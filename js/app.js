const D=window.MLD_DATA;
const EMBLEM="images/emblem.jpg";
const TROPHY="images/trophies/mld-dor.webp";
const STICKER=`<img class="sticker" alt="MLD D'or trophy" src="${TROPHY}">`;
const PHOTO="images/mld-dor-midhun.jpg", FACE="images/players/Midhun.jpg";
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TYPE={T:'Team Tour',D:'Solo · Dream Team',A:'Solo · Authentic',C:'Co-op Tour',S:'Season-wide · all tours'};
const SEASON_AW=D.seasonAwards||[];
const fmt=v=>v==null?'–':(Math.round(v*10)/10).toString();
const byName=Object.fromEntries(D.players.map(p=>[p.n,p]));
const GOAT=D.ballon.winner;
const pname=n=>`<button class="pl" data-p="${esc(n)}">${esc(n)}</button>`;
const names=s=>String(s).split(',').map(x=>x.trim());
const ICON={
  ball:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/></svg>',
  boot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 6h6l1 5 8 2a2 2 0 012 2v2H4z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  cup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 20h8"/></svg>',
  team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0112 0M15 20a4 4 0 016 0"/></svg>',
  solo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0114 0"/></svg>',
  medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="15" r="5"/><path d="M8 3l4 7 4-7"/></svg>',
  clip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>'
};

/* ---- derived per-tournament stats ---- */
function tourStats(ty){
  const m={};
  D.log.filter(r=>r[1]===ty).forEach(r=>{const o=m[r[2]]||(m[r[2]]={n:r[2],g:0,apps:0,rs:0,rc:0,teams:new Set()});
    o.g+=r[4]||0;o.apps++;if(r[5]!=null){o.rs+=r[5];o.rc++;}if(r[3])o.teams.add(r[3]);});
  D.trophies.filter(t=>t[1]===ty).forEach(t=>{const o=m[t[2]]||(m[t[2]]={n:t[2],g:0,apps:0,rs:0,rc:0,teams:new Set()});
    if(t[3]==='Player Trophy')o.w=(o.w||0)+1; if(t[3]==='Runner-up')o.ru=(o.ru||0)+1;});
  return Object.values(m).map(o=>({...o,r:o.rc?o.rs/o.rc:null,w:o.w||0,ru:o.ru||0}));
}

/* ---- category definitions ---- */
const CATS=[
  {id:'mld-dor',t:"MLD D'or",ic:'ball',tone:'gold',lead:()=>`${GOAT} · the only winner`},
  {id:'scorers',t:'Top Scorers',ic:'#t-boot',tone:'red',lead:()=>{const p=leader('g');return `${p.n} · ${p.g} goals`}},
  {id:'rating',t:'Career Rating',ic:'#t-ball',tone:'paper',lead:()=>{const p=leader('cs');return `${p.n} · ${fmt(p.cs)}`}},
  {id:'trophies',t:'Player Trophies',ic:'cup',tone:'',lead:()=>{const p=leader('pt');return `${p.n} · ${p.pt} titles`}},
  {id:'team',t:'Team Tour',ic:'#t-team',tone:'',lead:()=>'13 seasons · goals, rating, titles'},
  {id:'dream',t:'Solo Dream Team',ic:'#t-dream',tone:'',lead:()=>'Season 13 · winner Rashid'},
  {id:'auth',t:'Solo Authentic',ic:'#t-auth',tone:'',lead:()=>'Season 13 · winner Ashik'},
  {id:'coop',t:'Co-op Tour',ic:'#t-coop',tone:'',lead:()=>'2v2 · Siyan & Harris'},
  {id:'goldenboot',t:'Golden Boot',ic:'#t-boot',tone:'',lead:()=>'Top scorer each season'},
  {id:'goldenball',t:'Golden Ball',ic:'#t-ball',tone:'',lead:()=>'Best rating each season'},
  {id:'managers',t:'Manager Trophies',ic:'clip',tone:'',lead:()=>'Pranav · WaCky'},
  {id:'runners',t:'Runner-ups',ic:'medal',tone:'',lead:()=>{const p=leader('ru');return `${p.n} · ${p.ru} finals lost`}},
];
function leader(k){return [...D.players].sort((a,b)=>(b[k]??-1)-(a[k]??-1)||b.g-a.g)[0]}

const GROUPS=[['',['home','compare']],['Hall of fame',['mld-dor']],['All-time',['scorers','rating','trophies','runners','managers']],
  ['Tournaments',['team','dream','auth','coop']],['Season awards',['goldenboot','goldenball']],['Extras',['side-quests','games']]];
function navIcon(c){
  if(c.id==='home')return `<img alt="" src="${EMBLEM}" style="width:40px;height:40px;object-fit:cover;object-position:50% 45%">`;
  if(c.id==='mld-dor')return `<img alt="" src="${TROPHY}">`;
  if(c.id==='compare')return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/></svg>`;
  if(c.id==='games')return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="13.5" r="1"/></svg>`;
  if(c.id==='turbo')return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 15l2-5h9l4 3h3v2H3z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>`;
  if(c.id==='play')return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="14" r="4"/><circle cx="17" cy="8" r="2.5"/><path d="M11 11l4-2"/></svg>`;
  if(c.id==='side-quests')return `<img alt="" src="${MANDI_IC}" style="border-radius:50%">`;
  return c.ic[0]==='#'?`<svg><use href="${c.ic}"/></svg>`:ICON[c.ic];
}
function renderHome(){
  const all={home:{id:'home',t:'Home',lead:()=>'Season 14 · what is on now'},'side-quests':{id:'side-quests',t:'Side quests',lead:()=>'Mandi Challenge'},compare:{id:'compare',t:'Compare',lead:()=>'Two players, head to head'},games:{id:'games',t:'Games',lead:()=>'Mini games · MLD Flick, MLD Turbo'},play:{id:'play',t:'MLD Flick',lead:()=>'Disc football · turn based'},turbo:{id:'turbo',t:'MLD Turbo',lead:()=>'Car football · drive, jump, boost'}};
  CATS.forEach(c=>all[c.id]=c);
  let k=0;
  $('#dnav').innerHTML=GROUPS.map(([g,ids])=>`${g?`<div class="dgroup" style="--d:${k++}">${g}</div>`:''}${ids.map(id=>{const c=all[id];
    return `<button class="ditem${id==='mld-dor'?' gold':''}" style="--d:${k++}" data-go="${id==='home'?'':id}" data-nav="${id}"><span class="dic">${navIcon(c)}</span><span class="dtx"><b>${c.t}</b><small>${esc(c.lead())}</small></span></button>`}).join('')}`).join('');
}
function markNav(){document.querySelectorAll('.ditem').forEach(b=>b.classList.toggle('on',(b.dataset.nav==='home'&&!cur)||b.dataset.nav===cur));}
function openMenu(){const d=$('#drawer');markNav();$('#scrim').hidden=false;requestAnimationFrame(()=>{document.body.classList.add('menu-open');});
  d.setAttribute('aria-hidden','false');$('#menuBtn').setAttribute('aria-expanded','true');setTimeout(()=>$('#menuClose').focus({preventScroll:true}),50);}
