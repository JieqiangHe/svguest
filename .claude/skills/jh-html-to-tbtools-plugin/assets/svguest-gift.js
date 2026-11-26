'use strict';
// svguest free uses: TBtools plugin only. svguest-stage.sh inlines this file into the plugin's copy of app.html; the
// public app.html never carries it. Every computer running the plugin gets a few free AI calls (3) from svguest's gift
// Worker (GIFT_API): no code, no sign-in. The Worker keeps the count per device id, holds the AI service's key and
// calls the AI, so neither the AI service behind it nor any key reaches this page.
// It joins SVG Chat as one more service (regAdd, like the ChatGPT plan) and wraps call() for p 'Gift'. Text comes in
// English and Chinese from GT, picked by LNG at each render (lgSet is wrapped to re-render), because most of it carries
// numbers that the ZH map cannot key. Saved: sgGiftDev (random id of this computer; clearing it only asks the Worker for
// a fresh allowance, which the Worker limits per network), sgGiftQ (last known uses), sgGiftAd (which AI Dev card was closed).
(()=>{const GIFT_API='https://svguest-gift.REPLACE-ME.workers.dev'; // the deployed Worker, no trailing slash
if(/REPLACE-ME/.test(GIFT_API)||typeof call!=='function'||typeof regAdd!=='function'||typeof sse!=='function')return;
if(!window.tbtools&&!window.TBSIWC)return; // only inside TBtools
const zh=()=>LNG==='zh',T=(e,z)=>zh()?z:e,
  ENDED='目前本次的礼品的机会已经结束，欢迎大家多多关注 TBtools 公众号！', // shown to everyone, in both languages, when the Worker says the campaign is over
  FOOT=['This is just a place to share features with friends. It will never become paid.','这里只是和朋友们一起分享功能的地方，永远不会做成付费的形式。'],
  Q=()=>G.q?.quota||3,
  GT={campaign_ended:[ENDED,ENDED],
    device_exhausted:()=>[`Your ${Q()} free uses are used up. Follow the TBtools WeChat official account for more!`,`你的 ${Q()} 次免费使用机会已经用完，欢迎多多关注 TBtools 公众号！`],
    ip_limit:['Many computers on this network have already started their free uses today. Try again tomorrow.','今天这个网络下已有很多台电脑开始了免费体验，请明天再试。'],
    rate_limited:['Too many requests. Wait a minute and try again.','请求太频繁，请等一分钟再试。'],
    busy:['The free service is busy. Try again in a moment.','免费服务繁忙，请稍后再试。'],
    paused:['The free uses are paused for now.','免费体验暂时停用。'],too_large:['This message is too large for the free model. Start a new chat or send less.','这条消息太长，免费模型读不下。请新建对话或少发一些。'],
    bad_request:['The free service could not read this request.','免费服务无法读取这个请求。'],blocked:['The AI declined to answer this request.','AI 拒绝回答这个请求。'],
    unavailable:['The AI behind the free service is not answering. Try again later. This use was not counted.','免费服务暂时连不上 AI，请稍后再试；这次不计次数。'],
    config:['The free service is not set up correctly. Please tell the svguest author.','免费服务配置有误，请告诉 svguest 作者。'],
    origin:['The free uses work only in the svguest TBtools plugin.','免费体验只能在 svguest 的 TBtools 插件中使用。'],
    network:['The free service could not be reached. Check the network and try again.','连不上免费服务，请检查网络后重试。']},
  gt=c=>{const g=GT[c];return typeof g==='function'?g():g},
  gw=(c,m)=>gt(c)?T(...gt(c)):m||T('The free service failed.','免费服务出错。'),
  gwE=(c,m)=>gt(c)?gt(c)[0]:m||'The free service failed.', // chat replies and status messages stay English, as the app's own do
  rj=async r=>{try{return await r.json()}catch(_){return{error:{code:'unavailable'}}}},
  dev=()=>{let d=ls('sgGiftDev');if(!/^[a-z0-9]{16}$/.test(d||'')){d=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('');ls('sgGiftDev',d)}return d},
  H=()=>({'X-Gift-Device':dev()});
// G.q: {left,quota,used,model:{name}} as last told by the Worker; G.er: a problem with this computer (ip_limit), G.net: offline;
// G.ended: the Worker says the campaign is over (never saved: it is asked again at every start and every 2 minutes while it lasts, so a top-up reopens it); G.resume: Gift was the drawing model when it ended
const G={q:(()=>{try{return JSON.parse(ls('sgGiftQ')||'null')}catch(_){return null}})(),er:'',net:0,ended:0,resume:0,tm:0},
  keep=()=>ls('sgGiftQ',G.q?JSON.stringify(G.q):''),
  left=()=>G.q?G.q.left:null,
  live=()=>!G.er&&left()!==0&&!G.ended,
  adKey=()=>G.ended?'ended':left()===0?'used':'',
  mName=()=>G.q?.model?.name||'Gemini 3.8 Flash',
  noDraw=()=>{DRAW='';try{localStorage.removeItem('sgDraw')}catch(_){}};
const B=el('div','gb'),lead=el('p'),qd=el('div','gq'),qt=el('span'),bar=el('div','gbar'),qb=el('i'),
  ew=el('p','ew'),nt=el('p','gn'),rw=el('div','gr'),use=el('button','pri'),ad=el('div','gad'),ft=el('p','gf'),
  hint=el('div'),ban=el('div'),banX=el('button','ib');
use.id='mGiftUse';ad.id='mGiftAdC';hint.id='mGiftH';ban.id='mGiftAd';
bar.append(qb);qd.append(qt,bar);rw.append(use);B.append(lead,qd,ew,rw,nt,ad,ft);
document.head.append(Object.assign(el('style'),{textContent:
  // Chinese glyphs that the interface's "UI SC" subset lacks; written by scripts/svguest-gift-font.py
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,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) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4ECA,U+4F17,U+5144,U+516C,U+5269,U+544A,U+5730,U+5929,U+5BB6,U+5E08,U+5F88,U+5FD9,U+611F,U+6389,U+6682,U+670B,U+6C38,U+76EE,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+8BC9,U+8BEF,U+8D26,U+8FCE,U+949F,U+9519,U+9A8C}/* giftfont:end */'+
  '#mCdGift .gb{display:flex;flex-direction:column;gap:7px}#mCdGift .gr .pri,#mGiftH button{flex:none;padding:0 12px;border-color:transparent;background:var(--fg);color:var(--side)}'+
  '#mCdGift .gq{display:grid;grid-template-columns:1fr;gap:4px;font-size:12px}#mCdGift .gq span{color:var(--h4);font-weight:600}'+
  '#mCdGift .gbar{height:4px;border-radius:2px;background:var(--line);overflow:hidden}#mCdGift .gbar i{display:block;height:100%;border-radius:2px;background:var(--ok);transition:width .3s}#mCdGift .gbar.lo i{background:var(--wa)}'+
  '#mCdGift .gr{display:flex;gap:14px}#mCdGift p.gn{color:var(--t3);font-size:11px}.gf{color:var(--t3);font-size:10.5px;line-height:1.45}#mCdGift p.gf{padding-top:7px;border-top:1px solid var(--line)}'+
  '.gad{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:7px;background:var(--side);box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;line-height:1.45;color:var(--h4)}'+
  '.gad b{color:var(--fg);font-weight:600}.gad b em{font-style:normal;color:#c4314b;font-weight:700}.gad small{color:var(--t3);font-size:10.5px}.gad .gu{color:var(--t3);font-size:11px}'+
  '#mGiftAd{position:relative;margin:0 8px 6px}#mGiftAd .gad{padding-right:26px}#mGiftAd>.ib{position:absolute;top:3px;right:3px;width:20px;height:20px;min-width:0;padding:0;border:0;background:none;color:var(--t3);font-size:14px;line-height:20px}'+
  '#mGiftH{display:flex;flex-direction:column;gap:3px;margin:0 10px 8px;padding:7px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;color:var(--h4)}#mGiftH .gh{display:flex;align-items:center;gap:8px}#mGiftH .gh span{flex:1}#mGiftH button{height:22px;font-size:11px}'}));
