/* ================= Player form (for auction managers) =================
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
  const STATUS={
    prime:{e:'🔥',t:'Top Form'},rising:{e:'📈',t:'Rising'},stable:{e:'⚖️',t:'Stable'},
    declining:{e:'📉',t:'Declining'},poor:{e:'⚠️',t:'Poor Form'},inactive:{e:'💤',t:'Inactive'},none:{e:'·',t:'Not enough data'}};

  /* ---- every tournament, oldest first, with each player's place in its field ---- */
  const order=(s,ty)=>{const o=TOUR_ORDER[s]||TOUR_ORDER.default;const i=o.indexOf(ty);return s*10+(i<0?9:i);};
  const tours={};
  D.log.forEach(r=>{if(!NAMES[r[1]])return;if(r[4]==null&&r[5]==null)return;const k=r[0]+r[1];(tours[k]=tours[k]||{s:r[0],ty:r[1],rows:[]}).rows.push(r);});
  const list=Object.values(tours).sort((a,b)=>order(a.s,a.ty)-order(b.s,b.ty));
  const latestSeason=Math.max(...list.map(t=>t.s));
  const share=(arr,v)=>{ // 1 = best in the field, 0 = last
    const vals=arr.filter(x=>x!=null);if(v==null||vals.length<2)return null;
    const better=vals.filter(x=>x>v).length,same=vals.filter(x=>x===v).length-1;return 1-(better+same/2)/(vals.length-1);};
  /* how far you went in the tournament gives a small form bonus (a finalist edges a non-finalist with
     slightly better raw stats). Only the champion, runner-up and recorded 3rd–5th places are known. */
  const RESULT_BONUS={'Player Trophy':0.10,'Runner-up':0.06,'3rd Place':0.03,'4th Place':0.02,'5th Place':0.01};
  const resBonus={};(D.trophies||[]).forEach(t=>{const bn=RESULT_BONUS[t[3]];if(bn==null)return;const k=t[0]+'|'+t[1]+'|'+t[2];resBonus[k]=Math.max(resBonus[k]||0,bn);});
  const perf={};
  list.forEach(t=>{
    const G=t.rows.map(r=>r[4]),R=t.rows.map(r=>r[5]);
    const scored=t.rows.map(r=>{const a=share(G,r[4]),b=share(R,r[5]);const p=[a,b].filter(x=>x!=null);
      let v=p.length?p.reduce((x,y)=>x+y,0)/p.length:null;if(v!=null)v+=(resBonus[t.s+'|'+t.ty+'|'+r[2]]||0);return {r,v};});
    const ranked=scored.filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
    scored.forEach(x=>{if(x.v==null)return;(perf[x.r[2]]=perf[x.r[2]]||[]).push({s:t.s,ty:t.ty,team:x.r[3],g:x.r[4],rt:x.r[5],v:x.v,place:ranked.indexOf(x)+1,field:ranked.length,o:order(t.s,t.ty)});});
  });
  Object.values(perf).forEach(a=>a.sort((x,y)=>x.o-y.o));

  /* ---- the six statuses ---- */
  const cache={};
  function formOf(n){
    if(cache[n])return cache[n];
    const all=perf[n]||[],last=all.length?all[all.length-1]:null;
    let k,why;
    if(!last||last.s<latestSeason-1){k='inactive';why=last?`Last played in Season ${last.s} (${NAMES[last.ty]}). No tournaments in Season ${latestSeason-1} or ${latestSeason}.`:'No tournament stats recorded.';}
    else if(all.length<3){k='none';why=`Only ${all.length} tournament${all.length===1?'':'s'} with stats so far. Form needs the latest three.`;}
    else{
      const [a,b,c]=all.slice(-3),level=(a.v+b.v+c.v)/3,trend=c.v-a.v;
      if(level>=.72&&c.v>=.6)k='prime';
      else if(trend>=.2&&c.v>=.4)k='rising';
      else if(level<.35)k='poor';
      else if(trend<=-.2)k='declining';
      else k='stable';
      const words={prime:'Near the top of the field in all three, and still there in the latest.',rising:'Finishing higher in the field each time.',
        stable:'Finishing around the same place in the field each time.',declining:'Finishing lower in the field than before.',
        poor:'Near the bottom of the field across all three.'}[k];
      why=words;
    }
    return cache[n]={k,...STATUS[k],why,recent:all.slice(-3).reverse()};
  }
  window.formOf=formOf;
  window.formChip=(n,cls='')=>{if(!byName[n]||byName[n].side)return'';const f=formOf(n);
    return `<span class="formchip f-${f.k} ${cls}" role="button" tabindex="0" data-form="${esc(n)}" aria-label="Form: ${f.t}. Tap for why.">${f.e} ${f.t}</span>`;};

  /* ---- tap a chip: short explanation ---- */
  let tip=null;
  const close=()=>{if(tip){tip.remove();tip=null;}};
  function open(chip){
    close();const n=chip.dataset.form,f=formOf(n);
    tip=document.createElement('div');tip.className='formtip';tip.setAttribute('role','dialog');
    const ord=x=>x+(x%100>=11&&x%100<=13?'th':['th','st','nd','rd'][x%10]||'th');
    tip.innerHTML=`<b>${f.e} ${f.t}</b><p>${esc(f.why)}</p>${f.recent.length&&f.k!=='inactive'?`<ul>${f.recent.map(p=>`<li><span>S${p.s} ${NAMES[p.ty]}</span><span>${p.g??'–'} goals · rating ${p.rt??'–'} · ${ord(p.place)} of ${p.field}</span></li>`).join('')}</ul><small>Latest first. Place = position in that tournament's field by goals and rating.</small>`:''}`;
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
