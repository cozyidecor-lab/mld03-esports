/* ================= MLD TURBO: 2D car football ================= */
const TB=(function(){
  const W=200,H=100,R=22,GH=32,BR=5.2,G=150,CW=15,CH=6.4,MATCH=120;
  const el=id=>document.getElementById(id);
  let cv,ctx,raf=0,last=0,acc=0,dpr=1,scale=1;
  const S={phase:'menu',mode:'cpu',t:MATCH,score:[0,0],cars:[],ball:null,count:0,ot:false,flash:'',flashT:0,goalPause:0,trail:[]};
  const keys={};
  const inp=[{l:0,r:0,j:0,b:0,jp:0,x:0,y:0},{l:0,r:0,j:0,b:0,jp:0,x:0,y:0}];

  function car(team){const x=team===0?40:W-40;return {team,x,y:H-CH/2,vx:0,vy:0,a:0,f:team===0?1:-1,ground:true,jumps:0,airT:0,flip:0,flipDir:0,boost:100,boosting:false,spin:0};}
  function kickoff(){S.cars=[car(0),car(1)];S.ball={x:W/2,y:H-48,vx:0,vy:0,spin:0};S.count=2.2;S.trail=[];}
  function start(mode){S.mode=mode;S.score=[0,0];S.t=MATCH;S.ot=false;kickoff();S.phase='play';ui();}

  /* ---------- physics ---------- */
  function cornerPush(o,r){ // keep a circle inside the arena (top corners rounded), return true if touched
    // top-left and top-right rounded corners
    for(const [cx,cy] of [[R,R],[W-R,R]]){
      if((cx<W/2?o.x<cx:o.x>cx)&&o.y<cy){const dx=o.x-cx,dy=o.y-cy,d=Math.sqrt(dx*dx+dy*dy),lim=R-r;
        if(d>lim){const nx=dx/d,ny=dy/d;o.x=cx+nx*lim;o.y=cy+ny*lim;const vn=o.vx*nx+o.vy*ny;if(vn>0){o.vx-=1.75*vn*nx;o.vy-=1.75*vn*ny;}return true;}}
    }
    return false;
  }
  function stepBall(dt){
    const b=S.ball;b.vy+=G*dt;b.vx*=1-0.22*dt;b.vy*=1-0.05*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.vx*dt/BR;
    cornerPush(b,BR);
    if(b.y>H-BR){b.y=H-BR;if(b.vy>0)b.vy=-b.vy*0.72;b.vx*=0.985;}
    if(b.y<BR){b.y=BR;if(b.vy<0)b.vy=-b.vy*0.75;}
    const inMouth=b.y>H-GH;
    for(const side of [0,1]){
      const wx=side===0?0:W, s=side===0?1:-1;
      if(!inMouth){ if(s*(b.x-wx)<BR){b.x=wx+s*BR;if(s*b.vx<0)b.vx=-b.vx*0.75;} }
      else{ // inside goal mouth: crossbar corner + goal back
        if(s*(b.x-wx)<-BR*0.6){return side===0?1:0;} // scored: side 0 goal -> team 1 scores
      }
      // crossbar point
      const px=wx,py=H-GH,dx=b.x-px,dy=b.y-py,d2=dx*dx+dy*dy;
      if(d2<BR*BR&&d2>0){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;b.x=px+nx*BR;b.y=py+ny*BR;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.7*vn*nx;b.vy-=1.7*vn*ny;}}
    }
    return -1;
  }
  function stepCar(c,io,dt){
    // analog stick (touch joystick) or digital left/right (keyboard / computer)
    let ax=io.x||((io.r?1:0)-(io.l?1:0));if(Math.abs(ax)<0.18)ax=0;
    const dir=ax>0?1:ax<0?-1:0, mag=Math.min(1,Math.abs(ax));
    const flipDir=Math.abs(ax)>0.35&&!(io.y<-0.6&&Math.abs(ax)<0.55)?dir:0;
    // jump / double jump / flip (edge-triggered)
    if(io.jp){io.jp=0;
      if(c.ground){c.vy=-78;c.ground=false;c.jumps=1;c.airT=0;}
      else if(c.jumps===1&&c.airT<1.6){c.jumps=2;
        if(flipDir){c.flip=0.42;c.flipDir=flipDir;c.vx+=flipDir*62;c.vy=Math.min(c.vy,-22);} else c.vy=Math.min(c.vy,-62);}
    }
    if(c.ground){
      if(dir){c.vx+=dir*(0.45+0.55*mag)*(c.team===1&&S.mode==='cpu'?120:150)*dt;c.f=dir;} else c.vx*=1-3.2*dt;
      c.a=0;
    } else {
      c.airT+=dt;
      if(c.flip>0){c.flip-=dt;c.a+= -c.flipDir*c.f*(Math.PI*2/0.42)*dt;}
      else if(dir) c.a+= dir*(0.35+0.65*mag)*c.f*-4.6*dt; // stick left/right spins the car in the air
    }
    c.boosting=io.b&&c.boost>0;
    if(c.boosting){const nx=c.f*Math.cos(c.a),ny=Math.sin(c.a)*-1;c.vx+=nx*230*dt;c.vy+=ny*230*dt;c.boost=Math.max(0,c.boost-34*dt);}
    else if(c.ground)c.boost=Math.min(100,c.boost+12*dt);
    const max=c.boosting?105:62;const sp=Math.sqrt(c.vx*c.vx+c.vy*c.vy);if(c.ground&&Math.abs(c.vx)>max)c.vx=Math.sign(c.vx)*max;
    if(sp>160){c.vx*=160/sp;c.vy*=160/sp;}
    c.vy+=G*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
    const hh=CH/2,hw=CW/2;
    if(c.y>=H-hh){c.y=H-hh;if(c.vy>0)c.vy=0;
      if(!c.ground){c.ground=true;c.jumps=0;c.flip=0;c.a=0;}}
    else if(c.ground&&c.y<H-hh-0.5)c.ground=false;
    if(c.y<hh+1){c.y=hh+1;if(c.vy<0)c.vy=0;}
    const o={x:c.x,y:c.y,vx:c.vx,vy:c.vy};if(cornerPush(o,hw*0.7)){c.x=o.x;c.y=o.y;c.vx=o.vx;c.vy=o.vy;}
    if(c.x<hw){c.x=hw;c.vx=Math.max(0,c.vx);} if(c.x>W-hw){c.x=W-hw;c.vx=Math.min(0,c.vx);}
    // normalise angle
    while(c.a>Math.PI)c.a-=Math.PI*2;while(c.a<-Math.PI)c.a+=Math.PI*2;
  }
  function carBall(c){
    const b=S.ball,ca=Math.cos(c.a),sa=Math.sin(c.a);
    // world -> car-local (car drawn with translate, scale(f,1), rotate(-a))
    const dx=(b.x-c.x)*c.f,dy=b.y-c.y;
    const rx=dx*ca-dy*sa, ry=dx*sa+dy*ca;
    const qx=Math.max(-CW/2,Math.min(CW/2,rx)),qy=Math.max(-CH/2,Math.min(CH/2,ry));
    let lx=rx-qx,ly=ry-qy,d2=lx*lx+ly*ly;if(d2>BR*BR)return;
    let d=Math.sqrt(d2);if(d<1e-4){lx=0;ly=-1;d=1;}
    lx/=d;ly/=d;
    // car-local normal -> world
    let nx=(lx*ca+ly*sa)*c.f, ny=-lx*sa+ly*ca;
    const pen=BR-(d2<1e-8?0:d);b.x+=nx*pen;b.y+=ny*pen;
    const rv=(b.vx-c.vx)*nx+(b.vy-c.vy)*ny;
    if(rv<0){const mb=1,mc=3.2,j=-(1+0.42)*rv/(1/mb+1/mc);b.vx+=j*nx/mb;b.vy+=j*ny/mb;c.vx-=j*nx/mc;c.vy-=j*ny/mc;
      const out=b.vx*nx+b.vy*ny;if(out<30){b.vx+=nx*(30-out);b.vy+=ny*(30-out);}
      if(c.flip>0){b.vx+=nx*38;b.vy+=ny*38;}
      hitFx(b.x-nx*BR,b.y-ny*BR);}
  }
  function carCar(){const [a,b]=S.cars;const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy),rr=CW*0.75;
    if(d>=rr||d===0)return;const nx=dx/d,ny=dy/d,ov=(rr-d)/2;a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
    const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const j=-1.5*rv/2;a.vx-=j*nx;a.vy-=j*ny;b.vx+=j*nx;b.vy+=j*ny;}}
  let fx=[];function hitFx(x,y){fx.push({x,y,t:0.35});}

  /* ---------- computer opponent ---------- */
  const ai={jumpCd:0};
  function think(c,io,dt){
    const b=S.ball,own=c.team===0?0:W,att=c.team===0?W:0,s=c.team===0?1:-1;
    ai.react=(ai.react||0)-dt;ai.jumpCd-=dt;if(ai.react>0)return;ai.react=0.12;io.l=io.r=io.b=0;
    const danger=s*(b.x-c.x)<0; // ball is behind me (between me and my goal)
    let tx=danger?b.x-s*14:b.x-s*7;
    if(danger&&Math.abs(b.x-own)<60)tx=own+s*12;
    const dx=tx-c.x;
    if(c.ground){ if(Math.abs(dx)>2){if(dx>0)io.r=1;else io.l=1;}
      if(!danger&&Math.abs(dx)>70&&c.boost>50)io.b=1;
      const dist=Math.hypot(b.x-c.x,b.y-c.y);
      if(ai.jumpCd<=0&&dist<26&&b.y<c.y-8&&Math.abs(b.x-c.x)<16){io.jp=1;ai.jumpCd=1.1;}
    } else {
      if(c.jumps===1&&c.airT>0.25&&ai.jumpCd<0.6&&Math.hypot(b.x-c.x,b.y-c.y)<14){if(b.x>c.x)io.r=1;else io.l=1;io.jp=1;}
      else { const want=Math.atan2(c.y-b.y,(b.x-c.x)*c.f);const diff=want-c.a; if(Math.abs(diff)>0.2){ if(diff>0)c.f>0?io.l=1:io.r=1; else c.f>0?io.r=1:io.l=1; } }
    }
  }

  /* ---------- game loop ---------- */
  function tick(dt){
    if(S.phase!=='play')return;
    if(S.goalPause>0){S.goalPause-=dt;S.ball.vx*=0.9;S.ball.vy*=0.9;if(S.goalPause<=0){if(over())return;kickoff();}stepBall(dt);return;}
    if(S.count>0){S.count-=dt;return;}
    S.t-=dt;
    if(S.mode==='cpu')think(S.cars[1],inp[1],dt);
    S.cars.forEach((c,i)=>stepCar(c,inp[i],dt));
    carCar();
    const sub=3;let goal=-1;
    for(let k=0;k<sub&&goal<0;k++){goal=stepBall(dt/sub);S.cars.forEach(carBall);}
    if(goal>=0){S.score[goal]++;S.goalPause=2.2;S.flash=goal===0?(S.mode==='cpu'?'Goal!':'Red scores!'):(S.mode==='cpu'?'CPU scores':'White scores!');S.flashT=2;
      if(S.ot)S.t=0;}
    if(S.t<=0&&S.goalPause<=0){ if(S.score[0]===S.score[1]){if(!S.ot){S.ot=true;S.t=999;S.flash='Overtime · next goal wins';S.flashT=2.2;}} else {S.t=0;S.phase='over';ui();} }
  }
  function over(){if(S.ot||S.t<=0){if(S.score[0]!==S.score[1]){S.phase='over';ui();return true;}}return false;}
  function frame(ts){
    raf=requestAnimationFrame(frame);
    const dt=Math.min(0.05,(ts-(last||ts))/1000);last=ts;acc+=dt;
    while(acc>=1/120){tick(1/120);acc-=1/120;}
    fx=fx.filter(f=>(f.t-=dt)>0);if(S.flashT>0)S.flashT-=dt;
    draw();hud();
  }

  /* ---------- drawing ---------- */
  function size(){const wrap=el('tbWrap');if(!wrap||!cv)return;const land=matchMedia('(orientation:landscape) and (max-height:520px)').matches;const w=Math.max(240,Math.min(wrap.clientWidth,900,(window.innerHeight-(land?64:200))*W/H));dpr=window.devicePixelRatio||1;
    cv.style.width=w+'px';cv.style.height=(w*H/W)+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(w*H/W*dpr);scale=w/W;}
  function arenaPath(){ctx.beginPath();ctx.moveTo(0,H-GH);ctx.lineTo(0,R);ctx.arcTo(0,0,R,0,R);ctx.lineTo(W-R,0);ctx.arcTo(W,0,W,R,R);ctx.lineTo(W,H-GH);}
  function draw(){
    if(!ctx)return;const k=scale*dpr;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(k,0,0,k,0,0);
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#16141a');g.addColorStop(1,'#241417');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // crowd glow + MLD centre mark
    ctx.fillStyle='rgba(227,25,31,.07)';ctx.font='bold 34px Anton, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('MLD',W/2,H/2+4);
    // floor
    ctx.fillStyle='#1d6b3a';ctx.fillRect(0,H-3,W,3);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(W/2-0.3,H-3,0.6,3);
    // goals
    for(const s of [0,1]){const x=s===0?0:W;const gx=s===0?-10:W;
      ctx.fillStyle=s===0?'rgba(227,25,31,.35)':'rgba(240,240,240,.25)';ctx.fillRect(s===0?0:W-6,H-GH,6,GH);
      ctx.strokeStyle=s===0?'#e3191f':'#f2f2f0';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,H-GH);ctx.lineTo(s===0?6:W-6,H-GH);ctx.stroke();}
    // arena wall
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.1;arenaPath();ctx.stroke();
    ctx.strokeStyle='rgba(227,25,31,.55)';ctx.lineWidth=.5;ctx.save();ctx.translate(0,0);arenaPath();ctx.stroke();ctx.restore();
    // ball shadow + ball
    const b=S.ball;if(!b)return;
    const sh=Math.max(0.2,1-(H-b.y)/90);ctx.fillStyle=`rgba(0,0,0,${0.35*sh})`;ctx.beginPath();ctx.ellipse(b.x,H-1.5,BR*sh,1.1*sh,0,0,7);ctx.fill();
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin);ctx.fillStyle='#f4f4f2';ctx.beginPath();ctx.arc(0,0,BR,0,7);ctx.fill();
    ctx.fillStyle='#e3191f';for(let i=0;i<5;i++){const an=i*1.2566;ctx.beginPath();ctx.arc(Math.cos(an)*BR*.62,Math.sin(an)*BR*.62,BR*.22,0,7);ctx.fill();}
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,BR*.28,0,7);ctx.fill();ctx.restore();
    // cars
    S.cars.forEach(c=>drawCar(c));
    fx.forEach(f=>{ctx.strokeStyle=`rgba(255,255,255,${f.t*2.5})`;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(f.x,f.y,(0.35-f.t)*30+2,0,7);ctx.stroke();});
    // countdown / flash
    ctx.textAlign='center';ctx.fillStyle='#fff';
    if(S.count>0&&S.goalPause<=0){ctx.font='bold 22px Anton, Impact, sans-serif';ctx.fillText(S.count>1.4?'3':S.count>0.7?'2':'1',W/2,H/2-8);}
    if(S.flashT>0){ctx.globalAlpha=Math.min(1,S.flashT);ctx.font='bold 16px Anton, Impact, sans-serif';ctx.fillText(S.flash.toUpperCase(),W/2,H/2-14);ctx.globalAlpha=1;}
  }
  function drawCar(c){
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.f,1);ctx.rotate(-c.a);
    if(c.boosting){ctx.fillStyle='rgba(255,140,40,.9)';ctx.beginPath();ctx.moveTo(-CW/2,-1.6);ctx.lineTo(-CW/2-5-Math.random()*4,0);ctx.lineTo(-CW/2,1.6);ctx.fill();
      ctx.fillStyle='rgba(255,230,120,.9)';ctx.beginPath();ctx.moveTo(-CW/2,-0.9);ctx.lineTo(-CW/2-3,0);ctx.lineTo(-CW/2,0.9);ctx.fill();}
    const body=c.team===0?'#e3191f':'#f2f2f0',trim=c.team===0?'#7d070b':'#e3191f';
    ctx.fillStyle=body;rr(-CW/2,-CH/2,CW,CH*0.72,1.6);ctx.fill();
    ctx.fillStyle=trim;rr(-CW*0.1,-CH/2-2.6,CW*0.42,3,1.2);ctx.fill();
    ctx.fillStyle='rgba(20,20,24,.85)';rr(CW*0.02,-CH/2-2,CW*0.26,2,0.8);ctx.fill();
    ctx.fillStyle=trim;ctx.fillRect(-CW/2,-CH/2+CH*0.72-1.3,CW,1);
    ctx.fillStyle='#111';[-CW*0.3,CW*0.3].forEach(x=>{ctx.beginPath();ctx.arc(x,CH/2-1.4,1.9,0,7);ctx.fill();});
    ctx.fillStyle='#888';[-CW*0.3,CW*0.3].forEach(x=>{ctx.beginPath();ctx.arc(x,CH/2-1.4,.7,0,7);ctx.fill();});
    ctx.restore();
  }
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function hud(){const s=el('tbScore');if(!s||S.phase==='menu')return;
    const t=S.ot?'OT':`${Math.floor(Math.max(0,S.t)/60)}:${String(Math.floor(Math.max(0,S.t)%60)).padStart(2,'0')}`;
    const txt=`${S.score[0]}|${t}|${S.score[1]}`;if(s.dataset.v===txt)return;s.dataset.v=txt;
    s.innerHTML=`<span class="red">${S.mode==='cpu'?'You':'Red'}</span><b>${S.score[0]}</b><em>${t}</em><b>${S.score[1]}</b><span class="white">${S.mode==='cpu'?'CPU':'White'}</span>`;
    [0,1].forEach(i=>{const m=el('tbBoost'+i);if(m&&S.cars[i])m.style.width=S.cars[i].boost+'%';});}

  /* ---------- controls ---------- */
  function pad(i){return `<div class="tbpad p${i}">
    <div class="tbstick" data-stick="${i}" aria-label="Joystick: drive, and spin in the air"><div class="ring"></div><div class="knob"></div></div>
    <div class="tbbtns"><button class="boost" data-tb="${i}:b" aria-label="Boost">BOOST<i><s id="tbBoost${i}"></s></i></button><button class="jump" data-tb="${i}:j" aria-label="Jump">JUMP</button></div></div>`;}
  function bindPads(){
    document.querySelectorAll('[data-tb]').forEach(btn=>{const [i,k]=btn.dataset.tb.split(':');const io=inp[+i];
      const on=e=>{e.preventDefault();btn.setPointerCapture&&btn.setPointerCapture(e.pointerId);btn.classList.add('on');if(k==='j'){io.j=1;io.jp=1;}else io[k]=1;};
      const off=e=>{btn.classList.remove('on');io[k]=0;};
      btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off);
      btn.addEventListener('contextmenu',e=>e.preventDefault());});
    document.querySelectorAll('[data-stick]').forEach(st=>{const io=inp[+st.dataset.stick];const knob=st.querySelector('.knob');let id=null;
      const set=e=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width*0.36;
        let dx=e.clientX-cx,dy=e.clientY-cy;const L=Math.hypot(dx,dy);if(L>R){dx*=R/L;dy*=R/L;}
        knob.style.transform=`translate(${dx}px,${dy}px)`;io.x=dx/R;io.y=dy/R;};
      const end=()=>{id=null;io.x=0;io.y=0;knob.style.transform='';st.classList.remove('on');};
      st.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;st.setPointerCapture(id);st.classList.add('on');set(e);});
      st.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e);});
      st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
      st.addEventListener('contextmenu',e=>e.preventDefault());});
  }
  const KEYMAP={ArrowLeft:[0,'l'],ArrowRight:[0,'r'],ArrowUp:[0,'j'],' ':[0,'j'],Shift:[0,'b'],a:[0,'l'],d:[0,'r'],w:[0,'j'],
    j:[1,'l'],l:[1,'r'],i:[1,'j'],k:[1,'b']};
  function key(e,down){if(!active())return;const m=KEYMAP[e.key]||KEYMAP[e.key.toLowerCase&&e.key.toLowerCase()];if(!m)return;
    if(S.mode==='cpu'&&m[0]===1)return; if(S.mode==='cpu'&&e.key.toLowerCase()==='k')return;
    const io=inp[m[0]];if(m[1]==='j'){if(down&&!io.j)io.jp=1;io.j=down?1:0;}else io[m[1]]=down?1:0;e.preventDefault();}
  let isActive=false;const active=()=>isActive&&S.phase==='play';

  function ui(){
    const p=el('tbPanel'),stage=el('tbStage');if(!p)return;
    stage.hidden=S.phase==='menu';el('v-turbo').classList.toggle('playing',S.phase!=='menu');document.body.classList.toggle('tb-playing',S.phase==='play'&&isActive);
    if(S.phase==='menu'){p.innerHTML=`<div class="flcard"><p>Drive, jump and boost to smash the ball into the other goal. Left thumb: the joystick drives, and spins the car in the air. Right thumb: JUMP and BOOST. Tap JUMP again in the air to flip toward the way the stick is pushed; push the stick up (or leave it centred) for a straight double jump. Most goals in 2 minutes wins.</p>
      <button class="flbtn red" data-tbgo="cpu">Play vs computer</button><button class="flbtn" data-tbgo="duo">2 players on this device</button>
      <p class="note">Tip: turn your phone sideways for a bigger pitch. On a keyboard: arrows or WASD, Space to jump, Shift to boost. Player 2: J L, I to jump, K to boost.</p></div>`;}
    else if(S.phase==='play'){p.innerHTML=`<div class="tbpads ${S.mode}">${pad(0)}${S.mode==='duo'?pad(1):''}</div>`;bindPads();}
    else if(S.phase==='over'){const w=S.score[0]>S.score[1]?0:1;
      p.innerHTML=`<div class="flcard center"><b class="flbig">${S.mode==='cpu'?(w===0?'You win!':'CPU wins'):(w===0?'Red wins!':'White wins!')}</b><p class="note">${S.score[0]} – ${S.score[1]}</p>
      <div class="flrow"><button class="flbtn red" data-tbgo="${S.mode}">Play again</button><button class="flbtn" data-tbgo="menu">Back</button></div></div>`;}
    el('tbScore').dataset.v='';size();hud();draw();
  }
  let mounted=false;
  function mount(){if(mounted)return;mounted=true;cv=el('tbCanvas');ctx=cv.getContext('2d');
    window.addEventListener('resize',()=>{size();draw();});
    document.addEventListener('keydown',e=>key(e,true));document.addEventListener('keyup',e=>key(e,false));
    document.addEventListener('click',e=>{const a=e.target.closest('[data-tbgo]');if(!a)return;const m=a.dataset.tbgo;if(m==='menu'){S.phase='menu';ui();}else start(m);});}
  function show(){mount();isActive=true;if(S.phase==='play'&&!S.ball)S.phase='menu';ui();last=0;if(!raf)raf=requestAnimationFrame(frame);}
  function hide(){isActive=false;document.body.classList.remove('tb-playing');if(raf){cancelAnimationFrame(raf);raf=0;}inp.forEach(io=>{io.l=io.r=io.j=io.b=0;io.x=io.y=0;});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else if(!document.hidden&&isActive&&!raf){last=0;raf=requestAnimationFrame(frame);}});
  return {show,hide,S,inp,tick,start};
})();
