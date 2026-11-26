'use strict';
// svguest gift codes: TBtools plugin only. svguest-stage.sh inlines this file into the plugin's copy of app.html; the
// public app.html never carries it. A gift code is redeemed at svguest's gift Worker (GIFT_API), which keeps the
// quota and calls the AI with its own key, so neither the AI service behind it nor any key reaches this page.
// It joins SVG Chat as one more service (regAdd, like the ChatGPT plan) and wraps call() for p 'Gift'. Text comes
// in English and Chinese from GT, picked by LNG at each render (lgSet is wrapped to re-render), because most of it
// carries numbers that the ZH map cannot key. Saved: sgGiftCode, sgGiftDev (random id of this computer), sgGiftQ
// (last known quota), sgGiftAd (the code whose used-up AI Dev card was closed).
(()=>{const GIFT_API='https://svguest-gift.REPLACE-ME.workers.dev'; // the deployed Worker, no trailing slash
if(/REPLACE-ME/.test(GIFT_API)||typeof call!=='function'||typeof regAdd!=='function'||typeof sse!=='function')return;
if(!window.tbtools&&!window.TBSIWC)return; // only inside TBtools
const zh=()=>LNG==='zh',T=(e,z)=>zh()?z:e,
  ENDED='目前本次的礼品机会已经结束，欢迎大家多多关注 TBtools 公众号！', // shown to everyone, in both languages, when the Worker reports the campaign over
  GT={campaign_ended:[ENDED,ENDED],device_exhausted:['This computer has used all its gift calls.','这台电脑的礼品次数已用完。'],bad_code:['This gift code is not valid. Check it and try again.','礼品码无效，请检查后重试。'],disabled:['This gift code has been turned off.','这个礼品码已停用。'],
    expired:['This gift code has expired.','这个礼品码已过期。'],exhausted:['This gift code is used up.','这个礼品码的次数已用完。'],
    device_limit:['This gift code is already in use on another computer.','这个礼品码已在另一台电脑上使用。'],
    rate_limited:['Too many requests with this gift code. Wait a minute and try again.','请求太频繁，请等一分钟再试。'],
    too_many_fails:['Too many wrong gift codes. Wait a few minutes and try again.','输错礼品码次数太多，请过几分钟再试。'],
    busy:['The gift service is busy. Try again in a moment.','礼品服务繁忙，请稍后再试。'],
    paused:['Gift codes are paused for now.','礼品码暂时停用。'],too_large:['This message is too large for the gift model. Start a new chat or send less.','这条消息太长，礼品模型读不下。请新建对话或少发一些。'],
    bad_request:['The gift service could not read this request.','礼品服务无法读取这个请求。'],blocked:['The AI declined to answer this request.','AI 拒绝回答这个请求。'],
    unavailable:['The AI behind the gift service is not answering. Try again later. This call was not counted.','礼品服务暂时连不上 AI，请稍后再试；这次不计次数。'],
    config:['The gift service is not set up correctly. Please tell the svguest author.','礼品服务配置有误，请告诉 svguest 作者。'],
    origin:['This gift code works only in the svguest TBtools plugin.','礼品码只能在 svguest 的 TBtools 插件中使用。'],
    network:['The gift service could not be reached. Check the network and try again.','连不上礼品服务，请检查网络后重试。'],
    no_code:['Redeem a gift code under Models and keys first.','请先在“模型与密钥”里兑换礼品码。']},
  SH={bad_code:['Not valid','无效'],disabled:['Turned off','已停用'],expired:['Expired','已过期'],exhausted:['Used up','已用完'],device_limit:['On another computer','已在别处使用'],device_exhausted:['Used up','已用完']},
  gw=(c,m)=>GT[c]?T(...GT[c]):m||T('The gift service failed.','礼品服务出错。'),
  gwE=(c,m)=>GT[c]?GT[c][0]:m||'The gift service failed.', // chat replies and status messages stay English, as the app's own do
  rj=async r=>{try{return await r.json()}catch(_){return{error:{code:'unavailable'}}}},
  dev=()=>{let d=ls('sgGiftDev');if(!/^[a-z0-9]{16}$/.test(d||'')){d=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('');ls('sgGiftDev',d)}return d},
  H=()=>({'X-Gift-Code':G.code,'X-Gift-Device':dev()}),
  fmtD=t=>{const d=new Date(t);return zh()?`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`:d.toLocaleDateString('en',{year:'numeric',month:'short',day:'numeric'})},
  norm=s=>{const a=String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,''),b=a.startsWith('SVG')?a.slice(3):a;return b.length===8?`SVG-${b.slice(0,4)}-${b.slice(4)}`:null};
// G.q: {left,quota,used,exp,model:{name}} as last told by the Worker; G.er: the code's problem (an error code), G.net: offline;
// G.ended: the Worker says the campaign is over (never saved: it is asked again at every start and every 2 minutes while it lasts, so a top-up reopens it); G.resume: Gift was the drawing model when it ended
const G={code:ls('sgGiftCode')||'',q:(()=>{try{return JSON.parse(ls('sgGiftQ')||'null')}catch(_){return null}})(),er:'',net:0,busy:0,msg:'',ended:0,resume:0,tm:0},
  keep=()=>{ls('sgGiftCode',G.code);ls('sgGiftQ',G.q?JSON.stringify(G.q):'')},
  left=()=>G.q?G.q.left:null,
  live=()=>!!G.code&&!G.er&&left()!==0&&!G.ended,
  CODEERR=['bad_code','disabled','expired','exhausted','device_limit','device_exhausted'],
  adKey=()=>G.ended?'ended':G.code&&left()===0?G.code:'',
  mName=()=>G.q?.model?.name||'Gemini 3.8 Flash';
const B=el('div','gb'),lead=el('p'),kf=el('div','kf'),inp=el('input'),go=el('button','pri'),qd=el('div','gq'),qc=el('b'),qt=el('span'),qb=el('i'),bar=el('div','gbar'),
  ew=el('p','ew'),nt=el('p','gn'),rw=el('div','gr'),use=el('button','lk'),rm=el('button','lk'),ad=el('div','gad'),
  hint=el('p'),ban=el('div'),banX=el('button','ib');
inp.id='mGiftIn';go.id='mGiftGo';use.id='mGiftUse';rm.id='mGiftX';ad.id='mGiftAdC';hint.id='mGiftH';ban.id='mGiftAd';
Object.assign(inp,{placeholder:'SVG-XXXX-XXXX',spellcheck:false,autocomplete:'off',maxLength:20});
bar.append(qb);qd.append(qc,qt,bar);kf.append(inp,go);rw.append(use,rm);B.append(lead,kf,qd,ew,rw,nt,ad);
document.head.append(Object.assign(el('style'),{textContent:
  // Chinese glyphs that the interface's "UI SC" subset lacks; written by scripts/svguest-gift-font.py
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,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) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4F17,U+5144,U+5151,U+516C,U+51E0,U+51ED,U+5269,U+544A,U+5BB6,U+5E08,U+5E74,U+5FD9,U+611F,U+65E5,U+6682,U+6708,U+671F,U+76EE,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+8BC9,U+8BEF,U+8D26,U+8FCE,U+949F,U+9519}/* giftfont:end */'+
  '#mCdGift .gb{display:flex;flex-direction:column;gap:7px}#mCdGift .kf input{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.04em;text-transform:uppercase}'+
  '#mCdGift .kf .pri,#mGiftH button{flex:none;padding:0 12px;border-color:transparent;background:var(--fg);color:var(--side)}#mCdGift .kf .pri:disabled{opacity:.5}'+
  '#mCdGift .gq{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:3px 8px;font-size:11.5px}#mCdGift .gq b{font:600 11.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.03em}#mCdGift .gq span{color:var(--h4);text-align:right}'+
  '#mCdGift .gbar{grid-column:1/-1;height:4px;border-radius:2px;background:var(--line);overflow:hidden}#mCdGift .gbar i{display:block;height:100%;border-radius:2px;background:var(--ok);transition:width .3s}#mCdGift .gbar.lo i{background:var(--wa)}'+
  '#mCdGift .gr{display:flex;gap:14px}#mCdGift p.gn{color:var(--t3);font-size:11px}'+
  '.gad{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:7px;background:var(--side);box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;line-height:1.45;color:var(--h4)}'+
  '.gad b{color:var(--fg);font-weight:600}.gad b em{font-style:normal;color:#c4314b;font-weight:700}.gad small{color:var(--t3);font-size:10.5px}.gad .gu{color:var(--t3);font-size:11px}'+
  '#mGiftAd{position:relative;margin:0 8px 6px}#mGiftAd .gad{padding-right:26px}#mGiftAd>.ib{position:absolute;top:3px;right:3px;width:20px;height:20px;min-width:0;padding:0;border:0;background:none;color:var(--t3);font-size:14px;line-height:20px}'+
  '#mGiftH{display:flex;align-items:center;gap:8px;margin:0 10px 8px;padding:7px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;color:var(--h4)}#mGiftH span{flex:1}#mGiftH button{height:22px;font-size:11px}'}));
