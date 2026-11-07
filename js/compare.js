/* ================= Compare: two players head to head =================
   Loaded after app.js and uses its data and helpers (D, byName, honours, perfSeason, avatar, cabinet, esc, fmt). */
(function(){
  const CMP={a:null,b:null,active:0,done:false};
  const pool=()=>D.players.filter(p=>!p.side);

  /* ---------- per-player numbers ---------- */
  function statsOf(n){
    const p=byName[n],h={};honours(n).forEach(x=>h[x.k]=x.n);
    const rows=D.log.filter(r=>r[2]===n);
    const tour=t=>rows.filter(r=>r[1]===t);
    const avg=a=>{const v=a.filter(r=>r[5]!=null);return v.length?v.reduce((s,r)=>s+r[5],0)/v.length:null;};
    const team=tour('T'),solo=rows.filter(r=>r[1]==='D'||r[1]==='A');
    const perf=perfSeason(n),played=perf.filter(Boolean);
    const bestSeasonGoals=Math.max(0,...Array.from({length:13},(_,i)=>rows.filter(r=>r[0]===i+1).reduce((s,r)=>s+(r[4]||0),0)));
    const bestRating=Math.max(0,...rows.map(r=>r[5]||0));
    const titles=p.pt,finals=p.pt+p.ru;
    return {n,p,h,
      goals:p.g,tournaments:p.t,gpt:p.t?p.g/p.t:0,rating:p.r||0,career:p.cs||0,rank:p.crk,
      titles,runners:p.ru,managers:p.mt,finals,finalWin:finals?titles/finals:null,
      boots:h.GS||0,balls:h.GB||0,sboots:h.SGS||0,sballs:h.SGB||0,dor:h.bdo||0,
      teamGoals:team.reduce((s,r)=>s+(r[4]||0),0),teamRating:avg(team),teamTitles:h.T||0,
      soloGoals:solo.reduce((s,r)=>s+(r[4]||0),0),soloRating:avg(solo),
      bestSeasonGoals,bestRating,
      perfAvg:played.length?played.reduce((s,x)=>s+x.v,0)/played.length:0,perfBest:played.length?Math.max(...played.map(x=>x.v)):0,
      perf,seasons:played.length};
  }
  let maxCache=null;
  function leagueMax(){ // best value in the whole league for each metric, so the MLD Index is on a fair 0–100 scale
    if(maxCache)return maxCache;const all=pool().map(p=>statsOf(p.n));const m={};
    ['goals','career','rating','titles','runners','managers','boots','balls','sboots','sballs','perfAvg','perfBest','tournaments'].forEach(k=>m[k]=Math.max(...all.map(s=>s[k]||0))||1);
    return maxCache=m;
  }
  /* MLD Index: one 0–100 number for "who was better for MLD" */
  const WEIGHTS=[['career','Career rating',24],['goals','Goals',16],['titles','Titles won',18],['perfAvg','Season performance',14],
    ['rating','Average rating',8],['awards','Season awards',8],['runners','Finals reached (runner-up)',4],['tournaments','Experience',4],['dor','MLD D\'or',4]];
  function index(s){const m=leagueMax();let tot=0;const parts={};
    WEIGHTS.forEach(([k,,w])=>{let v;
      if(k==='awards')v=Math.min(1,(s.boots+s.balls+2*(s.sboots+s.sballs))/Math.max(1,(m.boots+m.balls+2*(m.sboots+m.sballs))/1.5));
      else if(k==='dor')v=s.dor?1:0;
      else v=Math.min(1,(s[k]||0)/m[k]);
      parts[k]=v*w;tot+=v*w;});
    return {score:Math.round(tot*10)/10,parts};}

  /* ---------- All-time rank = rank by MLD Index, for every player, everywhere on the site ---------- */
  (function rankAll(){
    const ranked=pool().map(p=>{const s=statsOf(p.n),ix=index(s);p.mi=ix.score;p.miParts=ix.parts;return p;})
      .sort((a,b)=>b.mi-a.mi||b.g-a.g||a.n.localeCompare(b.n));
    ranked.forEach((p,i)=>p.crk=i+1);
  })();
  window.MLDI={statsOf,index,WEIGHTS,ranked:()=>pool().slice().sort((a,b)=>a.crk-b.crk)};

  /* ---------- categories (higher is better unless low:true) ---------- */
  const CATS=[
    ['Career','career','Career rating score',v=>fmt(v)],
    ['Career','rank','All-time rank',v=>'#'+v,{low:true}],
    ['Career','tournaments','Tournaments played',v=>v],
    ['Scoring','goals','Total goals',v=>v],
    ['Scoring','gpt','Goals per tournament',v=>v.toFixed(1)],
    ['Scoring','bestSeasonGoals','Most goals in one season',v=>v],
    ['Scoring','sboots','Season Golden Boots',v=>v],
    ['Scoring','boots','Golden Boots (per tour)',v=>v],
    ['Rating','rating','Average rating',v=>fmt(v)],
    ['Rating','bestRating','Best single rating',v=>v],
    ['Rating','sballs','Season Golden Balls',v=>v],
    ['Rating','balls','Golden Balls (per tour)',v=>v],
    ['Trophies','titles','Titles won',v=>v],
    ['Trophies','finals','Finals reached',v=>v],
    ['Trophies','finalWin','Finals won %',v=>v==null?'–':Math.round(v*100)+'%',{skipNull:true}],
    ['Trophies','managers','Titles as manager',v=>v],
    ['Trophies','dor','MLD D\'or',v=>v?'★ Winner':'–'],
    ['Team Tour','teamGoals','Team Tour goals',v=>v],
    ['Team Tour','teamRating','Team Tour avg rating',v=>fmt(v),{skipNull:true}],
    ['Team Tour','teamTitles','Team Tour titles',v=>v],
    ['Solo','soloGoals','Solo goals (S13+)',v=>v],
    ['Solo','soloRating','Solo avg rating',v=>fmt(v),{skipNull:true}],
    ['Form','perfAvg','Avg season points',v=>Math.round(v)],
    ['Form','perfBest','Best season points',v=>Math.round(v)],
  ];
  function judge(A,B){
    let wa=0,wb=0;const rows=CATS.map(([grp,k,label,f,o={}])=>{
      const a=A[k],b=B[k];
      if(o.skipNull&&(a==null||b==null))return {grp,label,fa:a==null?'–':f(a),fb:b==null?'–':f(b),w:-1,a:a||0,b:b||0,low:o.low};
      const av=a||0,bv=b||0;let w=0;
      if(av!==bv){w=(o.low?av<bv:av>bv)?1:2;w===1?wa++:wb++;}
      return {grp,label,fa:f(a),fb:f(b),w,a:av,b:bv,low:o.low};});
    return {rows,wa,wb};
  }
  function headToHead(a,b){
    const fin=[];for(let s=1;s<=13;s++){const t=D.trophies.filter(x=>x[0]===s&&x[1]==='T');
      const aw=t.some(x=>x[2]===a&&x[3]==='Player Trophy'),bw=t.some(x=>x[2]===b&&x[3]==='Player Trophy');
      const ar=t.some(x=>x[2]===a&&x[3]==='Runner-up'),br=t.some(x=>x[2]===b&&x[3]==='Runner-up');
      if(aw&&br)fin.push([s,a]);if(bw&&ar)fin.push([s,b]);}
    const mates=[],both=[];for(let s=1;s<=13;s++){const ra=D.log.find(r=>r[0]===s&&r[1]==='T'&&r[2]===a),rb=D.log.find(r=>r[0]===s&&r[1]==='T'&&r[2]===b);
      if(ra&&rb){both.push(s);if(ra[3]&&ra[3]===rb[3])mates.push([s,ra[3]]);}}
    let sa=0,sb=0;both.forEach(s=>{const ga=D.log.filter(r=>r[0]===s&&r[2]===a).reduce((x,r)=>x+(r[4]||0),0),gb=D.log.filter(r=>r[0]===s&&r[2]===b).reduce((x,r)=>x+(r[4]||0),0);if(ga>gb)sa++;else if(gb>ga)sb++;});
    return {fin,mates,both,sa,sb};
  }

  /* ---------- graphs ---------- */
  function twoLine(A,B){ // overall performance by season, both players on one scale
    const W=360,H=190,L=30,R=14,T=24,Bm=26,iw=W-L-R,ih=H-T-Bm;
    const pa=A.perf.map(x=>x?x.v:null),pb=B.perf.map(x=>x?x.v:null);
    const all=[...pa,...pb].filter(v=>v!=null);const max=Math.max(10,Math.ceil(Math.max(...all,1)*1.12/10)*10);
    const x=i=>L+iw*i/12,y=v=>T+ih*(1-v/max);
    const path=per=>{let d='',pen=false;per.forEach((v,i)=>{if(v==null){pen=false;return;}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);pen=true;});return d;};
    const dots=(per,cls)=>per.map((v,i)=>v==null?'':`<circle style="--i:${i}" class="pt ${cls}" cx="${x(i)}" cy="${y(v)}" r="3.6"/>`).join('');
    const tips=pa.map((v,i)=>`S${i+1} · ${A.n} ${v==null?'–':v} · ${B.n} ${pb[i]==null?'–':pb[i]}`);
    return `<div class="lchart cmpline"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Overall performance by season for both players">
      ${[0,max/2,max].map(v=>`<line class="gl" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L-6}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('')}
      ${pa.map((_,i)=>`<text class="ax" x="${x(i)}" y="${H-8}" text-anchor="middle">S${i+1}</text>`).join('')}
      <path class="ln sa" pathLength="1" d="${path(pa)}"/><path class="ln sb" pathLength="1" d="${path(pb)}"/>
      <line class="xh" x1="0" x2="0" y1="${T}" y2="${y(0)}" style="opacity:0"/>
      ${dots(pa,'sa')}${dots(pb,'sb')}
      ${pa.map((_,i)=>`<rect class="hit" x="${x(i)-iw/24}" y="${T-14}" width="${iw/12}" height="${ih+14}" data-x="${x(i)}" data-tip="${esc(tips[i])}"/>`).join('')}
    </svg><div class="tip" hidden></div></div>`;
  }
  function radar(A,B){ // six skills, each as a share of the best in the league
    const m=leagueMax(),ax=[['Scoring',s=>s.goals/m.goals],['Rating',s=>s.rating/m.rating],['Titles',s=>s.titles/m.titles],
      ['Awards',s=>Math.min(1,(s.boots+s.balls+2*(s.sboots+s.sballs))/Math.max(1,(m.boots+m.balls+2*(m.sboots+m.sballs))/1.5))],['Form',s=>s.perfAvg/m.perfAvg],['Experience',s=>s.tournaments/m.tournaments]];
    const C=110,R=78,n=ax.length,pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [C+Math.cos(a)*R*v,C+Math.sin(a)*R*v];};
    const poly=s=>ax.map(([,f],i)=>pt(i,Math.max(0.03,Math.min(1,f(s)||0))).map(v=>v.toFixed(1)).join(',')).join(' ');
    const rings=[.25,.5,.75,1].map(k=>`<polygon class="rg" points="${ax.map((_,i)=>pt(i,k).join(',')).join(' ')}"/>`).join('');
    const spokes=ax.map((_,i)=>{const [x2,y2]=pt(i,1);return `<line class="rg" x1="${C}" y1="${C}" x2="${x2}" y2="${y2}"/>`;}).join('');
    const labels=ax.map(([l],i)=>{const [lx,ly]=pt(i,1.2);return `<text class="rl" x="${lx}" y="${ly+4}" text-anchor="${Math.abs(lx-C)<4?'middle':lx>C?'start':'end'}">${l}</text>`;}).join('');
    return `<svg class="radar" viewBox="-30 -6 280 232" role="img" aria-label="Skill radar comparing both players">${rings}${spokes}
      <polygon class="ra" points="${poly(A)}"/><polygon class="rb" points="${poly(B)}"/>${labels}</svg>`;
  }
  function barRow(r,A,B){
    const tot=Math.max(r.a,r.b)||1,la=r.low?(r.a?Math.min(r.a,r.b)/r.a:0):r.a/tot,lb=r.low?(r.b?Math.min(r.a,r.b)/r.b:0):r.b/tot;
    return `<div class="crow${r.w===1?' wa':r.w===2?' wb':''}">
      <div class="cv a">${r.w===1?'<i>✓</i>':''}${r.fa}</div>
      <div class="cm"><span>${r.label}</span><div class="cbars"><div class="cb a"><s style="width:${Math.round(la*100)}%"></s></div><div class="cb b"><s style="width:${Math.round(lb*100)}%"></s></div></div></div>
      <div class="cv b">${r.fb}${r.w===2?'<i>✓</i>':''}</div></div>`;
  }

  /* ---------- page ---------- */
  function slot(i){const n=i===0?CMP.a:CMP.b;
    return `<button class="cslot${CMP.active===i?' active':''}${n?' full':''} s${i}" data-cslot="${i}">
      ${n?`${avatar(n,'cav')}<b>${esc(n)}</b>${founderTag(n,'sm')}<small>Rank #${byName[n].crk} · ${byName[n].g} goals</small><span class="cx" data-cclear="${i}" aria-label="Remove">✕</span>`
        :`<span class="cplus">+</span><b>Player ${i+1}</b><small>Tap, then search below</small>`}</button>`;}
  function view(){
    setTimeout(bind,0);
    const ready=CMP.a&&CMP.b&&CMP.a!==CMP.b;
    return {t:'Compare <em>Players</em>',p:'Pick two players and see who has been better for MLD, stat by stat.',
      b:`<div class="cslots">${slot(0)}<div class="cvs">VS</div>${slot(1)}</div>
        <label class="search" for="cmpQ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input id="cmpQ" placeholder="Search a player for Player ${CMP.active+1}" autocomplete="off"></label>
        <div class="rows" id="cmpSug"></div>
        <button class="flbtn red cgo" data-cgo="1" ${ready?'':'disabled'}>Compare</button>
        <div id="cmpOut">${CMP.done&&ready?result(CMP.a,CMP.b):''}</div>`};
  }
  function bind(){
    const q=document.getElementById('cmpQ');if(!q)return;
    q.addEventListener('input',()=>sug(q.value));
  }
  function sug(v){
    const box=document.getElementById('cmpSug');if(!box)return;const q=v.trim().toLowerCase();
    if(!q){box.innerHTML='';return;}
    const other=CMP.active===0?CMP.b:CMP.a;
    const hits=pool().filter(p=>p.n.toLowerCase().includes(q)&&p.n!==other)
      .sort((a,b)=>(a.n.toLowerCase().startsWith(q)?0:1)-(b.n.toLowerCase().startsWith(q)?0:1)||b.g-a.g).slice(0,8);
    box.innerHTML=hits.map(p=>`<button class="row" data-cpick="${esc(p.n)}"><div class="rk">#${p.crk}</div><div class="nm">${avatar(p.n)}<div><b>${esc(p.n)}</b><span>${p.g} goals · rating ${fmt(p.r)}</span>${miniIcons(p.n)}</div></div><div class="vl">${p.g}<small>goals</small></div></button>`).join('')
      ||'<p class="note">No player with that name.</p>';
  }
  function rerender(scrollTo){renderStat();if(scrollTo){const el=document.getElementById(scrollTo);if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),60);}}
  document.addEventListener('click',e=>{
    const x=e.target.closest('[data-cclear]');if(x){e.stopPropagation();const i=+x.dataset.cclear;if(i===0)CMP.a=null;else CMP.b=null;CMP.active=i;CMP.done=false;rerender();return;}
    const s=e.target.closest('[data-cslot]');if(s){CMP.active=+s.dataset.cslot;CMP.done=false;rerender();setTimeout(()=>{const q=document.getElementById('cmpQ');if(q)q.focus();},80);return;}
    const p=e.target.closest('[data-cpick]');if(p){const n=p.dataset.cpick;
      if(CMP.active===0)CMP.a=n;else CMP.b=n;CMP.done=false;
      CMP.active=!CMP.a?0:!CMP.b?1:CMP.active;rerender();if(!(CMP.a&&CMP.b))setTimeout(()=>{const q=document.getElementById('cmpQ');if(q)q.focus();},80);return;}
    if(e.target.closest('[data-cgo]')){CMP.done=true;rerender('cmpOut');}
  },true);

  function result(a,b){
    const A=statsOf(a),B=statsOf(b),IA=index(A),IB=index(B),J=judge(A,B),HH=headToHead(a,b);
    const win=IA.score===IB.score?(J.wa===J.wb?0:J.wa>J.wb?1:2):IA.score>IB.score?1:2;
    const W=win===1?A:win===2?B:null,Lo=win===1?B:A;
    const margins=J.rows.filter(r=>r.w>0&&(win===0||r.w===win)).map(r=>({r,m:Math.abs(r.a-r.b)/Math.max(r.a,r.b,1)})).sort((x,y)=>y.m-x.m).slice(0,3);
    const groups=[...new Set(CATS.map(c=>c[0]))];
    const gwin=g=>{const rs=J.rows.filter(r=>r.grp===g);const x=rs.filter(r=>r.w===1).length,y=rs.filter(r=>r.w===2).length;return x>y?1:y>x?2:0;};
    const fin=HH.fin.length?HH.fin.map(([s,w])=>`<span class="chip on">S${s} final · ${esc(w)} won</span>`).join(''):'<span class="chip">Never met in a Team Tour final</span>';
    return `<div class="cres">
      <div class="cverdict ${win===1?'va':win===2?'vb':'vd'}">
        <span class="ctag">${win?'The better MLD player':'Too close to call'}</span>
        ${W?`<div class="cwin">${avatar(W.n,'cwav')}<div><b>${esc(W.n)}</b>${founderTag(W.n)}<small>wins ${win===1?J.wa:J.wb} categories to ${win===1?J.wb:J.wa}</small></div></div>`:`<div class="cwin"><div><b>Dead even</b><small>${J.wa} – ${J.wb} in categories</small></div></div>`}
        <div class="cidx"><div class="${win===1?'on':''}"><small>${esc(a)}</small><b>${IA.score}</b></div><span>MLD Index</span><div class="${win===2?'on':''}"><small>${esc(b)}</small><b>${IB.score}</b></div></div>
        <div class="cidxbar"><i class="a" style="width:${IA.score}%"></i></div><div class="cidxbar"><i class="b" style="width:${IB.score}%"></i></div>
      </div>
      <h2 class="sec">Overall performance <small>BY SEASON</small></h2>
      <div class="clegend"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></div>${twoLine(A,B)}
      <p class="note">Points each season = goals + rating + bonuses for titles, finals and awards (the same score as on player profiles). Gaps mean they did not play that season.</p>
      <div class="ctwo">
        <div><h2 class="sec">Skill radar</h2><div class="clegend"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></div>${radar(A,B)}
          <p class="note">Each point is a share of the best in MLD history. Bigger shape, better player.</p></div>
        <div><h2 class="sec">Category wins</h2>
          <div class="cgroups">${groups.map(g=>{const w=gwin(g);return `<div class="cg ${w===1?'a':w===2?'b':''}"><span>${g}</span><b>${w===1?esc(a):w===2?esc(b):'Even'}</b></div>`;}).join('')}</div>
          <div class="cscore"><div class="a"><b>${J.wa}</b><small>${esc(a)}</small></div><span>categories</span><div class="b"><b>${J.wb}</b><small>${esc(b)}</small></div></div></div>
      </div>
      <h2 class="sec">Stat by stat</h2>
      <div class="cnames"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></div>
      ${groups.map(g=>`<div class="cgroup"><div class="cgt">${g}</div>${J.rows.filter(r=>r.grp===g).map(r=>barRow(r,A,B)).join('')}</div>`).join('')}
      <h2 class="sec">Head to head</h2>
      <div class="chh">
        <div class="tile"><b>${HH.both.length}</b><span>Team Tour seasons both played</span></div>
        <div class="tile"><b>${HH.mates.length}</b><span>Seasons as teammates</span></div>
        <div class="tile"><b>${HH.sa}–${HH.sb}</b><span>Seasons outscoring the other</span></div>
      </div>
      <div class="chips" style="margin-top:10px">${fin}${HH.mates.map(([s,t])=>`<span class="chip">S${s} teammates · ${esc(t)}</span>`).join('')}</div>
      <h2 class="sec">Trophy cabinets</h2>
      <div class="ccab"><div><b class="cct a">${esc(a)}</b>${cabinet(a)}</div><div><b class="cct b">${esc(b)}</b>${cabinet(b)}</div></div>
      <div class="cfinal ${win===1?'va':win===2?'vb':'vd'}">
        <span class="ctag">Final verdict</span>
        <b>${W?`${esc(W.n)} has been the better player for MLD.`:`${esc(a)} and ${esc(b)} are level.`}</b>
        <p>${W?`${esc(W.n)} leads the MLD Index ${Math.max(IA.score,IB.score)} to ${Math.min(IA.score,IB.score)} and wins ${win===1?J.wa:J.wb} categories to ${win===1?J.wb:J.wa} (the rest are level).`:`Same MLD Index and the same number of categories won.`}
          ${margins.length?` Biggest edges: ${margins.map(x=>`${x.r.label} (${win===1||(!win&&x.r.w===1)?x.r.fa:x.r.fb} vs ${win===1||(!win&&x.r.w===1)?x.r.fb:x.r.fa})`).join(', ')}.`:''}
          ${W&&Lo&&(win===1?J.wb:J.wa)>0?` ${esc(Lo.n)} still wins ${win===1?J.wb:J.wa} categories.`:''}</p>
        <p class="note">The MLD Index (0–100) weighs career rating ${WEIGHTS[0][2]}%, titles ${WEIGHTS[2][2]}%, goals ${WEIGHTS[1][2]}%, season performance ${WEIGHTS[3][2]}%, average rating, awards, finals, experience and the MLD D'or, each measured against the best in MLD history.</p>
        <div class="flrow"><button class="flbtn red" data-cshare="1">Share card</button><button class="flbtn" data-cswap="1">Swap sides</button></div>
      </div>
    </div>`;
  }
  /* ---------- share card: a branded 1080×1350 image of the head-to-head ---------- */
  const loadImg=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
  async function shareCard(a,b){
    const A=statsOf(a),B=statsOf(b),IA=index(A),IB=index(B),J=judge(A,B);
    const win=IA.score===IB.score?(J.wa===J.wb?0:J.wa>J.wb?1:2):IA.score>IB.score?1:2;
    try{await Promise.all(['400 80px Anton','700 40px "Barlow Condensed"','500 30px Barlow'].map(f=>document.fonts.load(f)));}catch(e){}
    const [pa,pb,logo]=await Promise.all([loadImg(photoOf(a)),loadImg(photoOf(b)),loadImg('images/emblem.jpg')]);
    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const RED='#e3191f',GOLD='#f0c35a',INK='#f5f5f4',MUT='#9a9aa0';
    const D_='Anton, Impact, sans-serif',L_='"Barlow Condensed", "Arial Narrow", sans-serif',B_='Barlow, system-ui, sans-serif';
    // background
    x.fillStyle='#0a0a0b';x.fillRect(0,0,W,H);
    let g=x.createRadialGradient(270,380,20,270,380,640);g.addColorStop(0,'rgba(227,25,31,.35)');g.addColorStop(1,'rgba(227,25,31,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    g=x.createRadialGradient(810,380,20,810,380,640);g.addColorStop(0,'rgba(242,242,240,.16)');g.addColorStop(1,'rgba(242,242,240,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    // header
    if(logo){x.save();x.beginPath();x.arc(96,96,44,0,7);x.clip();x.drawImage(logo,52,52,88,88);x.restore();}
    x.fillStyle=INK;x.font=`700 34px ${L_}`;x.textBaseline='alphabetic';x.fillText('MLD 03 ESPORTS',160,90);
    x.fillStyle=MUT;x.font=`600 24px ${L_}`;x.fillText('HEAD TO HEAD',160,122);
    x.textAlign='right';x.fillStyle=MUT;x.font=`600 24px ${L_}`;x.fillText('mld03-esports.store',W-52,104);x.textAlign='left';
    // players
    const side=(p,img,n,cx,col,won)=>{
      const r=150,cy=380;x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.closePath();x.fillStyle='#1f1f22';x.fill();x.clip();
      if(img){const s=Math.max(2*r/img.width,2*r/img.height);x.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);}
      else{x.fillStyle=MUT;x.font=`400 110px ${D_}`;x.textAlign='center';x.fillText(initials(n),cx,cy+40);x.textAlign='left';}
      x.restore();x.lineWidth=10;x.strokeStyle=won?GOLD:col;x.beginPath();x.arc(cx,cy,r+6,0,7);x.stroke();
      if(won){x.fillStyle=GOLD;x.font=`700 30px ${L_}`;x.textAlign='center';x.fillText('★ WINNER',cx,cy-r-30);x.textAlign='left';}
      x.textAlign='center';x.fillStyle=INK;let fs=78;x.font=`400 ${fs}px ${D_}`;const name=n.toUpperCase();
      while(x.measureText(name).width>440&&fs>40){fs-=4;x.font=`400 ${fs}px ${D_}`;}x.fillText(name,cx,cy+r+100);
      x.fillStyle=MUT;x.font=`600 28px ${L_}`;x.fillText(`ALL-TIME RANK #${p.p.crk}`,cx,cy+r+142);x.textAlign='left';};
    side(A,pa,a,270,RED,win===1);side(B,pb,b,810,'#f2f2f0',win===2);
    x.fillStyle='#000';x.beginPath();x.arc(540,380,52,0,7);x.fill();x.strokeStyle='#2a2a2e';x.lineWidth=3;x.stroke();
    x.fillStyle=INK;x.font=`700 40px ${L_}`;x.textAlign='center';x.fillText('VS',540,394);x.textAlign='left';
    // MLD Index
    const iy=760;x.fillStyle=MUT;x.font=`700 26px ${L_}`;x.textAlign='center';x.fillText('MLD INDEX',540,iy-38);
    x.font=`400 96px ${D_}`;x.fillStyle=win===1?GOLD:INK;x.fillText(IA.score.toFixed(1),270,iy+30);x.fillStyle=win===2?GOLD:INK;x.fillText(IB.score.toFixed(1),810,iy+30);
    const bar=(y,v,col,right)=>{x.fillStyle='#1f1f22';x.fillRect(60,y,960,14);x.fillStyle=col;const w=960*Math.min(1,v/100);x.fillRect(right?1020-w:60,y,w,14);};
    bar(iy+60,IA.score,RED,false);bar(iy+86,IB.score,'#f2f2f0',true);
    // key stats
    const rows=[['Goals',A.goals,B.goals],['Titles',A.titles,B.titles],['Avg rating',fmt(A.rating),fmt(B.rating)],['Tournaments',A.tournaments,B.tournaments]];
    let y=950;rows.forEach(([l,va,vb])=>{const na=parseFloat(va),nb=parseFloat(vb);
      x.fillStyle='rgba(255,255,255,.04)';x.fillRect(60,y-46,960,66);
      x.font=`400 46px ${D_}`;x.textAlign='left';x.fillStyle=na>nb?INK:MUT;x.fillText(String(va),90,y);
      x.textAlign='right';x.fillStyle=nb>na?INK:MUT;x.fillText(String(vb),990,y);
      x.textAlign='center';x.fillStyle=MUT;x.font=`700 28px ${L_}`;x.fillText(l.toUpperCase(),540,y-6);y+=82;});
    // verdict
    x.textAlign='center';
    const verdict=win?`${(win===1?a:b).toUpperCase()} WINS ${win===1?J.wa:J.wb}–${win===1?J.wb:J.wa} IN CATEGORIES`:`DEAD EVEN · ${J.wa}–${J.wb} IN CATEGORIES`;
    x.fillStyle=win?GOLD:INK;let vf=44;x.font=`400 ${vf}px ${D_}`;while(x.measureText(verdict).width>960&&vf>28){vf-=2;x.font=`400 ${vf}px ${D_}`;}
    x.fillText(verdict,540,1300);x.textAlign='left';
    x.fillStyle=RED;x.fillRect(0,H-12,W,12);
    // share, or save as a file
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    const fname=`MLD-${a}-vs-${b}.png`.replace(/[^A-Za-z0-9.-]+/g,'-');const file=new File([blob],fname,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:`${a} vs ${b} · MLD 03`,text:`${a} vs ${b} on MLD 03 Esports · mld03-esports.store`});return 'shared';}catch(e){if(e&&e.name==='AbortError')return 'cancelled';}}
    const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download=fname;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return 'saved';
  }
  document.addEventListener('click',async e=>{const btn=e.target.closest('[data-cshare]');if(!btn||!CMP.a||!CMP.b)return;
    const t=btn.textContent;btn.textContent='Making card…';btn.disabled=true;
    try{const r=await shareCard(CMP.a,CMP.b);btn.textContent=r==='saved'?'Saved to your phone ✓':r==='shared'?'Shared ✓':t;}catch(err){btn.textContent='Could not make the card';}
    setTimeout(()=>{btn.textContent=t;btn.disabled=false;},2200);});
  window.MLDshareCard=shareCard;
  document.addEventListener('click',e=>{if(e.target.closest('[data-cswap]')){[CMP.a,CMP.b]=[CMP.b,CMP.a];rerender('cmpOut');}});
  VIEWS.compare=view;
  window.CMP=CMP;
})();
