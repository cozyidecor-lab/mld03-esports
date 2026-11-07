/* ================= Player tiers (S/A/B/C/D, from recent form) =================
   Worked out automatically from the season log every time the page loads, so adding a new
   tournament's stats updates everyone's form with no other edits.

   How it works
   - A "tournament" is one tour in one season with individual stats (Team Tour, Solo Dream Team,
     Solo Authentic). Co-op is 2 v 2 with no individual stats, so it is not used.
   - Each performance is scored by where the player finished in THAT tournament's field
     (average of their goals position and rating position), because totals are not comparable
     between an 8-team Team Tour and a 1 v 1 Solo tournament.
   - Form looks at the player's latest three tournaments: how good they were, and which way it went.
   - Inactive: no tournament in the latest two completed seasons. Fewer than three tournaments:
     Not enough data. Career honours (champion, veteran…) are kept out of this on purpose. */
(function(){
  /* every season runs in this order: Solo Authentic, Co-op, Solo Dream Team, then Team Tour last.
     Co-op has no individual stats, so it is skipped for form. */
  const TOUR_ORDER={default:['A','D','T']};
  const NAMES={T:'Team Tour',D:'Solo Dream Team',A:'Solo Authentic'};
  const TIERS=[['S',.08],['A',.17],['B',.25],['C',.25],['D',1]]; // share of active, ranked players in each tier

  /* ---- every tournament, oldest first, with each player's place in its field ---- */
  const order=(s,ty)=>{const o=TOUR_ORDER[s]||TOUR_ORDER.default;const i=o.indexOf(ty);return s*10+(i<0?9:i);};
  const tours={};
  D.log.forEach(r=>{if(!NAMES[r[1]])return;if(r[4]==null&&r[5]==null)return;const k=r[0]+r[1];(tours[k]=tours[k]||{s:r[0],ty:r[1],rows:[]}).rows.push(r);});
  const list=Object.values(tours).sort((a,b)=>order(a.s,a.ty)-order(b.s,b.ty));
  const latestSeason=Math.max(...list.map(t=>t.s));
  const share=(arr,v)=>{ // 1 = best in the field, 0 = last
    const vals=arr.filter(x=>x!=null);if(v==null||vals.length<2)return null;
    const better=vals.filter(x=>x>v).length,same=vals.filter(x=>x===v).length-1;return 1-(better+same/2)/(vals.length-1);};
  const perf={};
  list.forEach(t=>{
    const G=t.rows.map(r=>r[4]),R=t.rows.map(r=>r[5]);
    const scored=t.rows.map(r=>{const a=share(G,r[4]),b=share(R,r[5]);const p=[a,b].filter(x=>x!=null);return {r,v:p.length?p.reduce((x,y)=>x+y,0)/p.length:null};});
    const ranked=scored.filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
    scored.forEach(x=>{if(x.v==null)return;(perf[x.r[2]]=perf[x.r[2]]||[]).push({s:t.s,ty:t.ty,team:x.r[3],g:x.r[4],rt:x.r[5],v:x.v,place:ranked.indexOf(x)+1,field:ranked.length,o:order(t.s,t.ty)});});
  });
  Object.values(perf).forEach(a=>a.sort((x,y)=>x.o-y.o));

  /* ---- the six statuses ---- */
  /* ---- tiers: rank every active player by recent level, then cut into S/A/B/C/D ---- */
  const level=a=>{const w=a.slice(-3);return w.reduce((s,p)=>s+p.v,0)/w.length;};
  const ranked=Object.keys(perf).filter(n=>{const a=perf[n];return a.length>=2&&a[a.length-1].s>=latestSeason-1;})
    .map(n=>({n,lv:level(perf[n])})).sort((a,b)=>b.lv-a.lv);
  const tierOfRank={};let at=0;
  TIERS.forEach(([t,share],i)=>{const cnt=i===TIERS.length-1?ranked.length-at:Math.max(1,Math.round(ranked.length*share));
    ranked.slice(at,at+cnt).forEach((r,k)=>tierOfRank[r.n]={t,pos:at+k+1});at+=cnt;});
  const TNAME={S:'S tier',A:'A tier',B:'B tier',C:'C tier',D:'D tier'};
  const cache={};
  function formOf(n){
    if(cache[n])return cache[n];
    const all=perf[n]||[],last=all.length?all[all.length-1]:null;
    let k,t,why,arrow='';
    if(!last||last.s<latestSeason-1){k='inactive';t='Inactive';why=last?`Last played in Season ${last.s} (${NAMES[last.ty]}). Tiers only rank players from Season ${latestSeason-1} or ${latestSeason}.`:'No tournament stats recorded.';}
    else if(all.length<2){k='none';t='Unranked';why='Only 1 tournament with stats so far. A tier needs at least two.';}
    else{
      const r=tierOfRank[n],w=all.slice(-3),trend=w[w.length-1].v-w[0].v;
      k=r.t.toLowerCase();t=TNAME[r.t];
      if(w.length>=2&&trend>=.2)arrow='↑';else if(w.length>=2&&trend<=-.2)arrow='↓';
      why=`#${r.pos} of ${ranked.length} active players, by where they finished in their last ${w.length} tournaments.`+
        (arrow==='↑'?' Trending up: finishing higher than before.':arrow==='↓'?' Trending down: finishing lower than before.':' Steady: finishing around the same place.');
    }
    return cache[n]={k,t,e:k.length===1?r_(k):'',arrow,why,recent:all.slice(-3).reverse(),tier:k.length===1?k.toUpperCase():null};
  }
  const r_=k=>k.toUpperCase();
  window.formOf=formOf;window.tierOf=formOf;window.tierRanked=()=>ranked.map(r=>r.n);
  window.formChip=(n,cls='')=>{if(!byName[n]||byName[n].side)return'';const f=formOf(n);
    const label=f.tier?`<b>${f.tier}</b>${f.arrow?`<i>${f.arrow}</i>`:''}`:`<span>${f.t}</span>`;
    return `<span class="tierchip t-${f.k} ${cls}" role="button" tabindex="0" data-form="${esc(n)}" aria-label="${f.t}${f.arrow==='↑'?', trending up':f.arrow==='↓'?', trending down':''}. Tap for why.">${label}</span>`;};

  /* ---- tap a chip: short explanation ---- */
  let tip=null;
  const close=()=>{if(tip){tip.remove();tip=null;}};
  function open(chip){
    close();const n=chip.dataset.form,f=formOf(n);
    tip=document.createElement('div');tip.className='formtip';tip.setAttribute('role','dialog');
    const ord=x=>x+(x%100>=11&&x%100<=13?'th':['th','st','nd','rd'][x%10]||'th');
    tip.innerHTML=`<b>${f.tier?`<span class="tierchip t-${f.k}"><b>${f.tier}</b>${f.arrow?`<i>${f.arrow}</i>`:''}</span> `:''}${f.t}</b><p>${esc(f.why)}</p>${f.recent.length&&f.k!=='inactive'?`<ul>${f.recent.map(p=>`<li><span>S${p.s} ${NAMES[p.ty]}</span><span>${p.g??'–'} goals · rating ${p.rt??'–'} · ${ord(p.place)} of ${p.field}</span></li>`).join('')}</ul><small>Latest first. Place = position in that tournament's field by goals and rating.</small>`:''}`;
    document.body.appendChild(tip);
    const r=chip.getBoundingClientRect(),w=Math.min(320,innerWidth-24);tip.style.width=w+'px';
    let x=Math.min(Math.max(12,r.left+r.width/2-w/2),innerWidth-w-12),y=r.bottom+8;
    if(y+tip.offsetHeight>innerHeight-12)y=Math.max(12,r.top-tip.offsetHeight-8);
    tip.style.left=x+'px';tip.style.top=y+'px';
  }
  const hit=e=>e.target.closest&&e.target.closest('[data-form]');
  // capture phase, so tapping the chip inside a player row does not also open the profile
  document.addEventListener('click',e=>{const c=hit(e);if(c){e.preventDefault();e.stopPropagation();tip&&tip._for===c?close():(open(c),tip._for=c);return;}
    if(tip&&!e.target.closest('.formtip'))close();},true);
  document.addEventListener('keydown',e=>{const c=hit(e);if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(c);}if(e.key==='Escape')close();});
  addEventListener('scroll',close,{passive:true});
})();