function closeMenu(){if(!document.body.classList.contains('menu-open'))return;document.body.classList.remove('menu-open');$('#drawer').setAttribute('aria-hidden','true');
  $('#menuBtn').setAttribute('aria-expanded','false');setTimeout(()=>{if(!document.body.classList.contains('menu-open'))$('#scrim').hidden=true;},380);}
document.addEventListener('click',e=>{
  if(e.target.closest('#menuBtn,[data-open-menu]'))return openMenu();
  if(e.target.closest('#menuClose')||e.target.id==='scrim')return closeMenu();
  if(e.target.closest('#drawer [data-go]'))closeMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
(function(){let x0=null;const d=document.getElementById('drawer');
  d.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  d.addEventListener('touchend',e=>{if(x0!=null&&x0-e.changedTouches[0].clientX>60)closeMenu();x0=null;},{passive:true});})();

/* ---- leaderboard helper ---- */
let lb={q:'',limit:25};
function leaderboard(list,valFn,label,subFn){
  const ranked=list.map((p,i)=>({...p,_rk:i+1}));
  const q=lb.q.trim().toLowerCase();
  const shown=ranked.filter(p=>!q||p.n.toLowerCase().includes(q));
  const pod=!q&&ranked.length>=3?`<div class="podium">${[1,0,2].map(i=>{const p=ranked[i];return `<button class="pod p${i+1}" data-p="${esc(p.n)}">
      ${photoOf(p.n)?`<img class="av" alt="" src="${photoOf(p.n)}">`:''}<small>No. ${i+1}</small><div class="n">${valFn(p)}</div><b>${esc(p.n)}</b></button>`}).join('')}</div>`:'';
  const rows=shown.slice(0,lb.limit).map(p=>`<button class="row${p.n===GOAT?' goat':''}" data-p="${esc(p.n)}"><div class="rk">${p._rk}</div>
    <div class="nm">${avatar(p.n)}<div><b>${esc(p.n)}</b><span>${subFn(p)}</span>${miniIcons(p.n)}</div></div>
    <div class="vl">${valFn(p)}<small>${label}</small></div></button>`).join('');
  return `<label class="search" for="q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <input id="q" placeholder="Search ${ranked.length} players" autocomplete="off" value="${esc(lb.q)}"></label>${pod}
    <div class="rows">${rows||'<p class="note">No player matches that name.</p>'}</div>${shown.length>lb.limit?'<button class="more" data-more="1">Show more</button>':''}`;
}
const sortBy=(arr,k)=>[...arr].sort((a,b)=>(b[k]??-1)-(a[k]??-1)||(b.g||0)-(a.g||0));
const s=(n,w)=>n+' '+w+(n===1?'':'s');

/* ---- stat views ---- */
let cur='', sub={team:'g',dream:'r',auth:'r'};
const VIEWS={
  scorers:()=>({t:'Top <em>Scorers</em>',p:'Total goals across every MLD tournament with individual stats.',
    b:leaderboard(sortBy(D.players,'g'),p=>p.g,'goals',p=>`${s(p.t,'tournament')} · ${(p.g/p.t).toFixed(1)} per tournament`)}),
  rating:()=>({t:'Career <em>Rating</em>',p:'Average rating × ln(1 + tournaments played). Rewards players who keep performing over many tournaments.',
    b:leaderboard(sortBy(D.players,'cs'),p=>fmt(p.cs),'score',p=>`Avg rating ${fmt(p.r)} · ${s(p.t,'tournament')}`)}),
  trophies:()=>({t:'Player <em>Trophies</em>',p:'Championships won as a player, across all tournament types.',
    b:leaderboard([...D.players].filter(p=>p.pt>0).sort((a,b)=>b.pt-a.pt||b.ru-a.ru||b.g-a.g),p=>p.pt,'titles',p=>`${s(p.ru,'runner-up finish')} · ${p.g} goals`)}),
  runners:()=>({t:'Runner-<em>ups</em>',p:'Finals reached but not won. Runner-up finishes earn no trophy.',
    b:leaderboard([...D.players].filter(p=>p.ru>0).sort((a,b)=>b.ru-a.ru||b.pt-a.pt),p=>p.ru,'finals',p=>`${s(p.pt,'title')} won`)}),
  managers:()=>{const m=D.trophies.filter(t=>t[3]==='Manager Trophy');
    return {t:'Manager <em>Trophies</em>',p:'Championships won as a team manager. Counted separately from player trophies.',
    b:`<div class="winners">${m.map(t=>`<button class="win first" data-p="${esc(t[2])}"><span>Season ${t[0]} · ${TYPE[t[1]]}</span><b>${esc(t[2])}</b><span>${esc(t[4]||'')}</span></button>`).join('')}</div>`}},
  team:()=>tourView('T','Team <em>Tour</em>','Every Team Tour from Season 1 to 13.'),
  dream:()=>tourView('D','Solo <em>Dream Team</em>','Season 13 Solo Dream Team (Group A).'),
  auth:()=>tourView('A','Solo <em>Authentic</em>','Season 13 Solo Authentic.'),
  coop:()=>{const t=D.trophies.filter(x=>x[1]==='C');const w=t.filter(x=>x[3]==='Player Trophy'),r=t.filter(x=>x[3]==='Runner-up');
    return {t:'Co-op <em>Tour</em>',p:'2v2 tournament. Individual goals and ratings are not tracked, only results.',
    b:`<div class="winners"><div class="win first"><span>S13 Champions</span><b>${w.map(x=>pname(x[2])).join(' & ')}</b></div>
      <div class="win"><span>S13 Runners-up</span><b>${r.map(x=>pname(x[2])).join(' & ')}</b></div></div>`}},
  goldenboot:()=>awardsView(3,'Golden <em>Boot</em>','Top scorer of each tournament.','goals'),
  goldenball:()=>awardsView(5,'Golden <em>Ball</em>','Highest rating of each tournament.','rating'),
  'mld-dor':ballonView,
  'side-quests':sideView,
  games:gamesView,
};
function tourView(ty,title,p){
  const k=sub[ty==='T'?'team':ty==='D'?'dream':'auth'];
  const list=tourStats(ty);
  const opts=[['g','Goals'],['r','Avg rating'],['w','Titles'],['apps','Appearances']];
  const sorted=[...list].sort((a,b)=>(b[k]??-1)-(a[k]??-1)||b.g-a.g);
  let head='';
  if(ty!=='T'){const t=D.trophies.filter(x=>x[0]===13&&x[1]===ty);
    head=`<div class="winners">${t.map((x,i)=>`<button class="win${i?'':' first'}" data-p="${esc(x[2])}"><span>${x[3]==='Player Trophy'?'Winner':x[3]}</span><b>${esc(x[2])}</b></button>`).join('')}</div>`;}
  const lab={g:'goals',r:'rating',w:'titles',apps:'apps'}[k];
  return {t:title,p,b:head+`<div class="pills">${opts.map(([v,l])=>`<button class="pill${v===k?' on':''}" data-sub="${ty}" data-k="${v}">${l}</button>`).join('')}</div>`+
    leaderboard(sorted,x=>k==='r'?fmt(x.r):x[k],lab,x=>`${x.g} goals · rating ${fmt(x.r)}${ty==='T'?` · ${s(x.apps,'season')}`:''}${x.w?` · ${s(x.w,'title')}`:''}`)};
}
function awardsView(k,title,p,unit){
  const wins={};D.awards.forEach(a=>names(a[k]).forEach(n=>wins[n]=(wins[n]||0)+1));
  const multi=Object.entries(wins).filter(e=>e[1]>1).sort((a,b)=>b[1]-a[1]);
  const sw=SEASON_AW.map(a=>`<div class="boot season"><div class="s">S${a[0]}</div><div class="who">${names(a[k]).map(pname).join(', ')}<small>Season-wide · best across all tours</small></div><div class="n">${a[k-1]}<small>${unit.toUpperCase()}</small></div></div>`).join('');
  return {t:title,p,b:(sw?`<h2 class="sec" style="margin-top:0">Season-wide <small>WHOLE SEASON</small></h2><div class="rows">${sw}</div><h2 class="sec">Per tournament <small>EACH TOUR</small></h2>`:'')+(multi.length?`<div class="winners">${multi.map(([n,c],i)=>`<button class="win${i?'':' first'}" data-p="${esc(n)}"><span>${c} times</span><b>${esc(n)}</b></button>`).join('')}</div>`:'')+
    `<div class="rows">${[...D.awards].reverse().map(a=>`<div class="boot"><div class="s">S${a[0]}</div><div class="who">${names(a[k]).map(pname).join(', ')}<small>${TYPE[a[1]]}</small></div><div class="n">${a[k-1]}<small>${unit.toUpperCase()}</small></div></div>`).join('')}</div>`};
}
function perSeason(n){return Array.from({length:13},(_,i)=>{const rs=D.log.filter(r=>r[2]===n&&r[0]===i+1);return rs.length?rs.reduce((s,r)=>s+(r[4]||0),0):null;})}
/* line graph: one series, gaps where the player did not play that season */
function chart(per,cls='',tips=null,marks=null){
  const W=360,H=180,L=30,R=14,T=22,B=26,iw=W-L-R,ih=H-T-B;
  const vals=per.filter(v=>v!=null);if(!vals.length)return '<p class="note">No goals recorded by season.</p>';
  const max=Math.max(10,Math.ceil(Math.max(...vals)*(marks?1.3:1.12)/10)*10);
  const x=i=>L+iw*i/12, y=v=>T+ih*(1-v/max);
  const segs=[];let cur=[];per.forEach((v,i)=>{if(v==null){if(cur.length)segs.push(cur);cur=[];}else cur.push([i,v]);});if(cur.length)segs.push(cur);
  const line=s=>s.map(([i,v],k)=>(k?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
  const area=s=>line(s)+`L${x(s[s.length-1][0]).toFixed(1)} ${y(0)}L${x(s[0][0]).toFixed(1)} ${y(0)}Z`;
  const peak=vals.indexOf(Math.max(...vals)), pts=per.map((v,i)=>v==null?null:i).filter(i=>i!=null);
  const peakI=pts[peak], lastI=pts[pts.length-1];
  const ticks=[0,max/2,max];
  const lab=(i,txt)=>`<text class="lv" x="${x(i)}" y="${y(per[i])-10}" text-anchor="${i===0?'start':i===12?'end':'middle'}">${txt}</text>`;
  return `<div class="lchart ${cls}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Goals by season line graph">
    ${ticks.map(v=>`<line class="gl" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L-6}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('')}
    ${per.map((_,i)=>`<text class="ax" x="${x(i)}" y="${H-8}" text-anchor="middle">S${i+1}</text>`).join('')}
    ${segs.map(s=>`<path class="ar" d="${area(s)}"/>`).join('')}
    ${segs.map(s=>`<path class="ln" pathLength="1" d="${line(s)}"/>`).join('')}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${y(0)}" style="opacity:0"/>
    ${per.map((v,i)=>v==null?'':`<circle style="--i:${i}" class="pt${i===peakI||i===lastI?' key':''}" cx="${x(i)}" cy="${y(v)}" r="${i===peakI||i===lastI?5:4}"/>`).join('')}
    ${marks?per.map((v,i)=>v!=null&&marks[i]?`<use class="mk" style="--i:${i}" href="#t-team" x="${x(i)-8}" y="${y(v)-(i===peakI||i===lastI?44:28)}" width="16" height="16"/>`:'').join(''):''}
    ${lab(peakI,per[peakI])}${lastI!==peakI?lab(lastI,per[lastI]):''}
    ${per.map((v,i)=>`<rect class="hit" x="${x(i)-iw/24}" y="${T-14}" width="${iw/12}" height="${ih+14}" data-i="${i}" data-x="${x(i)}" data-tip="${tips?esc(tips[i]):`S${i+1} · ${v==null?'did not play':v+' goal'+(v===1?'':'s')}`}"/>`).join('')}
  </svg><div class="tip" hidden></div></div>`;
}
document.addEventListener('pointermove',e=>{
  const h=e.target.closest&&e.target.closest('.lchart .hit');
  document.querySelectorAll('.lchart').forEach(c=>{if(!h||!c.contains(h)){c.querySelector('.tip').hidden=true;c.querySelector('.xh').style.opacity=0;}});
  if(!h)return;const c=h.closest('.lchart'),svg=c.querySelector('svg'),tip=c.querySelector('.tip'),xh=c.querySelector('.xh');
  const px=+h.dataset.x;xh.setAttribute('x1',px);xh.setAttribute('x2',px);xh.style.opacity=1;
  tip.textContent=h.dataset.tip;tip.hidden=false;const sc=svg.getBoundingClientRect().width/360;
  tip.style.left=Math.min(Math.max(px*sc,50),svg.getBoundingClientRect().width-50)+'px';
});
function ballonView(){
  const m=byName[GOAT];const rows=D.log.filter(r=>r[2]===GOAT);const tro=D.trophies.filter(t=>t[2]===GOAT);
  const gb=D.awards.filter(a=>names(a[5]).includes(GOAT)).map(a=>'S'+a[0]);
  const goalsRank=sortBy(D.players,'g').findIndex(p=>p.n===GOAT)+1;
  return {t:"MLD <em>D'or</em>",p:`${D.ballon.label}. Awarded once so far, and ${GOAT} is the only player to win it.`,
   b:`<div class="bdo-page"><div class="bigphoto"><img alt="${esc(GOAT)} holding the MLD D'or" src="${PHOTO}"><span class="tag">★ 1st MLD D'or · ${esc(GOAT)}</span></div>
   <div style="display:flex;flex-direction:column;gap:14px">
     <div class="kv"><div class="tile gold"><b>#1</b><span>Career rating</span></div><div class="tile red"><b>${m.g}</b><span>Goals · #${goalsRank}</span></div><div class="tile"><b>${m.t}</b><span>Tournaments</span></div>
       <div class="tile"><b>${fmt(m.r)}</b><span>Avg rating</span></div><div class="tile"><b>${m.pt}</b><span>Trophies</span></div><div class="tile"><b>${gb.length}</b><span>Golden Balls</span></div></div>
     <div class="how"><b style="font:400 1.3rem var(--display);text-transform:uppercase">How it was decided</b>
       <div class="split"><i></i><i></i></div><div class="lg"><span>Performance score 80%</span><span>Jury vote 20%</span></div>
       <p class="note">Built on Team Tour data from Seasons 1 to 12.</p></div>
     <div><h2 class="sec" style="margin-top:4px">Overall performance <small>BY SEASON</small></h2>${perfChart(GOAT)}</div>
     <div><h2 class="sec" style="margin-top:4px">Honours</h2><div class="chips"><span class="chip on" style="background:var(--gold);color:#1a1205">MLD D'or · S1–12</span>
       ${gb.map(x=>`<span class="chip on">Golden Ball · ${x}</span>`).join('')}${tro.map(t=>`<span class="chip${t[3]==='Player Trophy'?' on':''}">S${t[0]} ${t[3]==='Player Trophy'?'Champion':t[3]} · ${TYPE[t[1]]}</span>`).join('')}</div></div>
   </div></div>
   <h2 class="sec">Season log <small>${rows.length} ENTRIES</small></h2>${logTable(rows)}`};
}
const logTable=rows=>`<div class="tw"><table class="tbl"><thead><tr><th>Season</th><th>Event</th><th>Team</th><th class="num">Goals</th><th class="num">Rating</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>S${r[0]}</td><td>${TYPE[r[1]]}</td><td style="color:var(--muted)">${esc(r[3]||'–')}</td><td class="num">${r[4]??'–'}</td><td class="num">${r[5]??'–'}</td></tr>`).join('')}</tbody></table></div>`;


/* ---- mini games hub: every game lives here, so the menu stays short ---- */
const GAMES=[
  {id:'play',name:'MLD Flick',about:'Disc football. Pull back a disc, aim and flick it into the ball. Turn based.',tags:['Online','2 players','Turn based'],
   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="14" r="4"/><circle cx="17" cy="8" r="2.5"/><path d="M11 11l4-2"/></svg>'},
  {id:'turbo',name:'MLD Turbo',about:'Car football. Drive, jump, flip and boost to smash the ball into the goal.',tags:['Online','vs computer','2 players'],
   icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 15l2-5h9l4 3h3v2H3z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>'},
];
const LB_GAMES=[['flick','MLD Flick'],['turbo','MLD Turbo']];
let lbGame='flick',lbOff=null;
function gamesView(){
  setTimeout(mountLeaderboard,0);
  return {t:'Mini <em>Games</em>',p:'Quick games to play with the squad. Pick one to start.',
    b:`<div class="games">${GAMES.map(g=>`<button class="gcard" data-go="${g.id}"><span class="gi">${g.icon}</span><span><b>${g.name}</b><small>${g.about}</small><span class="tags">${g.tags.map(t=>`<span class="pill">${t}</span>`).join('')}</span></span></button>`).join('')}</div>
    <h2 class="sec">Mini games leaderboard <small>ONLINE WINS</small></h2>
    <div class="pills" id="lbTabs">${LB_GAMES.map(([k,n])=>`<button class="pill${k===lbGame?' on':''}" data-lb="${k}">${n}</button>`).join('')}</div>
    <div class="rows" id="lbRows"><p class="note">Loading…</p></div>`};
}
function mountLeaderboard(){
  const box=document.getElementById('lbRows');if(!box)return;if(lbOff){lbOff();lbOff=null;}
  lbOff=NET.onLeaderboard(lbGame,list=>{const b=document.getElementById('lbRows');if(!b)return;
    if(list===null){b.innerHTML='<p class="note">The leaderboard could not connect. Check your internet and reload.</p>';return;}
    b.innerHTML=list.length?list.slice(0,30).map((p,i)=>`<div class="row${i<3?' top3':''}"><div class="rk">${i+1}</div><div class="nm"><span class="av0">${esc(p.name.slice(0,2).toUpperCase())}</span><div><b>${esc(p.name)}</b><span>${p.wins} online win${p.wins===1?'':'s'}</span></div></div><div class="vl">${p.wins}<small>wins</small></div></div>`).join('')
      :'<p class="note">No wins yet. Win an online match and your name goes here first.</p>';});
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-lb]');if(!t)return;lbGame=t.dataset.lb;
  document.querySelectorAll('#lbTabs .pill').forEach(b=>b.classList.toggle('on',b.dataset.lb===lbGame));mountLeaderboard();});

function renderStat(){
  const v=VIEWS[cur]();
  $('#statEx').textContent=cur==='mld-dor'?'The':'Explore';
  $('#statTitle').innerHTML=v.t;$('#statSub').textContent=v.p;$('#statBody').innerHTML=v.b;
  const q=$('#q');if(q)q.addEventListener('input',()=>{lb.q=q.value;lb.limit=25;const pos=q.selectionStart;renderStat();const n=$('#q');n.focus();n.setSelectionRange(pos,pos);});
}

/* ---- player sheet ---- */
function openPlayer(n){
  const p=byName[n];if(!p)return;
  if(p.side){openSidePlayer(n);return;}
  playIntro(n);
  const rows=D.log.filter(r=>r[2]===n);const tro=D.trophies.filter(t=>t[2]===n);const goat=n===GOAT;
  $('#sheetBody').innerHTML=`<div class="grab"></div><button class="ibtn close" data-close="1" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    ${avatar(n,'bigav')}<div class="photo-tools" id="photoTools"></div>
    <div class="sub">All-time rank #${p.crk} · ${s(p.t,'tournament')}</div><h3>${esc(n)}</h3>
    ${cabinet(n)}
    <div class="kv"><div class="tile red"><b>${p.g}</b><span>Goals</span></div><div class="tile"><b>${fmt(p.r)}</b><span>Avg rating</span></div><div class="tile"><b>${fmt(p.cs)}</b><span>Career score</span></div>
      <div class="tile"><b>${p.pt}</b><span>Trophies</span></div><div class="tile"><b>${p.ru}</b><span>Runner-up</span></div><div class="tile"><b>${p.mt}</b><span>As manager</span></div></div>
    <h2 class="sec" style="margin-top:8px">Overall performance <small>BY SEASON</small></h2>${perfChart(n)}
    ${tro.length?`<h2 class="sec">Honours</h2><div class="chips">${tro.map(t=>`<span class="chip${/Trophy/.test(t[3])?' on':''}">S${t[0]} ${t[3]==='Player Trophy'?'Champion':t[3]==='Manager Trophy'?'Champion manager':t[3]} · ${TYPE[t[1]]}</span>`).join('')}</div>`:''}
    <h2 class="sec">Season log</h2>${logTable(rows)}`;
  $('#sheet').classList.add('on');$('#sheetBody').scrollTop=0;sheetOpen=n;renderPhotoTools(n);
  if(AUDIO[n])$('#photoTools').insertAdjacentHTML('afterend',`<button class="chip on" data-replay="1" style="border:0;margin:0 0 8px">▶ Play ${esc(n)}'s sound again</button>`);
}
let sheetOpen=null;
const closeSheet=()=>{$('#sheet').classList.remove('on');sheetOpen=null;stopIntro();};

/* ---- routing ---- */
function go(v){
  cur=VIEWS[v]||v==='play'||v==='turbo'?v:'';
  $('#v-home').classList.toggle('on',!cur);$('#v-stat').classList.toggle('on',!!cur&&cur!=='play'&&cur!=='turbo');$('#v-game').classList.toggle('on',cur==='play');$('#v-turbo').classList.toggle('on',cur==='turbo');
  if(cur==='play')FL.show();else FL.hide();
  if(cur==='turbo')TB.show();else TB.hide();
  if(cur&&VIEWS[cur]){lb={q:'',limit:25};renderStat();}
  const h=cur?'#'+cur:' ';
  try{history.replaceState(null,'',cur?'#'+cur:location.pathname+location.search)}catch(e){}
  window.scrollTo(0,0);replay();if(typeof markNav==='function')markNav();
}
function replay(){if(!document.body.classList.contains('ready'))return;
  document.body.classList.remove('ready');void document.body.offsetWidth;requestAnimationFrame(()=>document.body.classList.add('ready'));}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-go],[data-p],[data-more],[data-sub],[data-close]');
  if(!t){if(e.target.id==='sheet')closeSheet();return;}
  if(t.dataset.p!==undefined)return openPlayer(t.dataset.p);
  if(t.dataset.close)return closeSheet();
  if(t.dataset.more){lb.limit+=50;return renderStat();}
  if(t.dataset.sub){sub[t.dataset.sub==='T'?'team':t.dataset.sub==='D'?'dream':'auth']=t.dataset.k;lb.limit=25;return renderStat();}
  if(t.dataset.go!==undefined){go(t.dataset.go);if(t.dataset.focus)setTimeout(()=>$('#gq').focus(),60);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(h!==cur)go(h)});


/* ---- photos (shared, saved into the page) ---- */
const PHOTOS={}; /* uploaded photos are a claude.ai feature; on the website add files to images/players/ instead */
const SELF="";
const DEFAULT_FACE={Hudaifa:"images/players/Hudaifa.jpg",Cijin:"images/players/Cijin.jpg",Nezel:"images/players/Nezel.jpg",WaCky:"images/players/WaCky.jpg",Ashik:"images/players/Ashik.jpg",Vishnu:"images/players/Vishnu.jpg",Siyan:"images/players/Siyan.jpg",Salman:"images/players/Salman.jpg",Pranav:"images/players/Pranav.jpg",Nabeel:"images/players/Nabeel.jpg","Rashid":"images/players/Rashid.jpg","Ig Ezio":"images/players/Ig Ezio.jpg","Harris":"images/players/Harris.jpg","Millaj":"images/players/Millaj.jpg","Zainudheen":"images/players/Zainudheen.jpg","Zayidali Nahyan":"images/players/Zayidali Nahyan.jpg","Arjun":"images/players/Arjun.jpg","Arun":"images/players/Arun.jpg","Shahid Mubarak":"images/players/Shahid Mubarak.jpg","Senpai":"images/players/Senpai.jpg"};
const photoOf=n=>PHOTOS[n]?'/_blob/'+PHOTOS[n]:(n===GOAT?FACE:(DEFAULT_FACE[n]||null));
const initials=n=>n.replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';
function avatar(n,cls=''){const u=photoOf(n);
  return `<span class="av0 ${cls}${n===GOAT?' goat':''}">${u?`<img alt="" src="${u}" loading="lazy">`:esc(initials(n))}</span>`;}

/* ---- honours per player, MLD D'or first, then Team Tour, then the newer tournaments ---- */
const HON=[
  {k:'bdo',label:"MLD D'or",img:true},
  {k:'T',label:'Team Tour',sym:'#t-team',cls:'team'},
  {k:'M',label:'Team Tour',sym:'#t-team',cls:'team mgr',mgr:true},
  {k:'SGB',label:'Golden Ball',sym:'#t-ball',cls:'season',season:true},
  {k:'SGS',label:'Golden Boot',sym:'#t-boot',cls:'season',season:true},
  {k:'D',label:'Solo Dream Team',sym:'#t-dream'},
  {k:'A',label:'Solo Authentic',sym:'#t-auth'},
  {k:'C',label:'Co-op Tour',sym:'#t-coop'},
  {k:'GB',label:'Golden Ball',sym:'#t-ball'},
  {k:'GS',label:'Golden Boot',sym:'#t-boot'},
  {k:'RU-T',label:'Runner-up · Team Tour',sym:'#t-runner'},
  {k:'RU-D',label:'Runner-up · Solo Dream Team',sym:'#t-runner'},
  {k:'RU-A',label:'Runner-up · Solo Authentic',sym:'#t-runner'},
  {k:'RU-C',label:'Runner-up · Co-op',sym:'#t-runner'},
  {k:'SQ',label:'Side quest',mandi:true},
];
const honoursCache={};
function honours(n){
  if(honoursCache[n])return honoursCache[n];
  const c={};const add=k=>c[k]=(c[k]||0)+1;
  if(n===GOAT)add('bdo');
  D.trophies.forEach(t=>{if(t[2]!==n)return;
    if(t[3]==='Player Trophy')add(t[1]);else if(t[3]==='Manager Trophy')add('M');else if(t[3]==='Runner-up')add('RU-'+t[1]);});
  D.awards.forEach(a=>{if(names(a[5]).includes(n))add('GB');if(names(a[3]).includes(n))add('GS');});
  SEASON_AW.forEach(a=>{if(names(a[5]).includes(n))add('SGB');if(names(a[3]).includes(n))add('SGS');});
  SIDE.forEach(q=>{if(q.winner===n)add('SQ');});
  return honoursCache[n]=HON.filter(h=>c[h.k]).map(h=>({...h,n:c[h.k]}));
}
const icon=h=>h.mandi?`<img alt="" src="${MANDI_IC}" style="border-radius:50%">`:h.img?`<img alt="" src="${TROPHY}">`:`<svg class="tico"><use href="${h.sym}"/></svg>`;
function miniIcons(n){const hs=honours(n).filter(h=>!h.k.startsWith('RU'));if(!hs.length)return'';
  return `<div class="mini">${hs.map(h=>`<span${h.mgr?' class="mgr"':h.season?' class="season"':''} title="${h.mgr?'Team Tour (as manager)':h.season?'Season-wide '+esc(h.label):esc(h.label)}">${icon(h)}${h.mgr?'<b class="asmgr">MGR</b>':''}${h.season?'<b class="asseason">SEASON</b>':''}${h.n>1?'×'+h.n:''}</span>`).join('')}</div>`;}
function cabinet(n){const hs=honours(n);if(!hs.length)return '<p class="note">No trophies yet.</p>';
  return `<div class="cabinet">${hs.map((h,i)=>`<div class="cab${h.k==='bdo'?' first':''}${h.cls?' '+h.cls:''}"><div class="pl8">${h.mandi?`<img alt="" src="${MANDI_IC}" style="border-radius:50%;width:54px;height:54px;object-fit:cover">`:h.img?`<img alt="" src="${TROPHY}">`:`<svg><use href="${h.sym}"/></svg>`}</div>
    ${h.n>1?`<i>×${h.n}</i>`:''}<small>${esc(h.label).replace(' · ','<br>')}${h.mgr?'<br><em class="asmgr">(As manager)</em>':''}${h.season?'<br><em class="asseason">(Season-wide)</em>':''}</small></div>`).join('')}</div>`;}

/* ---- global search ---- */
function renderGlobal(){
  const q=$('#gq').value.trim().toLowerCase();
  if(!q){$('#gres').innerHTML='';return;}
  const hits=Object.values(byName).filter(p=>p.n.toLowerCase().includes(q)).sort((a,b)=>a.n.toLowerCase().indexOf(q)-b.n.toLowerCase().indexOf(q)||b.g-a.g).slice(0,12);
  $('#gres').innerHTML=hits.map(p=>`<button class="row${p.n===GOAT?' goat':''}" data-p="${esc(p.n)}"><div class="rk">#${p.crk}</div>
    <div class="nm">${avatar(p.n)}<div><b>${esc(p.n)}</b><span>${p.g} goals · rating ${fmt(p.r)}</span>${miniIcons(p.n)}</div></div>
    <div class="vl">${p.g}<small>goals</small></div></button>`).join('')||'<p class="note">No player called that. Check the spelling.</p>';
}
$('#gq').addEventListener('input',renderGlobal);

/* ---- photo upload (editors only) ---- */
let assetsNS=null, artifactNS=null, canSave=null;
(async()=>{try{
  const c=window.claude; if(!c||!c.use)return;
  const [a,b]=await Promise.all([c.use('assets'),c.use('artifact')]);
  assetsNS=a;artifactNS=b;canSave=!!(a&&b);
  if(sheetOpen)renderPhotoTools(sheetOpen);
}catch(e){}})();
function renderPhotoTools(n){
  const box=$('#photoTools');if(!box)return;
  if(!canSave){box.innerHTML='';return;}
  box.innerHTML=`<label class="primary" for="photoIn">${PHOTOS[n]?'Change photo':'Add photo'}</label>
    <input type="file" id="photoIn" accept="image/*" hidden>${PHOTOS[n]?'<button data-rmphoto="1">Remove photo</button>':''}<span id="photoMsg"></span>`;
  $('#photoIn').addEventListener('change',e=>{const f=e.target.files[0];if(f)savePhoto(n,f);});
}
function shrink(file){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(1,640/Math.max(img.width,img.height));const c=document.createElement('canvas');
    c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('encode')),'image/jpeg',.86);};
  img.onerror=()=>rej(new Error('read'));img.src=u;});}
