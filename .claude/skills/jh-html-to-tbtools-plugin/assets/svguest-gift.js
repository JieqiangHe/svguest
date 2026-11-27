'use strict';
// svguest free trial: TBtools plugin only. svguest-stage.sh inlines this file into the plugin's copy of app.html; the
// public app.html never carries it. Every computer running the plugin gets a few free AI uses (5), no code, no sign-in,
// from svguest's Worker (GIFT_API). The Worker counts one use per chat turn (every call of that turn carries the same
// X-Gift-Turn id, so continuations, panels and the image-reading step are not charged again), holds the AI service's key
// and calls the AI; the page never learns who or what is behind it, and the UI never names the model.
// It joins SVG Chat as one more service (regAdd, like the ChatGPT plan) and wraps call() for p 'Gift'. Every string is
// written in English and Chinese (GT, FT, AD...), picked by LNG at each render (lgSet is wrapped to re-render).
// Saved: sgGiftDev (random id of this computer; clearing it only asks the Worker for a fresh allowance, which the Worker
// limits per network), sgGiftQ (last known uses), sgGiftAd (which AI Dev cards were closed).
(()=>{const GIFT_API='https://svguest-gift.REPLACE-ME.workers.dev'; // the deployed Worker, no trailing slash
if(/REPLACE-ME/.test(GIFT_API)||typeof call!=='function'||typeof regAdd!=='function'||typeof sse!=='function')return;
if(!window.tbtools&&!window.TBSIWC)return; // only inside TBtools
const zh=()=>LNG==='zh',T=(e,z)=>zh()?z:e,
  ENDED=['This round of free gifts has ended for now. Follow the TBtools WeChat official account for more!','目前本次的礼品的机会已经结束，欢迎大家多多关注 TBtools 公众号！'], // the Chinese line is the author's exact wording
  FOOT=['This is just a place to share features with friends. It will never become paid.','这里只是和朋友们一起分享功能的地方，永远不会做成付费的形式。'],
  TOEN='svguest’s free service, which passes it on to an AI model', // what the app's line under the composer says; chNote below adds the Chinese
  WAIT=['Takes about 1–2 minutes','大约需要一两分钟'],
  Q=()=>G.q?.quota||5,
  GT={campaign_ended:ENDED,
    device_exhausted:()=>[`Your ${Q()} free uses are used up. Follow the TBtools WeChat official account for more!`,`你的 ${Q()} 次免费使用机会已经用完，欢迎多多关注 TBtools 公众号！`],
    ip_limit:['Many computers on this network have already started the free trial today. Try again tomorrow.','今天这个网络下已有很多台电脑开始了免费体验，请明天再试。'],
    turn_limit:['This message needed too many AI calls. Send it again as a new message.','这条消息用到的 AI 调用次数太多了，请作为新消息重新发送。'],
    rate_limited:['Too many requests. Wait a minute and try again.','请求太频繁，请等一分钟再试。'],
    busy:['The free service is busy. Try again in a moment.','免费服务繁忙，请稍后再试。'],
    paused:['The free trial is paused for now.','免费体验暂时停用。'],
    too_large:['This message is too large for the free trial. Start a new chat or send less.','这条消息太长，免费体验读不下。请新建对话或少发一些。'],
    bad_request:['The free service could not read this request.','免费服务无法读取这个请求。'],
    blocked:['The AI declined to answer this request.','AI 拒绝回答这个请求。'],
    unavailable:['The AI behind the free service is not answering. Try again later. This use was not counted.','免费服务暂时连不上 AI，请稍后再试；这次不计次数。'],
    config:['The free service is not set up correctly. Please tell the svguest author.','免费服务配置有误，请告诉 svguest 作者。'],
    origin:['The free trial works only in the svguest TBtools plugin.','免费体验只能在 svguest 的 TBtools 插件中使用。'],
    network:['Could not reach the free service. Check your network and try again.','连不上免费服务，请检查网络后重试。']},
  gt=c=>{const g=GT[c];return typeof g==='function'?g():g},
  gw=(c,m)=>gt(c)?T(...gt(c)):m||T('The free service failed.','免费服务出错。'),
  rj=async r=>{try{return await r.json()}catch(_){return{error:{code:'unavailable'}}}},
  dev=()=>{let d=ls('sgGiftDev');if(!/^[a-z0-9]{16}$/.test(d||'')){d=rid(16);ls('sgGiftDev',d)}return d},
  rid=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join(''),
  H=()=>({'X-Gift-Device':dev()});
// G.q: {left,quota,used} as last told by the Worker; G.er: a problem with this computer (ip_limit), G.net: offline;
// G.ended: the Worker says the campaign is over (never saved: it is asked again at every start and every 2 minutes while it lasts, so a top-up reopens it); G.resume: the free model was drawing when it ended
const G={q:(()=>{try{return JSON.parse(ls('sgGiftQ')||'null')}catch(_){return null}})(),er:'',net:0,ended:0,resume:0,tm:0},
  keep=()=>ls('sgGiftQ',G.q?JSON.stringify(G.q):''),
  left=()=>G.q?G.q.left:null,
  live=()=>!G.er&&left()!==0&&!G.ended,
  started=()=>!!G.q&&G.q.left<G.q.quota,
  adKey=()=>G.ended?'ended':left()===0?'used':started()?'once':'',
  adSeen=k=>(ls('sgGiftAd')||'').split(',').includes(k),
  mName=()=>T('svguest free trial','svguest 免费体验'),
  noDraw=()=>{DRAW='';try{localStorage.removeItem('sgDraw')}catch(_){}};
const B=el('div','gb'),lead=el('p'),qd=el('div','gq'),qt=el('span'),bar=el('div','gbar'),qb=el('i'),
  rw=el('div','gr'),use=el('button','pri'),nt=el('p','gn'),ad=el('div'),ft=el('p','gf'),
  hint=el('div'),ban=el('div'),banX=el('button','ib');
use.id='mGiftUse';ad.id='mGiftAdC';hint.id='mGiftH';ban.id='mGiftAd';
bar.append(qb);qd.append(qt,bar);rw.append(use);B.append(lead,qd,rw,nt,ad,ft);
document.head.append(Object.assign(el('style'),{textContent:
  // Chinese glyphs that the interface's "UI SC" subset lacks; written by scripts/svguest-gift-font.py
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,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) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4ECA,U+4F17,U+516C,U+5269,U+5347,U+53E5,U+544A,U+5730,U+5929,U+5BB6,U+5F88,U+5FD9,U+6682,U+670B,U+6C38,U+76EE,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+804A,U+8BC1,U+8BC9,U+8BEF,U+8D26,U+8FCE,U+9000,U+949F,U+9519,U+9A8C}/* giftfont:end */'+
  '#mCdGift .gb{display:flex;flex-direction:column;gap:7px}#mCdGift .gr .pri,#mGiftH button{flex:none;padding:0 12px;border-color:transparent;background:var(--fg);color:var(--side)}'+
  '#mCdGift .gq{display:grid;grid-template-columns:1fr;gap:4px;font-size:12px}#mCdGift .gq span{color:var(--h4);font-weight:600}'+
  '#mCdGift .gbar{height:4px;border-radius:2px;background:var(--line);overflow:hidden}#mCdGift .gbar i{display:block;height:100%;border-radius:2px;background:var(--ok);transition:width .3s}#mCdGift .gbar.lo i{background:var(--wa)}'+
  '#mCdGift .gr{display:flex;gap:14px}#mCdGift p.gn{color:var(--t3);font-size:11px}.gf{color:var(--t3);font-size:10.5px;line-height:1.45}#mCdGift p.gf{padding-top:7px;border-top:1px solid var(--line)}'+
  // the AI Dev promo card: a quiet gradient hairline, a slow sheen, a twinkling star and a typed example; all of it stops under prefers-reduced-motion
  // TBtools' own colours, from its logo (tbtools.svg): yellow #f9e44d, amber #e9af00, brown #aa6418; the card carries the logo's faint 16-unit grid
  '.aid{--aid-s:#e9af0024;--aid-a:#e9af00;--aid-b:#aa6418;--aid-c:#f9e44d;--aid-t1:#aa6418;--aid-t2:#d19500;--aid-g:#aa641812;--aid-p:#aa64180f;--aid-r:#aa641830;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:5px;padding:10px 12px 9px;border-radius:8px;background:linear-gradient(100deg,var(--side) 38%,#0000 96%),linear-gradient(var(--aid-g) 1px,#0000 1px) 0 0/16px 16px,linear-gradient(90deg,var(--aid-g) 1px,#0000 1px) 0 0/16px 16px,var(--side);box-shadow:inset 0 0 0 1px var(--aid-r);font-size:11.5px;line-height:1.45;color:var(--h4)}'+
  '[data-theme=dark] .aid{--aid-s:#f9e44d1c;--aid-a:#e9af00;--aid-b:#f9e44d;--aid-c:#f9e44d;--aid-t1:#e9af00;--aid-t2:#f9e44d;--aid-g:#f9e44d12;--aid-p:#f9e44d14;--aid-r:#f9e44d2e}'+
  '.aid::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 38%,var(--aid-s) 50%,transparent 62%);background-size:300% 100%;background-position:160% 0}'+
  '.aid::after{content:"";position:absolute;left:0;right:0;top:0;height:1.5px;background:linear-gradient(90deg,var(--aid-a),var(--aid-c),var(--aid-a),var(--aid-b),var(--aid-a));background-size:200% 100%}'+
  '.aid>*{position:relative}.aid .ah{display:flex;align-items:center;gap:7px;color:var(--fg)}.aid .ah i.lg{flex:none;display:block;width:24px;height:24px;border-radius:5.4px}.aid .ah svg{display:block;width:24px;height:24px}'+
  '.aid .ah b{font-size:13px;font-weight:700;letter-spacing:.01em;background:linear-gradient(90deg,var(--aid-t1),var(--aid-t2),var(--aid-t1));background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}'+
  '.aid .ah em{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:1px 5px;border-radius:8px;color:var(--aid-b);box-shadow:inset 0 0 0 1px var(--aid-r)}.aid .ah em.hv{text-transform:none;letter-spacing:.02em;font-weight:650}'+
  '.aid .fr{font-size:10.5px;color:var(--aid-t1);font-weight:600}.aid ul.af{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1px;font-size:11px;line-height:1.4}.aid ul.af li{position:relative;padding-left:9px}.aid ul.af li::before{content:"";position:absolute;left:0;top:.55em;width:4px;height:4px;border-radius:1px;background:var(--aid-a)}.aid.sm ul.af{font-size:10.5px}.aid .al{color:var(--fg);font-weight:600}.aid .ap{display:flex;align-items:center;min-height:22px;padding:0 8px;border-radius:6px;background:var(--aid-p);box-shadow:inset 0 0 0 1px var(--aid-g);font:11px ui-monospace,SFMono-Regular,Menlo,Consolas,"UI SC",monospace;color:var(--fg);white-space:nowrap;overflow:hidden}'+
  '.aid .ap::before{content:"›";margin-right:6px;color:var(--aid-b)}.aid .ty{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom}.aid .cu{flex:none;width:1.5px;height:12px;margin-left:1px;background:var(--aid-b)}'+
  '.aid .aw{color:var(--t3);font-size:10.5px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;column-gap:8px;row-gap:6px}.aid .aw>span:first-child{min-width:12em}.aid .aw code{font:600 10.5px ui-monospace,SFMono-Regular,Menlo,Consolas,"UI SC",monospace;color:var(--fg)}.aid a.dl,#mCdGift .aid a.dl,#mGiftAd .aid a.dl{margin-left:auto;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px 0 4px;border-radius:11px;background:#f9e44d;color:#aa6418;font-size:10.5px;font-weight:650;line-height:1;text-decoration:none!important;white-space:nowrap;box-shadow:inset 0 0 0 1px #e9af00}.aid a.dl i{flex:none;display:block;width:16px;height:16px}.aid a.dl svg{display:block;width:16px;height:16px}.aid a.dl::after{content:"↗";font-size:9px;opacity:.7}.aid a.dl:hover{background:#f3d43a;box-shadow:inset 0 0 0 1px #aa6418}.aid a.dl:focus-visible{outline:2px solid #aa6418;outline-offset:2px}.aid.sm{padding:7px 10px 7px;gap:3px}.aid.sm .ap{display:none}.aid.sm ul.af li:nth-child(3){display:none}'+
  '@media (prefers-reduced-motion:no-preference){.aid::before{animation:aidsh 6s ease-in-out infinite}.aid::after,.aid .ah b{animation:aidbar 7s linear infinite}.aid .ah i.lg{animation:aidglow 7s ease-in-out infinite}.aid .cu{animation:aidbl 1s steps(1) infinite}.aid .ty{animation:aidty 7s linear infinite}}'+
  '@keyframes aidsh{0%,45%{background-position:160% 0}100%{background-position:-60% 0}}@keyframes aidbar{to{background-position:200% 0}}@keyframes aidglow{0%,100%{box-shadow:0 0 0 0 #e9af0000}50%{box-shadow:0 0 8px 1px #e9af0066}}@keyframes aidbl{50%{opacity:0}}@keyframes aidty{0%{width:0}42%,86%{width:var(--w)}100%{width:0}}'+
  '#mGiftAd{position:relative;margin:0 8px 6px}#mGiftAd .aid{padding-right:26px}#mGiftAd>.ib{position:absolute;z-index:1;top:4px;right:4px;width:20px;height:20px;min-width:0;padding:0;border:0;background:none;color:var(--t3);font-size:14px;line-height:20px}'+
  '#mGiftH{display:flex;flex-direction:column;gap:3px;margin:0 10px 8px;padding:7px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;color:var(--h4)}#mGiftH .gh{display:flex;align-items:center;gap:8px}#mGiftH .gh span{flex:1}#mGiftH button{height:22px;font-size:11px}'}));
