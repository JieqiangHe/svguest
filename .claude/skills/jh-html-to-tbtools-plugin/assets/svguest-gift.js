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
  GT={bad_code:['This gift code is not valid. Check it and try again.','礼品码无效，请检查后重试。'],disabled:['This gift code has been turned off.','这个礼品码已停用。'],
    expired:['This gift code has expired.','这个礼品码已过期。'],exhausted:['This gift code is used up.','这个礼品码的次数已用完。'],
    device_limit:['This gift code is already in use on another computer.','这个礼品码已在另一台电脑上使用。'],
    rate_limited:['Too many requests with this gift code. Wait a minute and try again.','请求太频繁，请等一分钟再试。'],
    too_many_fails:['Too many wrong gift codes. Wait a few minutes and try again.','输错礼品码次数太多，请过几分钟再试。'],
    busy:['The gift service is busy. Try again in a moment.','礼品服务繁忙，请稍后再试。'],daily_cap:['Today\'s gift use is used up. Try again tomorrow.','今天的礼品额度已用完，请明天再试。'],
    paused:['Gift codes are paused for now.','礼品码暂时停用。'],too_large:['This message is too large for the gift model. Start a new chat or send less.','这条消息太长，礼品模型读不下。请新建对话或少发一些。'],
    bad_request:['The gift service could not read this request.','礼品服务无法读取这个请求。'],blocked:['The AI declined to answer this request.','AI 拒绝回答这个请求。'],
    unavailable:['The AI behind the gift service is not answering. Try again later. This call was not counted.','礼品服务暂时连不上 AI，请稍后再试；这次不计次数。'],
    config:['The gift service is not set up correctly. Please tell the svguest author.','礼品服务配置有误，请告诉 svguest 作者。'],
    origin:['This gift code works only in the svguest TBtools plugin.','礼品码只能在 svguest 的 TBtools 插件中使用。'],
    network:['The gift service could not be reached. Check the network and try again.','连不上礼品服务，请检查网络后重试。'],
    no_code:['Redeem a gift code under Models and keys first.','请先在“模型与密钥”里兑换礼品码。']},
  SH={bad_code:['Not valid','无效'],disabled:['Turned off','已停用'],expired:['Expired','已过期'],exhausted:['Used up','已用完'],device_limit:['On another computer','已在别处使用']},
  gw=(c,m)=>GT[c]?T(...GT[c]):m||T('The gift service failed.','礼品服务出错。'),
  gwE=(c,m)=>GT[c]?GT[c][0]:m||'The gift service failed.', // chat replies and status messages stay English, as the app's own do
  rj=async r=>{try{return await r.json()}catch(_){return{error:{code:'unavailable'}}}},
  dev=()=>{let d=ls('sgGiftDev');if(!/^[a-z0-9]{16}$/.test(d||'')){d=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('');ls('sgGiftDev',d)}return d},
  H=()=>({'X-Gift-Code':G.code,'X-Gift-Device':dev()}),
  fmtD=t=>{const d=new Date(t);return zh()?`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`:d.toLocaleDateString('en',{year:'numeric',month:'short',day:'numeric'})},
  norm=s=>{const a=String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,''),b=a.startsWith('SVG')?a.slice(3):a;return b.length===8?`SVG-${b.slice(0,4)}-${b.slice(4)}`:null};
// G.q: {left,quota,used,exp,model:{name}} as last told by the Worker; G.er: the code's problem (an error code), G.net: offline
const G={code:ls('sgGiftCode')||'',q:(()=>{try{return JSON.parse(ls('sgGiftQ')||'null')}catch(_){return null}})(),er:'',net:0,busy:0,msg:''},
  keep=()=>{ls('sgGiftCode',G.code);ls('sgGiftQ',G.q?JSON.stringify(G.q):'')},
  left=()=>G.q?G.q.left:null,
  live=()=>!!G.code&&!G.er&&left()!==0,
  mName=()=>G.q?.model?.name||'Gemini 3.8 Flash';
