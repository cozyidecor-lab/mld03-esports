/* ================= 🔥 Roast a player =================
   Button on every profile. Builds roasts from that player's own stats (data.js), so they change by
   themselves when new results are added. Football stats only, all in good fun. Each tap: a new roast. */
(function(){
  const TN={T:'Team Tour',A:'Solo Authentic',D:'Solo Dream Team',C:'Co-op'};
  const pl=(n,w,ws)=>`${n} ${n===1?w:(ws||w+'s')}`;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const all=()=>D.players.filter(p=>!p.side);

  function factsOf(n){
    const p=byName[n],rows=D.log.filter(r=>r[2]===n),wg=rows.filter(r=>r[4]!=null);
    const seasons=[...new Set(rows.map(r=>r[0]))].sort((a,b)=>a-b);
    const teams={};rows.filter(r=>r[1]==='T'&&r[3]).forEach(r=>teams[r[3]]=(teams[r[3]]||0)+1);
    let W=0,L=0;(D.finals||[]).forEach(f=>{if(f.cp.includes(n))W++;if(f.rp.includes(n))L++;});
    let gap=0,from=0,to=0;for(let i=1;i<seasons.length;i++)if(seasons[i]-seasons[i-1]>gap){gap=seasons[i]-seasons[i-1];from=seasons[i-1];to=seasons[i];}
    const best=wg.slice().sort((a,b)=>b[4]-a[4])[0],last=wg.slice().sort((a,b)=>a[0]-b[0]||'ACDT'.indexOf(a[1])-'ACDT'.indexOf(b[1])).pop();
    const regs=all().filter(x=>x.t>=3&&x.r),rs=regs.map(x=>x.r).sort((a,b)=>a-b),median=rs[Math.floor(rs.length/2)]||0,top=rs[Math.floor(rs.length*.85)]||99;
    const s=typeof MLDI!=='undefined'?MLDI.statsOf(n):{};
    const f=typeof formOf==='function'?formOf(n):null;
    const goalRank=all().slice().sort((a,b)=>b.g-a.g).findIndex(x=>x.n===n)+1;
    return {p,rows,seasons,teams,W,L,gap,from,to,best,last,median,top,s,f,goalRank,zero:wg.filter(r=>r[4]===0),N:all().length,
      tier:typeof tierOf==='function'?tierOf(n):null};
  }

  // each roast: when it applies → the line
  const R=[
    [(x,n)=>x.p.t>=6&&!x.p.pt&&!x.p.mt, (x,n)=>`${pl(x.p.t,'tournament')}, ${x.p.g} goals, 0 trophies. ${n} doesn't play for titles. ${n} plays for the experience.`],
    [(x,n)=>!x.p.pt&&x.p.ru>=1, (x,n)=>`${pl(x.p.ru,'runner-up finish','runner-up finishes')} and 0 titles. ${n} has seen the trophy up close. Never touched it.`],
    [(x,n)=>x.L>=2&&!x.W, (x,n)=>`${x.L} Team Tour finals, ${x.L} defeats. ${n} gets to the final like there's a reservation, then forgets to show up.`],
    [(x,n)=>x.W>=1&&x.L>x.W, (x,n)=>`Finals record: ${x.W} won, ${x.L} lost. Put ${n} in your final and start praying.`],
    [(x,n)=>Object.keys(x.teams).length>=9, (x,n)=>`${Object.keys(x.teams).length} different Team Tour clubs. ${n} changes teams more often than most people change their password.`],
    [(x,n)=>{const m=Math.max(0,...Object.values(x.teams));return m>=3;}, (x,n)=>{const [t,c]=Object.entries(x.teams).sort((a,b)=>b[1]-a[1])[0];return `${c} Team Tours for ${t}. Loyalty? Or did nobody else pick ${n}?`;}],
    [(x,n)=>x.gap>=3, (x,n)=>`Played Season ${x.from}, vanished for ${pl(x.gap-1,'season')}, came back in Season ${x.to} like ${n} just went out to buy milk.`],
    [(x,n)=>x.zero.length>0, (x,n)=>{const z=x.zero[0];return `${n} once played the whole S${z[0]} ${TN[z[1]]} and scored 0 goals. Zero. The ball filed a missing person report.`;}],
    [(x,n)=>x.best&&x.last&&x.best!==x.last&&x.best[4]-x.last[4]>=10, (x,n)=>`Best tournament: ${x.best[4]} goals. Latest: ${x.last[4]}. ${n}'s peak called. It wants its player back.`],
    [(x,n)=>x.p.t>=3&&x.p.r&&x.p.r<x.median, (x,n)=>`Average rating ${(+x.p.r).toFixed(1)}. Even the rating system isn't impressed with ${n}.`],
    [(x,n)=>x.f&&x.f.k==='poor', (x,n)=>`Current form: poor. ${n} is playing like the controller isn't plugged in.`],
    [(x,n)=>x.f&&x.f.k==='declining', (x,n)=>`Form: declining. ${n}'s graph looks like a stock market crash.`],
    [(x,n)=>x.f&&x.f.k==='inactive'&&x.seasons.length, (x,n)=>`Last seen in Season ${x.seasons[x.seasons.length-1]}. ${n} retired and forgot to tell the group.`],
    [(x,n)=>x.p.t===1, (x,n)=>`One tournament played. ${n} came, saw, and left the group chat.`],
    [(x,n)=>x.p.t<=2&&x.p.g<25, (x,n)=>`${pl(x.p.g,'goal')} in total. ${n} is still in the tutorial.`],
    [(x,n)=>x.p.crk>x.N*.6, (x,n)=>`All-time rank #${x.p.crk} of ${x.N}. ${n} isn't in the GOAT debate. ${n} is in the GOAT's highlight reel, getting dribbled past.`],
    [(x,n)=>x.p.g>=150&&!(x.s.boots||0)&&!(x.s.sboots||0), (x,n)=>`${x.p.g} goals and not one Golden Boot. ${n} scores plenty, just never when anyone is counting.`],
    [(x,n)=>x.p.t>=5&&x.p.g/x.p.t<12, (x,n)=>`${(x.p.g/x.p.t).toFixed(1)} goals per tournament. Strikers say "clinical". ${n} says "eventually".`],
    [(x,n)=>x.p.ru>=3, (x,n)=>`${x.p.ru} runner-up medals. At this point silver is ${n}'s favourite colour.`],
    [(x,n)=>x.p.pt>=3, (x,n)=>`${x.p.pt} titles. ${n}'s trophy cabinet is full, so the new ones just live on the floor now.`],
    [(x,n)=>x.tier==='S'&&x.p.crk>1, (x,n)=>`S tier, all-time #${x.p.crk}. So close to the top, so far from #1. Somebody tell ${n} the GOAT spot is taken.`],
    [(x,n)=>x.p.crk===1, (x,n)=>`#1 all-time. ${n} has won so much the trophies have started asking for a day off.`],
    [(x,n)=>x.goalRank===1, (x,n)=>`Most goals in MLD history (${x.p.g}). Defenders see ${n} in their nightmares. Goalkeepers have stopped sleeping.`],
    [(x,n)=>x.f&&x.f.k==='prime', (x,n)=>`Top form right now. Enjoy it, ${n}. The form indicator has a very long memory.`],
    [(x,n)=>x.p.mt>=1, (x,n)=>`Won the Team Tour as a manager. ${n} found the secret: let everyone else do the running.`],
    [(x,n)=>x.p.r>=x.top&&x.p.pt<=1&&x.p.t>=3, (x,n)=>`Elite ratings, almost no trophies. ${n} is the best player on the losing team, every time.`],
    [(x,n)=>typeof FOUNDER!=='undefined'&&n===FOUNDER, (x,n)=>`Started MLD, runs MLD, built the website, and is still only #${x.p.crk} all-time in MLD. Even the founder can't buy a better rating.`],
  ];
  const FALLBACK=[
    (x,n)=>`${pl(x.p.t,'tournament')}, ${pl(x.p.g,'goal')}. ${n}'s highlight reel loads instantly. Very short file.`,
    (x,n)=>`${n}'s stats don't talk. They whisper.`,
    (x,n)=>`All-time rank #${x.p.crk}. ${n} is in the database. That's the achievement.`];
  function roastsFor(n){
    if(!byName[n]||byName[n].side)return [];const x=factsOf(n);
    const L=R.filter(([c])=>{try{return c(x,n);}catch(e){return false;}}).map(([,t])=>t(x,n));
    FALLBACK.forEach(t=>{if(L.length<3)L.push(t(x,n));});
    for(let i=L.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[L[i],L[j]]=[L[j],L[i]];}
    return L;
  }
  window.roastsFor=roastsFor;

  /* ---------- the roast card ---------- */
  let ov=null,st=null;
  function render(){
    const line=st.list[st.i];
    ov.innerHTML=`<div class="rsbox" role="dialog" aria-label="Roast of ${esc(st.n)}"><button class="rsx" data-rs="close" aria-label="Close">✕</button>
      <div class="rshead">${avatar(st.n)}<span><small>🔥 MLD Roast</small><b>${esc(st.n)}</b></span></div>
      <p class="rsline">${esc(line)}</p>
      <div class="rsmeta">Roast ${st.i+1} of ${st.list.length} · from ${esc(st.n)}'s real MLD stats</div>
      <div class="rsbtns"><button class="flbtn red" data-rs="next">🔄 Another one</button><button class="flbtn" data-rs="share">Share</button></div></div>`;
  }
  function open(n){
    st={n,list:roastsFor(n),i:0};if(!st.list.length)return;
    if(!ov){ov=document.createElement('div');ov.className='pcard rsov';document.body.appendChild(ov);}
    render();ov.hidden=false;
  }
  function close(){if(ov){ov.remove();ov=null;}}
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-roast]');if(b){open(b.dataset.roast);return;}
    if(!ov)return;const a=e.target.closest('[data-rs]');
    if(e.target===ov||(a&&a.dataset.rs==='close'))return close();
    if(!a)return;
    if(a.dataset.rs==='next'){st.i=(st.i+1)%st.list.length;render();const l=ov.querySelector('.rsline');if(l){l.classList.add('pop');}}
    if(a.dataset.rs==='share'){const text=`🔥 MLD Roast: ${st.n}\n${st.list[st.i]}\n\n${location.origin}/?p=${encodeURIComponent(st.n)}`;
      if(navigator.share){navigator.share({text}).catch(()=>{});}
      else{try{await navigator.clipboard.writeText(text);window.mldToast&&mldToast('Roast copied. Paste it in the group');}catch(err){}}}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})();