// the AI Dev promo (TBtools' plugin builder); full when the free uses are gone or the campaign is over, compact once after the first use
// Path in TBtools (Lorena: do not mention the Linux/Others nest). Change only WHERE / AIPATH.
const WHERE=['Open it in TBtools: ','在 TBtools 里打开：'],AIPATH=['Plugin › AI Dev','Plugin › AI Dev'],
  // where to get TBtools: a small TBtools-style pill (inline logo at 16px, label, ↗) opened the same way as the app's own links (target=_blank)
  DL='https://www.yuque.com/cjchen/hirv8i/xq65ml',DLT=['Download TBtools','下载 TBtools'],
  DEMO=['count FASTA sequence lengths','统计 FASTA 序列长度'],
  // distinctive facts from the v2.570 hands-on (plan-then-approve, rollback, a plugin you can open). Lorena approved saying AI Dev is free to use.
  FREE=['Free, built-in model, no API key needed','免费使用，内置模型，无需自备 API key'],
  FEAT=[['Describe it in one sentence; AI Dev builds a plugin you can open right away.','说一句话，AI Dev 帮你做出可直接打开的插件。'],['Plans first, builds after you approve: compile, package, sample check.','先出计划，你批准后才动手：编译、打包、样例验证。'],['Not right? Keep chatting; every step can be rolled back.','不满意就接着聊，每步可回退。']],
  HV=['Harness upgrade','Harness 升级'],
  // the TBtools logo: tbtools.svg from the repo root, byte for byte (only aria-hidden and stroke:none were added on the root, as the app's own TBtools links do, so no host CSS can stroke it);
  // shown at 24px (1.5 px per unit: the grid lines fall on whole pixels). Never animate its parts: the card animates around it
  LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" style="stroke:none"><rect width="16" height="16" rx="3.6" fill="#f9e44d"/><path fill="#e9af00" d="M8 0h4v12H8zM4 4h4v4H4zM4 12h4v4H4zM12 0h.4a3.6 3.6 0 0 1 3.6 3.6V4h-4zM0 12h4v4h-.4A3.6 3.6 0 0 1 0 12.4z"/><path d="M4 0v16M8 0v16M12 0v16M0 4h16M0 8h16M0 12h16" stroke="#aa6418" stroke-width=".625"/></svg>',
  adFill=(n,o={})=>{n.className='aid'+(o.sm?' sm':'');n.replaceChildren();const top=o.top;
    if(top){const s=el('span','al');s.textContent=top;n.append(s)}
    const h=el('div','ah'),b=el('b');b.textContent='AI Dev';const lg=el('i','lg');lg.innerHTML=LOGO;h.append(lg);h.append(b,Object.assign(el('em'),{textContent:T('New','新')}),Object.assign(el('em','hv'),{textContent:T(...HV)}));n.append(h);
    const fr=el('span','fr');fr.textContent=T(...FREE);n.append(fr);
    const ul=el('ul','af');for(const row of FEAT){const li=el('li');li.textContent=T(...row);ul.append(li)}n.append(ul);
    const t=T(...DEMO),w=[...t].reduce((a,c)=>a+(/[^\x00-\x7f]/.test(c)?1:.6),0),p=el('div','ap'),ty=el('span','ty'),cu=el('i','cu');ty.textContent=t;ty.style.setProperty('--w',w+'em');ty.style.width=w+'em';ty.style.animationTimingFunction=`steps(${[...t].length},end)`;p.append(ty,cu);n.append(p);
    const wh=el('span','aw'),ph=el('span');ph.append(T(...WHERE),Object.assign(el('code'),{textContent:T(...AIPATH)}));const dl=Object.assign(el('a','dl'),{href:DL,target:'_blank',rel:'noopener'});const di=el('i');di.innerHTML=LOGO;dl.append(di,document.createTextNode(T(...DLT)));wh.append(ph,dl);n.append(wh);
    if(o.foot){const f=el('span','gf');f.textContent=T(...FOOT);n.append(f)}};