// the AI Dev card (TBtools' plugin builder), shown when a code is used up; CJ is TBtools' author
const adFill=(n,top)=>{n.replaceChildren();const b=el('b');top&&n.append(el('span','gu',G.ended?ENDED:T(`Your gift code ${G.code} is used up. Thanks for trying it!`,`礼品码 ${G.code} 的次数已用完，感谢试用！`)));b.append(T('New in TBtools: ','TBtools 新功能：'),Object.assign(el('em'),{textContent:'AI'}),' Dev');
  n.append(b,el('span',0,T('Describe the tool you need and AI Dev builds it into a TBtools plugin with you. Open it from TBtools’ Plugin menu › AI Dev.','说出你想要的工具，AI Dev 和你一起把它做成 TBtools 插件。在 TBtools 的 Plugin 菜单 › AI Dev 打开。')),
    el('small',0,T('svguest’s gift codes are supported by CJ (TBtools). Thank you!','svguest 礼品码由 CJ 师兄（TBtools）支持，感谢！')))};
const R={p:'Gift',body:B,ms:[{id:'gemini',get n(){return mName()},see:1,ctx:64e3}],
  get n(){return T('Gift code','礼品码')},get by(){return T('TBtools plugin only','TBtools 插件专享')},
  to:'svguest’s gift service (Google Gemini)',add:'Redeem a code',note:'Have a gift code? Redeem it to draw with Gemini, no key needed.',
  get need(){return G.ended?ENDED:gwE(G.code?G.er||(left()===0?'exhausted':'no_code'):'no_code')},
  ok:()=>live(),
  st:()=>G.ended?['er',T('Ended','已结束')]:!G.code?['',T('No code','未兑换')]:G.busy?['wa',T('Checking…','正在检查…')]:G.er?['er',T(...(SH[G.er]||['Not available','不可用']))]:left()===0?['er',T('Used up','已用完')]:G.net?['wa',T('Offline','未联网')]:['ok',left()==null?T('Ready','可用'):T(`${left()} left`,`剩 ${left()} 次`)]};
