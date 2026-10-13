'use strict';
(()=>{const S=window.TBSIWC;if(!S||!S.url||typeof call!=='function'||!$('mModel'))return;
const G={st:null,ms:[],pt:0,pm:''},M=$('mModel'),V=$('mVis'),
  rqs=(p,b)=>fetch(S.url+p,{method:b==null?'GET':'POST',body:b,headers:{'x-siwc-key':S.key}}),
  rj=async r=>{const t=await r.text();try{return JSON.parse(t)}catch(_){return{error:{message:t.slice(0,300)||'HTTP '+r.status}}}},
  why=j=>j?.error?.message||j?.message||(typeof j?.error=='string'?j.error:'')||'unknown error',
  r1=el('label'),r2=el('label'),sb=el('button',0,'Sign in'),ks=el('small'),hk=el('input'),lk=el('input'),px=el('input'),pn=el('small');
PROV.Gpt='ChatGPT';NAME.auto='ChatGPT (sign in first)';VIS.add('auto');
r1.dataset.p=r2.dataset.p='Gpt';r1.htmlFor='mGptNone';r1.title='Draw with your ChatGPT plan (Sign in with ChatGPT; TBtools only). Sign-in opens in your web browser.';
hk.type='hidden';hk.id='mKeyGpt';ks.id='mKsGpt';sb.style.justifySelf='start';lk.readOnly=true;lk.hidden=true;lk.style.gridColumn='2';lk.title='Open this link in your web browser to sign in';lk.onfocus=()=>lk.select();
px.id='mGptPx';px.spellcheck=false;r2.title='Proxy for TBtools\' connection to OpenAI; leave empty to use the system proxy';
r1.append('ChatGPT',sb,ks,lk,hk);r2.append('Proxy',px,pn);$('mKeyDs').closest('label').after(r1,r2);
const ui=()=>{const s=G.st||{};hk.value=s.signedIn&&s.share?'1':'';sb.textContent=s.waiting?'Sign in again':s.signedIn?'Sign out':'Sign in';s.waiting||(lk.hidden=true);
    ks.textContent=s.waiting?'Finish signing in in your web browser…':s.signedIn?`Signed in as ${s.email||s.name||'your ChatGPT account'}`+(s.share?G.ms.length?` · ${G.ms.length} model${G.ms.length>1?'s':''}`:'':' (plan usage is off for this account)'):s.error?'Not signed in: '+s.error:'Not signed in';
    px.placeholder='Auto: '+(s.auto||'none');pn.textContent=(G.pm||s.note||s.ptest||'Empty uses the system proxy; e.g. 127.0.0.1:7890 or socks://127.0.0.1:7891')+(s.proxy?` System proxy: ${s.auto||'none'}.`:'');document.activeElement!==px&&(px.value=s.proxy||'')},
  st=async()=>{try{G.st=await rj(await rqs('/siwc/status'))}catch(_){G.st={error:'TBtools is not answering'}}ui();return G.st},
  poll=async()=>{clearTimeout(G.pt);const s=await st();s.waiting?G.pt=setTimeout(poll,1500):s.signedIn&&s.share&&models()},
  self=()=>{drawTo().p==='Gpt'&&!ls('msbVis')&&V.value!=='self'&&(V.value='self',cfgSync())},
  put=L=>{G.ms=L.map(m=>m.id);for(const m of L){NAME[m.id]=m.n;VIS.add(m.id);m.c>0&&(CTX[m.id]=m.c)}
    for(const s of[M,V])s.querySelectorAll('option[value^="Gpt:"]').forEach(o=>o.remove());
    const vs=(G.ms.length?G.ms:['auto']).map(m=>'Gpt:'+m),op=v=>new Option(nameOf(who(v)),v);M.append(...vs.map(op));V.append(...vs.map(op));
    for(const[s,k]of[[M,'msbDraw'],[V,'msbVis']]){const v=ls(k);v&&v.startsWith('Gpt:')&&(s.value=vs.includes(v)?v:vs[0],ls(k,s.value))}cfgSync();self();ctxU()},
  models=async()=>{let j,r;try{r=await rqs('/siwc/models');j=await rj(r)}catch(_){return}if(!r.ok)return ks.textContent='Signed in, but the model list failed: '+why(j);
    const L=(j.models||j.data||[]).filter(m=>m&&(m.slug||m.id)&&(!m.visibility||m.visibility==='list')).map(m=>({id:m.slug||m.id,n:m.display_name||m.slug||m.id,c:m.context_window}));
    ls('msbGptModels',JSON.stringify(L));put(L);ui()};
sb.onclick=async e=>{e.preventDefault();const s=G.st||{};
  if(s.signedIn&&!s.waiting){if(!confirm('Sign out of ChatGPT? minisvg will no longer use your ChatGPT plan.'))return;try{G.st=await rj(await rqs('/siwc/logout',''))}catch(_){}ls('msbGptModels','[]');put([]);return ui()}
  ks.textContent='Opening the ChatGPT sign-in page…';let r,j;try{r=await rqs('/siwc/login','');j=await rj(r)}catch(_){j={error:{message:'TBtools is not answering'}}}
  if(!r||!r.ok)return ks.textContent='Could not start sign-in: '+why(j);
  G.st={...G.st,waiting:true};ui();j.opened||(lk.value=j.url,lk.hidden=false);poll()};
M.addEventListener('change',self);px.onchange=async()=>{const v=px.value.trim();G.st={...G.st,proxy:v};G.pm='Testing the proxy…';ui();try{const r=await rqs('/siwc/proxy',v),j=await rj(r);r.ok?(G.st=j,G.pm=''):(G.pm=why(j),await st())}catch(_){G.pm='TBtools is not answering'}ui()};
const ask0=ask;ask=function(a){const d=drawTo(),r=imgs.length?reader():null;
  if(!ac&&[d,r].some(x=>x&&x.p==='Gpt')&&!hk.value){$('mCfg').open=true;msg(G.st?.signedIn?'This ChatGPT account doesn\'t let apps use its plan; see AI settings':'Sign in with ChatGPT in AI settings first');return}return ask0(a)};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gpt')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');const m=to.m==='auto'?G.ms[0]:to.m;if(!m)throw Error('Sign in with ChatGPT in AI settings first');
  const sy=msgs.filter(x=>x.role==='system').map(x=>x.content).join('\n\n'),E={low:'low',high:'high',max:'xhigh'}[o.eff]||'medium',
    inp=msgs.filter(x=>x.role!=='system').map(x=>({role:x.role,content:typeof x.content=='string'?x.content:x.content.map(c=>c.image_url?{type:'input_image',image_url:c.image_url.url}:{type:'input_text',text:c.text||''})}));
  let r;for(const x of[{reasoning:{effort:E,summary:'auto'}},{reasoning:{effort:E==='xhigh'?'high':E}},{}]){r=await rqs('/siwc/responses',JSON.stringify({model:m,instructions:sy,input:inp,...x,store:false,stream:true}));
    if(r.status!==400||!x.reasoning||!/reason|summar|effort/i.test(await r.clone().text()))break}
  if(!r.ok)throw Error(`${r.status} ${why(await rj(r))}`);
  let out='',cut=0,u=null;
  for await(const j of sse(r)){const t=j.type;if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');
    if(t==='response.output_text.delta'){out+=j.delta||'';o.on&&o.on(out)}
    else if(/^response\.reasoning(_summary)?_text\.delta$/.test(t))o.quiet||o.ui.think(j.delta||'');
    else if(t==='response.completed')u=j.response?.usage;
    else if(t==='response.incomplete'){u=j.response?.usage;const w=j.response?.incomplete_details?.reason;if(w!=='max_output_tokens')throw Error('The reply stopped early'+(w?': '+w:''));cut=1}
    else if(t==='response.failed'||t==='error')throw Error(why(j.response||j))}
  o.ui.use(u&&{prompt_tokens:u.input_tokens,completion_tokens:u.output_tokens,completion_tokens_details:{reasoning_tokens:u.output_tokens_details?.reasoning_tokens||0}});return{out,cut}};
try{put(JSON.parse(ls('msbGptModels')||'[]'))}catch(_){put([])}
poll().then(()=>{G.st?.signedIn||[drawTo(),reader()].some(x=>x&&x.p==='Gpt')&&($('mCfg').open=true)});
})();
