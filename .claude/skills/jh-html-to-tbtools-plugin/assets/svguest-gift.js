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
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,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) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4ECA,U+4F17,U+516C,U+5269,U+544A,U+5730,U+5929,U+5BB6,U+5F88,U+5FD9,U+6682,U+670B,U+6C38,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+8BC9,U+8BEF,U+8D26,U+8FCE,U+949F,U+9519}/* giftfont:end */'+
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
  '.aid .aw{color:var(--t3);font-size:10.5px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;column-gap:8px;row-gap:6px}.aid .aw>span:first-child{min-width:12em}.aid .aw code{font:600 10.5px ui-monospace,SFMono-Regular,Menlo,Consolas,"UI SC",monospace;color:var(--fg)}.aid a.dl,#mCdGift .aid a.dl,#mGiftAd .aid a.dl{margin-left:auto;color:#8a5a1c;font-size:10.5px;font-weight:400;line-height:1.4;text-decoration:none!important;white-space:nowrap;background:none;border:0;box-shadow:none;padding:0;height:auto}.aid a.dl::after{content:" ↗"}.aid a.dl:hover,#mCdGift .aid a.dl:hover,#mGiftAd .aid a.dl:hover{text-decoration:underline!important}.aid a.dl:focus-visible{outline:2px solid #8a5a1c99;outline-offset:2px;border-radius:2px}[data-theme=dark] #mCdGift .aid a.dl,[data-theme=dark] #mGiftAd .aid a.dl,[data-theme=dark] .aid a.dl{color:#f3d77a}[data-theme=dark] .aid a.dl:focus-visible,[data-theme=dark] #mCdGift .aid a.dl:focus-visible,[data-theme=dark] #mGiftAd .aid a.dl:focus-visible{outline-color:#f3d77a99}.aid.sm{padding:7px 10px 7px;gap:3px}.aid.sm .ap{display:none}.aid.sm ul.af li:nth-child(3){display:none}'+
  '@media (prefers-reduced-motion:no-preference){.aid::before{animation:aidsh 6s ease-in-out infinite}.aid::after,.aid .ah b{animation:aidbar 7s linear infinite}.aid .ah i.lg{animation:aidglow 7s ease-in-out infinite}.aid .cu{animation:aidbl 1s steps(1) infinite}.aid .ty{animation:aidty 7s linear infinite}}'+
  '@keyframes aidsh{0%,45%{background-position:160% 0}100%{background-position:-60% 0}}@keyframes aidbar{to{background-position:200% 0}}@keyframes aidglow{0%,100%{box-shadow:0 0 0 0 #e9af0000}50%{box-shadow:0 0 8px 1px #e9af0066}}@keyframes aidbl{50%{opacity:0}}@keyframes aidty{0%{width:0}42%,86%{width:var(--w)}100%{width:0}}'+
  '#mGiftAd{position:relative;margin:0 8px 6px}#mGiftAd .aid{padding-right:26px}#mGiftAd>.ib{position:absolute;z-index:1;top:4px;right:4px;width:20px;height:20px;min-width:0;padding:0;border:0;background:none;color:var(--t3);font-size:14px;line-height:20px}'+
  '#mGiftH{display:flex;flex-direction:column;gap:3px;margin:0 10px 8px;padding:7px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;color:var(--h4)}#mGiftH .gh{display:flex;align-items:center;gap:8px}#mGiftH .gh span{flex:1}#mGiftH button{height:22px;font-size:11px}'}));
// the AI Dev promo (TBtools' plugin builder); full when the free uses are gone or the campaign is over, compact once after the first use
// Path in TBtools (Lorena: do not mention the Linux/Others nest). Change only WHERE / AIPATH.
const WHERE=['Open it in TBtools: ','在 TBtools 里打开：'],AIPATH=['Plugin › AI Dev','Plugin › AI Dev'],
  // where to get TBtools: a plain text link (brown, ↗, underline on hover) opened the same way as the app's own links (target=_blank)
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
    const wh=el('span','aw'),ph=el('span');ph.append(T(...WHERE),Object.assign(el('code'),{textContent:T(...AIPATH)}));const dl=Object.assign(el('a','dl'),{href:DL,target:'_blank',rel:'noopener',textContent:T(...DLT)});wh.append(ph,dl);n.append(wh);
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