// the AI Dev card (TBtools' plugin builder), shown when the free uses are used up or the campaign has ended; CJ is TBtools' author
const adFill=(n,top)=>{n.replaceChildren();const b=el('b');top&&n.append(el('span','gu',G.ended?ENDED:gw('device_exhausted')));b.append(T('New in TBtools: ','TBtools 新功能：'),Object.assign(el('em'),{textContent:'AI'}),' Dev');
  n.append(b,el('span',0,T('Describe the tool you need and AI Dev builds it into a TBtools plugin with you. Open it from TBtools’ Plugin menu › AI Dev.','说出你想要的工具，AI Dev 和你一起把它做成 TBtools 插件。在 TBtools 的 Plugin 菜单 › AI Dev 打开。')),
    el('small',0,T('svguest’s free uses are supported by CJ (TBtools). Thank you!','svguest 的免费体验由 CJ 师兄（TBtools）支持，感谢！')));top&&n.append(el('small',0,T(...FOOT)))};
const R={p:'Gift',body:B,ms:[{id:'gemini',get n(){return mName()},see:1,ctx:64e3}],
  get n(){return T('Free uses','免费体验')},get by(){return T('TBtools plugin only','TBtools 插件专享')},
  to:'svguest’s free service (Google Gemini)',add:'Free uses',note:'Free Gemini uses for every computer with the svguest TBtools plugin, no key needed.',
  get need(){return G.ended?ENDED:gwE(G.er||(left()===0?'device_exhausted':'bad_request'))},
  ok:()=>live(),
  st:()=>G.ended?['er',T('Ended','已结束')]:G.er?['er',T('Not available','不可用')]:left()===0?['er',T('Used up','已用完')]:G.net&&!G.q?['wa',T('Offline','未联网')]:!G.q?['wa',T('Checking…','正在检查…')]:['ok',T(`${left()} left`,`剩 ${left()} 次`)]};