function buildPage(map){
  const slotS='__SELF'+'_SLOT__', slotP='__PHOTOS'+'_SLOT__';
  const js=v=>JSON.stringify(v).replace(/</g,'\\u003c');
  const parts=SELF.split(slotS);
  const body=parts[0].split(slotP).join(js(map))+js(SELF)+parts[1].split(slotP).join(js(map));
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'+body+'</body></html>';
}
async function publishPhotos(map,n){
  const msg=$('#photoMsg');
  try{ try{sessionStorage.setItem('mld.reopen',n)}catch(e){}
    await artifactNS.publish(buildPage(map));
  }catch(e){
    if(e&&e.code==='conflict'){msg.textContent='Someone else just saved. Reloading with their changes.';return;}
    if(e&&(e.code==='not_writer'||e.code==='not_granted'||e.code==='capability_disabled')){canSave=false;msg.textContent='Only people who can edit this page can change photos.';return;}
    msg.textContent='Could not save the photo. Try again in a moment.';
  }
}
async function savePhoto(n,file){
  const msg=$('#photoMsg');msg.textContent='Uploading…';
  try{const blob=await shrink(file);const r=await assetsNS.upload(blob,{filename:n.replace(/\W+/g,'-')+'.jpg'});
    msg.textContent='Saving…';await publishPhotos({...PHOTOS,[n]:r.id},n);
  }catch(e){msg.textContent=e&&e.code==='quota_exceeded'?'Photo storage is full. Remove some photos first.':'Could not upload that image. Try a JPG or PNG.';}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rmphoto]');if(!b||!sheetOpen)return;
  const m={...PHOTOS};delete m[sheetOpen];$('#photoMsg').textContent='Saving…';publishPhotos(m,sheetOpen);});

