/* ================= MLD Database: every player, by tier (default) or in the order they joined MLD =================
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
  const SORTS=[['tier','Tiers'],['join','Joined order'],['az','A – Z'],['za','Z – A'],['goals','Most goals'],['rating','Career rating'],['seasons','Most tournaments'],['trophies','Most trophies']];
  const st={sort:'tier',q:''};
  const TORDER={s:0,a:1,b:2,c:3,d:4,none:5,inactive:6};
  const TLABEL={s:['S tier','The elite'],a:['A tier','Top performers'],b:['B tier','Solid'],c:['C tier','Average'],d:['D tier','Finding their feet'],none:['Unranked','Not enough recent tournaments'],inactive:['Inactive','Not played in the last two seasons']};
  function list(){
    let L=[...joined];
    if(st.sort==='tier'){const rk=tierRanked();const at=n=>{const i=rk.indexOf(n);return i<0?1e4+(byName[n].crk||999):i;};
      L.sort((a,b)=>TORDER[tierOf(a.n).k]-TORDER[tierOf(b.n).k]||at(a.n)-at(b.n));}
    else if(st.sort==='az')L.sort((a,b)=>a.n.localeCompare(b.n,undefined,{sensitivity:'base'}));
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
    const lead=p=>st.sort==='tier'?(()=>{const t=tierOf(p.n);return t.tier?`<span class="tbig t-${t.k}">${t.tier}${t.arrow?`<i>${t.arrow}</i>`:''}</span>`:'–';})():st.sort==='join'?`#${p._join}`:st.sort==='goals'?p.g:st.sort==='rating'?fmt(p.cs):st.sort==='seasons'?p.t:st.sort==='trophies'?p.pt:`#${p._join}`;
    const lab=st.sort==='tier'?'tier':st.sort==='goals'?'goals':st.sort==='rating'?'score':st.sort==='seasons'?'played':st.sort==='trophies'?'titles':'joined';
    let lastS=null,lastT=null;
    const head=p=>{if(st.sort==='tier'){if(st.q.trim())return'';const k=tierOf(p.n).k;if(k===lastT)return'';lastT=k;
        return `<div class="aptier th-${k}" data-tierhead="${k}"><span>${TLABEL[k][0]}</span><small>${TLABEL[k][1]} · ${L.filter(x=>tierOf(x.n).k===k).length}</small></div>`;}
      if(st.sort!=='join'||st.q.trim())return'';const s=JOIN_ORDER.includes(p.n)?'F':first[p.n];if(s===lastS)return'';lastS=s;
      return `<div class="apseason">${s==='F'?'Founder':`Joined in Season ${s}`}<small>${s==='F'?'Started MLD':L.filter(x=>!JOIN_ORDER.includes(x.n)&&first[x.n]===s).length+' players'}</small></div>`;};
    return L.map(p=>head(p)+`<button class="row${p.n===GOAT?' goat':''}${st.sort==='tier'?' tr-'+tierOf(p.n).k:''}" data-p="${esc(p.n)}"><div class="nm">${avatar(p.n)}<div><b>${esc(p.n)}</b>
      <span>Joined S${first[p.n]||'?'} · ${p.t} tournament${p.t===1?'':'s'} · ${p.g} goals</span>${miniIcons(p.n)}</div></div>
      <div class="vl">${lead(p)}<small>${lab}</small></div></button>`).join('')||'<p class="note">No player with that name.</p>';
  }
  function view(){
    setTimeout(bind,0);
    setTimeout(glow,30);
    return {t:'MLD <em>Database</em>',p:`All ${joined.length} MLD players. Tiers rank active players by their last few tournaments; ↑ and ↓ show which way they are heading.`,
      b:`<label class="search" for="apQ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="apQ" placeholder="Search ${joined.length} players" autocomplete="off" value="${esc(st.q)}"></label>
        <div class="pills" id="apSort">${SORTS.map(([k,l])=>`<button class="pill${k===st.sort?' on':''}" data-aps="${k}">${l}</button>`).join('')}</div>
        <div class="rows aplist" id="apRows">${rows()}</div>`};
  }
  function bind(){const q=document.getElementById('apQ');if(!q)return;
    q.addEventListener('input',()=>{st.q=q.value;document.getElementById('apRows').innerHTML=rows();});}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-aps]');if(!b)return;st.sort=b.dataset.aps;
    document.querySelectorAll('#apSort .pill').forEach(x=>x.classList.toggle('on',x.dataset.aps===st.sort));
    document.getElementById('apRows').innerHTML=rows();glow();});
  /* ---------- the page glows in the colour of the tier you are scrolling through ---------- */
  const GC={s:[240,192,80,.5],a:[227,25,31,.34],b:[150,90,235,.22],c:[60,130,240,.13],d:[150,150,160,.06],none:[0,0,0,0],inactive:[0,0,0,0]};
  let ov=null,tick=0;
  function glow(){
    if(!ov){ov=document.createElement('div');ov.id='tierGlow';ov.setAttribute('aria-hidden','true');document.body.prepend(ov);}
    const on=typeof cur!=='undefined'&&cur==='all-players'&&st.sort==='tier'&&!st.q.trim();
    if(!on){ov.style.opacity=0;return;}
    const hs=[...document.querySelectorAll('[data-tierhead]')];if(!hs.length){ov.style.opacity=0;return;}
    const y=innerHeight*.35;let i=0;hs.forEach((h,k)=>{if(h.getBoundingClientRect().top<=y)i=k;});
    const a=GC[hs[i].dataset.tierhead],nx=hs[i+1]?GC[hs[i+1].dataset.tierhead]:a;
    const t0=hs[i].getBoundingClientRect().top,t1=hs[i+1]?hs[i+1].getBoundingClientRect().top:t0+1e4;
    let t=Math.max(0,Math.min(1,(y-t0)/Math.max(1,t1-t0)));t=t<.55?0:(t-.55)/.45;t=t*t*(3-2*t); // shift only as the next tier comes up
    if(hs[0].getBoundingClientRect().top>y){t=0;} // above the first tier: full gold
    const c=a.map((v,k)=>v+(nx[k]-v)*t);
    ov.style.setProperty('--gc',`${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`);ov.style.setProperty('--ga',c[3].toFixed(3));
    ov.style.opacity=1;
  }
  addEventListener('scroll',()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;glow();});},{passive:true});
  const baseGo=go;go=function(v){baseGo(v);setTimeout(glow,30);}; // turn the glow off on every other page
  VIEWS['all-players']=view;
})();
