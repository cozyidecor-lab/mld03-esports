/* ================= MLD FLICK: turn-based disc football ================= */
const FL=(function(){
  const W=100,H=160,GOAL=34,DR=5.2,BR=2.7,POST=1.2;
  const FORMS={
    box:{name:'Box',desc:'2 at the back, 2 up front',pts:[[50,151],[30,128],[70,128],[32,102],[68,102]]},
    diamond:{name:'Diamond',desc:'Balanced, one striker',pts:[[50,151],[50,132],[24,114],[76,114],[50,97]]},
    wall:{name:'Wall',desc:'3 defenders, 1 striker',pts:[[50,151],[22,127],[50,130],[78,127],[50,100]]},
  };
  const POSTS=[[W/2-GOAL/2,0],[W/2+GOAL/2,0],[W/2-GOAL/2,H],[W/2+GOAL/2,H]];
  const WIN=2, TURN_MS=25000, VMAX=3.4;

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
      if(inMouth){ if(o.y<-o.r)return 1; if(o.y>H+o.r)return 2; }
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
  let cv,ctx,raf=0,dpr=1,scale=1;
  const el=id=>document.getElementById(id);

  /* ---------- rendering ---------- */
  function size(){const wrap=el('flWrap');if(!wrap||!cv)return;const w=Math.max(220,Math.min(wrap.clientWidth,460,(window.innerHeight-190)*W/(H+12)));dpr=window.devicePixelRatio||1;
    cv.style.width=w+'px';cv.style.height=(w*(H+12)/W)+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(w*(H+12)/W*dpr);scale=w/W;}
  function toPx(x,y){return [x*scale*dpr,(y+6)*scale*dpr];}
  function draw(){
    if(!ctx)return;const k=scale*dpr;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
    ctx.setTransform(k,0,0,k,0,6*k);
    // pitch
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#1d6b3a':'#1f7440';ctx.fillRect(0,i*H/8,W,H/8);}
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=.6;ctx.strokeRect(.3,.3,W-.6,H-.6);
    ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,13,0,7);ctx.stroke();
    ctx.strokeRect(W/2-24,0,48,20);ctx.strokeRect(W/2-24,H-20,48,20);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.font='bold 14px Anton, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('MLD',W/2,H/2+5);
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
    // discs
    b.forEach((o,i)=>{
      if(o.ball){ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(o.x+.5,o.y+.7,o.r,0,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(o.x,o.y,o.r*.42,0,7);ctx.fill();return;}
      const mine=S.phase==='play'&&!S.anim&&o.t===S.turn&&isMyTurn();
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(o.x+.6,o.y+.9,o.r,0,7);ctx.fill();
      if(mine){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(o.x,o.y,o.r+1.1,0,7);ctx.stroke();}
      ctx.fillStyle=o.t===0?'#e3191f':'#f2f2f0';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();
      ctx.strokeStyle=o.t===0?'#7d070b':'#e3191f';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(o.x,o.y,o.r-.5,0,7);ctx.stroke();
      ctx.fillStyle=o.t===0?'#fff':'#e3191f';ctx.font='bold 3.1px Anton, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('MLD',o.x,o.y+1.1);
    });
  }
  function loop(){
    if(S.anim){let g=0;for(let k=0;k<5&&!g;k++){g=step(S.board);if(!moving(S.board))break;}
      if(g){S.pendingGoal=g;S.board.forEach(o=>{o.vx=0;o.vy=0;});}
      if(g||!moving(S.board)){S.board.forEach(o=>{o.vx=0;o.vy=0;});S.anim=false;settled();}}
    if(S.phase==='play')updTimer();
    draw();raf=requestAnimationFrame(loop);
  }

  /* ---------- turn flow ---------- */
  const isMyTurn=()=>S.mode==='local'||S.turn===S.me;
  function startMatch(){
    S.board=setup(S.forms[0],S.forms[1]);S.score=[0,0];S.turn=0;S.shotN=0;S.lastShotSeen=0;S.lastSnapSeen=0;S.awaitingSnap=0;S.result=null;
    S.phase='play';S.turnStart=Date.now();ui();window.scrollTo(0,0);
  }
  function kickoffReset(conceded){S.board=setup(S.forms[0],S.forms[1]);S.turn=conceded;}
  function shoot(d,vx,vy){
    S.board[d].vx=vx;S.board[d].vy=vy;S.anim=true;S.aim=null;S.pendingGoal=0;
  }
  function settled(){
    // the shooter (or the local device) decides the outcome and, online, publishes the result
    const authoritative=S.mode==='local'||S.shooter===S.me;
    if(!authoritative){ if(S.awaitingSnap&&S.snapCache&&S.snapCache.n===S.awaitingSnap)adoptSnap(S.snapCache); return; }
    resolveTurn(S.pendingGoal);
  }
  function resolveTurn(goal){
    if(goal){const team=goal===1?0:1;S.score[team]++;flash(team);}
    if(S.score[0]>=WIN||S.score[1]>=WIN){S.result=S.score[0]>=WIN?0:1;}
    if(goal&&S.result==null)kickoffReset(goal===1?1:0); else S.turn=1-S.turn;
    S.turnStart=Date.now();
    if(S.mode==='online')sendSnap(goal);
    if(S.result!=null)endMatch(); else ui();
  }
  function flash(team){const f=el('flFlash');if(!f)return;f.textContent=(S.mode==='local'?(team===0?'Red':'White'):(team===S.me?'You':'Opponent'))+' scored!';
    f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
  function endMatch(){S.phase='over';ui();}
  function updTimer(){const t=el('flTimer');if(!t)return;const left=Math.max(0,TURN_MS-(Date.now()-S.turnStart));
    t.style.width=(left/TURN_MS*100)+'%';
    if(left===0&&!S.anim&&isMyTurn()&&(S.mode==='local'||S.turn===S.me)&&S.phase==='play'){S.shooter=S.mode==='local'?S.turn:S.me;S.shotN++;resolveTurn(0);}}

  /* ---------- input: pull back and release ---------- */
  function ptr(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/scale,(e.clientY-r.top)/scale-6];}
  let drag=null;
  function down(e){
    if(S.phase!=='play'||S.anim||!isMyTurn())return;
    if(S.mode==='online'&&S.awaitingSnap)return;
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
    S.shooter=S.mode==='local'?S.turn:S.me;S.shotN++;
    if(S.mode==='online')pres({shot:{n:S.shotN,d:a.d,vx,vy}});
    shoot(a.d,vx,vy);ui();}

  /* ---------- online: matchmaking + sync over room presence ---------- */
  function pres(p){if(S.room)S.room.presence(p).catch(()=>{});}
  function sendSnap(goal){pres({snap:{n:S.shotN,pos:snapPos(S.board),score:S.score,turn:S.turn,res:S.result,goal:goal||0}});
    applyPos(S.board,snapPos(S.board));}
  function adoptSnap(sn){applyPos(S.board,sn.pos);const prev=S.score.slice();S.score=sn.score.slice();S.turn=sn.turn;S.result=sn.res;
    S.lastSnapSeen=sn.n;S.shotN=sn.n;S.awaitingSnap=0;S.turnStart=Date.now();
    if(sn.goal){const team=sn.goal===1?0:1;if(S.score[team]>prev[team])flash(team);}
    if(S.result!=null)endMatch();else ui();}
  function peersList(){return S.room?S.room.peers():[];}
  function onlinePeers(){return peersList().filter(p=>p.presence&&p.presence.g==='flick'&&!p.sameTab);}
  function onPeers(){
    const me=peersList().find(p=>p.sameTab);if(me)S.myPeer=me.peer;
    const cnt=el('flOnline');if(cnt){const n=onlinePeers().length;cnt.textContent=n?`${n} other player${n>1?'s':''} here now`:'No one else is here right now';}
    if(S.mode!=='online'||!S.myPeer)return;
    if(S.phase==='search'){
      const others=onlinePeers().filter(p=>p.presence.st==='search');
      const all=[S.myPeer,...others.map(p=>p.peer)].sort();
      if(all.length>=2&&(all[0]===S.myPeer||all[1]===S.myPeer)){
        const opp=all[0]===S.myPeer?all[1]:all[0];
        S.opp=opp;S.me=S.myPeer<opp?0:1;S.mid=[S.myPeer,opp].sort().join('~');
        S.forms=[null,null];S.phase='form';pres({st:'match',mid:S.mid,fm:null,ready:false,shot:null,snap:null,aim:null});ui();
      }
      return;
    }
    const o=peersList().find(p=>p.peer===S.opp);
    if(S.phase==='form'||S.phase==='play'){
      const gone=!o||(o.presence.mid&&o.presence.mid!==S.mid)||(S.phase==='play'&&o.presence.mid!==S.mid)||o.presence.st==='idle';
      if(gone){ S.result=S.me;S.left=true;endMatch(); return; }
      if(o.presence.st==='search')return;
    }
    if(!o)return;const op=o.presence;
    if(S.phase==='form'){S.forms[1-S.me]=op.ready?op.fm:null;ui();
      if(S.forms[0]&&S.forms[1])startMatch();return;}
    if(S.phase==='play'){
      S.oppAim=op.aim&&S.turn!==S.me?op.aim:null;
      if(op.shot&&op.shot.n>S.lastShotSeen&&S.turn!==S.me){S.lastShotSeen=op.shot.n;S.shooter=1-S.me;S.awaitingSnap=op.shot.n;S.oppAim=null;
        const d=op.shot.d;if(S.board[d]&&S.board[d].t===S.turn)shoot(d,op.shot.vx,op.shot.vy);}
      if(op.snap&&op.snap.n>S.lastSnapSeen){S.snapCache=op.snap;
        if(!S.anim||S.awaitingSnap!==op.snap.n){S.anim=false;adoptSnap(op.snap);}}
    }
  }
  async function connect(){
    if(S.room)return S.room;
    try{const c=window.claude;if(!c||!c.use)return null;const r=await c.use('room');if(!r)return null;S.room=r;
      r.onPeers(onPeers,()=>{S.room=null;ui();});pres({g:'flick',st:'idle'});return r;}catch(e){return null;}
  }

  /* ---------- screens ---------- */
  function formCards(team){return Object.entries(FORMS).map(([k,f])=>{
    const dots=f.pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]-80}" r="5" fill="${team===0?'#e3191f':'#f2f2f0'}"/>`).join('');
    return `<button class="flform" data-fm="${k}"><svg viewBox="0 0 100 80"><rect width="100" height="80" rx="6" fill="#1f7440"/><path d="M0 1H100M30 80V64H70V80" stroke="rgba(255,255,255,.5)" fill="none"/>${dots}</svg><b>${f.name}</b><small>${f.desc}</small></button>`;}).join('');}
  function ui(){
    const box=el('flPanel');if(!box)return;
    const sc=el('flScore');const stage=el('flStage');
    const nm=t=>S.mode==='local'?(t===0?'Red':'White'):(t===S.me?'You':'Opponent');
    stage.hidden=!(S.phase==='play'||S.phase==='over');const vg=el('v-game');if(vg)vg.classList.toggle('playing',!stage.hidden);
    if(S.phase==='menu'){
      box.innerHTML=`<div class="flcard"><p>Pull back one of your discs, aim and let go to hit the ball. Teams take turns. First to <b>${WIN} goals</b> wins.</p>
        <button class="flbtn red" data-fl="online">Find online match</button>
        <p class="note" id="flOnline">${S.room===false?'':'Checking who is here…'}</p>
        <button class="flbtn" data-fl="local">Play on this phone · 2 players</button>
        <p class="note" id="flNoRoom" hidden>Online matches are not switched on for the website yet. Play on one phone for now.</p></div>`;
      if(S.room===false){el('flNoRoom').hidden=false;el('flOnline').hidden=true;box.querySelector('[data-fl="online"]').disabled=true;}
      else connect().then(r=>{if(!r){S.room=false;const a=el('flNoRoom'),b=el('flOnline'),c=box.querySelector('[data-fl="online"]');if(a)a.hidden=false;if(b)b.hidden=true;if(c)c.disabled=true;}else onPeers();});
    } else if(S.phase==='search'){
      box.innerHTML=`<div class="flcard center"><div class="flspin"></div><b class="flbig">Looking for an opponent…</b><p class="note">The match starts as soon as another player taps Find online match.</p><button class="flbtn" data-fl="cancel">Cancel</button></div>`;
    } else if(S.phase==='form'){
      const team=S.mode==='local'?S.localPick:S.me;const mine=S.forms[team];
      const who=S.mode==='local'?(team===0?'Red team':'White team'):'Your team';
      const oppReady=S.mode==='online'&&S.forms[1-S.me];
      box.innerHTML=`<div class="flcard"><b class="flbig">${who}: pick a formation</b>
        <div class="flforms">${formCards(team)}</div>
        ${S.mode==='online'?`<p class="note">${mine?'Locked in. ':''}Opponent ${oppReady?'is ready':'is still choosing'}.</p>`:''}</div>`;
      if(mine)box.querySelectorAll('.flform').forEach(b=>b.classList.toggle('on',b.dataset.fm===mine));
    } else if(S.phase==='play'){
      const my=isMyTurn()&&!S.anim&&!(S.mode==='online'&&S.awaitingSnap);
      box.innerHTML=`<div class="flturn ${S.turn===0?'red':'white'}">${S.anim?'…':S.mode==='local'?`${nm(S.turn)} to play`:my?'Your turn · pull back a disc':'Opponent is aiming…'}</div>`;
    } else if(S.phase==='over'){
      const won=S.mode==='online'?S.result===S.me:null;
      box.innerHTML=`<div class="flcard center"><b class="flbig">${S.left?'Opponent left. You win!':S.mode==='local'?`${nm(S.result)} wins!`:won?'You win!':'Opponent wins'}</b>
        <p class="note">${S.score[0]} – ${S.score[1]}</p><div class="flrow"><button class="flbtn red" data-fl="${S.mode==='local'?'local':'online'}">Play again</button><button class="flbtn" data-fl="menu">Back</button></div></div>`;
    }
    if(sc)sc.innerHTML=(S.phase==='play'||S.phase==='over')?`<span class="red">${S.mode==='local'?'Red':S.me===0?'You':'Opp'}</span><b>${S.score[0]} – ${S.score[1]}</b><span class="white">${S.mode==='local'?'White':S.me===1?'You':'Opp'}</span>`:'';
    size();draw();
  }
  function act(a){
    if(a==='local'){S.mode='local';S.forms=[null,null];S.localPick=0;S.left=false;S.phase='form';ui();}
    else if(a==='online'){connect().then(r=>{if(!r){S.room=false;S.phase='menu';ui();return;}
      S.mode='online';S.left=false;S.phase='search';S.opp=null;S.mid=null;pres({g:'flick',st:'search',mid:null,fm:null,ready:false,shot:null,snap:null,aim:null});ui();onPeers();});}
    else if(a==='cancel'||a==='menu'){S.phase='menu';S.mode=null;pres({st:'idle',mid:null,shot:null,snap:null,aim:null,ready:false});ui();}
  }
  function pickForm(k){
    if(S.phase!=='form')return;
    if(S.mode==='local'){S.forms[S.localPick]=k;if(S.localPick===0){S.localPick=1;ui();}else startMatch();return;}
    S.forms[S.me]=k;pres({fm:k,ready:true});ui();if(S.forms[0]&&S.forms[1])startMatch();
  }
  function mount(){
    if(cv)return;cv=el('flCanvas');ctx=cv.getContext('2d');
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    window.addEventListener('resize',()=>{size();draw();});
    document.addEventListener('click',e=>{const a=e.target.closest('[data-fl]');if(a)act(a.dataset.fl);const f=e.target.closest('[data-fm]');if(f)pickForm(f.dataset.fm);});
  }
  function show(){mount();if(!raf)raf=requestAnimationFrame(loop);if(S.phase==='menu'||!S.mode)S.phase=S.phase==='menu'?'menu':S.phase;ui();}
  function hide(){if(raf){cancelAnimationFrame(raf);raf=0;}if(S.phase==='search')act('cancel');}
  return {show,hide,S,step,setup};
})();
