/* ================= Fun Facts: records, heartbreak, roasts and weird stats =================
   Every fact is worked out from js/data.js each time the page loads, so adding a new tournament
   updates them automatically (new record holders, new roasts). No fact is typed in by hand.
   Roasts are about football stats only, all in good fun. Loaded after compare.js. */
(function(){
  const L=D.log,P=D.players.filter(p=>!p.side),F=D.finals||[];
  const TN={T:'Team Tour',A:'Solo Authentic',D:'Solo Dream Team',C:'Co-op'};
  const latest=Math.max(...L.map(r=>r[0]));
  const and=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
  const pl=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
  const by=(a,f)=>a.slice().sort((x,y)=>f(y)-f(x));
  const facts=[];
  // one fact: {c:category, e:emoji, h:headline, big:number/word, sm:label under the number, t:sentence, who:[names]}
  const add=(c,make)=>{try{const f=make();if(f)facts.push(Object.assign({c},f));}catch(e){console.warn('fun fact skipped',e);}};

  /* ---- shared numbers ---- */
  const seasons={};L.forEach(r=>(seasons[r[2]]=seasons[r[2]]||new Set()).add(r[0]));
  const fin={};F.forEach(f=>{f.cp.forEach(n=>(fin[n]=fin[n]||{w:[],l:[]}).w.push(f.s));f.rp.forEach(n=>(fin[n]=fin[n]||{w:[],l:[]}).l.push(f.s));});
  const tt=L.filter(r=>r[1]==='T'&&r[3]);
  const withG=L.filter(r=>r[4]!=null);

  /* ================= RECORDS ================= */
  add('records',()=>{const s=by(withG,r=>r[4]);const [a,b]=s;
    return {s:`${a[2]} scored ${a[4]} goals in one tournament (S${a[0]} ${TN[a[1]]}), the most ever in MLD.`,e:'🚀',h:'The goal machine',big:a[4],sm:'goals in one tournament',who:[a[2]],
      t:`${a[2]} scored ${a[4]} goals in the S${a[0]} ${TN[a[1]]}${a[3]?` for ${a[3]}`:''}. The next best ever is ${b[4]}. Everyone else is just playing a different game.`};});
  add('records',()=>{const s=by(L.filter(r=>r[5]!=null),r=>r[5]);const a=s[0];
    return {s:`${a[2]}'s ${a[5]} rating in the S${a[0]} ${TN[a[1]]} is the highest rating ever in MLD.`,e:'⭐',h:'Highest rating ever',big:a[5],sm:'rating in one tournament',who:[a[2]],
      t:`${a[2]} hit a ${a[5]} rating in the S${a[0]} ${TN[a[1]]}${a[4]!=null?`, with ${a[4]} goals`:''}. Nobody has rated higher in MLD history.`};});
  add('records',()=>{const s=by(P.filter(p=>p.t>=3),p=>p.g/p.t);const a=s[0],b=s[1];
    return {s:`${a.n} averages ${(a.g/a.t).toFixed(1)} goals per tournament, the best scoring rate in MLD.`,e:'🎯',h:'Goals on demand',big:(a.g/a.t).toFixed(1),sm:'goals per tournament',who:[a.n,b.n],
      t:`${a.n} averages ${(a.g/a.t).toFixed(1)} goals every tournament (${pl(a.t,'tournament')}), the best rate in MLD. ${b.n} is next with ${(b.g/b.t).toFixed(1)}.`};});
  add('records',()=>{const tot={};withG.forEach(r=>{const k=r[2]+'|'+r[0];tot[k]=(tot[k]||0)+r[4];});
    const [k,g]=by(Object.entries(tot),e=>e[1])[0];const [n,s]=k.split('|');
    return {s:`${n} scored ${g} goals in Season ${s}, the most anyone has scored in a single season.`,e:'📅',h:'Best season ever',big:g,sm:'goals in one season',who:[n],t:`${n} scored ${g} goals across all tours in Season ${s}. The most anyone has managed in a single season.`};});

  /* ================= ROAST CORNER ================= */
  add('roast',()=>{const a=by(P.filter(p=>!p.pt&&!p.mt),p=>p.t*1000+p.g)[0];
    return {s:`${a.n} has played ${a.t} tournaments and scored ${a.g} goals, but has never won a trophy.`,e:'🧳',h:'The tourist',big:0,sm:`trophies in ${a.t} tournaments`,who:[a.n],
      t:`${a.n}: ${pl(a.t,'tournament')}, ${a.g} goals, 0 trophies. Shows up every time, collects the experience, leaves the cup for someone else.`};});
  add('roast',()=>{const zero=L.filter(r=>r[4]===0);if(!zero.length)return null;
    return {s:zero.length===1?`${zero[0][2]} played a whole tournament (S${zero[0][0]} ${TN[zero[0][1]]}) and scored 0 goals.`:`${and(zero.map(r=>r[2]))} each played a whole tournament and scored 0 goals.`,e:'🥅',h:'The net is still waiting',big:0,sm:'goals in a whole tournament',who:zero.map(r=>r[2]),
      t:zero.length===1?`${zero[0][2]} played the entire S${zero[0][0]} ${TN[zero[0][1]]} and scored 0 goals. Not one. The ball is still waiting for an introduction.`
        :`${zero.map(r=>`${r[2]} (S${r[0]} ${TN[r[1]]})`).join(' and ')} each finished a whole tournament with 0 goals. MLD's official ghost strikers.`};});
  add('roast',()=>{ // champion with the fewest goals in a title-winning Team Tour
    const c=[];F.forEach(f=>f.cp.forEach(n=>{const r=tt.find(x=>x[0]===f.s&&x[2]===n);if(r&&r[4]!=null)c.push({n,s:f.s,g:r[4],team:f.champ});}));
    const a=by(c,x=>-x.g)[0];if(!a)return null;
    return {s:`${a.n} won the S${a.s} Team Tour with ${a.team} while scoring just ${pl(a.g,'goal')}.`,e:'🎒',h:'Carried to glory',big:a.g,sm:'goals in a title-winning Team Tour',who:[a.n],
      t:`${a.n} won the S${a.s} Team Tour with ${a.team} after scoring just ${pl(a.g,'goal')}. Same medal as everyone else. Teammates, please send the bill.`};});
  add('roast',()=>{const tm={};tt.forEach(r=>(tm[r[2]]=tm[r[2]]||new Set()).add(r[3]));
    const [n,s]=by(Object.entries(tm),e=>e[1].size)[0];
    return {s:`${n} has played Team Tour for ${s.size} different teams, more than anyone in MLD.`,e:'🔄',h:'Loyalty not found',big:s.size,sm:'different Team Tour teams',who:[n],
      t:`${n} has played Team Tour for ${s.size} different teams: ${[...s].join(', ')}. Has a shirt from every club and a heart for none.`};});
  add('roast',()=>{const reg=P.filter(p=>p.t>=6&&p.r);const a=by(reg,p=>-p.r)[0];
    return {s:`${a.n} has the lowest average rating (${a.r.toFixed(1)}) of any player with 6 or more tournaments.`,e:'📉',h:'Experience ≠ quality',big:a.r.toFixed(1),sm:`average rating after ${a.t} tournaments`,who:[a.n],
      t:`${a.n} has played ${pl(a.t,'tournament')} and still has the lowest average rating of any regular (6+ tournaments). Practice makes… participation.`};});
  add('roast',()=>{ // biggest fall: best tournament vs latest one, among players who played the latest season
    const c=[];Object.keys(seasons).forEach(n=>{const rows=withG.filter(r=>r[2]===n&&r[1]==='T');if(rows.length<3)return;
      const last=rows.reduce((a,r)=>r[0]>a[0]?r:a);if(last[0]<latest)return;const best=by(rows,r=>r[4])[0];if(best===last)return;
      c.push({n,best,last,drop:best[4]-last[4]});});
    const a=by(c,x=>x.drop)[0];if(!a||a.drop<10)return null;
    return {s:`${a.n} scored ${a.best[4]} goals in the S${a.best[0]} Team Tour, but only ${a.last[4]} in the latest one.`,e:'🪂',h:'Where did it go?',big:`${a.best[4]}→${a.last[4]}`,sm:'goals: best Team Tour → latest',who:[a.n],
      t:`${a.n} once scored ${a.best[4]} goals in the S${a.best[0]} Team Tour. Latest Team Tour: ${a.last[4]}. Someone please check on them.`};});
  add('roast',()=>{const c=Object.entries(fin).filter(([,v])=>!v.w.length);const [n,v]=by(c,e=>e[1].l.length)[0]||[];if(!n||v.l.length<2)return null;
    return {s:`${n} has played ${v.l.length} Team Tour finals and lost all ${v.l.length} of them.`,e:'💔',h:'Final boss? Final loss.',big:`0–${v.l.length}`,sm:'Team Tour finals won–lost',who:[n],
      t:`${n} has reached ${v.l.length} Team Tour finals (S${v.l.join(', S')}) and lost every single one. Gets to the door, forgets the key.`};});
  add('roast',()=>{const a=by(P,p=>p.ru*10-p.pt)[0];
    return {s:`${a.n} has ${a.ru} runner-up finishes, the most in MLD history.`,e:'🥈',h:'Silver collector',big:a.ru,sm:'runner-up finishes',who:[a.n],
      t:`${a.n} has finished runner-up ${a.ru} times, the most in MLD. Silver is also a colour, apparently.`};});
  add('roast',()=>{const c=Object.entries(fin).map(([n,v])=>({n,w:v.w.length,l:v.l.length})).filter(x=>x.w&&x.l>x.w);
    const a=by(c,x=>x.l-x.w)[0];if(!a)return null;
    return {s:`${a.n} has played ${a.w+a.l} Team Tour finals and lost ${a.l} of them.`,e:'😬',h:'Big game? Big gamble.',big:`${a.w}–${a.l}`,sm:'Team Tour finals won–lost',who:[a.n],
      t:`${a.n} has played ${a.w+a.l} Team Tour finals and lost ${a.l} of them. If they are in your final, maybe check the other team's squad first.`};});
  add('roast',()=>{const c=Object.keys(seasons).map(n=>{const s=[...seasons[n]].sort((a,b)=>a-b);let g=0,at=0;for(let i=1;i<s.length;i++)if(s[i]-s[i-1]>g){g=s[i]-s[i-1];at=i;}return {n,g,from:s[at-1],to:s[at]};});
    const a=by(c,x=>x.g)[0];if(!a||a.g<4)return null;
    return {s:`${a.n} played Season ${a.from}, disappeared for ${pl(a.g-1,'season')}, then came back in Season ${a.to}.`,e:'👻',h:'The disappearing act',big:a.g-1,sm:'seasons missing',who:[a.n],
      t:`${a.n} played Season ${a.from}, vanished for ${pl(a.g-1,'season')}, then walked back in for Season ${a.to} like nothing happened.`};});

  /* ================= LEGENDS & LOYALTY ================= */
  add('loyal',()=>{const n=Math.max(...Object.values(seasons).map(s=>s.size));const all=Object.keys(seasons).filter(k=>seasons[k].size===latest);if(!all.length)return null;
    return {s:`${and(all)} ${all.length===1?'has':'have'} played all ${latest} MLD seasons, without missing one.`,e:'🛡️',h:'Never missed a season',big:latest,sm:'seasons out of '+latest,who:all,t:`${and(all)} ${all.length===1?'has':'have'} played every single one of the ${latest} seasons. MLD is not a hobby for them. It is a lifestyle.`};});
  add('loyal',()=>{const k={};tt.forEach(r=>{const x=r[2]+'|'+r[3];k[x]=(k[x]||0)+1;});const [x,c]=by(Object.entries(k),e=>e[1])[0];const [n,team]=x.split('|');if(c<3)return null;
    return {s:`${n} has played ${pl(c,'Team Tour')} for ${team}, the most anyone has played for one club.`,e:'❤️',h:'One club man',big:c,sm:`Team Tours with ${team}`,who:[n],t:`${n} has played ${pl(c,'Team Tour')} for ${team}, more than anyone has for one club.`};});
  add('loyal',()=>{const c=P.filter(p=>p.pt&&p.t<=1),d=P.filter(p=>p.pt&&p.t<=2);if(!d.length)return null;
    return {s:`${pl(d.length,'player')} won a title within their first two MLD tournaments.`,e:'🍀',h:'Beginner\'s luck',big:d.length,sm:'won a title in their first two tournaments',who:(c.length?c:d).map(p=>p.n).slice(0,6),
      t:`${pl(d.length,'player')} won a title within their first two tournaments.${c.length?` ${and(c.map(p=>p.n))} did it in their very first.`:''} Meanwhile some legends are still waiting.`};});

  /* ================= WEIRD BUT TRUE ================= */
  add('weird',()=>{let miss=0,tot=0;D.awards.filter(a=>a[1]==='T').forEach(a=>{const f=F.find(x=>x.s===a[0]);if(!f)return;tot++;
      const names=String(a[3]).split(/,\s*/);if(!names.some(n=>f.cp.includes(n)||f.rp.includes(n)))miss++;});
    return {s:`In ${miss} of ${tot} Team Tours, the Golden Boot winner's team did not even reach the final.`,e:'👟',h:'Golden Boot, no final',big:`${miss}/${tot}`,sm:'Team Tours',t:`In ${miss} of ${tot} Team Tours, the top scorer's team did not even reach the final. Goals win you a boot, not a cup.`};});
  add('weird',()=>{const g={};withG.forEach(r=>g[r[0]]=(g[r[0]]||0)+r[4]);const e=Object.entries(g);const hi=by(e,x=>x[1])[0],lo=by(e,x=>-x[1])[0];
    return {s:`Season ${hi[0]} had ${hi[1].toLocaleString()} goals, while Season ${lo[0]} had only ${lo[1]}.`,e:'📊',h:'Feast and famine',big:(hi[1]/lo[1]).toFixed(1)+'×',sm:'more goals',t:`Season ${hi[0]} had ${hi[1].toLocaleString()} goals. Season ${lo[0]} had only ${lo[1]}. Same league, very different vibes.`};});
  add('weird',()=>{const c={},r={};F.forEach(f=>{c[f.champ]=(c[f.champ]||0)+1;r[f.runner]=(r[f.runner]||0)+1;});
    const [t,n]=by(Object.entries(c),e=>e[1])[0];const most=Math.max(...Object.values(r));const losers=Object.keys(r).filter(k=>r[k]===most);
    return {s:`${t} has won the Team Tour ${pl(n,'time')}, more than any other team.`,e:'🏆',h:'Best club to be in',big:n,sm:`Team Tour titles for ${t}`,t:`${t} has won the Team Tour ${pl(n,'time')}, the most of any team. ${losers.includes(t)?`Plot twist: ${t} has also lost ${most} finals, joint most with ${and(losers.filter(x=>x!==t))||'nobody'}.`:`${and(losers)} ${losers.length>1?'have':'has'} lost the most finals (${most}).`}`};});
  add('weird',()=>{const tm={};tt.forEach(r=>(tm[r[3]]=tm[r[3]]||new Set()).add(r[2]));const [t,s]=by(Object.entries(tm),e=>e[1].size)[0];
    return {s:`${s.size} different players have played for ${t} in Team Tour, the most of any club.`,e:'👕',h:'Most worn shirt',big:s.size,sm:`players have played for ${t}`,t:`${s.size} different MLD players have pulled on the ${t} shirt in Team Tour. Most popular club in the league.`};});
  add('weird',()=>{const one=Object.values(seasons).filter(s=>s.size===1).length;
    return {s:`${one} of the ${Object.keys(seasons).length} MLD players played only one season.`,e:'🚪',h:'One and done',big:one,sm:`of ${Object.keys(seasons).length} players`,t:`${one} players played just one season of MLD and never came back. Some came for the experience, some came for one tournament, all of them left.`};});
  add('weird',()=>{const s=Math.max(...L.map(r=>r[0]));const n=new Set(L.filter(r=>r[0]===s).map(r=>r[2])).size;const fst=new Set(L.filter(r=>r[0]===1).map(r=>r[2])).size;
    return {s:`MLD has grown from ${fst} players in Season 1 to ${n} in Season ${s}.`,e:'📈',h:'From a group chat to a league',big:`${fst}→${n}`,sm:`players, Season 1 → Season ${s}`,t:`Season 1 had ${fst} players. Season ${s} had ${n}. MLD keeps growing.`};});

  /* ================= the page ================= */
  const CATS=[['roast','Roast corner 🔥','Screenshot it. Send it to the group. No mercy.'],['records','Records','The best numbers ever put up in MLD.'],
    ['loyal','Legends & loyalty','The ones who stay, and the lucky ones.'],['weird','Weird but true','Odd numbers from 13 seasons of MLD.']];
  const faces=names=>(names||[]).slice(0,6).map(n=>byName[n]?`<button class="ffwho" data-p="${esc(n)}">${avatar(n)}<b>${esc(n)}</b></button>`:'').join('');
  const card=(f,i)=>`<article class="ffcard ff-${f.c}" style="--i:${i}">
      <div class="fftop"><span class="ffe">${f.e}</span><span class="ffh">${esc(f.h)}</span></div>
      <div class="ffbig"><b>${esc(String(f.big))}</b><small>${esc(f.sm)}</small></div>
      <p>${esc(f.t)}</p>
      <div class="ffbot"><div class="ffwhos">${faces(f.who)}</div><button class="ffshare" data-ffshare="${facts.indexOf(f)}" aria-label="Share this fact">Share</button></div>
    </article>`;
  function view(){
    return {t:'Fun <em>Facts</em>',p:`Records, heartbreak and roasts, all worked out from ${latest} seasons of MLD stats. They change by themselves when new results come in.`,
      b:`<div class="ffjump">${CATS.map(([k,l])=>`<button class="chip" data-ffjump="${k}">${l}</button>`).join('')}</div>`+
        CATS.map(([k,l,sub])=>{const fs=facts.filter(f=>f.c===k);return fs.length?`<h2 class="sec" id="ff-${k}">${l} <small>${pl(fs.length,'fact').toUpperCase()}</small></h2><p class="note ffsub">${sub}</p><div class="ffgrid">${fs.map(card).join('')}</div>`:'';}).join('')};
  }
  VIEWS['fun-facts']=view;
  window.FUN_FACTS=facts;

  /* ---- share one fact (WhatsApp etc.), or copy it ---- */
  document.addEventListener('click',e=>{
    const j=e.target.closest('[data-ffjump]');if(j){const h=document.getElementById('ff-'+j.dataset.ffjump);if(h)h.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const b=e.target.closest('[data-ffshare]');if(!b)return;const f=facts[+b.dataset.ffshare];if(!f)return;
    const text=`${f.e} ${f.h}\n${f.t}\n\nMLD 03 Fun Facts: ${location.origin}/#fun-facts`;
    if(navigator.share)navigator.share({text}).catch(()=>{});
    else if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Share',1500);}).catch(()=>{});
  });

  /* ---- "Did you know?" card on the home page: a different fact each visit ---- */
  function homeCard(){const box=document.getElementById('didYouKnow');if(!box||!facts.length)return;
    const pool=facts.filter(f=>f.who&&f.who.length);const f=pool[Math.floor(Math.random()*pool.length)];
    box.innerHTML=`<button class="ffhome" data-go="fun-facts"><span class="ffhic"><img alt="" src="images/fun-facts.jpg"></span>
      <span class="ffhtx"><small>Did you know? ${f.e}</small><b>${esc(f.h)}</b><span>${esc(f.t)}</span><i>More fun facts →</i></span></button>`;}
  homeCard();
  /* one short random fact on the loading screen (tiny, one line) */
  (function(){const box=document.getElementById('introFact');if(!box||!facts.length)return;
    const f=facts[Math.floor(Math.random()*facts.length)];
    box.innerHTML=`<b>Did you know?</b> ${esc(f.e+' '+(f.s||f.t))}`;})();
})();