const R={p:'Gift',body:B,ms:[{id:'gemini',get n(){return mName()},see:1,ctx:64e3}],
  get n(){return T('Free trial','免费体验')},get by(){return T('TBtools plugin only','TBtools 插件专享')},
  to:TOEN,
  get add(){return T('Free trial','免费体验')},get note(){return T('Free AI drawing for every computer with the svguest TBtools plugin: no key needed.','装了 svguest 的 TBtools 插件的电脑都能免费用 AI 画图：无需密钥。')},
  get need(){return G.ended?T(...ENDED):gw(G.er||(left()===0?'device_exhausted':'bad_request'))},
  ok:()=>live(),
  st:()=>G.ended?['er',T('Ended','已结束')]:G.er?['er',T('Not available','不可用')]:left()===0?['er',T('Used up','已用完')]:G.net&&!G.q?['wa',T('Offline','未联网')]:!G.q?['wa',T('Checking…','正在检查…')]:['ok',T(`${left()} left`,`剩 ${left()} 次`)]};
const ui=()=>{const c=$('mCdGift');if(!c)return;cfgSync();const q=G.q,n=left(),gone=n===0&&!G.ended;
    c.querySelector('header b').textContent=R.n;const sm=c.querySelector('header small');sm&&(sm.textContent=R.by);
    lead.textContent=G.ended?T(...ENDED):G.er?gw(G.er):gone?gw('device_exhausted')
      :T(`Draw with AI right here in TBtools: ${Q()} free uses on this computer, no key or account needed. One use is one message you send. ${WAIT[0]} per drawing.`,`在 TBtools 里直接用 AI 画图：这台电脑有 ${Q()} 次免费机会，无需密钥或账号。你每发送一条消息算一次。每次画图${WAIT[1]}。`);
    qd.hidden=!!G.ended||!!G.er||!q;qt.textContent=q?T(`${q.left} of ${q.quota} uses left`,`剩 ${q.left} / ${q.quota} 次`):'';
    qb.style.width=q&&q.quota?Math.max(0,Math.min(100,q.left/q.quota*100))+'%':'0';bar.classList.toggle('lo',!!q&&q.left<q.quota&&q.left<=Math.max(1,q.quota*.34));
    use.textContent=T('Draw with it','用它画图');useUI();
    nt.textContent=T('A failed drawing is not counted. Your message is sent via svguest’s free service to an AI model.','失败的不计次数。你发送的内容经 svguest 的免费服务发给一个 AI 模型。');nt.hidden=!!G.ended||gone;
    ft.textContent=T(...FOOT);
    ad.hidden=!(G.ended||gone);ad.hidden||adFill(ad);
    const gh=el('div','gh');gh.append(...(G.ended?[Object.assign(el('span'),{textContent:T(...ENDED)})]:[Object.assign(el('span'),{textContent:T(`Free trial: draw with AI, ${left()==null?Q():left()} of ${Q()} uses left on this computer. ${WAIT[0]}.`,`免费体验：用 AI 画图，这台电脑剩 ${left()==null?Q():left()} / ${Q()} 次。${WAIT[1]}。`)}),btn(T('Use it','试试'),()=>pickM('Gift:gemini',1))]));
    hint.replaceChildren(gh,Object.assign(el('small','gf'),{textContent:T(...FOOT)}));hint.hidden=hintOff();
    const k=adKey();ban.hidden=!k||adSeen(k);ban.hidden||(adFill(ban.firstChild,{sm:k==='once',top:hint.hidden?k==='ended'?T(...ENDED):k==='used'?gw('device_exhausted'):'':'',foot:k!=='once'}),banX.title=T('Close','关闭'));chNote()},
  hintOff=()=>$('mHello').hidden||(!G.ended&&(!live()||who(DRAW).p==='Gift')),
  useUI=()=>{use.hidden=!live()||who(DRAW).p==='Gift';rw.hidden=use.hidden},
  setEnded=on=>{on=on?1:0;if(on===G.ended)return;G.ended=on;
    if(on){if(who(DRAW).p==='Gift'){G.resume=1;DRAW=''} // only in memory: sgDraw stays, so a restart after the top-up picks the free trial again
      G.tm=G.tm||setInterval(check,12e4)}
    else{clearInterval(G.tm);G.tm=0;if(G.resume&&!DRAW)DRAW='Gift:gemini';G.resume=0}ui()},
  setQ=j=>{if(!j||typeof j.left!=='number')return;G.q={left:j.left,quota:j.quota,used:j.used??j.quota-j.left};keep()},
  onErr=e=>{const c=e?.code;if(c==='campaign_ended')setEnded(1);else{setQ(e);G.er=c==='ip_limit'?c:''}},
  check=async()=>{if(G.checking)return;G.checking=1;let r,j;
    try{r=await fetch(GIFT_API+'/status',{headers:H(),credentials:'omit',redirect:'error'});j=await rj(r);G.net=0}catch(_){G.net=1;G.checking=0;return ui()}
    G.checking=0;
    if(r.ok&&typeof j.ended==='boolean'){G.er=j.error?.code==='ip_limit'?'ip_limit':'';j.error||setQ(j);setEnded(j.ended)}else G.net=1;ui()};
