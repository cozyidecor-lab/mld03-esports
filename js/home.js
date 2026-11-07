/* ================= Home extras: Season progress, random player, profile links =================
   SEASON NOW: update `stage` as the season moves on (that is the only thing to change).
   stage = index in that tour's `stages` list (0 = first stage), 'done' when finished, null when not started.
   Each stage has a weight = its share of the tournament's matches (the league phase is most of a UCL-style tour).
   Tours always run in this order: Authentic → Co-op → Dream Team → Team Tour. */
(function(){
  const UCL=[['League phase',.45],['Knockout play-offs',.15],['Round of 16',.15],['Quarter-finals',.12],['Semi-finals',.08],['Final',.05]];
  const SEASON_NOW={s:14,tours:[
    {k:'A',name:'Solo Authentic',sym:'#t-auth',stages:UCL,stage:2},
    {k:'C',name:'Co-op',sym:'#t-coop',stages:[['Group stage',.6],['Knockouts',.3],['Final',.1]],stage:null},
    {k:'D',name:'Solo Dream Team',sym:'#t-dream',stages:[['Group stage',.6],['Knockouts',.3],['Final',.1]],stage:null},
    {k:'T',name:'Team Tour',sym:'#t-team',stages:[['League',.6],['Knockouts',.3],['Final',.1]],stage:null}]};

  /* ---------- Season progress ---------- */
  // finished stages count fully, the stage being played counts half
  function frac(t){if(t.stage==='done')return 1;if(t.stage==null)return 0;let f=0;t.stages.forEach(([,w],i)=>{if(i<t.stage)f+=w;else if(i===t.stage)f+=w/2;});return f;}
  function renderSeason(){
    const T=SEASON_NOW.tours,now=T.find(t=>t.stage!=null&&t.stage!=='done'),done=T.filter(t=>t.stage==='done').length;
    const status=t=>t.stage==='done'?'<span class="pill">Finished</span>':t.stage==null?'<span class="pill">Coming up</span>'
      :`<span class="pill red"><span class="live-dot"></span>${esc(t.stages[t.stage][0])}</span>`;
    const top=document.getElementById('s14prog');
    if(top){const cur=now||T.filter(t=>t.stage==='done').pop()||T[0],pct=Math.round(frac(cur)*100),n=T.indexOf(cur)+1;
      top.innerHTML=`<div class="sprog" role="group" aria-label="${esc(cur.name)} is ${pct}% done">
        <div class="sptop"><span>${now?'<span class="live-dot"></span>':''}<b>${pct}%</b> ${esc(cur.name)} done</span><small>Season ${SEASON_NOW.s} · tournament ${n} of ${T.length}</small></div>
        <div class="spsteps">${cur.stages.map(([nm],i)=>{const st=cur.stage==='done'||i<cur.stage?'done':i===cur.stage?'live':'';
          return `<span class="${st}"><i>${st==='done'?'✓':''}</i><small>${esc(nm.replace('Knockout play-offs','Play-offs').replace('League phase','League').replace('Quarter-finals','Quarters').replace('Semi-finals','Semis'))}</small></span>`;}).join('')}</div>
        <div class="spbar" title="Season ${SEASON_NOW.s}: ${done} of ${T.length} tournaments finished">${T.map(t=>`<i class="${t.stage==='done'?'done':t.stage!=null?'live':''}"><s style="width:${Math.round(frac(t)*100)}%"></s></i>`).join('')}</div>
        <div class="splab">${T.map(t=>`<span>${esc(t.name.replace('Solo ',''))}</span>`).join('')}</div>
        ${now?`<div class="spnow">Now playing: <b>${esc(now.stages[now.stage][0])}</b></div>`:''}
      </div>`;}
    const box=document.getElementById('s14box');
    if(box)box.innerHTML=`<div class="s14">${T.map(t=>`<div class="t14${t===now?' on':''}"><svg><use href="${t.sym}"/></svg><b>${esc(t.name)}</b>${status(t)}</div>`).join('')}</div>`;
  }
  renderSeason();

  /* ---------- small toast ---------- */
  let toastT=0;
  function toast(msg){let t=document.getElementById('mldToast');if(!t){t=document.createElement('div');t.id='mldToast';t.setAttribute('role','status');document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1800);}
  window.mldToast=toast;

  /* ---------- random player ---------- */
  let last=null;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-random]');if(!b)return;
    const pool=D.players.filter(p=>!p.side&&p.n!==last);const p=pool[Math.floor(Math.random()*pool.length)];last=p.n;
    b.classList.remove('roll');void b.offsetWidth;b.classList.add('roll');setTimeout(()=>openPlayer(p.n),260);});

  /* ---------- profile links: ?p=Name opens that profile ---------- */
  const linkFor=n=>`${location.origin}/?p=${encodeURIComponent(n)}`;
  async function copy(text){
    try{await navigator.clipboard.writeText(text);return true;}catch(e){}
    try{const a=document.createElement('textarea');a.value=text;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok;}catch(e){return false;}
  }
  document.addEventListener('click',async e=>{const b=e.target.closest('[data-copylink]');if(!b)return;
    const ok=await copy(linkFor(b.dataset.copylink));toast(ok?'Profile link copied':'Could not copy the link');
    if(ok){b.classList.add('ok');setTimeout(()=>b.classList.remove('ok'),1600);}});
  const want=new URLSearchParams(location.search).get('p');
  if(want&&byName[want]){
    try{const u=new URL(location.href);u.searchParams.delete('p');history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}
    setTimeout(()=>openPlayer(want),2600); // after the opening animation
  }
})();
