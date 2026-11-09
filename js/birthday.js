/* ================= 🎂 Birthdays =================
   Add a player here as  Name:'MM-DD'  (the name exactly as in data.js). On that date every year
   (the visitor's own date): a birthday banner at the top of Home, a confetti burst, a "Send wishes"
   counter (Firebase: bday/{name}/{year}, one wish per phone), a share button, a tap-to-play music-box
   "Happy Birthday" made in the browser (no music file), and a 🎂 badge on the player's profile. */
(function(){
  const BIRTHDAYS={Cijin:'11-09'};

  const d=new Date(),md=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const test=(new URLSearchParams(location.search).get('bdaytest')||'');
  const today=Object.keys(BIRTHDAYS).filter(n=>BIRTHDAYS[n]===(test||md)&&byName[n]);
  window.isBirthday=n=>today.includes(n);
  if(!today.length)return;
  const year=d.getFullYear();

  /* ---------- banner at the very top of Home ---------- */
  function banner(){
    const home=document.getElementById('v-home');if(!home||document.getElementById('bdayBox'))return;
    const box=document.createElement('div');box.id='bdayBox';box.className='bdaywrap';
    box.innerHTML=today.map(n=>{const p=byName[n],seasons=new Set(D.log.filter(r=>r[2]===n).map(r=>r[0])).size;
      return `<div class="bday" data-bday="${esc(n)}"><span class="bballoons" aria-hidden="true"><i>🎈</i><i>🎈</i><i>🎉</i><i>🎈</i></span>
        <button class="bdayph" data-p="${esc(n)}" aria-label="Open ${esc(n)}'s profile">${avatar(n,'bdayav')}<em aria-hidden="true">🎂</em></button>
        <div class="bdaytx"><small>Today is a big day in MLD</small><h2>Happy Birthday <span>${esc(n)}</span>!</h2>
          <p>${seasons} seasons · ${p.g} goals · ${p.pt} title${p.pt===1?'':'s'} · all-time #${p.crk}</p>
          <div class="bdaybtns"><button class="flbtn red" data-wish="${esc(n)}">🎉 Send wishes <b data-wishn="${esc(n)}"></b></button>
            <button class="flbtn" data-bsong="1">🎵 Play birthday song</button><button class="flbtn" data-bshare="${esc(n)}">Share</button></div>
          <small class="bwished" data-wished="${esc(n)}"></small></div></div>`;}).join('');
    home.prepend(box);
    today.forEach(watchWishes);
  }

  /* ---------- wishes: one per phone, live total ---------- */
  const dev=(()=>{try{let v=localStorage.getItem('mld-dev');if(!v){v=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',v);}return v;}catch(e){return 'anon';}})();
  const db=()=>typeof NET!=='undefined'?NET.db():null;
  const key=n=>n.replace(/[.#$\[\]\/]/g,'');
  const wishedKey=n=>`mld-wished-${key(n)}-${year}`;
  function paint(n,count){
    document.querySelectorAll(`[data-wishn="${CSS.escape(n)}"]`).forEach(b=>b.textContent=count?`· ${count}`:'');
    let mine=false;try{mine=localStorage.getItem(wishedKey(n))==='1';}catch(e){}
    document.querySelectorAll(`[data-wished="${CSS.escape(n)}"]`).forEach(s=>s.textContent=count?`${count} ${count===1?'person has':'people have'} wished ${n} today${mine?' (you too 💛)':''}`:'Be the first to wish!');
    document.querySelectorAll(`[data-wish="${CSS.escape(n)}"]`).forEach(b=>b.classList.toggle('done',mine));
  }
  function watchWishes(n){const x=db();if(!x){paint(n,0);return;}x.ref(`bday/${key(n)}/${year}/n`).on('value',s=>paint(n,s.val()||0));}
  async function wish(n,btn){
    try{if(localStorage.getItem(wishedKey(n))==='1'){window.mldToast&&mldToast('You already wished '+n+' 🎂');return;}}catch(e){}
    burst();const x=db();try{localStorage.setItem(wishedKey(n),'1');}catch(e){}
    if(!x){paint(n,1);return;}
    try{await x.ref(`bday/${key(n)}/${year}`).transaction(c=>{c=c||{n:0,by:{}};c.by=c.by||{};if(c.by[dev])return;c.by[dev]=true;c.n=(c.n||0)+1;return c;});}catch(e){}
    window.mldToast&&mldToast('Wish sent to '+n+' 🎉');
  }

  /* ---------- confetti ---------- */
  function burst(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const c=document.createElement('canvas');c.className='bdayfx';document.body.appendChild(c);
    const dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;c.width=W*dpr;c.height=H*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);
    const cols=['#e3191f','#ffffff','#ffd23f','#ff7ab6','#4ea3ff','#3ad06a'],P=[];
    const shot=(ox,oy,a0,n)=>{for(let k=0;k<n;k++){const a=a0+(Math.random()-.5)*.9,v=8+Math.random()*9;P.push({x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:3+Math.random()*4,c:cols[k%cols.length],rot:Math.random()*6,vr:(Math.random()-.5)*.4,s:k%3});}};
    shot(0,H,-Math.PI/3,70);shot(W,H,-2*Math.PI/3,70);shot(W/2,-10,Math.PI/2,40);
    const t0=performance.now();const step=t=>{const e=(t-t0)/1000;x.clearRect(0,0,W,H);
      P.forEach(p=>{p.vy+=.25;p.vx*=.986;p.vy*=.986;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;x.save();x.globalAlpha=Math.max(0,1-e/3);x.translate(p.x,p.y);x.rotate(p.rot);x.fillStyle=p.c;
        if(p.s===0)x.fillRect(-p.r,-p.r*.45,p.r*2,p.r*.9);else if(p.s===1){x.beginPath();x.arc(0,0,p.r*.7,0,7);x.fill();}else{x.beginPath();x.moveTo(0,-p.r);x.lineTo(p.r,p.r);x.lineTo(-p.r,p.r);x.fill();}x.restore();});
      if(e<3.1)requestAnimationFrame(step);else c.remove();};requestAnimationFrame(step);
  }

  /* ---------- music-box "Happy Birthday" (public-domain melody, made in the browser) ---------- */
  let ac=null,playing=false;
  function song(btn){
    if(playing)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
    const N={G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,C4:261.63,G3:196,F3:174.61,E4:329.63,F4:349.23};
    const M=[['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2],
      ['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',3]];
    const BASS=[['C4',3],['G3',3],['G3',3],['C4',3],['C4',3],['F3',3],['C4',1.5],['G3',1.5],['C4',3]];
    const beat=.42,t0=ac.currentTime+.08;
    const tone=(f,t,d,v,wave)=>{const o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain();o.type=wave||'sine';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2;
      o.connect(g);o2.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.35,d*1.4));
      o.start(t);o2.start(t);o.stop(t+d*1.5+.1);o2.stop(t+d*1.5+.1);};
    let t=t0;M.forEach(([n,b])=>{tone(N[n],t,b*beat,.22,'triangle');t+=b*beat;});
    let tb=t0+beat;BASS.forEach(([n,b])=>{tone(N[n],tb,b*beat,.08,'sine');tb+=b*beat;});
    playing=true;if(btn){btn.dataset.t=btn.textContent;btn.textContent='🎵 Playing…';}
    setTimeout(()=>{playing=false;if(btn)btn.textContent=btn.dataset.t||'🎵 Play birthday song';},(t-t0+.6)*1000);
    burst();
  }

  /* ---------- profile: 🎂 badge and a party look on the day ---------- */
  const base=openPlayer;
  openPlayer=function(n){base(n);const sb=document.getElementById('sheetBody');if(sb)sb.classList.toggle('bdayprof',today.includes(n));if(!today.includes(n))return;
    const tags=document.querySelector('#sheetBody .proftags');if(tags&&!tags.querySelector('.bdaytag'))tags.insertAdjacentHTML('afterbegin','<span class="bdaytag">🎂 Birthday today</span>');};

  document.addEventListener('click',e=>{
    const w=e.target.closest('[data-wish]');if(w)return wish(w.dataset.wish,w);
    const s=e.target.closest('[data-bsong]');if(s)return song(s);
    const sh=e.target.closest('[data-bshare]');if(sh){const n=sh.dataset.bshare,text=`🎂 Happy birthday ${n}! 🎉\nFrom the whole MLD 03 family.\n${location.origin}/?p=${encodeURIComponent(n)}`;
      if(navigator.share)navigator.share({text}).catch(()=>{});else{try{navigator.clipboard.writeText(text);window.mldToast&&mldToast('Copied. Paste it in the group');}catch(err){}}}
  });
  banner();
  setTimeout(burst,2900); // once per visit, after the opening animation
})();
