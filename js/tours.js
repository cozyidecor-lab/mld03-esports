/* ================= Tournaments: season-by-season archive =================
   Team Tour → seasons → season (champions, runners-up, every team) → team roster → player.
   Co-op / Solo → seasons → season (winners, runners-up, standings) → player.
   Uses only recorded data (season log, trophy log, awards). Photos only where real ones exist. */
(function(){
  const TT={T:{id:'team',name:'Team Tour',short:'Team'},D:{id:'dream',name:'Solo Dream Team',short:'Solo Dream Team'},
            A:{id:'auth',name:'Solo Authentic',short:'Solo Authentic'},C:{id:'coop',name:'Co-op Tour',short:'Co-op'}};
  /* real photographs only; add future ones here: PHOTOS[type][season] = {winner, runner} */
  const PHOTOS={
    T:{13:{winner:'images/tournaments/s13-team-champions-barcelona.jpg',runner:'images/tournaments/s13-team-runners-up-real-madrid.jpg'}},
    A:{13:{winner:'images/tournaments/s13-solo-authentic-champion-ashik.jpg'},14:{winner:'images/tournaments/s14-solo-authentic-champion-trex.jpg'}},
    C:{13:{winner:'images/tournaments/s13-coop-champions-harris-siyan.jpg'}},
    D:{}
  };
  const st={T:{s:null,open:null},D:{s:null,open:null},A:{s:null,open:null},C:{s:null,open:null}};
  const CUP='<svg class="tcup" aria-hidden="true"><use href="#t-team"/></svg>';
  /* each tournament shows its OWN trophy (Team Tour, Dream Team, Authentic, Co-op) */
  const cupOf=ty=>`<svg class="tcup" aria-hidden="true"><use href="#t-${TT[ty].id}"/></svg>`;
  const H=s=>esc(s);
  const seasonsOf=ty=>[...new Set([...D.log.filter(r=>r[1]===ty).map(r=>r[0]),...D.trophies.filter(t=>t[1]===ty).map(t=>t[0])])].sort((a,b)=>b-a);
  const tro=(ty,s,role)=>D.trophies.filter(t=>t[0]===s&&t[1]===ty&&t[3]===role).map(t=>t[2]);
  const award=(ty,s)=>D.awards.find(a=>a[0]===s&&a[1]===ty);
  const pl=n=>`<button class="pl" data-p="${H(n)}">${H(n)}</button>`;
  const photo=(src,alt,cls='')=>src?`<button class="tphoto ${cls}" data-poster="${H(src)}" data-pname="" aria-label="View photo full size"><img src="${H(src)}" alt="${H(alt)}" loading="lazy"></button>`:'';

  /* ---------- team tour ---------- */
  function teamsOf(s){
    const rows=D.log.filter(r=>r[0]===s&&r[1]==='T');const by={};
    rows.forEach(r=>{const t=r[3]||'Unknown';(by[t]=by[t]||[]).push(r);});
    const f=D.finals.find(x=>x.s===s)||{};
    // make sure everyone credited with the title / final is on the roster
    [[f.champ,f.cp],[f.runner,f.rp]].forEach(([t,list])=>{if(!t)return;by[t]=by[t]||[];(list||[]).forEach(n=>{if(!by[t].some(r=>r[2]===n))by[t].push([s,'T',n,t,null,null]);});});
    const mgr=D.trophies.filter(t=>t[0]===s&&t[1]==='T'&&t[3]==='Manager Trophy').map(t=>t[2]);
    return Object.entries(by).map(([name,rs])=>{const g=rs.reduce((a,r)=>a+(r[4]||0),0),rated=rs.filter(r=>r[5]!=null);
      return {name,rows:rs.sort((a,b)=>(b[5]||0)-(a[5]||0)||(b[4]||0)-(a[4]||0)),goals:g,avg:rated.length?rated.reduce((a,r)=>a+r[5],0)/rated.length:null,
        top:rs.slice().sort((a,b)=>(b[4]||0)-(a[4]||0))[0],role:name===f.champ?'win':name===f.runner?'run':'',mgr:name===f.champ?mgr:[]};})
      .sort((a,b)=>(a.role==='win'?0:a.role==='run'?1:2)-(b.role==='win'?0:b.role==='run'?1:2)||b.goals-a.goals);
  }
  function teamCard(t,s){
    const open=st.T.open===t.name;
    const tag=t.role==='win'?`<span class="tbadge win">${CUP} Champions</span>`:t.role==='run'?'<span class="tbadge run">🥈 Runners-up</span>':'';
    const ph=PHOTOS.T[s]&&(t.role==='win'?PHOTOS.T[s].winner:t.role==='run'?PHOTOS.T[s].runner:null);
    return `<div class="tteam ${t.role}${open?' open':''}">
      <button class="tthead" data-tteam="${H(t.name)}" aria-expanded="${open}">
        <span class="ttname">${t.role==='win'?'🏆 ':''}${H(t.name)}</span>${tag}
        <span class="ttmeta">${t.rows.length} players · ${t.goals} goals${t.avg!=null?` · avg rating ${fmt(t.avg)}`:''}</span><span class="ttchev">${open?'−':'+'}</span></button>
      ${open?`<div class="ttbody">${ph?photo(ph,`${t.name}, Season ${s} ${t.role==='win'?'champions':'runners-up'}`):''}
        ${t.mgr.length?`<p class="note">Manager: ${t.mgr.map(pl).join(', ')}</p>`:''}
        <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th class="num">Goals</th><th class="num">Rating</th></tr></thead><tbody>
        ${t.rows.map(r=>`<tr><td>${pl(r[2])}</td><td class="num">${r[4]??'–'}</td><td class="num">${r[5]??'–'}</td></tr>`).join('')}</tbody></table></div>
        ${t.top&&t.top[4]?`<p class="note">Top scorer: ${pl(t.top[2])} (${t.top[4]} goals)</p>`:''}</div>`:''}</div>`;
  }
  function teamSeason(s){
    const teams=teamsOf(s),win=teams.find(t=>t.role==='win'),run=teams.find(t=>t.role==='run'),a=award('T',s),rows=D.log.filter(r=>r[0]===s&&r[1]==='T');
    const ph=PHOTOS.T[s]||{};
    return `<div class="tsum">
        <div class="tfinal"><div class="tside win">${CUP}<small>Champions</small><b>${H(win?win.name:'–')}</b></div><span class="tvs">vs</span><div class="tside run"><small>Runners-up</small><b>${H(run?run.name:'–')}</b></div></div>
        ${ph.winner?`<div class="tphotos">${photo(ph.winner,`${win.name}, Season ${s} champions`,'big')}${ph.runner?photo(ph.runner,`${run.name}, Season ${s} runners-up`,'big'):''}</div>`:''}
        <div class="tstats"><div class="tile"><b>${teams.length}</b><span>Teams</span></div><div class="tile"><b>${rows.length}</b><span>Players</span></div><div class="tile"><b>${rows.reduce((x,r)=>x+(r[4]||0),0)}</b><span>Goals</span></div></div>
        ${a?`<div class="tawards"><div><small>Golden Boot</small><b>${String(a[3]).split(',').map(x=>pl(x.trim())).join(', ')}</b><span>${a[2]} goals</span></div><div><small>Golden Ball</small><b>${String(a[5]).split(',').map(x=>pl(x.trim())).join(', ')}</b><span>rating ${a[4]}</span></div></div>`:''}
      </div>
      <h2 class="sec">Teams <small>TAP A TEAM FOR ITS SQUAD</small></h2>
      <div class="tteams">${teams.map(t=>teamCard(t,s)).join('')}</div>`;
  }
  /* ---------- solo and co-op ---------- */
  function soloSeason(ty,s){
    const w=tro(ty,s,'Player Trophy'),r=tro(ty,s,'Runner-up'),places=['3rd Place','4th Place','5th Place'].map(p=>[p,tro(ty,s,p)]).filter(x=>x[1].length);
    const rows=D.log.filter(x=>x[0]===s&&x[1]===ty).sort((a,b)=>(b[5]||0)-(a[5]||0)||(b[4]||0)-(a[4]||0));
    const ph=PHOTOS[ty][s]||{},a=award(ty,s),pair=ty==='C';
    const who=list=>list.length?list.map(pl).join(pair?' &amp; ':', '):'–';
    return `<div class="tsum">
        <div class="tfinal"><div class="tside win">${cupOf(ty)}<small>${pair?'Champions':'Winner'}</small><b>${who(w)}</b></div><span class="tvs">vs</span><div class="tside run"><small>Runner${pair?'s':''}-up</small><b>${who(r)}</b></div></div>
        ${ph.winner?`<div class="tphotos">${photo(ph.winner,`${w.join(' and ')}, Season ${s} ${TT[ty].name} ${pair?'champions':'champion'}`,'big')}</div>`:''}
        ${places.length?`<div class="tplaces">${places.map(([p,n])=>`<div><small>${p}</small><b>${who(n)}</b></div>`).join('')}</div>`:''}
        ${a?`<div class="tawards"><div><small>Golden Boot</small><b>${String(a[3]).split(',').map(x=>pl(x.trim())).join(', ')}</b><span>${a[2]} goals</span></div><div><small>Golden Ball</small><b>${String(a[5]).split(',').map(x=>pl(x.trim())).join(', ')}</b><span>rating ${a[4]}</span></div></div>`:''}
      </div>
      ${rows.length?`<h2 class="sec">All players <small>${rows.length} PLAYERS · TAP A NAME</small></h2>
        <div class="tw"><table class="tbl"><thead><tr><th>Player</th><th>Result</th><th class="num">Goals</th><th class="num">Rating</th></tr></thead><tbody>
        ${rows.map(x=>{const res=w.includes(x[2])?'🏆 Winner':r.includes(x[2])?'Runner-up':(places.find(p=>p[1].includes(x[2]))||[''])[0];
          return `<tr${w.includes(x[2])?' class="twin"':''}><td>${pl(x[2])}</td><td>${res}</td><td class="num">${x[4]??'–'}</td><td class="num">${x[5]??'–'}</td></tr>`;}).join('')}</tbody></table></div>`
      :`<p class="note">${pair?'Co-op is 2 v 2, so only the final result is recorded: no individual goals or ratings.':'No player statistics were recorded for this tournament.'}</p>`}`;
  }
  /* ---------- pages ---------- */
  function seasonList(ty){
    const ss=seasonsOf(ty);
    return `<div class="tseasons">${ss.map(s=>{
      let a,b,n;
      if(ty==='T'){const f=D.finals.find(x=>x.s===s)||{};a=f.champ;b=f.runner;n=new Set(D.log.filter(r=>r[0]===s&&r[1]==='T').map(r=>r[3])).size+' teams';}
      else{a=tro(ty,s,'Player Trophy').join(' & ');b=tro(ty,s,'Runner-up').join(' & ');const c=D.log.filter(r=>r[0]===s&&r[1]===ty).length;n=c?c+' players':'Final recorded';}
      const ph=PHOTOS[ty][s]&&PHOTOS[ty][s].winner;
      return `<button class="tscard${ph?' hasph':''}" data-tseason="${s}">${ph?`<img src="${H(ph)}" alt="" loading="lazy">`:''}
        <span class="tsnum">Season <b>${s}</b></span><span class="tswin">🏆 ${H(a||'–')}</span><span class="tsrun">Runner-up: ${H(b||'–')}</span><span class="tsn">${n}</span></button>`;}).join('')}</div>
      ${ss.length===1?`<p class="note">Season ${ss[0]} is the only completed ${TT[ty].name} so far.</p>`:''}`;
  }
  function make(ty){
    return ()=>{const s=st[ty].s;
      if(s==null)return {t:`${TT[ty].name.replace(/ (\S+)$/,' <em>$1</em>')}`,p:`Every ${TT[ty].name} season in MLD history. Pick a season to see the champions, runners-up and ${ty==='T'?'every squad':'the standings'}.`,b:seasonList(ty)};
      return {t:`Season <em>${s}</em>`,p:`${TT[ty].name} · Season ${s}`,
        b:`<button class="tback" data-tback="1">← All ${TT[ty].name} seasons</button>${ty==='T'?teamSeason(s):soloSeason(ty,s)}`};};
  }
  const tyOf=()=>Object.keys(TT).find(k=>TT[k].id===cur);
  document.addEventListener('click',e=>{
    const ty=tyOf();if(!ty)return;
    const c=e.target.closest('[data-tseason]');if(c){st[ty].s=+c.dataset.tseason;st[ty].open=null;
      if(ty==='T'){const t=teamsOf(st.T.s).find(x=>x.role==='win');st.T.open=t?t.name:null;}
      renderStat();window.scrollTo({top:0});return;}
    if(e.target.closest('[data-tback]')){st[ty].s=null;renderStat();window.scrollTo({top:0});return;}
    const t=e.target.closest('[data-tteam]');if(t){const n=t.dataset.tteam;st.T.open=st.T.open===n?null:n;
      const y=t.getBoundingClientRect().top;renderStat();const again=[...document.querySelectorAll('[data-tteam]')].find(x=>x.dataset.tteam===n);
      if(again)window.scrollBy(0,again.getBoundingClientRect().top-y);}
  });
  Object.entries(TT).forEach(([ty,o])=>VIEWS[o.id]=make(ty));
  // opening a tournament from the menu always starts at its season list
  const before=go;go=function(v){const ty=Object.keys(TT).find(k=>TT[k].id===v);if(ty&&v!==cur){st[ty].s=null;st[ty].open=null;}before(v);};
})();