const B=el('div','gb'),lead=el('p'),kf=el('div','kf'),inp=el('input'),go=el('button','pri'),qd=el('div','gq'),qc=el('b'),qt=el('span'),qb=el('i'),bar=el('div','gbar'),
  ew=el('p','ew'),nt=el('p','gn'),rw=el('div','gr'),use=el('button','lk'),rm=el('button','lk'),ad=el('div','gad'),
  hint=el('p'),ban=el('div'),banX=el('button','ib');
inp.id='mGiftIn';go.id='mGiftGo';use.id='mGiftUse';rm.id='mGiftX';ad.id='mGiftAdC';hint.id='mGiftH';ban.id='mGiftAd';
Object.assign(inp,{placeholder:'SVG-XXXX-XXXX',spellcheck:false,autocomplete:'off',maxLength:20});
bar.append(qb);qd.append(qc,qt,bar);kf.append(inp,go);rw.append(use,rm);B.append(lead,kf,qd,ew,rw,nt,ad);
document.head.append(Object.assign(el('style'),{textContent:
  // Chinese glyphs that the interface's "UI SC" subset lacks; written by scripts/svguest-gift-font.py
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,d09GMk9UVE8AABXAAA8AAAAAGqgAABVrAAIBBgAAAAAAAAAAAAAAAAAAAAAAAAAAGYFSDapGGyAcQgZgDggAghwBNgIkA0AEBgWBAAcgFyQYQBuhGVFU7AIQXxTYxsjRk8fS1LRuqSZf7B3+szgRjfqyUZSWokdkPuzaEZLMwvPv2O++bbhKtS8iNCKHSKM0aLRAiWRGdMP7YZopivl38/0ap7ezQoW+qaISMQESh8QRi1XEZOvYsf2fn+fn9huwe0c9MS5/1ixoqdQmR5WBSpSVSNYHix6MMiIxEhsQDPxRde7+edPfz5m1/JZPkTyJVC/gbfmEAGUOsAnDDsJQMgwFpB/Jbff/v1c1Y9rYNrZ94FDEI/JyX9b7GYvyLWPhGBssFqvomrS8JxgtValAUGqx2LptV0wMDEp2v00xtm7BTCotthAJOg4CFOP0yFC4rzq/Z7BekmGWJ+kJsbyOaIDBc0QdDL4jHWVZIUjUl8ZOvQZ9MNn6tHKq1XslthAiPdvGbmJo1AZwr3M9fcWEk0jGItHuHI+ymsVMkislCxvyYRTClV0vY+nYnSOautvbgoYdyAQ172oBn8gn1Zko+WQpV+rxKfpcYYB2Jvrvit6dmGS8cRI1kyntJCuf3TdPmSzBak2mw7VRACaWk5iNiQXXGy0pEikR0rY3t1fi+nyBW2MGhS8O7bD7wI6/sM0fDxY4ncLEC4axdZw6yPW2+0DiCYbYDU8MTVa1Hh8uBHoE2ja/bYI9Q83wsCPFZlUWVOmx3Pn2sVI7sAaOy63s7RLsVtvH2qfMHO00zvP9LLcFb/xO+/+tWmK6GvlT1Jao//PNxdu2XucuFdCWQDJLG4OV4J8YP12isLdeJF10uTtvHJb8KSulz/QS9E7oJxssMTgnE2SVstekknwrHyv3lesMk40cjS4b15gsF2aMoo8yaJY32nn0gzH5Y3MEPkf7GVuDRIZN/qiYZKKxDI8vRI1ka1DFQHsAzyQx0bPnaIyzD8w4oBIiH8DguByW+v4WWXqKpRywBfWB34fO/za85b04XFQFicHkLBjI+NmXV9sEy/iHy35INCfH/pYJ0MmfMr7WRVxL5oMVwxVaAivoamxn22shESN4KwnbMquiFZZYMNFWRbgtElJYtXCxGc2tVZtV9g2LyJKThm/vW7wJ/HQzJeSNIOeOz0XHAxT0D4P8wheNnxZg0YCvYq1baIrIg2gdosVn4jhScnRpkgsBgU/gR9nzpfv8MqG221jK5bEDIRWAJzCfzeMPqJ+jBY7zsBlZif0LDBTg+xkYRB+GC6shvMKrmRXOxECcgirfvblqjqqimSNgBwSkYA5SNANPNAOFqm2nX5M4ffpjXAhmVmDUdQgToFibyPhx3CseJ/PhZyZ6gjMtwOh0ZQxuV23nFdJDo7qPmpFNJ2yUQwB+TDwObDmq7AL9um7TNz1FtLCx3/Y9aYajATpVV879pjiibrsptXxVHIePYSn3pAKU8AHGuzFF7Cbz4CDDHyGK5qJHoiVuSdgiSKSHQVXPepDQA/FysMBm4nNoWy93GtX1mD7uiaMPmqZk78lQ/LKXVlcs+ak4WJNcsSryR10zxMKPGELP3yoOJjufPKBYH+GekBQLMIc8OLKw4h9Pqo4P3XDOVZwj+xsEaNDuZ9hH0Ws7rsAYVCo1xRGKFABWgPURKAa/CVAEL3SM2uzfuFWp+djCmj7u6EJzG6dsqycZmgVoX139w5+cYaloWl+1pohrk6kAGjjPnOic1XMwKg5VF/lSbg4g5WkvkvzRehAGMJzO3Zu9Q6n53CKYBrtjiDVM2V6fJQUaoKRmw9K/GNVSybSmalUAhz1UnADTWSj/6uls3AcCXHymXwQj8k3LXmaI/6imQPlazNyiBBStFoiCTRjfvc29xQMoxdMh6DQKFJ9wFxaHModpNsHtUrBAitG9WkjTAPe8RF/TM72xlkAVBG2ANp2Jtwbqt+i3oMd0d2le5YIlZjS/1m2x2jYsILJ2Gj65ZiPD+BE1JVeM2rtU94/YyDpikelJWVgfDEU93xmFOALCfJJQFKwTawEv5G3MYhUu2a54ljYt9eTtPPTvGneOucELW0JRC96hodPRAKUzYzWyWiDZyRu7dw8cAtw5hNR0cNGxeWdX5h9jGYeVqb+H5gF8BOqnupr+QD9p3sJ2ioAumMuwnEarhXZl83ULabqoUXY48fxdFU+NgLAPF65dujpuaZnyapZL+Mf0UkeTP+P/ugBn56TpNAf+oQLs0L5kGUhCkSz0295ILGTl2KloJdIKUIeuom/A/7IX4mhwhYeD+kOwmIMWmEm6zvIZJguoFFuYqHh9v14Q95mbU/EJtjGI4wUYR4XnPJHN4wY0C6fZog22TNcUqCTBosZ/QAo2V8HmE1wM41EJy1QbdqkRntOT+lAJUwMgRs7HvBEdyO5z1nTSCMage6M7MQ/+QWOaVRvbQMwRoFH7MRMtKAblKT6oRDNlR0lgLi0A2MKkLgiFxAncgmIuEibm9vNcCs1ozsTDg/U0mCj+OcT/BCvRhJZUb1o1p7T2NwthXbeYpGwM3D1tpVR8f4tLShh5NK4BM2gYvPo4EFWgGRV6YQvz4+mYPwL5XDosSiEReof0XnCEoeGrv9COk2yCST7drUjESd5obu/TVRL9j5Frt6oj5e0ANeiIt3AfeW0OibAVE6kA9dq3LNl/tPecRa2CSHq5gw9PHO/aD3EYx2JmOFg4q9pYmXBzqcOpVCoL4vJX/CI9dj5U8OWBJyV1RzMcATMKI08MOAKmMEJEC91N1qXWSJR2T16jMWuyEQOSIfj8t9n3Mfk/dAB/v407lYjAPnh8YS127H5stFwtfFJVpKSrvY4kdaXcynbIoZCHiWt0+SQlm+YbaEsBT7o4EMBP+wl7Zz/wvz1FL4xnFb65qLdRBfqyA+9EJN/zSQOQdnY0UpvcsrTjMFZ8LbN9bZccesCcnV9e0ovY4Gks+2KwJ7UIUIMpzO8X8RXP7Bcn8AbuPkwFKOX/sXjovzMbL4q+DGfRhcdYJFfuh+C6fabfDoTRmOYp2bszXpYEFlUVyz7AFfu6taaw4lUHcPChb9sNvcs6VAGs7wS24YK5f1kJwIUAw4XIyuSuJWMHsOyb/p0pHXLdrG1sSxw+Iy3x1XrszI3k9kA7/Ar3GHhMQw8SBu4MV8MZWE1FO6hmaEetynDagunK9orwf6QIn4JMAz5AJ3zNx9N2NDxkcXp2Wmow4aO21IL/klLuQEZLJSDk0q0feyY+O5BE41qm5O4pUAILnKtKf5rbOz3j6L3f8L7Bpt3xYy9z8Cb/hC5kKzzL3l18XA6XH+uEnDj6j88ZDQtI0spTbCkfLjWgG6k5YY6bE+BHdqy0pexpEKAe/mG8Gk+K1QTAAPbzatxPxZfwG9N9OjJQr47cqR2hAn+sbVOE4lOOklBfpeYbcBEtV5+Lx1y7ACZi2QtUBoaPCA43zPqd/tkIBpq3vm/bFfM3Kx/koH6ZHId1XozXe4v1BJQGn/J6HyqOwDQmGg2dqtevnuRyqmsHG1YfhvIOQC4vfp0NDh21HfrMAtlrcH2Ers8CXlMYPXQ8lAxkAA716SXk8PVn5PrclWW5jKB1FBiQ7NVMoVFbPJfj+UXrFpIphwCNTRFX3gSmPkSANO1hho8oeuRjEnridGVHafhvkj/9ZTOSHQAi59txGdlW0ZprRrfWTq713qVewCSdZfivfweTwc+oWX/NqK2h4qmFBp6Es8Uk4m/Ak3CuuJo09tk7q0YBAmEGWxfs0thD22uRBYxcu9G5LbkVhksM55aVtQLWexrLvhDsTSsDvpG/YeiBKeBBAwYYvqdoUY6xXjhe2VGuzaek7p8CaFwzmMohC6tJfuXC5Wa0oNZjcdnWLyTTdhpe9lrpEH6k1asWjNp26ofXGfpSTCM7T1limrGfoga+YmiKIRRMgyiaegZ/ITrYBPPS/mfrDq/6n325heIejGIQ4oohJNKgZNuyI9hWTxf4Xe0w01VSywPrjyu7wLSux/R9dzvy3jpoSIZlf03YVlb8+HWhf902U1L5+iquraJi3NbuZ1OyNgkDzAj8e4QE4AdohgIaBzaLfMxF1062l6pVEN2HuT+9srgtxJ9sfIJtPjjil6T8jYHSuLbl+zBcWAPZkHunF2YiHal5ROBztZ3sfHR+mmZp7wks/3p4S2qHnFvXs81RwUmrlj7YgJ3qLW6JD4DO8DoLXaMYrLfPbeKIkp1Pr865c15Ab7QLgPF0DUpi0SwhcBMjZDyV/MPCifgpEMMHeBI9kpy0MVT2AZa3b8Z3m8LgGAgvUAAVPdeSpDQGwEJMYvAdSvE7AgsN/oPvplJcztMYnsVU3ahB2ADfoRktrFq4bE5hrcdit25YRGRtNIxctVIh/HCrV80Y+VlcBmepwPP4b8wLDXGeJcaGbhVVkuAmD41G+1OQyV3pVdqfNb5meAu106fxnO56BYO/s3/d5cdwFcaz+6dbcsVi44/9yeNpIGahJcPB4dxsHpT5AZ4RsQEzGFjwILSgokb7gK20j5wZFLG9ri1kpPjJRElrgdtkf7LPS6SG9mFlhxdlq0kAHs+wgagPUgEiCDDSZdjimzQnYdH2emQhU1N9SkSKwxA5khbx0KnRg1jJ4XmpYhxAxDPsI62HyJAnBILW5CH7cg2SLrqT1X4ZizqjSHu9jsjFCR+yqOQhqe6bOmrBfylx3/HzN/qrgF4wm2nqA3bk0yyfv1ZfzjaciyK1zKY1i70Zmxhcn3agc12AjBZXL1q2+CV+i/U/ncVUwcnAUK+Z0PBjLR4hbYRJFGo1gQUKzXINty9+WR75dH4eSczaJwS4INsgmm4D2Vkg10DvwfgVN+ILcJpgEIyogM5rMkJa+VGDP7v6wazmr2e+7n1xVgswGX5OWtUkQ7AA39zU7xPNiTdZaEOoz2LHtjaCS6g6z3Acx6/SDRW+ia9J5ZJ1gfVxgFskMm1mttQsr6E3smbQkOfN2iXg0TyTgS/Jicn5E1jiHFmptoBSmMG2eCXNjV68pe6bS8jCNk7kZOXLABaNf45bs9rSZlkqeqWBgx2xpjzcXTKYvmWLd5sY4OhnZF3cWb7SmuxVt8DAPf0QadrrUdwqiDG4mB3Jjxc5GnAGafpqJmwi5e6y+eTgoSVSwkdySCrasRM5yRxfAZxJWr+b+ZY8dWaHDi+RUn5KQGACKXWWCRduGDrnHz2KRp0Bw9PjS57pY7JwXJZn9nh+UHuZpaIkcMZc/6YtmOoC+0s1UU0hOK7o4eddV678Nd7vJKYbLcRxW1Yh2avZMrNw3UI65hCYNT4XEjRJb+AelsnGS6XqwrULqYSDVzbHSVTXBzUac8Qm6eFp8MDboeNdx5nlCuWVtENaIpwJf5YOFbFnvOMy3Da1CFzKRZ84dry8pxtexR5ccXydYyetUfzj++acDip/GxncWzj7dQguqoGwh7QfYSJUBHCBeJKJ+i9uoDOJ41xKkeMuBqFwBkPpLq0Rywr1Osx+96VIK9nZSGHCf9om9mjJNv9ksOUelnF56mBEBZx+p8d20LaeoA/5gLKsbUW4JT0wS8G9MHfhXxd8R5euTXMC2loi/+PhAXZrrzI8TdGmFJMtcIayozw6nxKvgF0nbNvx10UOwehBknoiIs4lPoBvbuvY2LYBsHcYNdE76xqpeDH9FEs5akioEgAWQ9iwGAxeFMb3gNWxv86qOhWuWeixEqdukwu8UruGwQgqcYQEQDLDfTwL9lHdiY2GO8sGg6OR1jvYmguq/oQigNXiXRYM2XS1dWCw4pCqEUXKzSHHq2/HshfvoPTbuWCW0bRLCfGsPuaY88vEC3Jo7ddPkD0nHSlbBiB/QOwJQpvJh2kbE+tTIHrjA9be6ReROxhUtq8ObRR1PT8FD8U1fn+n43uaml0W6qg6X0q6WBBgldaR4TmK40pRhb7WyrYScb5HBvAH2gVxYD0BztEt4gl2Na42b19iyzls8xX7xPKaHLO0hkwU+/hNSBB7H9a1lEfu6r7E2tPONbxDCuQo8dCLo0j6AGRy0Un3O9OowxSK/0herdkUlo1onSCDPz+lVzDmU/QEU/fWLjXA0br+8BywTAVvOWS+QB2X+Ysy14Bv8HuStollm2hrAUM5ORC00/hthmU4GcooZJmDEstQSRbwDoYZmCJGDzxCk/GjV+gjUMYN81DMhAwqXq41rHOMd4mM2shLMTefOBkrRZoBqgb1FNJ2lI6SGmCUuJ4FgiWuoMtWkYyEqovEvIfntoZ5FPNbJbc+vFnSJwUpYANMG8RpFCaC4QCeCjqGE6kAgdq3bJ3TYrfIyE2CGHcJ0WORXLAEUDqkLyXtx5kYGQNUdUKdiktp8rocW9cV8FkXxwoYZv9Yxa4T0UhJFkzmTGZR6Ymgk4fll3kFQwVOAUUQKmxVv1JUoBDETw3oU0EBhs/REBQU03Epgymit5Ew0ZTBwWl4kMAsg7+ExoLiT19ZJoYOXkIH08d4EBW0Kl7KqvFJkT4Z189VFwslN4dKvlSQ2x74Qp4tOrDniXsD8+H8LSzlwtj+kDLAOr6ViWufcidoFB2e89UYRdXHmBSdBAh/Loao/oaT0lXLCDkLxHjIYuqtbI4qAMaj/fNv0F3XAbBHb1J4hE5yIYDO4h8M+wZiyI+ufQH3KX6IKxnYgx/aU9zIp7DXae8T+oyuirQUMikXs/XIltxQre/nnsx0vuUmln7QnDDErjXl28N93wXhghoIHUhrFyF5xZcpeH2wdYpHdFtdnu8VWk7mC7EigCPZlkmmU9nJFxWCRInUaCyfamK1axKbP4ZPe8p+Y/4vGMfYoVoqpZ1OgZ21aTkGyO17vCK7m2w7c7nOXGeuM9d53bkBHz6u9afSPZICUO96iyUSzkgbeZS4SsCeKpNJwKmYVx1FmtXt5kd0VXdO3/h+kQTzJp06KPRR2qX3KWpxCtEITmxF9CH1RVBIqRE52Rw91dB5OTbiuKkv+gUrDv8r+nTMrw6dd9AK+Yqt4UXh7Sl4xreZaxKQNSV3dp5pfpw0S/pW12s5a7u3qZtoUHcqtcImPhu/f0t/nJ506nYil7j31IST3dHW4H51+l61vF5+rOuPdvu23cyN6n+qRjZAxd3VW1Y/sTWqPGTzv2sKM52yStsJCHCnErLzwZ2mSaNm/yvX1/9BgsJvyv0B2XHVHH8w3kjNHFy/+AWzi959ESv7GRDp3k4fylmif8Bryxb1Ueeaca1GbWT5ybR2Q83OLws6DOr31IBeTw0bF6TfKUO4RhfGsDhxMdPF8jSjaFZU0rxuqoKFDZYvxaSjt9sdh6hU4aw9tzx8MsIP0aSgL0PeNgFJDbq0TbNiUp3M37+JMTR2UecH9nQoY1APlZ8Mc0gyXlZmjOg3JqiDwgY8mHc3SD91thm1Z93opccAAAAA) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4ECA,U+5144,U+5151,U+51E0,U+51ED,U+5269,U+544A,U+5929,U+5E08,U+5E74,U+5F88,U+5FD9,U+611F,U+65E5,U+6682,U+6708,U+671F,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+8BC9,U+8BEF,U+8D26,U+949F,U+9519,U+989D}/* giftfont:end */'+
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
const adFill=(n,top)=>{n.replaceChildren();const b=el('b');top&&n.append(el('span','gu',T(`Your gift code ${G.code} is used up. Thanks for trying it!`,`礼品码 ${G.code} 的次数已用完，感谢试用！`)));b.append(T('New in TBtools: ','TBtools 新功能：'),Object.assign(el('em'),{textContent:'AI'}),' Dev');
  n.append(b,el('span',0,T('Describe the tool you need and AI Dev builds it into a TBtools plugin with you. Open it from TBtools’ Plugin menu › AI Dev.','说出你想要的工具，AI Dev 和你一起把它做成 TBtools 插件。在 TBtools 的 Plugin 菜单 › AI Dev 打开。')),
    el('small',0,T('svguest’s gift codes are supported by CJ (TBtools). Thank you!','svguest 礼品码由 CJ 师兄（TBtools）支持，感谢！')))};
const R={p:'Gift',body:B,ms:[{id:'gemini',get n(){return mName()},see:1,ctx:64e3}],
  get n(){return T('Gift code','礼品码')},get by(){return T('TBtools plugin only','TBtools 插件专享')},
  to:'svguest’s gift service (Google Gemini)',add:'Redeem a code',note:'Have a gift code? Redeem it to draw with Gemini, no key needed.',
  get need(){return gwE(G.code?G.er||(left()===0?'exhausted':'no_code'):'no_code')},
  ok:()=>live(),
  st:()=>!G.code?['',T('No code','未兑换')]:G.busy?['wa',T('Checking…','正在检查…')]:G.er?['er',T(...(SH[G.er]||['Not available','不可用']))]:left()===0?['er',T('Used up','已用完')]:G.net?['wa',T('Offline','未联网')]:['ok',left()==null?T('Ready','可用'):T(`${left()} left`,`剩 ${left()} 次`)]};
const ui=()=>{const c=$('mCdGift');if(!c)return;cfgSync();const q=G.q,has=!!G.code,n=left(),dead=has&&(!!G.er&&G.er!=='rate_limited'&&G.er!=='busy'||n===0);
    c.querySelector('header b').textContent=R.n;const sm=c.querySelector('header small');sm&&(sm.textContent=R.by);
    lead.textContent=has&&!dead?T(`SVG Chat can draw with ${mName()} on this code: no key or account needed.`,`凭这个礼品码，SVG Chat 可以用 ${mName()} 画图，无需密钥或账号。`)
      :T(`Redeem a gift code to draw with ${mName()} here in TBtools: no key or account needed. Gift codes work only in the svguest TBtools plugin.`,`兑换礼品码后，就能在 TBtools 里用 ${mName()} 画图，无需密钥或账号。礼品码只能在 svguest 的 TBtools 插件中使用。`);
    kf.hidden=has&&!dead;go.textContent=G.busy?T('Redeeming…','兑换中…'):T('Redeem','兑换');go.disabled=!!G.busy;inp.setAttribute('aria-label',T('Gift code','礼品码'));
    qd.hidden=!has;qc.textContent=G.code;
    qt.textContent=!q?T('Checking…','正在检查…'):T(`${q.left} of ${q.quota} calls left`,`剩 ${q.left} / ${q.quota} 次`)+(q.exp?T(` · until ${fmtD(q.exp)}`,` · ${fmtD(q.exp)}前有效`):'');
    qb.style.width=q&&q.quota?Math.max(0,Math.min(100,q.left/q.quota*100))+'%':'0';bar.classList.toggle('lo',!!q&&q.left<q.quota&&q.left<=Math.max(1,q.quota*.2));
    ew.textContent=G.msg||(has&&G.er?gw(G.er):'');ew.hidden=!ew.textContent;
    use.textContent=T('Draw with it','用它画图');rm.textContent=T('Remove the code','移除礼品码');rm.hidden=!has;useUI();
    nt.textContent=T('Each request to the AI uses one call; a figure usually takes one, a long one up to three. What you send goes through svguest’s gift service to Google Gemini.','每次请求 AI 计一次；一张图通常一次，很长的图最多三次。你发送的内容经 svguest 礼品服务发给 Google Gemini。');
    ad.hidden=!(has&&n===0);ad.hidden||adFill(ad);
    hint.replaceChildren(el('span',0,T(`Have a gift code? Draw with ${mName()} in TBtools, no key needed.`,`有礼品码？在 TBtools 里用 ${mName()} 画图，无需密钥。`)),btn(T('Redeem','兑换'),()=>openConn('Gift',{v:'Gift:gemini'})));
    hint.hidden=has||$('mHello').hidden;
    ban.hidden=!(has&&n===0&&ls('sgGiftAd')!==G.code);ban.hidden||(adFill(ban.firstChild,1),banX.title=T('Close','关闭'))},
  useUI=()=>{use.hidden=!G.code||!live()||who(DRAW).p==='Gift';rw.hidden=use.hidden&&rm.hidden},
  setQ=(j,code)=>{if(!j)return;if(typeof j.left==='number')G.q={left:j.left,quota:j.quota,used:j.used??j.quota-j.left,exp:j.exp??G.q?.exp??null,model:j.model||G.q?.model};code&&(G.er=code);keep()},
  check=async()=>{if(!G.code)return ui();G.busy=1;ui();let r,j;
    try{r=await fetch(GIFT_API+'/quota',{headers:H(),credentials:'omit',redirect:'error'});j=await rj(r);G.net=0}catch(_){G.net=1;G.busy=0;return ui()}
    G.busy=0;if(r.ok){G.er='';setQ(j)}else{const c=j.error?.code;setQ(j.error,['bad_code','disabled','expired','exhausted','device_limit'].includes(c)?c:'')}ui()},
  redeem=async()=>{const c=norm(inp.value);G.msg='';if(!c){G.msg=gw('bad_code');return ui()}
    G.busy=1;ui();let r,j;try{r=await fetch(GIFT_API+'/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:c,device:dev()}),credentials:'omit',redirect:'error'});j=await rj(r)}
    catch(_){G.busy=0;G.msg=gw('network');return ui()}G.busy=0;
    if(!r.ok){G.msg=gw(j.error?.code,j.error?.message);return ui()}
    G.code=j.code||c;G.er='';G.net=0;G.q=null;setQ(j);inp.value='';const v='Gift:gemini',p=PEND;
    if(!p&&who(DRAW).p!=='Gift'){DRAW=v;ls('sgDraw',v)}ui();
    p||msg(`Gift code redeemed: ${j.left} calls. SVG Chat draws with ${mName()}.`)};
// the hint under the chat's greeting, and the used-up banner above the composer
$('mHello').after(hint);new MutationObserver(()=>hint.hidden=!!G.code||$('mHello').hidden).observe($('mHello'),{attributes:true,attributeFilter:['hidden']});
banX.textContent='×';banX.onclick=()=>{ls('sgGiftAd',G.code);ban.hidden=true};ban.append(el('div','gad'),banX);$('mComp').before(ban);
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
const gErr=(c,m,p)=>Object.assign(Error(gwE(c,m)),{p:p||['bad_code','disabled','expired','exhausted','device_limit','no_code'].includes(c)?'Gift':undefined,gift:c}),
  after=()=>{const n=left();if(n===0&&who(DRAW).p==='Gift'){DRAW='';try{localStorage.removeItem('sgDraw')}catch(_){}}ui();
    n===0?setTimeout(()=>msg(`Gift code used up: SVG Chat draws with ${nameOf(drawTo())} again`),1500):n!=null&&n<=3&&msg(`Gift code: ${n} call${n>1?'s':''} left`)};
const call0=call;call=async function(to,msgs,o){if(to.p!=='Gift')return call0(to,msgs,o);
  if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');if(!G.code)throw gErr('no_code');
  let r;try{r=await fetch(GIFT_API+'/chat',{method:'POST',headers:{...H(),'Content-Type':'application/json'},body:JSON.stringify({messages:msgs,effort:o.eff}),signal:o.signal,credentials:'omit',redirect:'error'})}
  catch(e){if(e.name==='AbortError')throw e;G.net=1;ui();throw gErr('network')}
  G.net=0;
  if(!r.ok){const j=await rj(r),c=j.error?.code;setQ(j.error,['bad_code','disabled','expired','exhausted','device_limit'].includes(c)?c:'');after();throw gErr(c,j.error?.message)}
  let out='',cut=0,u=null;
  for await(const j of sse(r)){if(o.signal?.aborted)throw new DOMException('Stopped','AbortError');
    if(typeof j.d==='string'){out+=j.d;o.on&&o.on(out)}
    else if(typeof j.k==='string')o.quiet||o.ui.think(j.k);
    else if(j.end){cut=j.end.cut?1:0;u=j.end.usage;setQ(j.end)}
    else if(j.error){setQ(j.error);after();throw gErr(j.error.code,j.error.message)}}
  after();o.ui.use(u);return{out,cut}};
check();
})();
