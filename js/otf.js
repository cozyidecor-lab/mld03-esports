/* ================= ONE TOUCH FOOTBALL =================
   Two players, one pitch, two goals. Your footballer runs to the ball by itself:
   TAP to kick, HOLD to charge a power shot, RELEASE to shoot. 60 seconds, then sudden death on a draw.

   Online, through the site's Firebase Realtime Database (no extra services):
   - Invitations live at otf/invites/{id}. Every visitor listens and gets an in-site popup.
     Joining is a database transaction, so only one opponent can ever take an invitation.
     Invitations expire 30 s after creation (server clock).
   - The match lives at otf/matches/{id}. Kick-off time is a server timestamp and both phones read
     the time from the server clock, so the timer is the same on both. The official score is the
     database value (each goal is a +1 transaction; the rules in firebase-rules.json enforce it).
   - The inviting phone runs the ball physics and shares positions about 15 times a second;
     the joining phone sends its taps and draws what it receives. */
const OTF=(function(){
  const W=100,H=160,GOAL=38,BR=2.6,PR=4.6,REACH=PR+BR+4.2,MATCH_MS=60000,INVITE_MS=30000,COUNT_MS=3000;
  const el=id=>document.getElementById(id);
  const H_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const S={screen:null,name:'',inviteId:null,matchId:null,me:0,opp:'',m:null,offs:[],sound:true,ignored:new Set(),popups:{}};
  try{S.name=localStorage.getItem('mld-otf-name')||'';S.sound=localStorage.getItem('mld-otf-sound')!=='0';}catch(e){}
  let DB=null,skew=0;
  const db=()=>{if(!DB&&typeof NET!=='undefined'){DB=NET.db();if(DB)DB.ref('.info/serverTimeOffset').on('value',s=>{skew=s.val()||0;});}return DB;};
  const now=()=>Date.now()+skew;
  const dev=(()=>{try{let d=localStorage.getItem('mld-dev');if(!d){d=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',d);}return d;}catch(e){return 'x'+Math.random().toString(36).slice(2);}})();
  const TS={'.sv':'timestamp'};

  /* ================= the overlay and its screens ================= */
  let root;
  function mount(){
    if(root)return;root=document.createElement('div');root.id='otf';root.hidden=true;
    root.innerHTML=`<div class="otfbox" id="otfBox"></div>`;document.body.appendChild(root);
    // keep everything inside the part of the screen the keyboard leaves visible
    const vv=window.visualViewport;
    const fit=()=>{if(!vv)return;root.style.height=vv.height+'px';root.style.top=vv.offsetTop+'px';};
    if(vv){vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);}
    addEventListener('resize',()=>{fit();if(S.screen==='match')sizeCanvas();});
    root.addEventListener('click',onClick);
  }
  function show(screen,html){mount();S.screen=screen;root.hidden=false;document.body.classList.add('otf-open');
    root.dataset.screen=screen;el('otfBox').innerHTML=html;}
  function close(){
    leaveAll();if(!root)return;root.hidden=true;S.screen=null;document.body.classList.remove('otf-open');
    try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}catch(e){}
  }
  function goFull(){const d=document.documentElement;
    try{if(!document.fullscreenElement){if(d.requestFullscreen)d.requestFullscreen({navigationUI:'hide'}).catch(()=>{});else if(d.webkitRequestFullscreen)d.webkitRequestFullscreen();}}catch(e){}}
  const top=(title,back=true)=>`<div class="otftop">${back?'<button class="otfic" data-o="exit" aria-label="Close the game">✕</button>':'<span></span>'}<b>${title}</b><span class="otfmark">⚽</span></div>`;

  function nameScreen(next){
    S.afterName=next;
    show('name',`${top('One Touch Football')}
      <div class="otfname"><label for="otfName">ENTER YOUR NAME</label>
      <input id="otfName" maxlength="16" autocomplete="nickname" enterkeyhint="done" placeholder="Your name" value="${H_(S.name)}">
      <p class="otfmsg" id="otfNameMsg" hidden>Type a name first.</p>
      <button class="otfbtn red" data-o="name-ok">Continue</button></div>`);
    const i=el('otfName');setTimeout(()=>{i.focus();},60);
    i.addEventListener('focus',()=>setTimeout(()=>i.scrollIntoView({block:'center'}),300));
    i.addEventListener('keydown',e=>{if(e.key==='Enter')onClick({target:{closest:()=>({dataset:{o:'name-ok'}})}});});
  }
  function howtoScreen(){
    show('howto',`${top('One Touch Football')}
      <div class="otfhow"><h2>One Touch <em>Football</em></h2><p class="otftag">One touch. One shot. Score to win.</p>
      ${controlsHtml()}<p class="otfnote">Your player runs to the ball for you. Score more goals than your opponent in <b>60 seconds</b>. If it is level, the next goal wins (sudden death).</p>
      <button class="otfbtn red" data-o="play">Play</button></div>`);
  }
  const controlsHtml=()=>`<ol class="otfctl"><li><b>TAP</b><span>Kick the ball</span></li><li><b>HOLD</b><span>Charge shooting power</span></li><li><b>RELEASE</b><span>Shoot</span></li></ol>`;
  function lobbyScreen(msg){
    show('lobby',`${top('One Touch Football')}
      <div class="otflobby"><div class="otfpitchart" aria-hidden="true"></div>
      <p class="otfhi">Playing as <b>${H_(S.name)}</b> <button class="otflink" data-o="rename">Change</button></p>
      ${msg?`<p class="otfmsg">${msg}</p>`:''}
      <button class="otfbtn red big" data-o="find">Find online match</button>
      <p class="otfnote">Everyone browsing the MLD website gets your invitation. The first to accept plays you.</p>
      <button class="otflink" data-o="howto">How to play</button></div>`);
  }
  function waitingScreen(){
    show('wait',`${top('Finding a match')}
      <div class="otfwait"><div class="otfspin"></div><b>Waiting for an opponent…</b>
      <p class="otfnote">Your invitation is showing to everyone on the MLD website.</p>
      <div class="otfcount" id="otfLeft">30</div><button class="otfbtn" data-o="cancel">Cancel</button></div>`);
  }

  /* ================= invitations ================= */
  function findMatch(){
    const d=db();if(!d){lobbyScreen('Online play could not connect. Check your internet and try again.');return;}
    waitingScreen();
    const ref=d.ref('otf/invites').push();S.inviteId=ref.key;S.me=0;
    ref.onDisconnect().remove();
    ref.set({name:S.name,dev,t:TS,status:'open'}).catch(()=>lobbyScreen('Could not create the invitation. Try again.'));
    const h=ref.on('value',s=>{const v=s.val();if(!v)return;
      if(v.status==='taken'&&v.guest&&S.screen==='wait'){ref.off('value',h);clearInterval(S.waitT);ref.onDisconnect().cancel();
        startMatch(ref.key,0,v.guest);setTimeout(()=>ref.remove().catch(()=>{}),4000);}});
    S.offs.push(()=>ref.off('value',h));
    S.waitT=setInterval(()=>{ref.once('value').then(s=>{const v=s.val();if(!v||S.screen!=='wait')return;
      const left=Math.max(0,Math.ceil((v.t+INVITE_MS-now())/1000));const c=el('otfLeft');if(c)c.textContent=left;
      if(left<=0&&v.status==='open'){clearInterval(S.waitT);ref.remove().catch(()=>{});S.inviteId=null;lobbyScreen('No one joined in 30 seconds. Try again?');}});},500);
  }
  function cancelInvite(){clearInterval(S.waitT);const d=db();if(d&&S.inviteId)d.ref('otf/invites/'+S.inviteId).remove().catch(()=>{});S.inviteId=null;}
  function join(id){
    const d=db();if(!d)return;
    goFull();show('wait',`${top('Joining match',false)}<div class="otfwait"><div class="otfspin"></div><b>Joining…</b></div>`);
    let hostName='';
    d.ref('otf/invites/'+id).transaction(v=>{
      if(!v||v.status!=='open'||v.dev===dev||now()-(v.t||0)>INVITE_MS)return; // abort: gone, taken or expired
      hostName=v.name;v.status='taken';v.guest=S.name;v.gdev=dev;return v;
    },(err,ok,snap)=>{
      if(err||!ok){lobbyScreen('That match is no longer available. Someone else may have joined it.');return;}
      startMatch(id,1,snap.val().name||hostName);
    },false);
  }
  /* listen for invitations from anyone, on every page of the site */
  function listen(){
    const d=db();if(!d)return;
    const q=d.ref('otf/invites').orderByChild('t').startAt(now()-INVITE_MS-5000);
    const upd=s=>{const v=s.val(),id=s.key;if(!v)return hidePopup(id);
      const fresh=now()-(v.t||now())<INVITE_MS;
      if(v.status==='open'&&fresh&&v.dev!==dev&&!S.ignored.has(id)&&!S.screen)showPopup(id,v);else hidePopup(id);};
    q.on('child_added',upd);q.on('child_changed',upd);q.on('child_removed',s=>hidePopup(s.key));
    setInterval(()=>{Object.entries(S.popups).forEach(([id,p])=>{if(now()-p.t>INVITE_MS)hidePopup(id);});},1000);
  }
  function showPopup(id,v){
    if(S.popups[id])return;let box=el('otfPops');
    if(!box){box=document.createElement('div');box.id='otfPops';box.setAttribute('aria-live','polite');document.body.appendChild(box);}
    const p=document.createElement('div');p.className='otfpop';p.innerHTML=`<div class="otfpophead">⚽ FOOTBALL MATCH INVITATION</div>
      <p><b>${H_(v.name)}</b> is looking for an opponent!</p><p class="otfpopq">Join the One Touch Football match?</p>
      <div class="otfpoprow"><button class="otfbtn red" data-join="${H_(id)}">Join match</button><button class="otfbtn" data-ignore="${H_(id)}">Ignore</button></div>
      <i class="otfpopbar" style="animation-duration:${Math.max(1,INVITE_MS-(now()-v.t))}ms"></i>`;
    box.appendChild(p);S.popups[id]={p,t:v.t};
  }
  function hidePopup(id){const x=S.popups[id];if(!x)return;delete S.popups[id];x.p.classList.add('out');setTimeout(()=>x.p.remove(),300);}
  document.addEventListener('click',e=>{
    const j=e.target.closest('[data-join]'),ig=e.target.closest('[data-ignore]');
    if(ig){S.ignored.add(ig.dataset.ignore);hidePopup(ig.dataset.ignore);}
    if(j){const id=j.dataset.join;hidePopup(id);Object.keys(S.popups).forEach(hidePopup);
      if(S.name)join(id);else{goFull();nameScreen(()=>join(id));}}
    if(e.target.closest('[data-otf="open"]'))open();
  });

  /* ================= the match ================= */
  let cv,ctx,raf=0,game=null;
  function matchHtml(){return `<div class="otfmatch">
      <div class="otfbar"><button class="otfic" data-o="gear" aria-label="Settings">⚙</button>
        <div class="otfsc"><span class="n0" id="otfN0"></span><b id="otfScore">0 – 0</b><span class="n1" id="otfN1"></span></div>
        <div class="otftime" id="otfTime">1:00</div></div>
      <div class="otfstage" id="otfStage"><canvas id="otfCv" aria-label="Pitch. Tap to kick, hold to charge, release to shoot."></canvas>
        <div class="otfpow"><i id="otfPow"></i></div><div class="otfbig" id="otfBig"></div></div>
      <div class="otfgear" id="otfGear" hidden><b>Settings</b>${controlsHtml()}
        <label class="otfsw"><input type="checkbox" id="otfSnd" ${S.sound?'checked':''}> Sound</label>
        <div class="otfpoprow"><button class="otfbtn" data-o="gear">Back to game</button><button class="otfbtn" data-o="leave">Leave match</button></div></div></div>`;}
  function startMatch(id,me,opp){
    S.matchId=id;S.me=me;S.opp=opp;S.inviteId=null;
    const d=db(),ref=d.ref('otf/matches/'+id);S.mref=ref;
    show('match',matchHtml());
    cv=el('otfCv');ctx=cv.getContext('2d');sizeCanvas();bindInput();
    el('otfN0').textContent=me===0?'You':opp;el('otfN1').textContent=me===1?'You':opp;
    el('otfSnd').addEventListener('change',e=>{S.sound=e.target.checked;try{localStorage.setItem('mld-otf-sound',S.sound?'1':'0');}catch(err){}});
    game={phase:'wait',score:[0,0],start:0,sd:false,result:null,st:null,stAt:0,local:null,lastIn:{},pause:0,charge:[0,0],holdT:[0,0],buffer:[0,0],lastScoreSeen:[0,0],oppOn:true,oppOffAt:0};
    if(me===0){game.local=fresh();ref.update({score:{0:0,1:0},created:TS,names:{0:S.name,1:opp}}).catch(()=>{});}
    const meRef=ref.child('p'+me);meRef.update({on:true,ready:true,name:S.name}).catch(()=>{});
    const ci=d.ref('.info/connected'),ch=c=>{if(c.val()&&game&&!game.result){meRef.child('on').onDisconnect().set(false);meRef.update({on:true}).catch(()=>{});}};
    ci.on('value',ch);S.offs.push(()=>ci.off('value',ch));
    const h=ref.on('value',s=>onMatch(s.val()||{}));S.offs.push(()=>ref.off('value',h));
    show_big(`<small>You vs ${H_(opp)}</small><b>Get ready</b><span>Tap to kick · Hold to charge · Release to shoot</span>`);
    cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(frame);
  }
  function onMatch(m){
    if(!game)return;game.m=m;
    const op=m['p'+(1-S.me)]||{};
    if(op.on===false&&game.oppOn){game.oppOn=false;game.oppOffAt=Date.now();}else if(op.on){game.oppOn=true;}
    if(op.left&&!game.result&&game.phase!=='over'){finish({winner:S.me,why:'left'});return;}
    // both ready: the inviting phone stamps kick-off with the server clock
    if(S.me===0&&!m.start&&m.p0&&m.p1&&m.p0.ready&&m.p1.ready&&m.p1.on){S.mref.child('start').set(TS);}
    if(m.start){game.start=m.start+COUNT_MS;game.phase='play';}
    const sc=m.score||{};const s=[sc[0]||0,sc[1]||0];
    if(s[0]+s[1]>game.lastScoreSeen[0]+game.lastScoreSeen[1]){const who=s[0]>game.lastScoreSeen[0]?0:1;celebrate(who);}
    game.lastScoreSeen=s;game.score=s;game.sd=!!m.sd;
    if(S.me===1&&m.st){game.st=m.st;game.stAt=performance.now();}
    if(S.me===0&&m.in1){const i=m.in1;if(i.s!==game.lastIn.s){game.lastIn=i;if(i.h)press(1);else release(1);}}
    if(m.result&&!game.result)finish(m.result);
    paintBar();
  }
  /* ---------- physics (inviting phone only) ---------- */
  function fresh(){return {b:{x:W/2,y:H/2,vx:0,vy:0},p:[{x:W/2,y:H-22,vx:0,vy:0},{x:W/2,y:22,vx:0,vy:0}]};}
  // player 0 defends the bottom goal and attacks the top; player 1 the opposite
  const goalY=k=>k===0?0:H;
  function stepWorld(dt){
    const w=game.local,b=w.b;
    if(game.pause>0){game.pause-=dt;return 0;}
    w.p.forEach((q,k)=>{
      const gx=W/2,gy=goalY(k);let dx=b.x-gx,dy=b.y-gy;const L=Math.hypot(dx,dy)||1;
      const tx=b.x+dx/L*(PR+BR+1.5),ty=b.y+dy/L*(PR+BR+1.5); // stand behind the ball, facing the goal you attack
      let ax=tx-q.x,ay=ty-q.y;const d=Math.hypot(ax,ay);const sp=(game.ghost&&game.ghost[k]>0)?12:game.charge[k]>0?26:38;
      if(d>0.3){q.vx=ax/d*Math.min(sp,d*6);q.vy=ay/d*Math.min(sp,d*6);}else{q.vx=q.vy=0;}
      q.x=Math.max(PR,Math.min(W-PR,q.x+q.vx*dt));q.y=Math.max(PR,Math.min(H-PR,q.y+q.vy*dt));
      if(game.charge[k]>0)game.charge[k]=Math.min(1,game.charge[k]+dt/0.9);
      if(game.buffer[k]>0){game.buffer[k]-=dt;if(Math.hypot(b.x-q.x,b.y-q.y)<=REACH){kick(k,game.bufPow[k]);game.buffer[k]=0;}}
    });
    // players push each other apart
    const [a,c]=w.p,dx=c.x-a.x,dy=c.y-a.y,dd=Math.hypot(dx,dy),mn=PR*2;
    if(dd<mn&&dd>0){const o=(mn-dd)/2,nx=dx/dd,ny=dy/dd;a.x-=nx*o;a.y-=ny*o;c.x+=nx*o;c.y+=ny*o;}
    // ball touches players
    game.ghost=game.ghost||[0,0];game.ghost=game.ghost.map(g=>Math.max(0,g-dt));
    w.p.forEach((q,qi)=>{if(game.ghost[qi]>0)return;const dx=b.x-q.x,dy=b.y-q.y,dd=Math.hypot(dx,dy),mn=PR+BR;
      if(dd<mn&&dd>0){const nx=dx/dd,ny=dy/dd;b.x=q.x+nx*mn;b.y=q.y+ny*mn;const vn=(b.vx-q.vx)*nx+(b.vy-q.vy)*ny;if(vn<0){b.vx-=1.6*vn*nx;b.vy-=1.6*vn*ny;}}});
    b.x+=b.vx*dt;b.y+=b.vy*dt;const f=Math.pow(0.55,dt);b.vx*=f;b.vy*=f;
    if(b.x<BR){b.x=BR;b.vx=Math.abs(b.vx)*.8;}if(b.x>W-BR){b.x=W-BR;b.vx=-Math.abs(b.vx)*.8;}
    const mouth=Math.abs(b.x-W/2)<GOAL/2;
    if(mouth&&b.y<0)return 1;   // into the top goal: player 0 scores
    if(mouth&&b.y>H)return 2;   // into the bottom goal: player 1 scores
    if(!mouth){if(b.y<BR){b.y=BR;b.vy=Math.abs(b.vy)*.8;}if(b.y>H-BR){b.y=H-BR;b.vy=-Math.abs(b.vy)*.8;}}
    return 0;
  }
  function kick(k,pow){const w=game.local,b=w.b;
    // aim at a random spot inside the goal you attack; the stronger the shot, the wider it can go
    const tx=W/2+(Math.random()-.5)*GOAL*(.35+.5*pow),ty=k===0?-4:H+4;let dx=tx-b.x,dy=ty-b.y;const L=Math.hypot(dx,dy)||1;
    const sp=60+pow*130;b.vx=dx/L*sp;b.vy=dy/L*sp;game.ghost=[0,0];game.ghost[1-k]=0.32+0.25*pow;sfx('kick');}
  function press(k){if(!game||game.phase!=='play'||!running())return;game.charge[k]=0.001;game.holdT[k]=performance.now();}
  function release(k){if(!game||!game.charge[k])return;const pow=game.charge[k];game.charge[k]=0;
    if(!game.local)return;const q=game.local.p[k],b=game.local.b;
    if(Math.hypot(b.x-q.x,b.y-q.y)<=REACH)kick(k,pow);else{game.buffer[k]=k===1?0.45:0.3;game.bufPow=game.bufPow||[0,0];game.bufPow[k]=pow;}}
  const running=()=>game.start&&now()>=game.start&&!game.result;
  /* ---------- the official clock, score and result ---------- */
  function clock(){if(!game.start)return MATCH_MS;return Math.max(0,game.start+MATCH_MS-now());}
  function hostTick(dt){
    if(!running())return;
    const g=stepWorld(dt);
    if(g&&!game.scoring){game.scoring=true;const who=g===1?0:1;game.pause=1.6;
      S.mref.child('score/'+who).transaction(v=>(v||0)+1).then(r=>{
        if(game.sd&&r.committed)S.mref.child('result').transaction(v=>v||{winner:who,score:null,why:'sd'});
        setTimeout(()=>{const n=fresh();game.local.b=n.b;game.local.p=n.p;game.scoring=false;},1500);
      }).catch(()=>{game.scoring=false;});}
    if(clock()<=0&&!game.endSent){
      const [a,b]=game.score;
      if(a!==b){game.endSent=true;S.mref.child('result').transaction(v=>v||{winner:a>b?0:1,why:'time'});}
      else if(!game.sd){S.mref.child('sd').set(true);}
    }
    // share positions ~15 times a second
    const t=performance.now();if(t-(game.sent||0)>66){game.sent=t;const w=game.local,r=x=>Math.round(x*10)/10;
      S.mref.child('st').set({b:[r(w.b.x),r(w.b.y),r(w.b.vx),r(w.b.vy)],p:w.p.map(q=>[r(q.x),r(q.y)]),c:game.charge.map(x=>Math.round(x*100)/100)}).catch(()=>{});}
  }
  function finish(res){
    if(game.result)return;game.result=res;game.phase='over';cancelAnimationFrame(raf);
    const sc=game.score,won=res.winner===S.me;sfx(won?'win':'whistle');
    setTimeout(()=>{if(S.mref){S.mref.child('p'+S.me).update({on:false}).catch(()=>{});S.mref.child('p'+S.me+'/on').onDisconnect().cancel();}
      if(S.me===0&&S.mref){const r=S.mref;setTimeout(()=>r.remove().catch(()=>{}),60000);}},1500);
    show('result',`${top('Full time',false)}<div class="otfres ${won?'won':'lost'}"><small>${res.why==='left'?`${H_(S.opp)} left the match`:res.why==='sd'?'Sudden death':'Final score'}</small>
      <div class="otfresc"><span>${S.me===0?'You':H_(S.opp)}</span><b>${sc[0]} – ${sc[1]}</b><span>${S.me===1?'You':H_(S.opp)}</span></div>
      <h2>${won?'YOU WON':'YOU LOST'}</h2><p class="otfnote">${won?'Winner: you':`Winner: ${H_(S.opp)}`}</p>
      <button class="otfbtn red" data-o="again">Play again</button><button class="otfbtn" data-o="exit">Exit</button></div>`);
    leaveAll(true);
  }
  /* ---------- drawing ---------- */
  function sizeCanvas(){const st=el('otfStage');if(!st||!cv)return;const r=st.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';}
  function view(){ // own goal always at the bottom (portrait) or left (landscape); never stretched
    const land=cv.width>cv.height,ww=land?H:W,hh=land?W:H,s=Math.min(cv.width/(ww+8),cv.height/(hh+8));
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.translate(cv.width/2,cv.height/2);
    ctx.rotate((S.me===1?Math.PI:0)+(land?Math.PI/2:0));ctx.scale(s,s);ctx.translate(-W/2,-H/2);return s;}
  function stateNow(){
    if(S.me===0)return game.local;
    const st=game.st;if(!st)return fresh();
    const age=Math.min(.2,(performance.now()-game.stAt)/1000);
    const d=game.disp||(game.disp=fresh()),k=0.35;
    const bx=st.b[0]+st.b[2]*age,by=st.b[1]+st.b[3]*age;d.b.x+=(bx-d.b.x)*k;d.b.y+=(by-d.b.y)*k;
    st.p.forEach((p,i)=>{d.p[i].x+=(p[0]-d.p[i].x)*k;d.p[i].y+=(p[1]-d.p[i].y)*k;});
    if(Math.abs(bx-d.b.x)>25||Math.abs(by-d.b.y)>25){d.b.x=bx;d.b.y=by;}
    return d;
  }
  function draw(){
    if(!ctx)return;view();const w=stateNow();
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#1d6b3a':'#1f7440';ctx.fillRect(0,i*H/8,W,H/8);}
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.6;ctx.strokeRect(.3,.3,W-.6,H-.6);
    ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,12,0,7);ctx.stroke();
    ctx.strokeRect(W/2-24,0,48,20);ctx.strokeRect(W/2-24,H-20,48,20);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(W/2-GOAL/2,-5,GOAL,5);ctx.fillRect(W/2-GOAL/2,H,GOAL,5);
    ctx.fillStyle='#fff';[[W/2-GOAL/2,0],[W/2+GOAL/2,0],[W/2-GOAL/2,H],[W/2+GOAL/2,H]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,1.1,0,7);ctx.fill();});
    const ch=S.me===0?game.charge:(game.st&&game.st.c)||[0,0];
    w.p.forEach((q,i)=>{const mine=i===S.me;
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(q.x+.5,q.y+.7,PR,0,7);ctx.fill();
      if(ch[i]>0){ctx.strokeStyle=ch[i]>.8?'#ff3b3b':ch[i]>.45?'#ffb020':'#fff';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(q.x,q.y,PR+1.8,-Math.PI/2,-Math.PI/2+ch[i]*6.283);ctx.stroke();}
      ctx.fillStyle=mine?'#e3191f':'#f2f2f0';ctx.beginPath();ctx.arc(q.x,q.y,PR,0,7);ctx.fill();
      ctx.strokeStyle=mine?'#fff':'#e3191f';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(q.x,q.y,PR-.6,0,7);ctx.stroke();});
    const b=w.b;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(b.x+.4,b.y+.6,BR,0,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,BR,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(b.x,b.y,BR*.4,0,7);ctx.fill();
    const pw=el('otfPow');if(pw)pw.style.width=Math.round((ch[S.me]||0)*100)+'%';
  }
  let last=0;
  function frame(t){raf=requestAnimationFrame(frame);const dt=Math.min(.05,(t-(last||t))/1000);last=t;if(!game)return;
    if(S.me===0)hostTick(dt);
    // opponent gone for more than 10 seconds: the match ends
    if(!game.oppOn&&game.oppOffAt&&Date.now()-game.oppOffAt>10000&&!game.result){S.mref.child('result').transaction(v=>v||{winner:S.me,why:'left'});finish({winner:S.me,why:'left'});return;}
    paintBar();draw();}
  function paintBar(){if(!game)return;const sc=el('otfScore');if(sc)sc.textContent=`${game.score[0]} – ${game.score[1]}`;
    const tm=el('otfTime');if(!tm)return;
    if(!game.start){tm.textContent='1:00';return;}
    const pre=game.start-now();
    if(pre>0){show_big(`<b>${Math.ceil(pre/1000)}</b><span>Tap to kick · Hold to charge · Release to shoot</span>`,true);tm.textContent='1:00';return;}
    if(game.wasCounting){game.wasCounting=false;hide_big();sfx('whistle');}
    const c=clock();tm.classList.toggle('sd',game.sd&&c<=0);tm.textContent=game.sd&&c<=0?'SUDDEN DEATH':`${Math.floor(c/60000)}:${String(Math.ceil(c/1000)%60===0&&c>=60000?0:Math.ceil(c/1000)%60).padStart(2,'0')}`;
    if(c<=0&&!game.sd&&game.score[0]===game.score[1])tm.textContent='0:00';}
  function show_big(html,counting){const b=el('otfBig');if(!b)return;b.innerHTML=html;b.hidden=false;if(counting)game&&(game.wasCounting=true);}
  function hide_big(){const b=el('otfBig');if(b)b.hidden=true;}
  function celebrate(who){const mine=who===S.me;show_big(`<b class="g">GOAL!</b><span>${mine?'You scored':H_(S.opp)+' scored'}</span>`);
    sfx(mine?'goal':'conc');try{navigator.vibrate&&navigator.vibrate(mine?[60,40,120]:60);}catch(e){}
    setTimeout(()=>{if(game&&!game.result)hide_big();},1500);}
  /* ---------- input: anywhere on the pitch ---------- */
  function bindInput(){
    const st=el('otfStage');let seq=0;
    const down=e=>{e.preventDefault();if(!game||!running())return;audio();
      if(S.me===0)press(0);else{game.myHold=true;game.myCharge=performance.now();S.mref.child('in1').set({h:1,s:++seq});}};
    const up=e=>{if(!game)return;if(S.me===0)release(0);else if(game.myHold){game.myHold=false;S.mref.child('in1').set({h:0,s:++seq});}};
    st.addEventListener('pointerdown',down);st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);st.addEventListener('pointerleave',up);
    st.addEventListener('contextmenu',e=>e.preventDefault());
  }
  /* ---------- sound ---------- */
  let actx=null;
  function audio(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch(e){}return actx;}
  function sfx(kind){if(!S.sound)return;const a=audio();if(!a)return;const t=a.currentTime;
    const tone=(f,d,type='sine',v=.15,at=0)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t+at);g.gain.exponentialRampToValueAtTime(.0001,t+at+d);o.connect(g).connect(a.destination);o.start(t+at);o.stop(t+at+d+.02);};
    if(kind==='kick')tone(140,.12,'triangle',.25);
    if(kind==='whistle'){tone(2300,.35,'sine',.08);tone(2380,.35,'sine',.06,.05);}
    if(kind==='goal'||kind==='win'){const n=a.createBufferSource(),b=a.createBuffer(1,a.sampleRate*1.6,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      n.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.2);g.gain.exponentialRampToValueAtTime(.0001,t+1.6);
      n.connect(f).connect(g).connect(a.destination);n.start(t);[523,659,784].forEach((f2,i)=>tone(f2,.3,'triangle',.08,i*.1));}
    if(kind==='conc')tone(220,.4,'sawtooth',.05);
  }
  /* ---------- leaving ---------- */
  function leaveAll(keepScreen){
    clearInterval(S.waitT);cancelInvite();
    if(S.mref&&game&&!game.result){S.mref.child('p'+S.me).update({left:true,on:false}).catch(()=>{});}
    S.offs.forEach(f=>{try{f();}catch(e){}});S.offs=[];
    if(!keepScreen){cancelAnimationFrame(raf);game=null;S.mref=null;}
  }
  /* ---------- buttons ---------- */
  function onClick(e){
    const b=e.target.closest('[data-o]');if(!b)return;const o=b.dataset.o;
    if(o==='exit'){close();return;}
    if(o==='name-ok'){const i=el('otfName'),v=(typeof NET!=='undefined'?NET.cleanName(i.value):i.value.trim());
      if(!v){el('otfNameMsg').hidden=false;i.focus();return;}S.name=v;try{localStorage.setItem('mld-otf-name',v);}catch(err){}
      i.blur();const n=S.afterName;S.afterName=null;n?n():howtoScreen();return;}
    if(o==='play'){lobbyScreen();return;}
    if(o==='howto'){howtoScreen();return;}
    if(o==='rename'){nameScreen(()=>lobbyScreen());return;}
    if(o==='find'){goFull();findMatch();return;}
    if(o==='cancel'){cancelInvite();lobbyScreen();return;}
    if(o==='gear'){const g=el('otfGear');if(g)g.hidden=!g.hidden;return;}
    if(o==='leave'){if(game&&!game.result){S.mref.child('p'+S.me).update({left:true,on:false}).catch(()=>{});}leaveAll();lobbyScreen('You left the match.');return;}
    if(o==='again'){leaveAll();game=null;goFull();findMatch();return;}
  }
  function open(){goFull();if(!S.name)nameScreen();else howtoScreen();}
  addEventListener('pagehide',()=>{if(S.inviteId)cancelInvite();if(S.mref&&game&&!game.result)S.mref.child('p'+S.me).update({left:true,on:false});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listen);else listen();
  return {open,S,get game(){return game;}};
})();
