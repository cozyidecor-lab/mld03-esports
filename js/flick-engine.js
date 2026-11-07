/* ================= MLD Football Flick: game engine (physics + computer opponent) =================
   Pure logic, no drawing and no network. The physics is deterministic: it only uses + − × ÷ and √
   (no sin/cos), with a fixed time step, so the same flick from the same positions gives exactly the
   same result on every phone. That is how both players end up with identical positions.

   Pitch: 1100 × 700 units (formation x positions are written for a 1000-wide pitch and stretched). Team A defends the BOTTOM goal (y = 700) and attacks the top.
   Team B defends the TOP goal (y = 0). Bodies: 0 = ball, 1–4 = team A (1 = keeper), 5–8 = team B (5 = keeper).
   A state is a flat array [x0,y0, x1,y1, …] of the 9 bodies at rest. */
const FFE=(function(){
  const W=1100,H=700,R=27,BR=17,GOAL=230,G0=(W-GOAL)/2,G1=(W+GOAL)/2,POST=7,MAXV=26,MAXSTEPS=1500;
  const MASS_D=2.2,MASS_B=1,E_BODY=.9,E_WALL=.72;
  const FORMS={
    '3-1':{label:'3-1',desc:'Three attackers, one keeper',pos:[[500,652],[265,455],[500,428],[735,455]]},
    '2-2':{label:'2-2',desc:'Two attackers, a defender and a keeper',pos:[[500,652],[500,565],[335,445],[665,445]]},
    '1-3':{label:'1-3',desc:'One striker, two defenders and a keeper',pos:[[500,652],[295,565],[705,565],[500,440]]}};
  const TEAM={a:[1,2,3,4],b:[5,6,7,8]};
  const other=s=>s==='a'?'b':'a';
  const rnd=v=>Math.round(v*10)/10;

  function kickoff(fa,fb){
    const X=x=>W/2+(x-500)*W/1000,s=[W/2,H/2];(FORMS[fa]||FORMS['3-1']).pos.forEach(([x,y])=>s.push(X(x),y));
    (FORMS[fb]||FORMS['3-1']).pos.forEach(([x,y])=>s.push(W-X(x),H-y));return s;}

  /* is this flick allowed? (own disc, sensible numbers, not faster than the maximum) */
  function validShot(shot,side){
    if(!shot||!TEAM[side]||!TEAM[side].includes(shot.d))return false;
    if(typeof shot.vx!=='number'||typeof shot.vy!=='number'||!isFinite(shot.vx)||!isFinite(shot.vy))return false;
    const s2=shot.vx*shot.vx+shot.vy*shot.vy;return s2>0.25&&s2<=MAXV*MAXV+0.01;}

  /* run one flick until everything stops (or a goal). Returns final positions, the goal (which team scored),
     and optionally every frame for the animation plus sound events. */
  function simulate(st,shot,opt){
    opt=opt||{};const n=9,x=new Float64Array(n),y=new Float64Array(n),vx=new Float64Array(n),vy=new Float64Array(n),r=new Float64Array(n),im=new Float64Array(n);
    for(let i=0;i<n;i++){x[i]=st[2*i];y[i]=st[2*i+1];r[i]=i?R:BR;im[i]=1/(i?MASS_D:MASS_B);}
    vx[shot.d]=shot.vx;vy[shot.d]=shot.vy;
    const frames=opt.frames?[]:null,events=opt.frames?[]:null;let goal=null,steps=0,ballTouched=false;
    const ev=(k,v)=>{if(events&&events.length<80)events.push({s:steps,k,v});};
    const posts=[[G0,0],[G1,0],[G0,H],[G1,H]];
    for(steps=0;steps<MAXSTEPS;steps++){
      for(let sub=0;sub<2;sub++){
        for(let i=0;i<n;i++){x[i]+=vx[i]/2;y[i]+=vy[i]/2;}
        // walls (the ball may pass between the posts; discs never enter the goals)
        for(let i=0;i<n;i++){const ri=r[i];
          if(x[i]<ri){x[i]=ri;if(vx[i]<0){vx[i]=-vx[i]*E_WALL;ev('w',-vx[i]);}}
          else if(x[i]>W-ri){x[i]=W-ri;if(vx[i]>0){vx[i]=-vx[i]*E_WALL;ev('w',vx[i]);}}
          const mouth=i===0&&x[i]>G0&&x[i]<G1;
          if(!mouth){
            if(y[i]<ri&&y[i]>-ri*3){y[i]=ri;if(vy[i]<0){vy[i]=-vy[i]*E_WALL;ev('w',-vy[i]);}}
            else if(y[i]>H-ri&&y[i]<H+ri*3){y[i]=H-ri;if(vy[i]>0){vy[i]=-vy[i]*E_WALL;ev('w',vy[i]);}}
          }else if(y[i]<0||y[i]>H){ // inside the goal: the side netting keeps it in
            if(x[i]<G0+ri){x[i]=G0+ri;vx[i]=Math.abs(vx[i])*E_WALL;}else if(x[i]>G1-ri){x[i]=G1-ri;vx[i]=-Math.abs(vx[i])*E_WALL;}
          }
        }
        // posts
        for(let i=0;i<n;i++)for(let k=0;k<4;k++){const dx=x[i]-posts[k][0],dy=y[i]-posts[k][1],d2=dx*dx+dy*dy,m=r[i]+POST;
          if(d2<m*m&&d2>0){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;x[i]=posts[k][0]+nx*m;y[i]=posts[k][1]+ny*m;
            const vn=vx[i]*nx+vy[i]*ny;if(vn<0){vx[i]-=(1+E_WALL)*vn*nx;vy[i]-=(1+E_WALL)*vn*ny;ev('p',-vn);}}}
        // bodies
        for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
          const dx=x[j]-x[i],dy=y[j]-y[i],m=r[i]+r[j],d2=dx*dx+dy*dy;if(d2>=m*m||d2===0)continue;
          const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=m-d,sum=im[i]+im[j];
          x[i]-=nx*ov*im[i]/sum;y[i]-=ny*ov*im[i]/sum;x[j]+=nx*ov*im[j]/sum;y[j]+=ny*ov*im[j]/sum;
          const vn=(vx[j]-vx[i])*nx+(vy[j]-vy[i])*ny;
          if(vn<0){const jm=-(1+E_BODY)*vn/sum;vx[i]-=jm*im[i]*nx;vy[i]-=jm*im[i]*ny;vx[j]+=jm*im[j]*nx;vy[j]+=jm*im[j]*ny;
            if(i===0)ballTouched=true;ev(i===0?'b':'d',-vn);}
        }
        if(x[0]>G0&&x[0]<G1){if(y[0]<-BR){goal='a';break;}if(y[0]>H+BR){goal='b';break;}}
      }
      // rolling friction
      let moving=false;
      for(let i=0;i<n;i++){const s2=vx[i]*vx[i]+vy[i]*vy[i];if(s2===0)continue;
        const s=Math.sqrt(s2),ns=i?s*.986-.04:s*.992-.012;
        if(ns<=0.02){vx[i]=0;vy[i]=0;}else{vx[i]*=ns/s;vy[i]*=ns/s;moving=true;}}
      if(frames){const f=new Array(2*n);for(let i=0;i<n;i++){f[2*i]=x[i];f[2*i+1]=y[i];}frames.push(f);}
      if(goal){ev('g',1);break;}
      if(!moving)break;
    }
    const final=[];for(let i=0;i<n;i++){final.push(rnd(x[i]),rnd(y[i]));}
    return {final,goal,frames,events,steps,ballTouched};
  }

  /* full turn: flick → positions, score, whose turn next, match status */
  function resolveTurn(m,shot,side,timeUp){
    const res=simulate(m.st,shot,{frames:true});
    const score={a:m.score.a,b:m.score.b};let st=res.final,next=other(side),status=m.status,winner=null;
    if(res.goal){score[res.goal]++;st=kickoff(m.fa,m.fb);next=other(res.goal); // the team that conceded kicks off
      if(status==='sd'){status='over';winner=res.goal;}}
    if(status==='play'&&timeUp){if(score.a!==score.b){status='over';winner=score.a>score.b?'a':'b';}else status='sd';}
    return {res,next:{st,side:next,score,status,winner}};
  }

  /* ---------- computer opponent (medium) ----------
     Tries many flicks with the same physics, scores the outcome, then picks one of the best with
     a little human error (aim and power wobble), so it is good but beatable. It never touches the
     ball or the score directly. */
  function aiShot(st,side,rand){
    rand=rand||Math.random;const mine=TEAM[side],theirs=TEAM[other(side)],att=side==='a'?0:H,own=side==='a'?H:0;
    const bx=st[0],by=st[1],cands=[];
    const push=(d,tx,ty,p)=>{const dx=tx-st[2*d],dy=ty-st[2*d+1],l=Math.sqrt(dx*dx+dy*dy);if(l<1)return;cands.push({d,vx:dx/l*MAXV*p,vy:dy/l*MAXV*p});};
    mine.forEach(d=>{
      // 1) hit the ball towards the goal: aim at the point behind the ball on the goal line
      const gx=W/2,gy=att,ux=bx-gx,uy=by-gy,ul=Math.sqrt(ux*ux+uy*uy)||1,cx=bx+ux/ul*(R+BR)*.9,cy=by+uy/ul*(R+BR)*.9;
      [-30,-15,0,15,30].forEach(o=>[.55,.75,.95].forEach(p=>push(d,cx+o,cy,p)));
      // 2) plain hits on the ball
      [-12,0,12].forEach(o=>[.5,.8,1].forEach(p=>push(d,bx+o,by,p)));
    });
    const keeper=mine[0],sign=side==='a'?1:-1;
    const score=c=>{const r=simulate(st,c);if(r.goal===side)return 1000;if(r.goal)return -2000;
      const fx=r.final[0],fy=r.final[1];let v=0;
      v+=(side==='a'?(H-fy):fy)/H*120;                         // ball further up the pitch
      v-=Math.abs(fx-W/2)/W*25;                               // and central
      const ownDist=Math.abs(fy-own);if(ownDist<200&&fx>G0-80&&fx<G1+80)v-=(200-ownDist)*.6; // danger near our goal
      // our keeper should stay home
      const kx=r.final[2*keeper],ky=r.final[2*keeper+1],kd=Math.sqrt((kx-W/2)**2+(ky-(own-sign*50))**2);if(kd>160)v-=(kd-160)*.15;
      // is an opponent disc lined up right behind the ball for an easy shot at our goal?
      theirs.forEach(t=>{const tx=r.final[2*t],ty=r.final[2*t+1];if(Math.abs(tx-fx)<70&&(side==='a'?ty<fy:ty>fy)&&Math.abs(ty-fy)<140)v-=18;});
      if(!r.ballTouched)v-=25;
      return v;};
    const scored=cands.map(c=>({c,v:score(c)})).sort((a,b)=>b.v-a.v);
    if(!scored.length)return {d:mine[1],vx:0,vy:-sign*10};
    const k=rand();const pick=scored[k<.65?0:k<.88?Math.min(1,scored.length-1):Math.min(2,scored.length-1)].c;
    // human error: up to about ±5° of aim and ±12% power
    const a=(rand()-.5)*.17,p=1+(rand()-.5)*.24,ca=1-a*a/2,sa=a; // small-angle rotation (no trig needed)
    let vx=(pick.vx*ca-pick.vy*sa)*p,vy=(pick.vx*sa+pick.vy*ca)*p;const s=Math.sqrt(vx*vx+vy*vy);if(s>MAXV*.995){vx*=MAXV*.995/s;vy*=MAXV*.995/s;}
    return {d:pick.d,vx:Math.round(vx*100)/100,vy:Math.round(vy*100)/100};
  }

  return {W,H,R,BR,GOAL,G0,G1,POST,MAXV,FORMS,TEAM,other,kickoff,validShot,simulate,resolveTurn,aiShot};
})();
if(typeof module!=='undefined')module.exports=FFE;