const ui=()=>{const c=$('mCdGift');if(!c)return;cfgSync();const q=G.q,has=!!G.code,n=left(),dead=has&&(!!G.er&&G.er!=='rate_limited'&&G.er!=='busy'||n===0);
    c.querySelector('header b').textContent=R.n;const sm=c.querySelector('header small');sm&&(sm.textContent=R.by);
    lead.textContent=G.ended?ENDED:has&&!dead?T(`SVG Chat can draw with ${mName()} on this code: no key or account needed.`,`凭这个礼品码，SVG Chat 可以用 ${mName()} 画图，无需密钥或账号。`)
      :T(`Redeem a gift code to draw with ${mName()} here in TBtools: no key or account needed. Gift codes work only in the svguest TBtools plugin.`,`兑换礼品码后，就能在 TBtools 里用 ${mName()} 画图，无需密钥或账号。礼品码只能在 svguest 的 TBtools 插件中使用。`);
    kf.hidden=!!G.ended||has&&!dead;go.textContent=G.busy?T('Redeeming…','兑换中…'):T('Redeem','兑换');go.disabled=!!G.busy;inp.setAttribute('aria-label',T('Gift code','礼品码'));
    qd.hidden=!has||!!G.ended;qc.textContent=G.code;
    qt.textContent=!q?T('Checking…','正在检查…'):T(`${q.left} of ${q.quota} calls left`,`剩 ${q.left} / ${q.quota} 次`)+(q.exp?T(` · until ${fmtD(q.exp)}`,` · ${fmtD(q.exp)}前有效`):'');
    qb.style.width=q&&q.quota?Math.max(0,Math.min(100,q.left/q.quota*100))+'%':'0';bar.classList.toggle('lo',!!q&&q.left<q.quota&&q.left<=Math.max(1,q.quota*.2));
    ew.textContent=G.ended?'':G.msg||(has&&G.er?gw(G.er):'');ew.hidden=!ew.textContent;
    use.textContent=T('Draw with it','用它画图');rm.textContent=T('Remove the code','移除礼品码');rm.hidden=!has;useUI();
    nt.textContent=T(`Each request to the AI uses one call, and a computer gets ${q?.quota||3} in all, whichever codes it redeems. What you send goes through svguest’s gift service to Google Gemini.`,`每次请求 AI 计一次；每台电脑一共 ${q?.quota||3} 次，换多少个码都一样。你发送的内容经 svguest 礼品服务发给 Google Gemini。`);nt.hidden=!!G.ended;
    ad.hidden=!adKey();ad.hidden||adFill(ad);
    hint.replaceChildren(...G.ended?[el('span',0,ENDED)]:[el('span',0,T(`Have a gift code? Draw with ${mName()} in TBtools, no key needed.`,`有礼品码？在 TBtools 里用 ${mName()} 画图，无需密钥。`)),btn(T('Redeem','兑换'),()=>openConn('Gift',{v:'Gift:gemini'}))]);
    hint.hidden=hintOff();
    ban.hidden=!adKey()||ls('sgGiftAd')===adKey();ban.hidden||(adFill(ban.firstChild,1),banX.title=T('Close','关闭'))},
  hintOff=()=>$('mHello').hidden||(!!G.code&&!G.ended),
  useUI=()=>{use.hidden=!G.code||!live()||who(DRAW).p==='Gift';rw.hidden=use.hidden&&rm.hidden},
  setEnded=on=>{on=on?1:0;if(on===G.ended)return;G.ended=on;
    if(on){if(who(DRAW).p==='Gift'){G.resume=1;DRAW=''} // only in memory: sgDraw stays, so a restart after the top-up picks Gift again
      G.tm=G.tm||setInterval(check,12e4)}
    else{clearInterval(G.tm);G.tm=0;if(G.resume&&!DRAW)DRAW='Gift:gemini';G.resume=0}ui()},
  onErr=e=>{const c=e?.code;if(c==='campaign_ended')setEnded(1);else setQ(e,CODEERR.includes(c)?c:'')},
  setQ=(j,code)=>{if(!j)return;if(typeof j.left==='number')G.q={left:j.left,quota:j.quota,used:j.used??j.quota-j.left,exp:j.exp??G.q?.exp??null,model:j.model||G.q?.model};code&&(G.er=code);keep()},
  check=async()=>{if(G.checking)return;G.checking=1;const has=!!G.code;has&&(G.busy=1,ui());let r,j;
    try{r=await fetch(GIFT_API+(has?'/quota':'/status'),{headers:has?H():{},credentials:'omit',redirect:'error'});j=await rj(r);G.net=0}catch(_){G.net=1;G.busy=0;G.checking=0;return ui()}
    G.busy=0;G.checking=0;
    if(r.ok){setEnded(j.ended);has&&!j.ended&&(G.er='',setQ(j))}else onErr(j.error);ui()},
  redeem=async()=>{const c=norm(inp.value);G.msg='';if(!c){G.msg=gw('bad_code');return ui()}
    G.busy=1;ui();let r,j;try{r=await fetch(GIFT_API+'/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:c,device:dev()}),credentials:'omit',redirect:'error'});j=await rj(r)}
    catch(_){G.busy=0;G.msg=gw('network');return ui()}G.busy=0;
    if(!r.ok){onErr(j.error);G.msg=j.error?.code==='campaign_ended'?'':gw(j.error?.code,j.error?.message);return ui()}
    setEnded(0);G.code=j.code||c;G.er='';G.net=0;G.q=null;setQ(j);inp.value='';const v='Gift:gemini',p=PEND;
    if(!p&&who(DRAW).p!=='Gift'){DRAW=v;ls('sgDraw',v)}ui();
    p||msg(`Gift code redeemed: ${j.left} calls. SVG Chat draws with ${mName()}.`)};
// the hint under the chat's greeting, and the used-up banner above the composer
$('mHello').after(hint);new MutationObserver(()=>hint.hidden=hintOff()).observe($('mHello'),{attributes:true,attributeFilter:['hidden']});
banX.textContent='×';banX.onclick=()=>{ls('sgGiftAd',adKey());ban.hidden=true};ban.append(el('div','gad'),banX);$('mComp').before(ban);
regAdd(R);ui();
go.onclick=e=>{e.preventDefault();redeem()};
inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();redeem()}else if(e.key==='Escape'){e.preventDefault();connX()}};
inp.oninput=()=>{G.msg&&(G.msg='',ui())};
use.onclick=()=>pickM('Gift:gemini',1);
rm.onclick=async()=>{if(!await cfm(T(`Remove the gift code ${G.code} from svguest? You can redeem it again later while it has calls left.`,`从 svguest 移除礼品码 ${G.code}？只要还有次数，之后可以再次兑换。`),T('Remove','移除')))return;
  G.code='';G.q=null;G.er='';G.msg='';keep();if(who(DRAW).p==='Gift'){DRAW='';try{localStorage.removeItem('sgDraw')}catch(_){}}ui()};
