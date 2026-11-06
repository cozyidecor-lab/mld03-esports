/* ================= MLD GOAT 🐐: the all-time leaderboard by MLD Index =================
   All-time rank everywhere on the site is this ranking (worked out in compare.js from the MLD Index).
   Opening: slow golden reveal + Solace music. Loaded after compare.js. */
(function(){
  const G={open:null,limit:30,intro:false};
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PART_LABEL=Object.fromEntries(MLDI.WEIGHTS.map(([k,l,w])=>[k,[l,w]]));

  /* ---------- Solace: plays while the GOAT page is open ---------- */
  const music={el:null,muted:false,fadeT:0};
  try{music.muted=localStorage.getItem('mld-goat-muted')==='1';}catch(e){}
  function audio(){if(!music.el){music.el=new Audio('audio/solace.m4a');music.el.loop=true;music.el.preload='auto';music.el.volume=0;}return music.el;}
  function fadeTo(v,ms,then){const a=audio();clearInterval(music.fadeT);const from=a.volume,steps=Math.max(1,Math.round(ms/40));let i=0;
    music.fadeT=setInterval(()=>{i++;a.volume=Math.max(0,Math.min(1,from+(v-from)*i/steps));if(i>=steps){clearInterval(music.fadeT);if(then)then();}},40);}
  function playMusic(){
    const a=audio();if(music.muted){setBtn();return;}
    if(!a.paused){fadeTo(.7,600);setBtn();return;}
    a.play().then(()=>{fadeTo(.7,2500);setBtn();}).catch(()=>{setBtn(true);}); // autoplay blocked: show a one-tap start
  }
  function stopMusic(){if(!music.el||music.el.paused)return;fadeTo(0,900,()=>music.el.pause());}
  function setBtn(blocked){
    const b=document.getElementById('goatSound');if(!b)return;
    const playing=music.el&&!music.el.paused&&!music.muted;
    b.classList.toggle('on',playing);b.classList.toggle('ask',!!blocked);
    b.innerHTML=blocked?'<span>♪</span> Play Solace':playing?'<span>♪</span> Sound on':'<span>♪</span> Sound off';
    b.setAttribute('aria-label',blocked?'Play the music':playing?'Mute the music':'Unmute the music');
  }
  document.addEventListener('click',e=>{const b=e.target.closest('#goatSound');if(!b)return;
    const a=audio();
    if(b.classList.contains('ask')||a.paused){music.muted=false;}else music.muted=!music.muted;
    try{localStorage.setItem('mld-goat-muted',music.muted?'1':'0');}catch(err){}
    if(music.muted){fadeTo(0,500,()=>a.pause());setTimeout(()=>setBtn(),520);}else playMusic();});

  /* ---------- the leaderboard ---------- */
  const ranked=()=>MLDI.ranked();
  function details(p){
    const s=MLDI.statsOf(p.n),parts=p.miParts||{};
    const bars=Object.entries(PART_LABEL).map(([k,[label,w]])=>{const v=parts[k]||0;
      return `<div class="gbar"><span>${label}</span><i><s style="width:${Math.round(v/w*100)}%"></s></i><b>${v.toFixed(1)}<small>/${w}</small></b></div>`;}).join('');
    return `<div class="gdet">
      <div class="gdtop">${avatar(p.n,'gbig')}<div><div class="gidx"><b>${p.mi.toFixed(1)}</b><small>MLD Index</small></div>
        ${founderTag(p.n,'sm')}<p class="note" style="margin:6px 0 0">${s.seasons} season${s.seasons===1?'':'s'} played · ${p.g} goals · ${p.pt} title${p.pt===1?'':'s'} · avg rating ${fmt(p.r)}</p></div></div>
      ${cabinet(p.n)}
      <div class="gbars"><small class="gcap">How the MLD Index adds up</small>${bars}</div>
      <button class="flbtn gprof" data-p="${esc(p.n)}">View ${esc(p.n)}'s full profile</button></div>`;
  }
  function rows(){
    const L=ranked();if(G.open===null&&L.length)G.open=L[0].n;
    return L.slice(0,G.limit).map((p,i)=>{const open=G.open===p.n;
      return `<div class="grow r${p.crk<=3?p.crk:''}${open?' open':''}" style="--i:${Math.min(i,14)}">
        <button class="ghead" data-gopen="${esc(p.n)}" aria-expanded="${open}"><span class="grk">${p.crk<=3?['🥇','🥈','🥉'][p.crk-1]:'#'+p.crk}</span>
        <span class="gnm">${avatar(p.n)}<span><b>${esc(p.n)}</b><small>${p.g} goals · ${p.pt} title${p.pt===1?'':'s'} · ${p.t} tournaments</small></span></span>
        <span class="gmi">${p.mi.toFixed(1)}<small>MLD Index</small></span></button>
        ${open?details(p):''}</div>`;}).join('')+(L.length>G.limit?'<button class="more" data-gmore="1">Show more</button>':'');
  }
  function view(){
    setTimeout(()=>{ if(!G.intro){G.intro=true;runIntro();} setBtn(); },0);
    return {t:"MLD <em>GOAT</em> 🐐",p:'The greatest of all time, ranked by the MLD Index: one score for a whole career. It weighs career rating, titles, goals, season-by-season performance, average rating, awards, finals reached, experience and the MLD D\'or, each measured against the best in MLD history. One great season is not enough; staying great is what counts.',
      b:`<button class="goatsound" id="goatSound" aria-label="Mute the music"><span>♪</span> Sound on</button>
        <div class="glist" id="goatRows">${rows()}</div>`};
  }
  document.addEventListener('click',e=>{
    const h=e.target.closest('[data-gopen]');if(h){const n=h.dataset.gopen;G.open=G.open===n?'':n;
      const box=document.getElementById('goatRows');if(box){box.classList.add('noanim');box.innerHTML=rows();}
      const row=box&&box.querySelector('.grow.open');if(row)row.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
    if(e.target.closest('[data-gmore]')){G.limit+=50;const box=document.getElementById('goatRows');if(box){box.classList.add('noanim');box.innerHTML=rows();}}
  });

  /* ---------- the opening: dark hall, gold light, the title, then the board ---------- */
  function runIntro(){
    const v=document.getElementById('v-stat');v.classList.add('goatmode');
    if(reduce()){v.classList.add('goatshow');return;}
    const ov=document.createElement('div');ov.className='gintro';
    ov.innerHTML=`<canvas></canvas><div class="gintxt"><small>MLD 03 · Hall of Fame</small><b>MLD GOAT</b><span>🐐</span><em>Legacy is earned, season after season.</em></div>
      <button class="gskip" aria-label="Skip the intro">Skip</button>`;
    document.body.appendChild(ov);
    const cv=ov.querySelector('canvas'),ctx=cv.getContext('2d');let W,H,dpr=Math.min(2,devicePixelRatio||1),raf=0,t0=performance.now();
    const fit=()=>{W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';};fit();
    const N=Math.round(Math.min(140,W*H/9000));
    const dots=Array.from({length:N},()=>({x:Math.random(),y:Math.random(),r:.4+Math.random()*1.6,s:.15+Math.random()*.5,tw:Math.random()*6}));
    const frame=now=>{const t=(now-t0)/1000;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
      // soft spotlight from above
      const g=ctx.createRadialGradient(W/2,-H*.1,10,W/2,H*.35,Math.max(W,H)*.8);const k=Math.min(1,t/1.6);
      g.addColorStop(0,`rgba(255,214,120,${.38*k})`);g.addColorStop(.45,`rgba(200,140,40,${.12*k})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      // drifting glitter
      dots.forEach(d=>{const y=((d.y+t*d.s*.06)%1)*H,x=d.x*W+Math.sin(t*.7+d.tw)*6,a=(.35+.65*Math.abs(Math.sin(t*1.6+d.tw)))*Math.min(1,t/1.2);
        ctx.fillStyle=`rgba(255,${200+Math.round(40*Math.sin(d.tw))},120,${a})`;ctx.beginPath();ctx.arc(x,y,d.r,0,7);ctx.fill();
        if(d.r>1.4){ctx.fillStyle=`rgba(255,240,200,${a*.5})`;ctx.fillRect(x-d.r*2.2,y-.3,d.r*4.4,.6);ctx.fillRect(x-.3,y-d.r*2.2,.6,d.r*4.4);}});
      raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);addEventListener('resize',fit);
    requestAnimationFrame(()=>ov.classList.add('go'));
    const done=()=>{if(ov.classList.contains('out'))return;ov.classList.add('out');v.classList.add('goatshow');
      setTimeout(()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit);ov.remove();},1300);};
    ov.querySelector('.gskip').onclick=done;setTimeout(done,4200);
  }

  /* ---------- enter / leave: wrap the site's router ---------- */
  const baseGo=go;
  go=function(v){
    const was=cur;
    if(v!=='goat'&&was==='goat'){stopMusic();G.intro=false;const s=document.getElementById('v-stat');s.classList.remove('goatmode','goatshow');document.querySelectorAll('.gintro').forEach(x=>x.remove());}
    if(v==='goat'&&was!=='goat'){G.open=null;G.limit=30;G.intro=false;const s=document.getElementById('v-stat');s.classList.remove('goatshow');}
    baseGo(v);
    if(v==='goat'&&cur==='goat')playMusic();
  };
  VIEWS.goat=view;
  document.addEventListener('visibilitychange',()=>{if(!music.el)return;if(document.hidden){if(!music.el.paused){music.el.pause();music.wasOn=true;}}
    else if(music.wasOn&&cur==='goat'&&!music.muted){music.wasOn=false;music.el.play().catch(()=>setBtn(true));}});
})();
