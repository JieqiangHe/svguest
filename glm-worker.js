const ORIGIN = 'https://jieqianghe.github.io';
const ROUTES = new Map([
  ['/glm/standard', 'https://open.bigmodel.cn/api/paas/v4/chat/completions'],
  ['/glm/coding', 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions']
]);

export default {
  async fetch(request) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const headers = new Headers({'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff'});
    if (origin === ORIGIN) {
      headers.set('Access-Control-Allow-Origin', ORIGIN);
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      headers.set('Access-Control-Expose-Headers', 'Retry-After');
      headers.set('Access-Control-Max-Age', '86400');
    }
    const error = (status, message) => new Response(JSON.stringify({error: {message}}), {
      status, headers: new Headers([...headers, ['Content-Type', 'application/json; charset=utf-8']])
    });
    if (request.method === 'GET' && url.pathname === '/' && !url.search)
      return new Response('svguest GLM relay is ready (v1).', {headers});
    const target = ROUTES.get(url.pathname);
    if (!target || url.search) return error(404, 'Unknown relay route.');
    if (origin !== ORIGIN) return error(403, 'Origin is not allowed.');
    if (request.method === 'OPTIONS') {
      if (request.headers.get('Access-Control-Request-Method') !== 'POST')
        return error(405, 'Only POST is allowed.');
      const requested = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
      if (requested.some(x => !['authorization', 'content-type'].includes(x)))
        return error(400, 'Unsupported request header.');
      return new Response(null, {status: 204, headers});
    }
    if (request.method !== 'POST') return error(405, 'Only POST is allowed.');
    const auth = request.headers.get('Authorization') || '';
    if (!/^Bearer [\x21-\x7e]{1,4096}$/i.test(auth)) return error(401, 'A GLM API key is required.');
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || ''))
      return error(415, 'Content-Type must be application/json.');
    if (!request.body) return error(400, 'A JSON request body is required.');
    try {
      const upstream = await fetch(target, {
        method: 'POST', redirect: 'manual', signal: request.signal, body: request.body,
        headers: {'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        await upstream.body?.cancel();
        return error(502, 'GLM returned a redirect; it was not followed.');
      }
      headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
      const retry = upstream.headers.get('Retry-After');
      if (retry) headers.set('Retry-After', retry);
      return new Response(upstream.body, {status: upstream.status, headers});
    } catch {
      return error(request.signal.aborted ? 499 : 502, request.signal.aborted ? 'Request cancelled.' : 'The relay could not reach GLM.');
    }
  }
};