const lg0=lgSet;lgSet=function(l){lg0(l);ui()};
const cs0=cfgSync;cfgSync=function(){cs0();useUI()}; // keeps Draw with it in step when the model is picked elsewhere
// SVG Chat requests for the gift model: the Worker streams {"d":text} {"k":thinking} and ends with {"end":…} or {"error":…}
const gErr=(c,m,p)=>Object.assign(Error(gwE(c,m)),{p:p||[...CODEERR,'no_code','campaign_ended'].includes(c)?'Gift':undefined,gift:c}),
  after=()=>{const n=left();if(n===0&&who(DRAW).p==='Gift'){DRAW='';try{localStorage.removeItem('sgDraw')}catch(_){}}ui();
    n===0?setTimeout(()=>msg(`Gift code used up: SVG Chat draws with ${nameOf(drawTo())} again`),1500):n!=null&&n<=3&&msg(`Gift code: ${n} call${n>1?'s':''} left`)};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gift')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');if(G.ended)throw gErr('campaign_ended');if(!G.code)throw gErr('no_code');
  let r;try{r=await fetch(GIFT_API+'/chat',{method:'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,effort:o.eff}),signal:o.signal,credentials:'omit',redirect:'error'})}
  catch(e){if(e.name==='AbortError')throw e;G.net=1;ui();throw gErr('network')}
  G.net=0;
  if(!r.ok){const j=await rj(r),c=j.error?.code;onErr(j.error);after();throw gErr(c,j.error?.message)}
  setEnded(0);
  let out='',cut=0,u=null;
  for await(const j of sse(r)){if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');
    if(typeof j.d==='string'){out+=j.d;o.on&&o.on(out)}
    else if(typeof j.k==='string')o.quiet||o.ui.think(j.k);
    else if(j.end){cut=j.end.cut?1:0;u=j.end.usage;setQ(j.end)}
    else if(j.error){onErr(j.error);after();throw gErr(j.error.code,j.error.message)}}
  after();o.ui.use(u);return{out,cut}};
check();
})();