const ui=()=>{const c=$('mCdGift');if(!c)return;cfgSync();const q=G.q,n=left(),gone=n===0&&!G.ended;
    c.querySelector('header b').textContent=R.n;const sm=c.querySelector('header small');sm&&(sm.textContent=R.by);
    lead.textContent=G.ended?ENDED:G.er?gw(G.er):gone?gw('device_exhausted')
      :T(`Draw with ${mName()} here in TBtools: ${Q()} free uses on this computer, no key or account needed. They work only in the svguest TBtools plugin.`,`在 TBtools 里用 ${mName()} 画图：这台电脑有 ${Q()} 次免费机会，无需密钥或账号。只能在 svguest 的 TBtools 插件中使用。`);
    qd.hidden=!!G.ended||!!G.er||!q;qt.textContent=q?T(`${q.left} of ${q.quota} uses left`,`剩 ${q.left} / ${q.quota} 次`):'';
    qb.style.width=q&&q.quota?Math.max(0,Math.min(100,q.left/q.quota*100))+'%':'0';bar.classList.toggle('lo',!!q&&q.left<q.quota&&q.left<=Math.max(1,q.quota*.34));
    ew.hidden=true;use.textContent=T('Draw with it','用它画图');useUI();
    nt.textContent=T('Each request to the AI uses one of them; a failed one is not counted. What you send goes through svguest’s free service to Google Gemini.','每次请求 AI 用掉一次；失败的不计次数。你发送的内容经 svguest 免费服务发给 Google Gemini。');nt.hidden=!!G.ended||gone;
    ft.textContent=T(...FOOT);
    ad.hidden=!adKey();ad.hidden||adFill(ad);
    const gh=el('div','gh');gh.append(...(G.ended?[el('span',0,ENDED)]:[el('span',0,T(`Free: draw with ${mName()}, ${left()==null?Q():left()} of ${Q()} uses left on this computer, no key needed.`,`免费体验：用 ${mName()} 画图，这台电脑剩 ${left()==null?Q():left()} / ${Q()} 次，无需密钥。`)),btn(T('Use it','试试'),()=>pickM('Gift:gemini',1))]));hint.replaceChildren(gh,el('small','gf',T(...FOOT)));
    hint.hidden=hintOff();
    ban.hidden=!adKey()||ls('sgGiftAd')===adKey();ban.hidden||(adFill(ban.firstChild,1),banX.title=T('Close','关闭'))},
  hintOff=()=>$('mHello').hidden||(!G.ended&&(!live()||who(DRAW).p==='Gift')),
  useUI=()=>{use.hidden=!live()||who(DRAW).p==='Gift';rw.hidden=use.hidden},
  setEnded=on=>{on=on?1:0;if(on===G.ended)return;G.ended=on;
    if(on){if(who(DRAW).p==='Gift'){G.resume=1;DRAW=''} // only in memory: sgDraw stays, so a restart after the top-up picks Gift again
      G.tm=G.tm||setInterval(check,12e4)}
    else{clearInterval(G.tm);G.tm=0;if(G.resume&&!DRAW)DRAW='Gift:gemini';G.resume=0}ui()},
  setQ=j=>{if(!j||typeof j.left!=='number')return;G.q={left:j.left,quota:j.quota,used:j.used??j.quota-j.left,model:j.model||G.q?.model};keep()},
  onErr=e=>{const c=e?.code;if(c==='campaign_ended')setEnded(1);else{setQ(e);G.er=c==='ip_limit'?c:''}},
  check=async()=>{if(G.checking)return;G.checking=1;let r,j;
    try{r=await fetch(GIFT_API+'/status',{headers:H(),credentials:'omit',redirect:'error'});j=await rj(r);G.net=0}catch(_){G.net=1;G.checking=0;return ui()}
    G.checking=0;
    if(r.ok&&typeof j.ended==='boolean'){G.er=j.error?.code==='ip_limit'?'ip_limit':'';j.error||setQ(j);setEnded(j.ended)}else G.net=1;ui()};
