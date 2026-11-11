/* ================= MLD Achievements: page, profile section, admin view =================
   Uses ACHE (js/ach-engine.js) on the site's data. Everything is recalculated from data.js on every load,
   so adding a finished tournament unlocks achievements by itself; nothing is entered by hand.
   Admin view: open the Achievements page with ?admin=1 in the address. */
(function(){
  if(typeof ACHE==='undefined')return;
  let R=ACHE.evaluate(D);
  const RC=['','#9a9aa0','#3ad06a','#4ea3ff','#a66bff','#f0c35a'];
  const A={sel:null,cat:'all',rar:0,status:'all',open:null};
  const total=ACHE.L.length;
  const pct=n=>Math.round(n/Math.max(1,R.players)*100);
  const listOf=n=>R.res[n]?R.res[n].list:[];
  const unlockedOf=n=>listOf(n).filter(z=>z.unlocked);
  const recentOf=(n,k)=>unlockedOf(n).slice().sort((a,b)=>b.order-a.order||b.a.rar-a.a.rar).slice(0,k);
  const rarestOf=n=>unlockedOf(n).slice().sort((a,b)=>R.rate[a.a.id]-R.rate[b.a.id]||b.a.rar-a.a.rar)[0];
  const featuredOf=(n,k)=>unlockedOf(n).slice().sort((a,b)=>b.a.rar-a.a.rar||R.rate[a.a.id]-R.rate[b.a.id]).slice(0,k);
  const fmtNum=v=>Number.isInteger(v)?v:(+v).toFixed(1);
  const ico=(a,locked,cls)=>`<span class="acico${locked?' off':''} ${cls||''}" style="--rc:${RC[a.rar]}" aria-hidden="true">${a.ic}</span>`;
  const rtag=a=>`<span class="acr" style="--rc:${RC[a.rar]}">${ACHE.RARITY[a.rar]}</span>`;

  function card(z,mode){
    const a=z.a,locked=mode==='player'&&!z.unlocked,share=pct(R.rate[a.id]);
    const p=Math.min(1,z.cur/z.target);
    const prog=mode==='player'?(z.unlocked?`<div class="acbar done"><i style="width:100%"></i></div><small class="acst ok">✓ Unlocked · ${esc(z.at)}</small>`
      :`<div class="acbar"><i style="width:${Math.round(p*100)}%"></i></div><small class="acst">${a.cat==='Rating'&&!/top/.test(a.id)?`${fmtNum(Math.min(z.cur,z.target))} / ${z.target}`:`${fmtNum(Math.min(z.cur,z.target))} / ${z.target}`} · Locked</small>`)
      :`<small class="acst">${R.rate[a.id]} player${R.rate[a.id]===1?'':'s'} · ${share}%</small>`;
    const open=mode==='all'&&A.open===a.id;
    return `<div class="accard${locked?' locked':''}" style="--rc:${RC[a.rar]}">
      <button class="achead" ${mode==='all'?`data-acopen="${a.id}"`:''}>${ico(a,locked)}<span class="actx"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>${rtag(a)}</button>
      <p class="accond">${esc(a.cond)}</p>${prog}
      ${open?`<div class="acwho">${R.rate[a.id]?Object.keys(R.res).filter(n=>R.res[n].list.find(x=>x.a.id===a.id).unlocked).sort((x,y)=>(byName[x]?byName[x].crk:999)-(byName[y]?byName[y].crk:999)).map(n=>`<button class="acwhoi" data-acsel="${esc(n)}">${avatar(n)}<span>${esc(n)}</span></button>`).join(''):'<small>Nobody yet. Be the first.</small>'}</div>`:''}
    </div>`;
  }
  function filters(mode){
    const chip=(k,v,l,on)=>`<button class="chip${on?' on':''}" data-acf="${k}" data-v="${v}">${l}</button>`;
    return `<div class="acfilters"><div class="acrow">${chip('cat','all','All',A.cat==='all')}${ACHE.CATS.map(c=>chip('cat',c,ACHE.CAT_NAME[c],A.cat===c)).join('')}</div>
      <div class="acrow">${chip('rar',0,'Any rarity',!A.rar)}${[1,2,3,4,5].map(r=>`<button class="chip${A.rar===r?' on':''}" data-acf="rar" data-v="${r}" style="--rc:${RC[r]}"><i class="acdot"></i>${ACHE.RARITY[r]}</button>`).join('')}</div>
      ${mode==='player'?`<div class="acrow">${chip('status','all','All',A.status==='all')}${chip('status','un','Unlocked',A.status==='un')}${chip('status','lo','Locked',A.status==='lo')}</div>`:''}</div>`;
  }
  const pass=z=>(A.cat==='all'||z.a.cat===A.cat)&&(!A.rar||z.a.rar===A.rar)&&(A.status==='all'||(A.status==='un'?z.unlocked:!z.unlocked));
  function grid(items,mode){
    const by={};items.filter(pass).forEach(z=>(by[z.a.cat]=by[z.a.cat]||[]).push(z));
    const out=ACHE.CATS.filter(c=>by[c]).map(c=>{const g=by[c],u=g.filter(z=>z.unlocked).length;
      return `<h2 class="sec">${ACHE.CAT_NAME[c]} <small>${mode==='player'?`${u} / ${g.length}`:`${g.length}`}</small></h2><div class="acgrid">${g.map(z=>card(z,mode)).join('')}</div>`;}).join('');
    return out||'<p class="note">Nothing matches these filters.</p>';
  }
  function playerPicker(){return `<div class="acpick"><label class="search" for="acQ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="acQ" placeholder="See a player's achievements" autocomplete="off" value=""></label><div class="acsug" id="acSug"></div></div>`;}

  function view(){
    setTimeout(bindSearch,0);
    const adm=/[?&]admin=1/.test(location.search);
    if(A.sel&&R.res[A.sel]){
      const n=A.sel,u=unlockedOf(n),p=Math.round(u.length/total*100);
      const next=listOf(n).filter(z=>!z.unlocked&&z.cur>0).sort((a,b)=>b.cur/b.target-a.cur/a.target||a.a.rar-b.a.rar).slice(0,3);
      const recent=recentOf(n,4);
      return {t:'MLD <em>Achievements</em>',p:`${n}'s achievements, worked out from the official MLD records.`,
        b:`${playerPicker()}
        <div class="acsum"><button class="acsumav" data-p="${esc(n)}">${avatar(n)}</button><div class="acsumtx"><b>${esc(n)}</b>
          <div class="acbig"><span>${u.length}</span> / ${total} unlocked · ${p}%</div><div class="acbar big"><i style="width:${p}%"></i></div></div>
          <button class="chip" data-acsel="">All players</button></div>
        ${next.length?`<h2 class="sec">Next up <small>CLOSEST TO UNLOCKING</small></h2><div class="acgrid">${next.map(z=>card(z,'player')).join('')}</div>`:''}
        ${recent.length?`<h2 class="sec">Recently unlocked</h2><div class="acrecent">${recent.map(z=>`<div class="acrec">${ico(z.a)}<span><b>${esc(z.a.name)}</b><small>${esc(z.at)}</small></span></div>`).join('')}</div>`:''}
        ${filters('player')}${grid(listOf(n),'player')}${adm?admin():''}`};
    }
    // all players
    const recent=[];Object.keys(R.res).forEach(n=>R.res[n].list.forEach(z=>{if(z.unlocked)recent.push({n,z});}));
    recent.sort((a,b)=>b.z.order-a.z.order||b.z.a.rar-a.z.a.rar);
    const items=ACHE.L.map(a=>({a,unlocked:R.rate[a.id]>0,cur:0,target:1}));
    const got=ACHE.L.filter(a=>R.rate[a.id]>0).length;
    return {t:'MLD <em>Achievements</em>',p:`${total} achievements across ${ACHE.CATS.length} categories, unlocked automatically from the official MLD records. Pick a player to see their progress.`,
      b:`${playerPicker()}
      <div class="acsum all"><div class="acsumtx"><b>All of MLD</b><div class="acbig"><span>${got}</span> / ${total} achievements unlocked by at least one player</div>
        <div class="acbar big"><i style="width:${Math.round(got/total*100)}%"></i></div></div></div>
      <h2 class="sec">Recently unlocked <small>LATEST RESULTS</small></h2><div class="acrecent">${recent.slice(0,6).map(({n,z})=>`<button class="acrec" data-acsel="${esc(n)}">${ico(z.a)}<span><b>${esc(n)}</b><small>${esc(z.a.name)} · ${esc(z.at)}</small></span></button>`).join('')}</div>
      ${filters('all')}${grid(items,'all')}${adm?admin():''}`};
  }
  function admin(){
    const rows=[];Object.keys(R.res).forEach(n=>R.res[n].list.forEach(z=>{if(z.unlocked)rows.push({n,z});}));
    rows.sort((a,b)=>a.n.localeCompare(b.n)||a.z.order-b.z.order);
    const src=s=>!s?'':s.type==='tournament'?`S${s.s} ${{T:'Team Tour',A:'Solo Authentic',D:'Solo Dream Team',C:'Co-op'}[s.t]} records`:s.type==='season'?`Season ${s.s} season awards`:`${s.label} rankings`;
    return `<h2 class="sec">Admin <small>${rows.length} UNLOCKS</small></h2>
      <p class="note">Achievements are recalculated from the records every time the site loads. To correct one, correct the stats in data.js; achievements can't be added by hand.
      <button class="chip on" data-acrecalc="1">Recalculate now</button></p>
      <div class="acadmin"><table><thead><tr><th>Player</th><th>Achievement</th><th>Unlocked</th><th>Source</th></tr></thead><tbody>
      ${rows.filter(r=>!A.sel||r.n===A.sel).map(({n,z})=>`<tr><td>${esc(n)}</td><td>${z.a.ic} ${esc(z.a.name)}</td><td>${esc(z.at)}</td><td>${esc(src(z.src))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function bindSearch(){
    const q=document.getElementById('acQ'),box=document.getElementById('acSug');if(!q||!box)return;
    q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();if(!v){box.innerHTML='';return;}
      const L=D.players.filter(p=>!p.side&&p.n.toLowerCase().includes(v)).sort((a,b)=>(a.n.toLowerCase().startsWith(v)?0:1)-(b.n.toLowerCase().startsWith(v)?0:1)||a.crk-b.crk).slice(0,6);
      box.innerHTML=L.map(p=>`<button class="acsugi" data-acsel="${esc(p.n)}">${avatar(p.n)}<span>${esc(p.n)}</span><small>${unlockedOf(p.n).length}/${total}</small></button>`).join('');});
  }
  document.addEventListener('click',e=>{
    const s=e.target.closest('[data-acsel]');if(s){A.sel=s.dataset.acsel||null;A.open=null;if(cur==='achievements'){renderStat();scrollTo(0,0);}else go('achievements');return;}
    const f=e.target.closest('[data-acf]');if(f){const k=f.dataset.acf;A[k]=k==='rar'?+f.dataset.v:f.dataset.v;renderStat();return;}
    const o=e.target.closest('[data-acopen]');if(o){A.open=A.open===o.dataset.acopen?null:o.dataset.acopen;renderStat();return;}
    if(e.target.closest('[data-acrecalc]')){R=ACHE.evaluate(D);renderStat();window.mldToast&&mldToast('Achievements recalculated');return;}
    const v=e.target.closest('[data-acview]');if(v){A.sel=v.dataset.acview;const c=document.querySelector('#sheetBody [data-close]');if(c)c.click();go('achievements');}
  });
  VIEWS.achievements=view;

  /* ---------- profile: summary section ---------- */
  function profileHtml(n){
    if(!R.res[n])return'';const u=unlockedOf(n),p=Math.round(u.length/total*100),rare=rarestOf(n),recent=recentOf(n,3),feat=featuredOf(n,4);
    return `<section class="acprof"><h2 class="sec">Achievements <small>${u.length} / ${total}</small></h2>
      <div class="acbar big"><i style="width:${p}%"></i></div><p class="note" style="margin:6px 0 10px">${p}% complete</p>
      ${rare?`<div class="acrare" style="--rc:${RC[rare.a.rar]}">${ico(rare.a)}<span><small>Rarest achievement · ${R.rate[rare.a.id]} of ${R.players} players</small><b>${esc(rare.a.name)}</b></span>${rtag(rare.a)}</div>`:''}
      ${feat.length?`<div class="acfeat">${feat.map(z=>`<div class="acf" title="${esc(z.a.name)}: ${esc(z.a.cond)}">${ico(z.a)}<small>${esc(z.a.name)}</small></div>`).join('')}</div>`:''}
      ${recent.length?`<p class="note acrecline">Recently: ${recent.map(z=>`${z.a.ic} ${esc(z.a.name)} <i>(${esc(z.at)})</i>`).join(' · ')}</p>`:''}
      <button class="flbtn" data-acview="${esc(n)}">View all achievements</button></section>`;
  }
  const base=openPlayer;
  openPlayer=function(n){base(n);const kv=document.querySelector('#sheetBody .kv');if(!kv||!R.res[n])return;
    kv.insertAdjacentHTML('afterend',profileHtml(n));};
  window.MLDach={get:()=>R,profileHtml};
})();