/* ---- side quests (kept low-key, not part of main honours) ---- */
const MANDI="images/side-quests/mandi-challenge.jpg", MANDI_IC="images/trophies/mandi.jpg";
const SIDE=[{id:'mandi',name:'Mandi Challenge',game:'eFootball',winner:'Hudaifa',length:'1 week',wins:10,
  about:'A week of quick eFootball tournaments. Whoever wins the most takes the mandi.',prize:'Quarter mandi',img:MANDI}];
SIDE.forEach(q=>{if(!byName[q.winner])byName[q.winner]={n:q.winner,g:0,t:0,pt:0,ru:0,mt:0,side:true};});
function sideView(){
  return {t:'Side <em>Quests</em>',p:'Fun challenges outside the main MLD tournaments. They do not count toward all-time stats.',
   b:SIDE.map(q=>`<div class="quest"><img alt="Hudaifa holding the QT Mandhi Challenge champion trophy" src="${q.img}">
     <div class="qb"><div class="tags"><span class="chip on">${esc(q.game)}</span><span class="chip">${esc(q.length)}</span></div>
       <h3>${esc(q.name)}</h3><p class="note" style="margin:0">${esc(q.about)}</p>
       <button class="who" data-p="${esc(q.winner)}" style="border:0;text-align:left;color:inherit">${avatar(q.winner)}<div><small>Winner</small><b>${esc(q.winner)}</b></div></button>
       <div class="facts"><div class="tile red"><b>${q.wins}</b><span>Tournaments won</span></div><div class="tile"><b style="font-size:1.3rem;line-height:1.2">${esc(q.prize)}</b><span>Prize</span></div></div>
     </div></div>`).join('')};
}
function openSidePlayer(n){
  const qs=SIDE.filter(q=>q.winner===n);
  $('#sheetBody').innerHTML=`<div class="grab"></div><button class="ibtn close" data-close="1" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    ${avatar(n,'bigav')}<div class="photo-tools" id="photoTools"></div>
    <div class="sub">Side quest player</div><h3>${esc(n)}</h3>${cabinet(n)}
    <p class="note">No main MLD tournament stats recorded for ${esc(n)} yet.</p>
    <h2 class="sec">Side quests</h2><div class="rows">${qs.map(q=>`<button class="boot" data-go="side-quests" style="width:100%;text-align:left;color:inherit"><div class="s" style="font-size:.9rem">${esc(q.game)}</div><div class="who">${esc(q.name)}<small>Won ${q.wins} quick tournaments in ${esc(q.length)} · ${esc(q.prize)}</small></div><div class="n">1st</div></button>`).join('')}</div>`;
  $('#sheet').classList.add('on');$('#sheetBody').scrollTop=0;sheetOpen=n;renderPhotoTools(n);
}