// the hint under the chat's greeting, and the AI Dev banner above the composer
$('mHello').after(hint);new MutationObserver(()=>hint.hidden=hintOff()).observe($('mHello'),{attributes:true,attributeFilter:['hidden']});
banX.textContent='×';banX.onclick=()=>{ls('sgGiftAd',adKey());ban.hidden=true};ban.append(el('div','gad'),banX);$('mComp').before(ban);
regAdd(R);ui();
use.onclick=()=>pickM('Gift:gemini',1);
const lg0=lgSet;lgSet=function(l){lg0(l);ui()};
const cs0=cfgSync;cfgSync=function(){cs0();useUI();hint.hidden=hintOff()}; // keeps Draw with it in step when the model is picked elsewhere
// SVG Chat requests for the free model: the Worker streams {"d":text} {"k":thinking} and ends with {"end":…} or {"error":…}
const gErr=(c,m)=>Object.assign(Error(gwE(c,m)),{p:['device_exhausted','ip_limit','campaign_ended'].includes(c)?'Gift':undefined,gift:c}),
  after=()=>{const n=left();if(n===0&&who(DRAW).p==='Gift')noDraw();ui();
    n===0?setTimeout(()=>msg(`Free uses used up: SVG Chat draws with ${nameOf(drawTo())} again`),1500):n!=null&&msg(`Free use: ${n} of ${Q()} left`)};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gift')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');if(G.ended)throw gErr('campaign_ended');
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
