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
  '/* giftfont:start */@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,d09GMk9UVE8AABWsAA8AAAAAGowAABVYAAIBBgAAAAAAAAAAAAAAAAAAAAAAAAAAGYFSDapCGyAcQgZgDggAggwBNgIkAzwEBgWBAAcgFyQYPBuFGVGUDd5igK8KbCLDh66XYRapr7VP5YxeQ3wYcu23w/Gj2xiTYo+FW7tDusaGUYyLtqN3s5/djaKeIIWUBrO0J66BikJPxL/kibhwCsLJLqTMxkYsfh9n2vIbQTZfIp3HyMfYsIFioJDthIvIv5Wr+RY/U5acZMYpqUTsACI4PbQvwCRt3v7p/OtsWLi/Y8kStjNTTGqWtB6xpicmPUx8U5sYxQLvP/gB5+wnNMks09zP4DApDPOJoW5FvMWnnan2jN1cX/pf+P/n11ydaBNv4m0hL9WV8vf+7N1tnnZtYlEcldBoNEp1D4XGVfBaCCGTiURoLLKL2KlAfgABAAdly1HAjB0/dS5IuWl1Pyi9uqMPlFGrPSCtWlVBOnVtFRQMAMRiukUhkmO0QrKZDkxsdkKN0aWCjPZo9KPAYe6pdJaXr/3HhI1YXRuoqudfFriUkMSH8ALwgI0BFCZgT+v02traHLW6Zs6YxBOZgOlRjar76r4jusq6gOoirvtJ3UWdknXk7PazGZ920MeaaFGG1r9chwsADacL/f+QEf2ti/jsYV34/7NmYBFiDJUNe2YfurAvcuXWNBuFKIdJbH7QI3+JaJIHPpxRaamP4VqSAV0uD/wQJHVhuHgjdBFNaVK1kuQFBokFamlgBv0c5kwknik2F2t1UntH7QH36TUABBH+6lJMukS+NG5O2XJvFBtD94z5dWxtxk8zP1r0ff8Hg+e6jGsfYf9pZs8bf57tgppLZq5bd92XQpoABsu2IhAIQaqvqN+fqBsb8AWEIPup0fTl35lUIzYPJzk9NPg8Ya7KuV7kXnuB6CLvsHd4YvbmSyPmCp/eNi9/fjnNLZGPixUZAfr+RTsoEVoBtv+NjlN+fm81tQFwieRbsrCovKZwb95GF1n1AQpGEbD450/Fxz7C1Bsbk1WJzzvv/XbgcKksWtmI8M60F1EC23vw3IUkgfYnwOCedxCLTtC0jtrL8if9Kz6dlqvEINIxEMmpuEiKRAiPxex8cm9d4K3gu+oxXuhCcEIkiK792hv8eImozF8aHqtn3VEKXu4Z3JfDd/dz8igvUJzRTZ/cSMLUzYg7sHVCyGiUV+BSRJLHk4wDeF1X+alMbyN6WE15NgVoU+S2ys1KW1eVtk0/86L6cPLtQuMB7sAWWWYX+Z/PtbDA8sOjDbCfIMCC3bhSPvPRiiYEj9gB0cEidIQfXX5eV2LYOR+Ky1QGAibDbzAZ54AVzgHWZTAYt1XRDV3FaDXp6PSxJEbrVlsnObihMBwLUXNadaaKl3bJ/nt4t7ovl5/n4aimnn9RdyznfmS6+AQ9lTwPum+YJx+3FYOj0KQt5vGJux/uu7MSbEcQPQIPCi7jg4YtxVz/3V8U/SQw9I4kRkfHAWaZgfkRy9GG8zG0UJDRCc6HlGsa/PpB3e/gBH2cAhbBknkZfnMMP4oKKFjqHOlxjFaZe1y8UdaBFgrMpldlHTEekU+P/v/0liqUDi70rMx4gTFYgIt/GCyctCaVVmPXj8MGFs4gUr4teFdODE6LcNcsS35n6CTrqv1syCstRd38sUNjdH/I6IZy47nuFuhn5T6qPK5x22WsPeyQxlW1txm2OAhHy1iNoI2wQDsH1y786diZx/mlYiY4x536tjX68TLR+kBDaKyWsYUp+HtTO5vGtwxw2niv/BwHP/xoGfFD+p1D3aPwVonnQ5D2J6CXU2C3rbKuC3AVdqFoNcRF7WGxpq+JcoQ5uDXsfvQeSVlDXBidhye58NuogJMXlR6WDCfLrDr5z6bMiyG070cX8J3ye5edSB71ANNvhoHPhUcB+FMvyHAv4Dd8cuyj2EWFQlMsEaxjnwn8DJXREwHWd3BYXx9VLevwUn4G3Ae2dzV1GAItvtLmXhX/i9dJE+Ol+Nej0cJiC2VhwQ+S1jb3juiRcQOz8p/ZQK4uJmWOO+OtKQCtyPJ2Dv+l73ozmMHlOJ7X8BJoYSKNFaWSUAZU4cXCs4/22NYyrzgH6a/hQgF/24q5TNsKt0NwE+OkbfPLN+wU4B3G5B3/IFZlLswbvM/3feN6JIpVizoIjuUBkvUd/7yjhUNbU33OVWM3ceUrg+KFVLzZbwypapdTYdmCpLGqMr8x0Nfkq0kN9FbhfaUEGaZgczlAJfCtPYpMjISeUgjJ4P1y5+BHqtDOt0CPnwA6/nVvYdKf7ibmk/23cmD5jn3AnDr96Eult5AJS4VDDNPvEaZDyb9wE2yrwYYPqHy7LbReAHSWLZFlpkDWR1AIPRS/PVxuEAyDjj/8PxH0jkL0byxUN6pAeMGxecOSRHdFFEVQc4DZIW7eY58ghpeCxbwXZsDEkeCWP+AH8pD1B+l7dZW02ctvyESB4GBdwM8iEHsQRLkDRJmWPUd2X0gVGAvAQY+Z0kHJLstCqPxdKVPDx+2WTElTALqyzn1QEG0ig8IoBKM5fUDQbKRwYPP3uy9NGmsQKcH3gBsOW4WW9AFOclIs0u1BqXu3YqHxVbSH8NxsgqDP0CJxiBXtFI3Ch2HkaWCejbErcSI8oLQj3eHwFab09P+MSwpJIkiByHH8mu+olEo6+Pm1G5A5BezHt2BnIb0DBwt8xEE9KQmu5aQBCMLVfW752fLRAtDa7T4U1epEm9/KS3iFoNkdl69fi54LlcFc8dU0fPfLgoOMpiPZwoFCoVAGPuIQdy9vK6dGm6OAi6q+AuegTE2kytIFylQPMvJaE6dkbMBmUWU3NUD025oXHWog8OQ278HKx6c+g9X/jAd1S47ds33lNL/lF5bcHXdmdPBUVh1ftnGNibzomcLMpLTCpvq+YAvFtKO4AC4ulwiCBVpXuU/kv8HtJzES1hgg9XYliLMLgkvtEk8V4Lo2VijEkGerl50pDp25ma06Zl2XPpvStepgVkeMrVI0i3azhQe3zo0dA3AYqqz6wL9rndm8h+ux/H0O21V3oaA++VNvhKqfVSbXp+t5aerNaW+Iv0GVsDYH7Vb+CuH+KOIz3+tVanidGTODzc+FzmIktYD3gxJj3T/y3QQqCqfs6E+kl2mQ8dPvLeOONlrFcWQwpFFmpDvaPAcxzbnFajgimunGywWPNHsF2RuR16CdnOek8okSwKaou5M2T3xGk6vaPJIHQ11voIh2jWhnwN9QxXJcx0gda47w0EtbxCgfzLKlsHvoVgqaYLSmyX/jDPzIENbgovdRWWVKnV3Pi8veLwKHBAyUJmM/lfVta6osF63zN4VH61hz2AeyLW18Gt86QBtjvPJOXoUHBC0wjtuLwXzGe4bRqWsETdBN02QkzkA5o3Y9zv0GFVWm1lv1vDTv3RxwiEFPqQ9hHVf0b2+prBRtD2wJjdYztjC9SHQolGBBytNa2Stv5dWqCDye/f6hmRzWre5SgflpUPAajyg+xlI3oHIOxs2AYh9i/oHdHIJmIShUcJ0mpUmOQ7Z/lAOD06BW2oFWNCPcNjUwJV2irX4tkfQwa1nBKuowTvyjN/p7EhCPUq/u3rfxwzhL2AdPdgyRZPAdA6yePQj84r8wXnWoBEtWSuZNS4q5luO6//6JyPje+1+eOBQKa4X1Crcerfx6gpoUsCKni2SdxYsswraB5W6JTLw5HOs/ev518h84bOfc2/KvgbXnZO5TmQN9q+Z7Pf08UvpUC7sIgYkBFDbU//i1M7S1wBdVNzoV/9vIvH+bFXtjyo2qBjAhn3IDOcCJc5DGGY5jBUlPUNN2nh97ZmrIW9y3sXzkk+mucdOEh5hLGveh+qirC8fetx99n7aP/+X1aPfyopJqZuwojLal8lHZ7zMqZzh03g627MT21bEzKdPtZnK9t2akhN7NwnYdH7M6ewOCaSc8bmmQyvykpI9l3GGuODiSHEkD2qC+A7jJxoAmmAIdJ2jZSnlH3Rv9LvsBvEeMW8Fbvsk3CmT5Lsauz3vVMg22IcNdGMCF97F5zhYAtPgogVdA+Ip0ZcovuPxmCCKsIrgX5cB4R2v6HUxk137tzZUVog2BpuBYPWMLUSDb2Mal8M0S2ih5ub1YqncybaX2m6RhGi7Thl/hacEgGHbVprvO9QKVaFly4/Bb9VekLcnjgqYtiW72CE68bPB82kYMUzBPLiw/NXLMmAk/LoheEQd8EiIM7hxYQ3JO9Z7DK+R70CGgxTkhTPph96yYDLwWOXnOynadIGaP5cbak+EMzf7G3MiYF69nazfXl315AJY3cIwGElyCSQLIpjF5dlFLAoNmZatO8BumbqlZuEcLvrc28OZlUrZ6c3XBlQXgmYnP0fgkm6JSQLuZl+VTY4SCdibNOMx674Ho+MNbKF6xhfGOjoq1yBnxJ//lhK3bvz6aPTUEa1jMTO5OhFFrP7W8SZXHFlhbr/Jb+4caaGtISI4WI+iuaYAM2b1/R7MfLxdtDjSERhs4Z5SGe5tFjI1vE1Ny0Qu/kyqanKjVqRhbcWZtxLj463+OwsKSdvMJNslU8LMKlN6LmGMIX3xp20lDrZbS0Rh69kH2iyW5qP9oo+Mb/Yf17xh6eLPDMDGyC/CExvOswMQAXmzDZ2hy5s0YklV4U32TZjqQbORkSRBFUWp3efbnyo+Ivp92b+kxAJwmr9r5Nnezp5PqY/ygp5G2hUXgfKxTwI7oUMq+2agxnibG+yaDGtTEtLaOWuoTPCWbVYwkz4iKqOlfJjSO4XNtg63CPSmpLlpcKL2QOTEKzlVcFL86j55REiL/jFaZXTvu4pT8POMRxHbjOurTKZ00gPfFQtlSlnWJFKAmMWb7UM2hugcEf5I02agaTULEYlFmlhTn7ZIXcBExfvfQY5Tx5Yp5mxtVc5yUMVAket4jCK+Z5BldvmcrGPcgfndF9Q3XkoS2JKvChZzU3S+xCKXvLP23bwpzOcD84jP6zBguqLz8JPr4gfvuVTs1rmYlbHkpWGEq46HbR+p4fYQXhkwCGYa/fkO7gaFtBrfb1z5cxxkjnD6ZZdGRKAwQ/VZIdafVRm8fy74WvTaxQidp0d5v59Kl9GfFbWM0z2xMSTDPEfOimaD2b3s7bnxO6FDpHZH7MiJB3uakh9Yv2e007u3SrDPrPn+dQiubEVxLQ2nB4izAFf5W4afe3Qp3VF7BIRIchgm46R2Ywh1nNUx9t41r6javP6+aQszqlWD0Y/kYuVJx7er81sm3Mf3h7DvFxoPd/2NmCDmoJU3UCiq1g63pFvVW+xfNGkv+VjL4Pw5tYmF5XFKt/UNxAJ3uQcHdjHo1uPJd1FSZUufUcMLp/z8ehXVDlAylzigQ1WeoFK1o/AA9VTAze3oW4PED6Bw+23QCmXUVH2HqrdW50hyAYJ16gJ+oJVIXrgVp27c7C85iE+tjIRkDBRRtDa5PQAYRZRTRlYLrrUuv4okdLTxnqyxydlRTbmLWA6ULAscASPVPSTms59QPHJ1hInZYUEiSRcmjfyxf/f1JoJe/K3MS+ub1lBRzLdtMHlQ+zoEk272FurKRQqgEUBbjr8iPVlPL933GHjPwNnhRpkbjCsqDQkOsI9WnuHjVi5wb+v5RQvh/1rTz8DI+UKaaCAZoTXFJBvsYF9TgJLTpvj6xWqmhJIDVyo6hudqsqPs4z98iR/2nLdsZNvk0lnukaWXENApJjmc8H7XHdL5/eN+ZE8x5DVsRomv18ddFR8SEnRN23r2i6KLSlDee+CzTA2kOzTtO9Rf705oXdQMF8PUUb3Bnn8IizLIYP2YkRN4l939TtGNBoTQxB89Y6mpPm0Ve4PdUuyXDNOOScoGMskDH3Bq5Wmetb0E38RqWsDfnbJE8AGU8JBgVWQq/4QOq0WGzavP6K5XYza0nZ2eU1u/67b9Tq6PvjHdHBqXH8HtX1xK8dx2bp1WovhGFdcgoYarNqIOv4HEbPJqPBhwhFzJBbFweBEs+iKv6t7dXVop0/u2hkQaWDDNwZXUba+JSCakUvNwg84/8vzI2aHGoM6d5uN8Kau6IIJZz4puz76TOOv7T2c0p6fErnYD356gmDkbGJRWyg+CAdurcGYG1EKCWIel5UMFaiMRfdolgAlQ/K3ZFBfzzkH6kov99bgo6tYP5w4M8GUYBpl7e45yqJ7ncscxYaxJAY9xVadDiHdYG9PZVcYQIRnJ4Q4IW8YFKxUFx4nRaQrNvNwz3pEeors+JhSwN3kGQVCWYdhu35d+LXjKsju5DIYyDzb28JnjFQPDOYWtkcixAzX53MQ05QobNALqo4hvAUI5uamdkS7lkI1hBwjb0bb+hbgXrpUpSQSQISPUt+Q/crx22vYIsqgLrhC5hwY8kWKSd7LaYGwAWpt0EDyyJeCwWUOV7GFHE6xmVvoVSAnuF+yTTuyTefZMZ7xY/BNfWWc5NYHoRijKT3VevfR1/mVhYf/EWp36OA49xIrMwheCxzOF+EhzKLFi2SbfXdd4IW3vjr0OZqymdLvaMLJfDulzn9bMNNxoOFa2h/Gu9QOoRJLRUmlO6jipR7pxZWABqutpHNPmKI3oGPsPFJZQzSE/oGO+Ph6ywTEia4wj7RDgeaqODesDrLEKqSIJgSieOVbwUrhRCe6jO1VUiVGVAYTYxZgsNqHs7WL0uEA8M4BScjTOXTSzXCZrfd/Pytbjiux9/1XxVkApKDi/ddRnwa+r1dUcwPBncLC7csSw3QW7ZM0NdB35OmIKmanhiS6gRFU7AKDH3s6Y28/1hvzO/PmPqVeOPZ56UP4fQo6l1DfhALOmR2gIHFABtowFhPmuHw8gjueK0OC1Oi9PL0zJEwOmEnEocMYAGwIcHBScATMF7oOUJWRRZh7WpCWA5R77ThOJ1ZQtGFls21DY4+/8OAOrgQDVdEZFqf9IpQidiCB9aCDGSHm04FrVqCur5Ngi0/Hmmz/fcXjvf62qf9Ebzmsr18SHCsEPb+7evS+w0XpD+Y+GnkidKZ5WVEQvEt61XA59DOp236DVMxVCbiZZI/GfSnb8Vg4oZez7mBrOyMym9Nvlv3F9r1u4fbBUG964ZodH4sFdQP6VjRYdtvocnPPfbYGErZ12UMGIBAgD5cRjR4rOHen99yeJHFImQH7LqJ4Vjc/FDp6869YP2H9aUw7FeWoM9K85uTWsf4KE48+Hs+rgZIj9AURQ1ScmRDRPEoQ+yhaP3zZcJk0RI1pCoODbTkqbZD2YCoeQoKLpSmuLnHLj0AGQnBgO4llNsLCNnY7qatejYgDlUVWtI540xW4cu6/RTreYZaWizWiLPEQABG71lpZGp5f45q7MJU6MYLAH62fMGkAShd8gwcVFcR4Mx/HDECrJOEhnDJXrL/BhDW5RbJggAAA==) format("woff2");font-display:swap;unicode-range:U+4E13,U+4EAB,U+4ECA,U+4F17,U+516C,U+5269,U+544A,U+5730,U+5929,U+5BB6,U+5F88,U+5FD9,U+6682,U+670B,U+6C38,U+76EE,U+793C,U+7A0D,U+7B54,U+7E41,U+7EDC,U+8BC9,U+8BEF,U+8D26,U+8FCE,U+949F,U+9519,U+9A8C}/* giftfont:end */'+
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
  '.aid .ah em{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:1px 5px;border-radius:8px;color:var(--aid-b);box-shadow:inset 0 0 0 1px var(--aid-r)}'+
  '.aid .al{color:var(--fg);font-weight:600}.aid .ap{display:flex;align-items:center;min-height:22px;padding:0 8px;border-radius:6px;background:var(--aid-p);box-shadow:inset 0 0 0 1px var(--aid-g);font:11px ui-monospace,SFMono-Regular,Menlo,Consolas,"UI SC",monospace;color:var(--fg);white-space:nowrap;overflow:hidden}'+
  '.aid .ap::before{content:"›";margin-right:6px;color:var(--aid-b)}.aid .ty{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom}.aid .cu{flex:none;width:1.5px;height:12px;margin-left:1px;background:var(--aid-b)}'+
  '.aid .aw{color:var(--t3);font-size:10.5px}.aid .aw code{font:600 10.5px ui-monospace,SFMono-Regular,Menlo,Consolas,"UI SC",monospace;color:var(--fg)}.aid .aw{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:4px}.aid a.dl,#mCdGift .aid a.dl,#mGiftAd .aid a.dl{margin-left:auto;font-size:10.5px;font-weight:600;color:var(--aid-b);text-decoration:none!important;white-space:nowrap;box-shadow:inset 0 -1px 0 var(--aid-r)}.aid a.dl::after{content:" ↗"}.aid a.dl:hover{box-shadow:inset 0 -1px 0 var(--aid-b)}.aid.sm{padding:7px 10px 7px;gap:3px}.aid.sm .ap{display:none}'+
  '@media (prefers-reduced-motion:no-preference){.aid::before{animation:aidsh 6s ease-in-out infinite}.aid::after,.aid .ah b{animation:aidbar 7s linear infinite}.aid .ah i.lg{animation:aidglow 7s ease-in-out infinite}.aid .cu{animation:aidbl 1s steps(1) infinite}.aid .ty{animation:aidty 7s linear infinite}}'+
  '@keyframes aidsh{0%,45%{background-position:160% 0}100%{background-position:-60% 0}}@keyframes aidbar{to{background-position:200% 0}}@keyframes aidglow{0%,100%{box-shadow:0 0 0 0 #e9af0000}50%{box-shadow:0 0 8px 1px #e9af0066}}@keyframes aidbl{50%{opacity:0}}@keyframes aidty{0%{width:0}42%,86%{width:var(--w)}100%{width:0}}'+
  '#mGiftAd{position:relative;margin:0 8px 6px}#mGiftAd .aid{padding-right:26px}#mGiftAd>.ib{position:absolute;z-index:1;top:4px;right:4px;width:20px;height:20px;min-width:0;padding:0;border:0;background:none;color:var(--t3);font-size:14px;line-height:20px}'+
  '#mGiftH{display:flex;flex-direction:column;gap:3px;margin:0 10px 8px;padding:7px 10px;border-radius:7px;box-shadow:inset 0 0 0 1px var(--btnb);font-size:11.5px;color:var(--h4)}#mGiftH .gh{display:flex;align-items:center;gap:8px}#mGiftH .gh span{flex:1}#mGiftH button{height:22px;font-size:11px}'}));