/* ---- player sounds: play when a profile is opened (the tap counts as the user gesture) ---- */
const AUDIO={Vishnu:"audio/Vishnu.m4a",Nezel:"audio/Nezel.m4a",Cijin:"audio/Cijin.m4a",Harris:"audio/Harris.m4a",Midhun:"audio/Midhun.m4a",Pranav:"audio/Pranav.m4a"};
let introAudio=null;
function stopIntro(){if(introAudio){introAudio.pause();introAudio.currentTime=0;}}
function playIntro(n){stopIntro();if(!AUDIO[n])return;
  try{introAudio=new Audio(AUDIO[n]);introAudio.play().catch(()=>{});}catch(e){}}
document.addEventListener('click',e=>{if(e.target.closest('[data-replay]')&&sheetOpen)playIntro(sheetOpen);});

/* start each graph's animation the first time it is on screen */
(function(){
  const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('play');io.unobserve(e.target);}}),{threshold:.35}):null;
  const arm=el=>{if(el.dataset.armed)return;el.dataset.armed=1;if(io)io.observe(el);else el.classList.add('play');};
  new MutationObserver(()=>document.querySelectorAll('.lchart:not([data-armed])').forEach(arm)).observe(document.body,{childList:true,subtree:true});
})();

/* ---- overall performance per season: goals + rating + honour bonuses ---- */
const BONUS={'Player Trophy':20,'Manager Trophy':10,'Runner-up':10,'3rd Place':5,'4th Place':5,'5th Place':5};
function perfSeason(n){
  return Array.from({length:13},(_,i)=>{const s=i+1;
    const rs=D.log.filter(r=>r[2]===n&&r[0]===s);
    const tr=D.trophies.filter(t=>t[2]===n&&t[0]===s);
    const aw=D.awards.filter(a=>a[0]===s);
    const gb=aw.filter(a=>names(a[5]).includes(n)).length, gs=aw.filter(a=>names(a[3]).includes(n)).length;
    const sw=SEASON_AW.filter(a=>a[0]===s),sgb=sw.filter(a=>names(a[5]).includes(n)).length,sgs=sw.filter(a=>names(a[3]).includes(n)).length;
    if(!rs.length&&!tr.length)return null;
    const g=rs.reduce((a,r)=>a+(r[4]||0),0), rt=rs.reduce((a,r)=>a+(r[5]||0),0);
    const bonus=tr.reduce((a,t)=>a+(BONUS[t[3]]||0),0)+10*gb+10*gs+15*sgb+15*sgs;
    const bits=[g+' goals','rating '+rt];
    tr.forEach(t=>bits.push(t[3]==='Player Trophy'?'champion':t[3]==='Manager Trophy'?'champion manager':t[3].toLowerCase()));
    if(gb)bits.push('Golden Ball');if(gs)bits.push('Golden Boot');if(sgb)bits.push('Season Golden Ball');if(sgs)bits.push('Season Golden Boot');
    return {v:Math.round(g+rt+bonus),tip:`S${s} · ${Math.round(g+rt+bonus)} pts · ${bits.join(', ')}`,cup:tr.some(t=>/Trophy/.test(t[3]))};
  });
}
function perfChart(n){
  const ps=perfSeason(n);
  return chart(ps.map(p=>p?p.v:null),'',ps.map((p,i)=>p?p.tip:`S${i+1} · did not play`),ps.map(p=>!!(p&&p.cup)))+
   `<p class="perf-note">Points each season = goals + rating + 20 per title won, 10 per runner-up finish, Golden Boot or Golden Ball, 15 per season-wide Golden Boot or Golden Ball, and 5 for a 3rd–5th place. A cup marks a season they won a title.</p>`;
}

renderHome();go(location.hash.slice(1));
try{const r=sessionStorage.getItem('mld.reopen');if(r){sessionStorage.removeItem('mld.reopen');setTimeout(()=>openPlayer(r),2500);}}catch(e){}

/* ---- intro ---- */
(function(){
  const intro=$('#intro'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let done=false;
  const finish=()=>{if(done)return;done=true;intro.classList.add('out');document.body.classList.add('ready');setTimeout(()=>intro.remove(),900);};
  requestAnimationFrame(()=>intro.classList.add('play'));
  setTimeout(finish,reduce?500:2400);intro.addEventListener('click',finish);
})();
