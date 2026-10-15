'use strict';
(()=>{const S=window.TBSIWC;if(!S||!S.url||typeof call!=='function'||typeof regAdd!=='function')return;
const G={st:null,ms:[],pt:0,pm:'',tm:0},
  rqs=(p,b)=>fetch(S.url+p,{method:b==null?'GET':'POST',body:b,headers:{'x-siwc-key':S.key}}),
  rj=async r=>{const t=await r.text();try{return JSON.parse(t)}catch(_){return{error:{message:t.slice(0,300)||'HTTP '+r.status}}}},
  why=j=>j?.error?.message||j?.message||(typeof j?.error=='string'?j.error:'')||'unknown error',
  B=el('div','gb'),ac=el('p'),gr=el('div','gr'),sb=el('button','pri','Sign in with ChatGPT'),so=el('button',0,'Sign out'),lk=el('input'),ke=el('p'),pd=el('details'),pl=el('summary',0,'Proxy'),px=el('input'),pn=el('p');
document.head.append(Object.assign(el('style'),{textContent:'#mCdGpt .gb{display:flex;flex-direction:column;gap:7px}#mCdGpt .gr{display:flex;flex-wrap:wrap;gap:4px}#mCdGpt .gr .pri{border-color:transparent;background:var(--fg);color:var(--side)}#mCdGpt input{width:100%;min-width:0;font-size:11.5px}#mCdGpt details summary{cursor:pointer;color:var(--h4);font-size:11.5px}#mCdGpt details[open]{display:flex;flex-direction:column;gap:4px}#mCdGpt .gq{display:inline-block;width:12px;height:12px;line-height:12px;text-align:center;border:1px solid;border-radius:50%;font-size:9px;margin-left:5px;color:var(--h4);cursor:help;vertical-align:1px}#mCdGpt p.gw{color:var(--wa)}'}));
const R={p:'Gpt',n:'ChatGPT',by:'Your ChatGPT plan',to:'OpenAI via your ChatGPT plan',add:'Sign in',need:'Sign in with ChatGPT under Models and keys first',note:'Its models are listed here once you sign in.',ms:[],body:B,
  ok:()=>!!(G.st?.signedIn&&G.st?.share),st:()=>{const s=G.st||{};return s.waiting?['wa','Signing in…']:s.signedIn?s.share?['ok','Signed in']:['wa','Plan use is off']:[s.error?'er':'','Not signed in']}};
lk.readOnly=true;lk.hidden=true;lk.title='Open this link in your web browser to sign in';lk.onfocus=()=>lk.select();sb.id='mGptIn';so.id='mGptOut';px.id='mGptPx';px.spellcheck=false;
pd.title='Proxy for TBtools\' connection to OpenAI. Usually leave it empty: the system proxy is read again every 30 s (shown as Auto), which keeps working when your proxy app picks a new port at each start, and in TUN or enhanced mode no port is needed.\nTo find the port: your proxy app\'s settings (Port or Mixed port; often Clash 7890, Clash Verge Rev 7897, v2rayN 10809, V2rayU 1087, Surge 6152), or macOS System Settings › Network › Details › Proxies (Secure web proxy), or Windows Settings › Network & internet › Proxy.';
pl.append(el('span','gq','?'));pd.append(pl,px,pn);gr.append(sb,so);B.append(ac,gr,lk,ke,pd);
const ui=()=>{const s=G.st||{},on=s.signedIn&&s.share,n=G.ms.length,m=G.pm||s.note||(G.tm?s.ptest:'')||'';s.waiting||(lk.hidden=true);
    ac.textContent=s.waiting?'The sign-in page opened in your web browser: finish there, and this card updates by itself.':s.signedIn?`Signed in as ${s.email||s.name||'your ChatGPT account'}${on&&n?` · ${n} model${n>1?'s':''}`:''}.`:'Draw with your ChatGPT plan instead of an API key. Sign-in opens in your web browser; svguest never sees your password.';
    sb.hidden=!!(s.waiting||s.signedIn);so.hidden=!sb.hidden;so.textContent=s.waiting?'Sign in again':'Sign out';
    ke.textContent=G.km||(s.signedIn&&!s.share?'This account doesn\'t let apps use its ChatGPT plan: turn plan usage on in ChatGPT settings, then sign in again.':!s.signedIn&&!s.waiting&&s.error?'Sign-in failed: '+s.error:'');ke.hidden=!ke.textContent;ke.className=/^(Sign-in failed|Could not|Signed in, but|This account)/.test(ke.textContent)?'ew':'';
    px.placeholder='System proxy: '+(s.auto||'none found');pn.textContent=m||(s.proxy?`System proxy: ${s.auto||'none'}.`:'');pn.hidden=!pn.textContent;pn.className=m&&!/^(OpenAI reached|Testing)/.test(m)?'gw':'';
    document.activeElement!==px&&(px.value=s.proxy||'');(s.proxy||m)&&(pd.open=true);cfgSync()},
  st=async()=>{try{G.st=await rj(await rqs('/siwc/status'))}catch(_){G.st={error:'TBtools is not answering'}}ui();return G.st},
  poll=async()=>{clearTimeout(G.pt);const s=await st();s.waiting?G.pt=setTimeout(poll,1500):(G.km&&(G.km='',ui()),s.signedIn&&s.share&&models())},
  fx=v=>v&&v.startsWith('Gpt:')&&G.ms.length&&!G.ms.includes(v.slice(4))?'Gpt:'+G.ms[0]:v,
  put=L=>{G.ms=L.map(m=>m.id);R.ms=L.map(m=>({id:m.id,n:m.n,see:1,...m.c>0?{ctx:m.c}:{}}));const d=fx(DRAW),r=fx(RD);d!==DRAW&&ls('sgDraw',DRAW=d);r!==RD&&ls('sgVis',RD=r);cfgSync();ctxU()},
  models=async()=>{let j,r;try{r=await rqs('/siwc/models');j=await rj(r)}catch(_){return}if(!r.ok)return G.km='Signed in, but the model list failed: '+why(j),ui();
    const L=(j.models||j.data||[]).filter(m=>m&&(m.slug||m.id)&&(!m.visibility||m.visibility==='list')).map(m=>({id:m.slug||m.id,n:m.display_name||m.slug||m.id,c:m.context_window}));
    ls('sgGptModels',JSON.stringify(L));put(L);ui()};
regAdd(R);
sb.onclick=so.onclick=async e=>{e.preventDefault();const s=G.st||{};
  if(s.signedIn&&!s.waiting){if(!await cfm('Sign out of ChatGPT? svguest will no longer use your ChatGPT plan.','Sign out'))return;try{G.st=await rj(await rqs('/siwc/logout',''))}catch(_){}G.km='';ls('sgGptModels','[]');put([]);return ui()}
  G.km='Opening the ChatGPT sign-in page…';ui();let r,j;try{r=await rqs('/siwc/login','');j=await rj(r)}catch(_){j={error:{message:'TBtools is not answering'}}}
  if(!r||!r.ok)return G.km='Could not start sign-in: '+why(j),ui();
  G.km=j.opened?'':'Your web browser didn\'t open: copy this link into it.';G.st={...G.st,waiting:true,error:null};ui();j.opened||(lk.value=j.url,lk.hidden=false);poll()};
px.onchange=async()=>{const v=px.value.trim();G.tm=1;G.st={...G.st,proxy:v};G.pm='Testing the proxy…';ui();try{const r=await rqs('/siwc/proxy',v),j=await rj(r);r.ok?(G.st=j,G.pm=''):(G.pm=why(j),await st())}catch(_){G.pm='TBtools is not answering'}ui()};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gpt')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');const m=to.m==='auto'?G.ms[0]:to.m;if(!m)throw Error('Sign in with ChatGPT under Models and keys first');
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
try{put(JSON.parse(ls('sgGptModels')||'[]'))}catch(_){put([])}poll();
})();
(()=>{const S=window.TBSIWC;if(!S||!S.url||!MAC||typeof placeImg!=='function')return;
const C=navigator.clipboard,w0=C&&C.writeText.bind(C);let pt=0;
w0&&(C.writeText=t=>w0(t).catch(()=>fetch(S.url+'/siwc/clip-text',{method:'POST',body:t,headers:{'x-siwc-key':S.key}}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status)})));
addEventListener('keydown',e=>{const t=e.target;if(!cmd(e)||e.shiftKey||e.altKey||e.key.toLowerCase()!=='v'||!root||dlgOpen()||t.id!=='mAsk'&&t.closest?.('#mChat,input,textarea,select,.ed,[contenteditable]'))return;
  const x=new XMLHttpRequest;try{x.open('GET',S.url+'/siwc/clip-image',false);x.setRequestHeader('x-siwc-key',S.key);x.send()}catch(_){return}if(x.status!==200)return;
  const b=atob(x.responseText),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const f=new File([u],'image.png',{type:'image/png'});
  e.preventDefault();e.stopImmediatePropagation();pt=Date.now();t.id==='mAsk'?attach([f]):placeImg(f)},true);
addEventListener('paste',e=>{Date.now()-pt<1e3&&[...e.clipboardData.files].some(isImg)&&(e.preventDefault(),e.stopImmediatePropagation())},true);
})();
