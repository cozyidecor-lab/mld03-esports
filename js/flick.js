/* ================= MLD FLICK: turn-based disc football ================= */
const FL=(function(){
  const W=100,H=160,GOAL=34,DR=5.2,BR=2.7,POST=1.2;
  const FORMS={
    box:{name:'Box',desc:'2 at the back, 2 up front',pts:[[50,151],[30,128],[70,128],[32,102],[68,102]]},
    diamond:{name:'Diamond',desc:'Balanced, one striker',pts:[[50,151],[50,132],[24,114],[76,114],[50,97]]},
    wall:{name:'Wall',desc:'3 defenders, 1 striker',pts:[[50,151],[22,127],[50,130],[78,127],[50,100]]},
  };
  const POSTS=[[W/2-GOAL/2,0],[W/2+GOAL/2,0],[W/2-GOAL/2,H],[W/2+GOAL/2,H]];
  const WIN=5, TURN_MS=25000, VMAX=3.4;

  /* ---------- physics (deterministic: fixed steps, plain arithmetic) ---------- */
  function setup(fa,fb){
    const d=[];
    FORMS[fa].pts.forEach(p=>d.push({x:p[0],y:p[1],vx:0,vy:0,r:DR,m:1,t:0}));
    FORMS[fb].pts.forEach(p=>d.push({x:W-p[0],y:H-p[1],vx:0,vy:0,r:DR,m:1,t:1}));
    d.push({x:W/2,y:H/2,vx:0,vy:0,r:BR,m:0.4,t:2,ball:1});
    return d;
  }
  function step(b){ // one substep; returns 0 none, 1 team0 scored (top goal), 2 team1 scored (bottom goal)
    for(const o of b){o.x+=o.vx*0.5;o.y+=o.vy*0.5;o.vx*=0.9915;o.vy*=0.9915;}
    for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){
      const a=b[i],c=b[j];const dx=c.x-a.x,dy=c.y-a.y,rr=a.r+c.r,d2=dx*dx+dy*dy;
      if(d2>=rr*rr||d2===0)continue;
      const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rr-d,im=1/a.m+1/c.m;
      a.x-=nx*ov*(1/a.m)/im;a.y-=ny*ov*(1/a.m)/im;c.x+=nx*ov*(1/c.m)/im;c.y+=ny*ov*(1/c.m)/im;
      const rv=(c.vx-a.vx)*nx+(c.vy-a.vy)*ny;if(rv>0)continue;
      const jj=-(1.88*rv)/im;a.vx-=jj*nx/a.m;a.vy-=jj*ny/a.m;c.vx+=jj*nx/c.m;c.vy+=jj*ny/c.m;
    }
    for(const o of b){
      for(const p of POSTS){const dx=o.x-p[0],dy=o.y-p[1],rr=o.r+POST,d2=dx*dx+dy*dy;
        if(d2<rr*rr&&d2>0){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;o.x=p[0]+nx*rr;o.y=p[1]+ny*rr;const vn=o.vx*nx+o.vy*ny;if(vn<0){o.vx-=1.8*vn*nx;o.vy-=1.8*vn*ny;}}}
      if(o.x<o.r){o.x=o.r;o.vx=-o.vx*0.8;} if(o.x>W-o.r){o.x=W-o.r;o.vx=-o.vx*0.8;}
      const inMouth=o.ball&&o.x>W/2-GOAL/2&&o.x<W/2+GOAL/2;
      if(inMouth){ if(o.y<0)return 1; if(o.y>H)return 2; }
      else{ if(o.y<o.r){o.y=o.r;o.vy=-o.vy*0.8;} if(o.y>H-o.r){o.y=H-o.r;o.vy=-o.vy*0.8;} }
    }
    return 0;
  }
  const moving=b=>b.some(o=>o.vx*o.vx+o.vy*o.vy>0.0004);
  const snapPos=b=>b.map(o=>[Math.round(o.x*100)/100,Math.round(o.y*100)/100]);
  function applyPos(b,pos){b.forEach((o,i)=>{o.x=pos[i][0];o.y=pos[i][1];o.vx=0;o.vy=0;});}

  /* ---------- state ---------- */
  const S={mode:null,phase:'menu',board:null,score:[0,0],turn:0,me:0,shotN:0,anim:false,pendingGoal:0,
    forms:[null,null],aim:null,oppAim:null,turnStart:0,room:null,myPeer:null,opp:null,mid:null,lastShotSeen:0,lastSnapSeen:0,
    awaitingSnap:0,result:null,localPick:0,searching:false,names:['You','Opponent']};
  let cv,ctx,raf=0,dpr=1,scale=1,viewFlip=false,fx=[],lastCeleb=0,actx=null;
  const el=id=>document.getElementById(id);

  /* ---------- rendering ---------- */
  function size(){const wrap=el('flWrap');if(!wrap||!cv)return;const w=Math.max(220,Math.min(wrap.clientWidth,460,(window.innerHeight-(document.body.classList.contains('fl-full')?130:190))*W/(H+12)));dpr=window.devicePixelRatio||1;
    cv.style.width=w+'px';cv.style.height=(w*(H+12)/W)+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(w*(H+12)/W*dpr);scale=w/W;}
  function toPx(x,y){return [x*scale*dpr,(y+6)*scale*dpr];}
  function draw(){
    if(!ctx)return;const k=scale*dpr;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
    ctx.setTransform(k,0,0,k,0,6*k);
    if(viewFlip){ctx.translate(W,H);ctx.rotate(Math.PI);}
    // pitch
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#1d6b3a':'#1f7440';ctx.fillRect(0,i*H/8,W,H/8);}
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=.6;ctx.strokeRect(.3,.3,W-.6,H-.6);
    ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,13,0,7);ctx.stroke();
    ctx.strokeRect(W/2-24,0,48,20);ctx.strokeRect(W/2-24,H-20,48,20);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.font='bold 14px Anton, Impact, sans-serif';ctx.textAlign='center';label('MLD',W/2,H/2,5);
    // goals
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(W/2-GOAL/2,-6,GOAL,6);ctx.fillRect(W/2-GOAL/2,H,GOAL,6);
    ctx.fillStyle='#fff';POSTS.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],POST,0,7);ctx.fill();});
    const b=S.board;if(!b)return;
    // aim lines
    const aim=S.aim||S.oppAim;
    if(aim&&b[aim.d]){const o=b[aim.d];const p=Math.min(1,aim.p);
      ctx.save();ctx.setLineDash([1.6,1.4]);ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+aim.dx*(8+34*p),o.y+aim.dy*(8+34*p));ctx.stroke();ctx.restore();
      ctx.strokeStyle=p>.8?'#ff3b3b':p>.45?'#ffb020':'#ffffff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(o.x,o.y,o.r+1.6,-Math.PI/2,-Math.PI/2+p*6.283);ctx.stroke();}
    // discs (labels stay upright when the board is turned)
    function label(t,x,y,dy){ctx.save();ctx.translate(x,y);if(viewFlip)ctx.rotate(Math.PI);ctx.fillText(t,0,dy);ctx.restore();}
    b.forEach((o,i)=>{
      if(o.ball){ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(o.x+(viewFlip?-.5:.5),o.y+(viewFlip?-.7:.7),o.r,0,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(o.x,o.y,o.r*.42,0,7);ctx.fill();return;}
      const mine=S.phase==='play'&&!S.anim&&o.t===S.turn&&isMyTurn();
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(o.x+(viewFlip?-.6:.6),o.y+(viewFlip?-.9:.9),o.r,0,7);ctx.fill();
      if(mine){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(o.x,o.y,o.r+1.1,0,7);ctx.stroke();}
      ctx.fillStyle=o.t===0?'#e3191f':'#f2f2f0';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();
      ctx.strokeStyle=o.t===0?'#7d070b':'#e3191f';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(o.x,o.y,o.r-.5,0,7);ctx.stroke();
      ctx.fillStyle=o.t===0?'#fff':'#e3191f';ctx.font='bold 3.1px Anton, Impact, sans-serif';ctx.textAlign='center';label('MLD',o.x,o.y,1.1);
    });
    // confetti
    fx.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore();});
    ctx.globalAlpha=1;
  }
  function loop(){
    if(S.anim){let g=0;for(let k=0;k<5&&!g;k++){g=step(S.board);if(!moving(S.board))break;}
      if(g||!moving(S.board)){S.board.forEach(o=>{o.vx=0;o.vy=0;});S.anim=false;finishShot();}}
    if(fx.length){fx.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.045;p.vx*=0.99;p.a+=p.va;p.life-=0.012;});fx=fx.filter(p=>p.life>0);}
    if(S.phase==='play')updTimer();
    draw();raf=requestAnimationFrame(loop);
  }

  /* ---------- turn flow ---------- */
  const isMyTurn=()=>S.mode==='local'||S.turn===S.me;
  function startMatch(){
    S.recorded=false;S.board=setup(S.forms[0],S.forms[1]);S.score=[0,0];S.turn=0;S.shotN=0;S.lastShotSeen=0;S.result=null;
    S.cur=null;S.queue=[];S.finalKnown=false;S.oppOffSince=0;S.noWin=false;S.left=false;S.anim=false;
    S.busy=false;S.passWait=false;S.viewTeam=0;fx=[];viewFlip=S.mode==='online'&&S.me===1;const pv=el('flPass');if(pv)pv.hidden=true;
    S.phase='play';S.turnStart=Date.now();ui();window.scrollTo(0,0);audio();
  }
  function kickoffReset(conceded){S.board=setup(S.forms[0],S.forms[1]);S.turn=conceded;}
  /* ---------- shots: the result is worked out instantly when the shot is taken ----------
     Both phones receive the shot together with its result, play the animation, then apply the
     result. Nothing waits on the shooter's screen staying on, so a phone that locks or switches
     apps can no longer freeze the game. */
  function simulate(d,vx,vy){
    const b=S.board.map(o=>Object.assign({},o));let g=0;
    if(d>=0){b[d].vx=vx;b[d].vy=vy;for(let i=0;i<60000;i++){g=step(b);if(g||!moving(b))break;}}
    return {pos:snapPos(b),goal:g};
  }
  function makeResult(d,vx,vy){
    const sim=simulate(d,vx,vy);const score=S.score.slice();let res=null,turn=1-S.turn;
    if(sim.goal){const team=sim.goal===1?0:1;score[team]++;if(score[team]>=WIN)res=team;turn=sim.goal===1?1:0;}
    return {pos:sim.pos,goal:sim.goal,score,turn,res};
  }
  function takeShot(d,vx,vy){ // by the player whose turn it is (d = -1: the turn timed out)
    S.shotN=Math.max(S.shotN,S.lastShotSeen)+1;
    const sh={n:S.shotN,d,vx,vy,r:makeResult(d,vx,vy)};
    if(S.mode==='online'){S.lastShotSeen=sh.n;pres({shot:sh,aim:null});}
    playShot(sh);
  }
  function playShot(sh){
    S.cur=sh;S.aim=null;S.oppAim=null;if(sh.r.res!=null)S.finalKnown=true;
    if(sh.d>=0&&S.board[sh.d]&&!document.hidden){
      S.board.forEach(o=>{o.vx=0;o.vy=0;});S.board[sh.d].vx=sh.vx;S.board[sh.d].vy=sh.vy;S.anim=true;
      setTimeout(()=>{if(S.cur===sh)finishShot();},15000); // safety net if the animation is interrupted
    } else finishShot();
    ui();
  }
  function finishShot(){
    const sh=S.cur;if(!sh)return;S.cur=null;S.anim=false;const r=sh.r;
    applyPos(S.board,r.pos);S.score=r.score.slice();S.result=r.res==null?null:r.res;
    S.lastShotSeen=Math.max(S.lastShotSeen,sh.n);S.shotN=Math.max(S.shotN,sh.n);
    if(r.goal){celebrate(r.goal===1?0:1,r.goal);S.busy=true;ui();
      setTimeout(()=>{S.busy=false;
        if(S.result==null){S.board=setup(S.forms[0],S.forms[1]);S.turn=r.turn;S.turnStart=Date.now();afterTurn();nextQueued();}
        else endMatch();},2600);
      return;}
    S.turn=r.turn;S.turnStart=Date.now();
    if(S.result!=null){endMatch();return;}
    afterTurn();nextQueued();
  }
  function nextQueued(){if(S.queue&&S.queue.length&&!S.cur&&!S.busy&&S.phase==='play')playShot(S.queue.shift());}
  function forfeit(){
    if(S.finalKnown||(S.phase!=='play'&&S.phase!=='form'))return;
    S.noWin=S.phase==='form';S.result=S.me;S.left=true;endMatch();
  }
  function afterTurn(){ui();if(S.mode==='local'&&S.turn!==S.viewTeam)passPhone();}
  /* ---------- pass-and-play: hand the phone over, board turns to face the new player ---------- */
  function passPhone(){
    S.passWait=true;const wrap=el('flWrap');if(!wrap)return;
    let ov=el('flPass');if(!ov){ov=document.createElement('div');ov.id='flPass';wrap.appendChild(ov);}
    const red=S.turn===0;
    ov.innerHTML=`<div class="fpbox ${red?'red':'white'}"><div class="fprot">↻</div><b>${red?'Red':'White'}'s turn</b><span>Pass the phone to <em>${red?'Red':'White'}</em>.<br>The pitch turns so your discs are at the bottom.</span><button class="flbtn red" data-flready="1">I'm ready</button></div>`;
    ov.hidden=false;
  }
  function ready(){
    const ov=el('flPass');if(ov)ov.hidden=true;
    cv.classList.remove('flspin');void cv.offsetWidth;cv.classList.add('flspin');
    setTimeout(()=>{cv.classList.remove('flspin');S.viewTeam=S.turn;viewFlip=S.turn===1;S.passWait=false;S.turnStart=Date.now();draw();ui();},520);
  }
  /* ---------- goal celebration: confetti, banner, crowd cheer ---------- */
  function celebrate(team,g){
    if(Date.now()-lastCeleb<3000)return;lastCeleb=Date.now();
    const gy=g===1?0:H,dir=g===1?1:-1,cols=team===0?['#e3191f','#ff5a5f','#ffffff','#f0b44a']:['#ffffff','#e3191f','#d9dbe0','#f0b44a'];
    for(let i=0;i<120;i++){const a=(Math.random()-.5)*Math.PI*.9;const sp=1.2+Math.random()*2.6;
      fx.push({x:W/2+(Math.random()-.5)*GOAL,y:gy,vx:Math.sin(a)*sp,vy:dir*Math.cos(a)*sp,a:Math.random()*6,va:(Math.random()-.5)*.4,s:1.4+Math.random()*1.6,c:cols[i%cols.length],life:1.2+Math.random()*.6});}
    const f=el('flFlash');
    if(f){const who=S.mode==='local'?(team===0?'Red':'White'):(team===S.me?'You':(S.oppName||'Opponent'));
      f.innerHTML=`<b>GOAL!</b><span>${String(who).replace(/</g,'&lt;')} ${S.mode==='online'&&team===S.me?'scored':'scores'}</span>`;
      f.className=team===0?'red':'white';void f.offsetWidth;f.classList.add('on');}
    cheer();try{navigator.vibrate&&navigator.vibrate([60,40,120]);}catch(e){}
  }
  function audio(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch(e){actx=null;}return actx;}
  function cheer(){const a=audio();if(!a)return;const t=a.currentTime;
    // crowd roar: filtered noise swelling up and fading out
    const len=2.8,buf=a.createBuffer(1,a.sampleRate*len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const src=a.createBufferSource();src.buffer=buf;const bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1100;bp.Q.value=.6;
    const g=a.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.55,t+.25);g.gain.exponentialRampToValueAtTime(.25,t+1.4);g.gain.exponentialRampToValueAtTime(.0001,t+len);
    src.connect(bp).connect(g).connect(a.destination);src.start(t);src.stop(t+len);
    // stadium horn: two short blasts
    [[0,.35],[.45,.5]].forEach(([s,l])=>{[233,294].forEach(fq=>{const o=a.createOscillator();o.type='sawtooth';o.frequency.value=fq;
      const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;const og=a.createGain();og.gain.setValueAtTime(0.0001,t+s);
      og.gain.exponentialRampToValueAtTime(.12,t+s+.04);og.gain.setValueAtTime(.12,t+s+l-.06);og.gain.exponentialRampToValueAtTime(.0001,t+s+l);
      o.connect(lp).connect(og).connect(a.destination);o.start(t+s);o.stop(t+s+l+.02);});});
  }
  function endMatch(){S.phase='over';
    if(S.mode==='online'){ if(S.result===S.me&&!S.recorded&&!S.noWin){S.recorded=true;NET.addWin('flick',S.myName);}
      const c=ch;ch=null;if(c)setTimeout(()=>c.close(),8000); }
    ui();}
  function updTimer(){const t=el('flTimer');if(!t)return;if(S.busy||S.passWait){S.turnStart=Date.now();}const left=Math.max(0,TURN_MS-(Date.now()-S.turnStart));
    t.style.width=(left/TURN_MS*100)+'%';
    if(S.phase!=='play')return;
    if(left===0&&!S.anim&&!S.cur&&!S.busy&&!S.passWait&&isMyTurn())takeShot(-1,0,0);
    // online: if the other phone has gone quiet for a long time, the match is theirs to lose
    if(S.mode==='online'&&!isMyTurn()&&!S.cur&&!S.busy&&Date.now()-S.turnStart>TURN_MS+30000)forfeit();
    if(S.mode==='online'&&S.oppOffSince&&Date.now()-S.oppOffSince>30000)forfeit();}

  /* ---------- input: pull back and release ---------- */
  function ptr(e){const r=cv.getBoundingClientRect();let x=(e.clientX-r.left)/scale,y=(e.clientY-r.top)/scale-6;if(viewFlip){x=W-x;y=H-y;}return [x,y];}
  let drag=null;
  function down(e){
    if(S.phase!=='play'||S.anim||S.busy||S.passWait||!isMyTurn())return;audio();
    if(S.cur||(S.queue&&S.queue.length))return;
    const [x,y]=ptr(e);let best=-1,bd=1e9;
    S.board.forEach((o,i)=>{if(o.t!==S.turn)return;const d=(o.x-x)**2+(o.y-y)**2;if(d<bd&&d<(o.r*2.2)**2){bd=d;best=i;}});
    if(best<0)return;drag={d:best};cv.setPointerCapture(e.pointerId);e.preventDefault();move(e);
  }
  function move(e){if(!drag)return;const [x,y]=ptr(e);const o=S.board[drag.d];let dx=o.x-x,dy=o.y-y;const len=Math.sqrt(dx*dx+dy*dy);
    if(len<0.5){S.aim=null;return;}dx/=len;dy/=len;S.aim={d:drag.d,dx,dy,p:Math.min(1,len/28)};
    if(S.mode==='online')pres({aim:{d:drag.d,dx:+dx.toFixed(3),dy:+dy.toFixed(3),p:+S.aim.p.toFixed(3)}});}
  function up(){if(!drag)return;const a=S.aim;drag=null;S.aim=null;if(S.mode==='online')pres({aim:null});
    if(!a||a.p<0.08)return;
    const vx=Math.round(a.dx*a.p*VMAX*1000)/1000,vy=Math.round(a.dy*a.p*VMAX*1000)/1000;
    takeShot(a.d,vx,vy);}

  /* ---------- online: matchmaking + sync over room presence ---------- */
  let ch=null,cancelFind=null;
  function pres(p){if(ch)ch.send(p);}
  function onOpp(op){
    if(S.mode!=='online')return;
    if(op.name)S.oppName=op.name;
    if(op.left){forfeit();return;}
    S.oppOffSince=op.on===false?(S.oppOffSince||Date.now()):0;
    if(S.phase==='form'){S.forms[1-S.me]=op.ready?op.fm:null;ui();
      if(S.forms[0]&&S.forms[1])startMatch();return;}
    if(S.phase==='play'){
      S.oppAim=op.aim&&S.turn!==S.me&&!S.cur?op.aim:null;
      const sh=op.shot;
      if(sh&&sh.r&&sh.r.pos&&sh.n>S.lastShotSeen){S.lastShotSeen=sh.n;
        if(S.cur||S.busy)S.queue.push(sh);else playShot(sh);}
    }
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.cur&&S.anim)finishShot();});
  window.addEventListener('pagehide',()=>{if(S.mode==='online'&&ch&&(S.phase==='play'||S.phase==='form'))ch.send({left:true});});
  function goOnline(){
    if(!NET.available()){S.phase='menu';ui();return;}
    NET.askName('MLD Flick').then(name=>{
      if(!name)return;S.myName=name;S.mode='online';S.left=false;S.oppName='';S.phase='search';ui();
      cancelFind=NET.findMatch('flick',name,m=>{cancelFind=null;S.me=m.me;S.mid=m.mid;S.oppName=m.opp;
        ch=NET.channel('flick',m.mid,m.me);ch.send({name,fm:null,ready:false,shot:null,snap:null,aim:null});ch.onOpp(onOpp);
        S.forms=[null,null];S.lastShotSeen=0;S.finalKnown=false;S.noWin=false;S.oppOffSince=0;S.phase='form';ui();});
    });
  }
  function leaveOnline(){if(cancelFind){cancelFind();cancelFind=null;}if(ch){ch.close();ch=null;}}
  /* ---------- screens ---------- */
  function formCards(team){return Object.entries(FORMS).map(([k,f])=>{
    const dots=f.pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]-80}" r="5" fill="${team===0?'#e3191f':'#f2f2f0'}"/>`).join('');
    return `<button class="flform" data-fm="${k}"><svg viewBox="0 0 100 80"><rect width="100" height="80" rx="6" fill="#1f7440"/><path d="M0 1H100M30 80V64H70V80" stroke="rgba(255,255,255,.5)" fill="none"/>${dots}</svg><b>${f.name}</b><small>${f.desc}</small></button>`;}).join('');}
  function ui(){
    const box=el('flPanel');if(!box)return;
    const sc=el('flScore');const stage=el('flStage');
    const nm=t=>S.mode==='local'?(t===0?'Red':'White'):(t===S.me?'You':(S.oppName||'Opponent'));
    stage.hidden=!(S.phase==='play'||S.phase==='over');
    document.body.classList.toggle('fl-full',!stage.hidden&&active);const vg=el('v-game');if(vg)vg.classList.toggle('playing',!stage.hidden);
    if(S.phase==='menu'){
      const on=NET.available();
      box.innerHTML=`<div class="flcard"><p>Pull back one of your discs, aim and let go to hit the ball. Teams take turns. First to <b>${WIN} goals</b> wins.</p>
        <button class="flbtn red" data-fl="online" ${on?'':'disabled'}>Find online match</button>
        <p class="note">${on?'Type your name and you are matched with the next player who taps Find online match. Wins go on the Mini Games leaderboard.':'Online play could not connect. Check your internet and reload the page.'}</p>
        <button class="flbtn" data-fl="local">Play on this phone · 2 players</button></div>`;
    } else if(S.phase==='search'){
      box.innerHTML=`<div class="flcard center"><div class="flspin"></div><b class="flbig">Looking for an opponent…</b><p class="note">Playing as <b>${(S.myName||'').replace(/</g,'&lt;')}</b>. The match starts as soon as another player taps Find online match.</p><button class="flbtn" data-fl="cancel">Cancel</button></div>`;
    } else if(S.phase==='form'){
      const team=S.mode==='local'?S.localPick:S.me;const mine=S.forms[team];
      const who=S.mode==='local'?(team===0?'Red team':'White team'):'Your team';
      const oppReady=S.mode==='online'&&S.forms[1-S.me];
      box.innerHTML=`<div class="flcard"><b class="flbig">${who}: pick a formation</b>
        <div class="flforms">${formCards(team)}</div>
        ${S.mode==='online'?`<p class="note">You vs <b>${(S.oppName||'Opponent').replace(/</g,'&lt;')}</b>. ${mine?'Locked in. ':''}${oppReady?'They are ready.':'They are still choosing.'}</p>`:''}</div>`;
      if(mine)box.querySelectorAll('.flform').forEach(b=>b.classList.toggle('on',b.dataset.fm===mine));
    } else if(S.phase==='play'){
      const my=isMyTurn()&&!S.anim&&!S.cur;
      const mine=S.mode==='online'&&my&&!S.busy;
      box.innerHTML=`<div class="flturn ${S.turn===0?'red':'white'}${mine?' mine':''}">${S.busy?'⚽ Goal! Kick-off in a moment…':S.anim?'…':S.mode==='local'?`${nm(S.turn)} to play`:my?'🟢 Your turn · pull back a disc':`${(S.oppName||'Opponent').replace(/</g,'&lt;')} is aiming…`}</div>`;
    } else if(S.phase==='over'){
      const won=S.mode==='online'?S.result===S.me:null;
      box.innerHTML=`<div class="flcard center"><b class="flbig">${S.left?`${(S.oppName||'Opponent').replace(/</g,'&lt;')} left. You win!`:S.mode==='local'?`${nm(S.result)} wins!`:won?'You win!':`${nm(S.result).replace(/</g,'&lt;')} wins`}</b>
        <p class="note">${S.score[0]} – ${S.score[1]}${S.mode==='online'&&won?' · win saved to the leaderboard':''}</p><div class="flrow"><button class="flbtn red" data-fl="${S.mode==='local'?'local':'online'}">Play again</button><button class="flbtn" data-fl="menu">Back</button></div></div>`;
    }
    if(sc)sc.innerHTML=(S.phase==='play'||S.phase==='over')?`<span class="red">${S.mode==='local'?'Red':S.me===0?'You':(S.oppName||'Opp').replace(/</g,'&lt;')}</span><b>${S.score[0]} – ${S.score[1]}</b><span class="white">${S.mode==='local'?'White':S.me===1?'You':(S.oppName||'Opp').replace(/</g,'&lt;')}</span>`:'';
    size();draw();
  }
  /* ---------- full screen while a match is on ---------- */
  function goFull(){const d=document.documentElement;
    try{if(!document.fullscreenElement){if(d.requestFullscreen)d.requestFullscreen({navigationUI:'hide'}).catch(()=>{});else if(d.webkitRequestFullscreen)d.webkitRequestFullscreen();}}catch(e){}}
  function exitFull(){document.body.classList.remove('fl-full');
    try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();}catch(e){}}
  function act(a){
    if(a==='local'||a==='online')goFull();
    if(a==='cancel'||a==='menu')exitFull();
    if(a==='local'){leaveOnline();S.mode='local';S.forms=[null,null];S.localPick=0;S.left=false;S.phase='form';ui();}
    else if(a==='online'){leaveOnline();goOnline();}
    else if(a==='cancel'||a==='menu'){leaveOnline();S.phase='menu';S.mode=null;ui();}
  }
  function pickForm(k){
    if(S.phase!=='form')return;goFull();
    if(S.mode==='local'){S.forms[S.localPick]=k;if(S.localPick===0){S.localPick=1;ui();}else startMatch();return;}
    S.forms[S.me]=k;pres({fm:k,ready:true});ui();if(S.forms[0]&&S.forms[1])startMatch();
  }
  function mount(){
    if(cv)return;cv=el('flCanvas');ctx=cv.getContext('2d');
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    window.addEventListener('resize',()=>{size();draw();});
    document.addEventListener('click',e=>{const a=e.target.closest('[data-fl]');if(a)act(a.dataset.fl);const f=e.target.closest('[data-fm]');if(f)pickForm(f.dataset.fm);if(e.target.closest('[data-flready]'))ready();});
  }
  function show(){active=true;mount();if(!raf)raf=requestAnimationFrame(loop);if(S.phase==='menu'||!S.mode)S.phase=S.phase==='menu'?'menu':S.phase;ui();}
  function hide(){active=false;exitFull();if(raf){cancelAnimationFrame(raf);raf=0;}if(S.phase==='search'||S.phase==='form'||(S.mode==='online'&&S.phase==='play'))act('cancel');}
  let active=false;
  return {show,hide,S,step,setup,joinOnline:()=>act('online')};
})();
