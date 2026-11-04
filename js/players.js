/* ================= All MLD Players: everyone, in the order they joined MLD =================
   JOIN_ORDER is the real joining order. Players not listed yet follow, ordered by the
   first season they played (and their order in that season's sheet). Add names to the list to fix the order. */
(function(){
  const JOIN_ORDER=['WaCky']; /* the founder */
  const JOINED_IN={Nezel:1}; /* corrections: season a player joined MLD, when the sheet shows a later first tournament */
  const first={},firstIdx={};
  D.log.forEach((r,i)=>{if(!(r[2] in first)){first[r[2]]=r[0];firstIdx[r[2]]=i;}});
  D.trophies.forEach((t,i)=>{if(!(t[2] in first)){first[t[2]]=t[0];firstIdx[t[2]]=1e6+i;}});
  Object.entries(JOINED_IN).forEach(([n,s])=>first[n]=s);
  const pos=n=>{const k=JOIN_ORDER.indexOf(n);return k>=0?k:1e3+(first[n]||99)*1e4;};
  const joined=[...D.players].filter(p=>!p.side).sort((a,b)=>pos(a.n)-pos(b.n)||a.n.localeCompare(b.n,undefined,{sensitivity:'base'}));
  joined.forEach((p,i)=>p._join=i+1);
  const SORTS=[['join','Joined order'],['az','A – Z'],['za','Z – A'],['goals','Most goals'],['rating','Career rating'],['seasons','Most tournaments'],['trophies','Most trophies']];
  const st={sort:'join',q:''};
  function list(){
    let L=[...joined];
    if(st.sort==='az')L.sort((a,b)=>a.n.localeCompare(b.n,undefined,{sensitivity:'base'}));
    else if(st.sort==='za')L.sort((a,b)=>b.n.localeCompare(a.n,undefined,{sensitivity:'base'}));
    else if(st.sort==='goals')L.sort((a,b)=>b.g-a.g);
    else if(st.sort==='rating')L.sort((a,b)=>(b.cs||0)-(a.cs||0));
    else if(st.sort==='seasons')L.sort((a,b)=>b.t-a.t||b.g-a.g);
    else if(st.sort==='trophies')L.sort((a,b)=>b.pt-a.pt||b.ru-a.ru||b.g-a.g);
    const q=st.q.trim().toLowerCase();if(q)L=L.filter(p=>p.n.toLowerCase().includes(q));
    return L;
  }
  function rows(){
    const L=list();
    const lead=p=>st.sort==='join'?`#${p._join}`:st.sort==='goals'?p.g:st.sort==='rating'?fmt(p.cs):st.sort==='seasons'?p.t:st.sort==='trophies'?p.pt:`#${p._join}`;
    const lab=st.sort==='goals'?'goals':st.sort==='rating'?'score':st.sort==='seasons'?'played':st.sort==='trophies'?'titles':'joined';
    let lastS=null;
    const head=p=>{if(st.sort!=='join'||st.q.trim())return'';const s=JOIN_ORDER.includes(p.n)?'F':first[p.n];if(s===lastS)return'';lastS=s;
      return `<div class="apseason">${s==='F'?'Founder':`Joined in Season ${s}`}<small>${s==='F'?'Started MLD':L.filter(x=>!JOIN_ORDER.includes(x.n)&&first[x.n]===s).length+' players'}</small></div>`;};
    return L.map(p=>head(p)+`<button class="row${p.n===GOAT?' goat':''}" data-p="${esc(p.n)}"><div class="nm">${avatar(p.n)}<div><b>${esc(p.n)}</b>
      <span>Joined S${first[p.n]||'?'} · ${p.t} tournament${p.t===1?'':'s'} · ${p.g} goals</span>${miniIcons(p.n)}</div></div>
      <div class="vl">${lead(p)}<small>${lab}</small></div></button>`).join('')||'<p class="note">No player with that name.</p>';
  }
  function view(){
    setTimeout(bind,0);
    return {t:'All MLD <em>Players</em>',p:`Every one of the ${joined.length} players who has played in MLD, from the first to join to the newest.`,
      b:`<label class="search" for="apQ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="apQ" placeholder="Search ${joined.length} players" autocomplete="off" value="${esc(st.q)}"></label>
        <div class="pills" id="apSort">${SORTS.map(([k,l])=>`<button class="pill${k===st.sort?' on':''}" data-aps="${k}">${l}</button>`).join('')}</div>
        <div class="rows aplist" id="apRows">${rows()}</div>`};
  }
  function bind(){const q=document.getElementById('apQ');if(!q)return;
    q.addEventListener('input',()=>{st.q=q.value;document.getElementById('apRows').innerHTML=rows();});}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-aps]');if(!b)return;st.sort=b.dataset.aps;
    document.querySelectorAll('#apSort .pill').forEach(x=>x.classList.toggle('on',x.dataset.aps===st.sort));
    document.getElementById('apRows').innerHTML=rows();});
  VIEWS['all-players']=view;
})();