// the AI Dev promo (TBtools' plugin builder); full when the free uses are gone or the campaign is over, compact once after the first use
// WHERE the user finds AI Dev in TBtools: UNCONFIRMED (a guess); change only these two lines
const WHERE=['Open it in TBtools: ','在 TBtools 里打开：'],AIPATH=['Plugin menu › AI Dev','Plugin 菜单 › AI Dev'],
  // where to get TBtools: a plain target=_blank link, opened by TBtools the same way as the app's own links (TBtools-II on GitHub, the In TBtools card)
  DL='https://www.yuque.com/cjchen/hirv8i/xq65ml',DLT=['Download TBtools','下载 TBtools'],
  DEMO=['rename FASTA headers in bulk','批量改 FASTA 序列名'],
  // the TBtools logo: tbtools.svg from the repo root, byte for byte (only aria-hidden and stroke:none were added on the root, as the app's own TBtools links do, so no host CSS can stroke it);
  // shown at 24px (1.5 px per unit: the grid lines fall on whole pixels). Never animate its parts: the card animates around it
  LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" style="stroke:none"><rect width="16" height="16" rx="3.6" fill="#f9e44d"/><path fill="#e9af00" d="M8 0h4v12H8zM4 4h4v4H4zM4 12h4v4H4zM12 0h.4a3.6 3.6 0 0 1 3.6 3.6V4h-4zM0 12h4v4h-.4A3.6 3.6 0 0 1 0 12.4z"/><path d="M4 0v16M8 0v16M12 0v16M0 4h16M0 8h16M0 12h16" stroke="#aa6418" stroke-width=".625"/></svg>',
  adFill=(n,o={})=>{n.className='aid'+(o.sm?' sm':'');n.replaceChildren();const top=o.top;
    if(top){const s=el('span','al');s.textContent=top;n.append(s)}
    const h=el('div','ah'),b=el('b');b.textContent='AI Dev';const lg=el('i','lg');lg.innerHTML=LOGO;h.append(lg);h.append(b,Object.assign(el('em'),{textContent:T('New','新')}));n.append(h);
    const d=el('span');d.textContent=T('Describe the tool you need. AI Dev builds it into a TBtools plugin.','说出你想要的工具，AI Dev 帮你做成 TBtools 插件。');n.append(d);
    const t=T(...DEMO),w=[...t].reduce((a,c)=>a+(/[^\x00-\x7f]/.test(c)?1:.6),0),p=el('div','ap'),ty=el('span','ty'),cu=el('i','cu');ty.textContent=t;ty.style.setProperty('--w',w+'em');ty.style.width=w+'em';ty.style.animationTimingFunction=`steps(${[...t].length},end)`;p.append(ty,cu);n.append(p);
    const wh=el('span','aw');wh.append(T(...WHERE),Object.assign(el('code'),{textContent:T(...AIPATH)}));const dl=Object.assign(el('a','dl'),{href:DL,target:'_blank',rel:'noopener',textContent:T(...DLT)});wh.append(dl);n.append(wh);
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
