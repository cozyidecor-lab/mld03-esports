/* ================= MLD player card: a downloadable 1080×1350 card for any player =================
   Button on every profile (below the name and like button). Draws the card on a canvas from the player's
   MLD stats: MLD Index, tier (card colour), photo, goals, rating, titles, awards, form.
   Everything comes from data.js, so cards update by themselves. Loaded after compare.js and form.js. */
(function(){
  const THEME={ // card colours by all-time tier
    S:{a:'#f7d774',b:'#9b6514',c:'#e0a93a',glow:'rgba(240,180,74,.45)',name:'S TIER',ink:'#2a1a02'},
    A:{a:'#ff5a4f',b:'#7d070b',c:'#e3191f',glow:'rgba(227,25,31,.45)',name:'A TIER',ink:'#fff'},
    B:{a:'#c4a2ff',b:'#3d1f7a',c:'#9a5cf0',glow:'rgba(154,92,240,.42)',name:'B TIER',ink:'#fff'},
    C:{a:'#8fbaff',b:'#163a7a',c:'#3c82f0',glow:'rgba(60,130,240,.4)',name:'C TIER',ink:'#fff'},
    D:{a:'#d9d9de',b:'#45454c',c:'#9a9aa2',glow:'rgba(200,200,210,.28)',name:'D TIER',ink:'#111'}};
  const loadImg=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
  const DF='Anton, Impact, sans-serif',LF='"Barlow Condensed", "Arial Narrow", sans-serif';
  const W=1080,H=1350;

  function shape(x,l,t,r,b,cut){ // card outline: cut corners at the top, pointed shield bottom
    x.beginPath();x.moveTo(l+cut,t);x.lineTo(r-cut,t);x.lineTo(r,t+cut);x.lineTo(r,b-150);
    x.quadraticCurveTo(r,b-90,(l+r)/2,b);x.quadraticCurveTo(l,b-90,l,b-150);x.lineTo(l,t+cut);x.closePath();}
  function fit(x,text,font,size,max,min=30){let s=size;x.font=`400 ${s}px ${font}`;while(x.measureText(text).width>max&&s>min){s-=4;x.font=`400 ${s}px ${font}`;}return s;}

  async function draw(n){
    const p=byName[n],s=MLDI.statsOf(n),tier=(typeof tierOf==='function'&&tierOf(n))||'D',T=THEME[tier];
    const f=typeof formOf==='function'?formOf(n):null;
    const rows=D.log.filter(r=>r[2]===n),joined=rows.length?Math.min(...rows.map(r=>r[0])):null;
    const best=rows.filter(r=>r[4]!=null).sort((a,b)=>b[4]-a[4])[0];
    const awards=(s.boots||0)+(s.balls||0)+(s.sboots||0)+(s.sballs||0)+(s.dor||0);
    try{await Promise.all(['400 80px Anton','700 40px "Barlow Condensed"','600 30px "Barlow Condensed"'].map(q=>document.fonts.load(q)));}catch(e){}
    const [photo,logo]=await Promise.all([loadImg(photoOf(n)),loadImg('images/emblem.jpg')]);
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const L=90,R=990,TOP=60,BOT=1250;

    // background
    x.fillStyle='#08080a';x.fillRect(0,0,W,H);
    let g=x.createRadialGradient(540,520,40,540,520,760);g.addColorStop(0,T.glow);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);

    // card body
    x.save();shape(x,L,TOP,R,BOT,70);x.shadowColor=T.glow;x.shadowBlur=60;
    g=x.createLinearGradient(L,TOP,R,BOT);g.addColorStop(0,'#1d1d22');g.addColorStop(.55,'#121215');g.addColorStop(1,'#0b0b0d');x.fillStyle=g;x.fill();x.restore();
    x.save();shape(x,L,TOP,R,BOT,70);x.clip();
    g=x.createLinearGradient(L,TOP,R,TOP+700);g.addColorStop(0,T.b);g.addColorStop(1,'rgba(0,0,0,0)');x.globalAlpha=.55;x.fillStyle=g;x.fillRect(L,TOP,R-L,BOT-TOP);x.globalAlpha=1;
    x.strokeStyle='rgba(255,255,255,.035)';x.lineWidth=18;for(let i=-H;i<W;i+=54){x.beginPath();x.moveTo(i,TOP);x.lineTo(i+H,TOP+H);x.stroke();} // light stripes
    // photo, top right, fading into the card
    const PX=400,PY=100,PS=560;
    if(photo){ // photo with soft edges on every side, so it melts into the card
      const o=document.createElement('canvas');o.width=o.height=PS;const y=o.getContext('2d');
      const sc=Math.max(PS/photo.width,PS/photo.height);y.drawImage(photo,PS/2-photo.width*sc/2,PS/2-photo.height*sc/2,photo.width*sc,photo.height*sc);
      y.globalCompositeOperation='destination-in';
      const edge=(x0,y0,x1,y1,b)=>{const q=y.createLinearGradient(x0,y0,x1,y1);q.addColorStop(0,'rgba(0,0,0,0)');q.addColorStop(b,'rgba(0,0,0,1)');q.addColorStop(1,'rgba(0,0,0,1)');y.fillStyle=q;y.fillRect(0,0,PS,PS);};
      edge(0,PS,0,0,.5);edge(0,0,0,PS,.1);edge(0,0,PS,0,.28);edge(PS,0,0,0,.12); // bottom, top, left, right
      x.drawImage(o,PX,PY);}
    else{x.fillStyle='rgba(255,255,255,.08)';x.font=`400 320px ${DF}`;x.textAlign='center';x.fillText(initials(n),PX+PS/2,PY+PS/2+110);x.textAlign='left';}
    x.restore();
    // border
    x.save();shape(x,L,TOP,R,BOT,70);g=x.createLinearGradient(L,TOP,R,BOT);g.addColorStop(0,T.a);g.addColorStop(.5,T.c);g.addColorStop(1,T.b);x.strokeStyle=g;x.lineWidth=10;x.stroke();x.restore();
    x.save();shape(x,L+18,TOP+18,R-18,BOT-22,58);x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=2;x.stroke();x.restore();

    // left column: MLD Index, tier, rank
    const ink=(a,b)=>{const q=x.createLinearGradient(0,170,0,330);q.addColorStop(0,a);q.addColorStop(1,b);return q;};
    x.textAlign='center';const CX=255;
    x.fillStyle=ink(T.a,T.c);x.font=`400 190px ${DF}`;x.fillText(String(Math.round(p.mi)),CX,330);
    x.fillStyle='#d9d9de';x.font=`700 30px ${LF}`;x.fillText('MLD INDEX',CX,375);
    // tier badge
    const bw=190,bh=58,bx=CX-bw/2,by=405;x.beginPath();x.roundRect(bx,by,bw,bh,29);g=x.createLinearGradient(bx,by,bx+bw,by+bh);g.addColorStop(0,T.b);g.addColorStop(.5,T.a);g.addColorStop(1,T.c);x.fillStyle=g;x.fill();
    x.fillStyle=T.ink;x.font=`700 34px ${LF}`;x.fillText(T.name,CX,by+42);
    x.fillStyle='#f5f5f4';x.font=`400 64px ${DF}`;x.fillText('#'+p.crk,CX,555);
    x.fillStyle='#9a9aa0';x.font=`700 26px ${LF}`;x.fillText('ALL-TIME',CX,592);
    if(logo){x.save();x.beginPath();x.arc(CX,670,46,0,7);x.clip();x.drawImage(logo,CX-46,624,92,92);x.restore();}

    // name
    const name=n.toUpperCase();x.fillStyle='#f5f5f4';fit(x,name,DF,128,780,60);x.fillText(name,540,800);
    g=x.createLinearGradient(340,0,740,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,T.c);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(240,826,600,4);
    const tags=[joined?`JOINED SEASON ${joined}`:null,`${s.seasons} SEASON${s.seasons===1?'':'S'}`,n===FOUNDER?'FOUNDER':null].filter(Boolean).join('  ·  ');
    x.fillStyle=n===FOUNDER?'#f0c35a':'#b5b5bb';x.font=`700 30px ${LF}`;x.fillText(tags,540,874);

    // stats, two rows of three
    const stats=[[p.g,'GOALS'],[fmt(p.r),'AVG RATING'],[p.t,'TOURNAMENTS'],[p.pt,'TITLES'],[p.ru,'RUNNER-UP'],[awards,'AWARDS']];
    stats.forEach(([v,l],i)=>{const col=i%3,row=Math.floor(i/3),cx=250+col*290,cy=962+row*128;
      if(col){x.fillStyle='rgba(255,255,255,.1)';x.fillRect(cx-145,cy-72,2,96);}
      x.fillStyle=i===0?T.a:'#f5f5f4';x.font=`400 76px ${DF}`;x.fillText(String(v),cx,cy);
      x.fillStyle='#9a9aa0';x.font=`700 26px ${LF}`;x.fillText(l,cx,cy+36);});
    x.fillStyle='rgba(255,255,255,.1)';x.fillRect(150,1022,780,2);

    // form + best tournament
    const line=[f&&f.k!=='none'&&f.k!=='inactive'?(/form/i.test(f.t)?f.t:'Form: '+f.t).toUpperCase():f&&f.k==='inactive'?'INACTIVE':null,best?`BEST: ${best[4]} GOALS · S${best[0]}`:null].filter(Boolean).join('   |   ');
    x.fillStyle='#d9d9de';let lf=30;x.font=`700 ${lf}px ${LF}`;while(x.measureText(line).width>640&&lf>22){lf-=2;x.font=`700 ${lf}px ${LF}`;}x.fillText(line,540,1172);

    // footer
    x.fillStyle='#f5f5f4';x.font=`700 30px ${LF}`;x.fillText('MLD 03 ESPORTS',540,1300);
    x.fillStyle='#7a7a80';x.font=`600 24px ${LF}`;x.fillText('mld03-esports.store',540,1332);
    x.textAlign='left';
    return c;
  }

  /* ---------- preview, download, share ---------- */
  let ov=null,cur=null;
  const fname=n=>`MLD-card-${n}.png`.replace(/[^A-Za-z0-9.-]+/g,'-');
  function close(){if(ov){ov.remove();ov=null;}}
  async function open(n,btn){
    const t=btn.innerHTML;btn.disabled=true;btn.textContent='Making card…';
    try{
      const c=await draw(n);const blob=await new Promise(r=>c.toBlob(r,'image/png'));cur={n,blob,url:URL.createObjectURL(blob)};
      close();ov=document.createElement('div');ov.className='pcard';ov.setAttribute('role','dialog');ov.setAttribute('aria-label',`${n}'s MLD player card`);
      ov.innerHTML=`<div class="pcbox"><img alt="${esc(n)}'s MLD player card" src="${cur.url}">
        <div class="pcbtns"><button class="flbtn red" data-pcdl="1">Download card</button>${navigator.canShare?'<button class="flbtn" data-pcshare="1">Share</button>':''}</div>
        <button class="pcclose" data-pcclose="1" aria-label="Close">Close</button></div>`;
      document.body.appendChild(ov);
    }catch(e){console.warn(e);btn.textContent='Could not make the card';setTimeout(()=>{btn.innerHTML=t;btn.disabled=false;},2000);return;}
    btn.innerHTML=t;btn.disabled=false;
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-pcard]');if(b){open(b.dataset.pcard,b);return;}
    if(!ov)return;
    if(e.target.closest('[data-pcclose]')||e.target===ov){close();return;}
    if(e.target.closest('[data-pcdl]')&&cur){const l=document.createElement('a');l.href=cur.url;l.download=fname(cur.n);document.body.appendChild(l);l.click();l.remove();
      const d=e.target.closest('[data-pcdl]');d.textContent='Saved ✓';setTimeout(()=>d.textContent='Download card',1800);return;}
    if(e.target.closest('[data-pcshare]')&&cur){const file=new File([cur.blob],fname(cur.n),{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file],title:`${cur.n} · MLD 03`,text:`${cur.n}'s MLD player card · mld03-esports.store`}).catch(()=>{});}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.MLDplayerCard=draw;
})();
