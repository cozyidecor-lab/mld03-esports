/* ================= Teammates & chemistry (profile section) =================
   From Team Tour rows in the log: players on the same team in the same season were teammates.
   Titles / finals together come from `finals` (champion and runner-up squads). Updates by itself. */
(function(){
  const tt=D.log.filter(r=>r[1]==='T'&&r[3]);
  const squads={};tt.forEach(r=>(squads[r[0]+'|'+r[3]]=squads[r[0]+'|'+r[3]]||[]).push(r));
  function matesOf(n){
    const m={};
    tt.filter(r=>r[2]===n).forEach(me=>(squads[me[0]+'|'+me[3]]||[]).forEach(r=>{if(r[2]===n)return;
      const x=m[r[2]]=m[r[2]]||{n:r[2],tours:0,titles:0,finals:0,goals:0,seasons:[]};
      x.tours++;x.goals+=(me[4]||0)+(r[4]||0);x.seasons.push({s:r[0],team:r[3]});}));
    (D.finals||[]).forEach(f=>{[['cp',1],['rp',0]].forEach(([k,won])=>{if(!f[k].includes(n))return;
      f[k].forEach(o=>{if(o===n||!m[o])return;m[o].finals++;if(won)m[o].titles++;});});});
    return Object.values(m).sort((a,b)=>b.tours-a.tours||b.titles-a.titles||b.goals-a.goals);
  }
  window.matesOf=matesOf;
  window.matesHTML=n=>{
    const L=matesOf(n);if(!L.length)return'';
    const best=L.slice().sort((a,b)=>b.titles-a.titles||b.tours-a.tours)[0];
    const top=L.slice(0,5);
    const row=x=>`<button class="mate" data-p="${esc(x.n)}">${avatar(x.n)}<span class="mtx"><b>${esc(x.n)}</b><small>${x.seasons.map(s=>`S${s.s} ${esc(s.team)}`).join(' · ')}</small></span>
      <span class="mnum"><b>${x.tours}</b><small>Team Tour${x.tours===1?'':'s'}</small>${x.titles?`<i>🏆 ${x.titles}</i>`:''}</span></button>`;
    return `<h2 class="sec">Teammates <small>TEAM TOUR</small></h2>
      ${best.titles?`<div class="mbest"><span class="mbl">Best partnership</span>${avatar(n)}<span class="mplus">+</span>${avatar(best.n)}
        <span class="mbt"><b>${esc(n)} & ${esc(best.n)}</b><small>${best.titles} title${best.titles===1?'':'s'} together · ${best.tours} Team Tour${best.tours===1?'':'s'} side by side</small></span></div>`:''}
      <p class="note" style="margin:0 0 8px">Most played with. ${L.length} different teammates in total.</p>
      <div class="mates">${top.map(row).join('')}</div>`;
  };
})();