// the hint under the chat's greeting, and the AI Dev banner above the composer
$('mHello').after(hint);new MutationObserver(()=>hint.hidden=hintOff()).observe($('mHello'),{attributes:true,attributeFilter:['hidden']});
banX.textContent='×';banX.onclick=()=>{const k=adKey();k&&ls('sgGiftAd',[...new Set([...(ls('sgGiftAd')||'').split(',').filter(Boolean),k])].join(','));ban.hidden=true};ban.append(el('div'),banX);$('mComp').before(ban);
// the line under the composer is built by the app in English only: say it in Chinese too, and without naming the AI
const cn0=chNote;chNote=function(){cn0();const n=$('mNote'),p='Only what you send leaves your computer, to ',s=n.textContent;
  if(!zh()||!s.startsWith(p)||!s.includes(TOEN))return;const to=s.slice(p.length,-1).split(' and ');
  n.textContent=to.length===1?'只有你发送的内容会离开你的电脑，发往 svguest 的免费服务，再由它转交给一个 AI 模型。':`只有你发送的内容会离开你的电脑，发往${to.map(x=>x===TOEN?'svguest 的免费服务（再由它转交给一个 AI 模型）':x).join('和')}。`};
regAdd(R);ui();
use.onclick=()=>pickM('Gift:gemini',1);
const lg0=lgSet;lgSet=function(l){lg0(l);ui()};
const cs0=cfgSync;cfgSync=function(){cs0();useUI();hint.hidden=hintOff()}; // keeps Draw with it in step when the model is picked elsewhere
// SVG Chat requests for the free model. One chat turn (one ask(): every call made with the same AbortSignal) shares an X-Gift-Turn id,
// so a cut-off drawing continued, panels drawn side by side and the image-reading step cost one use in all.
// The Worker streams {"d":text} {"k":thinking} and ends with {"end":…} or {"error":…}.
const turns=new WeakMap,tid=o=>{if(!o.signal)return{id:rid(20),first:1};let t=turns.get(o.signal);t||turns.set(o.signal,t={id:rid(20),first:1});const r={...t};t.first=0;return r},
  gErr=(c,m)=>Object.assign(Error(gw(c,m)),{p:['device_exhausted','ip_limit','campaign_ended'].includes(c)?'Gift':undefined,gift:c}),
  after=(was)=>{const n=left();if(n===0&&who(DRAW).p==='Gift')noDraw();ui();if(n==null||n===was)return;
    n===0?setTimeout(()=>msg(T(`Free uses used up: SVG Chat draws with ${nameOf(drawTo())} again`,`免费次数已用完：SVG Chat 改用 ${nameOf(drawTo())} 画图`)),1500):msg(T(`Free trial: ${n} of ${Q()} uses left`,`免费体验：剩 ${n} / ${Q()} 次`))};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gift')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');if(G.ended)throw gErr('campaign_ended');
  const t=tid(o),was=left();t.first&&!o.quiet&&o.ui?.stage?.(T(...WAIT));
  let r;try{r=await fetch(GIFT_API+'/chat',{method:'POST',headers:{...H(),'X-Gift-Turn':t.id,'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,effort:o.eff}),signal:o.signal,credentials:'omit',redirect:'error'})}
  catch(e){if(e.name==='AbortError')throw e;G.net=1;ui();throw gErr('network')}
  G.net=0;
  if(!r.ok){const j=await rj(r),c=j.error?.code;onErr(j.error);after(was);throw gErr(c,j.error?.message)}
  setEnded(0);
  let out='',cut=0,u=null;
  for await(const j of sse(r)){if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');
    if(typeof j.d==='string'){out+=j.d;o.on&&o.on(out)}
    else if(typeof j.k==='string')o.quiet||o.ui.think(j.k);
    else if(j.end){cut=j.end.cut?1:0;u=j.end.usage;setQ(j.end)}
    else if(j.error){onErr(j.error);after(was);throw gErr(j.error.code,j.error.message)}}
  after(was);o.ui.use(u);return{out,cut}};
check();
})();
