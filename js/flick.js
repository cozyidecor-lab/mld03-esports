/* ================= MLD FOOTBALL FLICK: screens, controls, online play =================
   Turn-based, carrom-style football. Physics lives in js/flick-engine.js (deterministic).

   Online (Firebase Realtime Database, the site's existing backend; no extra services):
   - ff/players/{id}  profile + stats (name, PIN hash, wins/losses/streak). ff/names/{key} → id keeps names unique.
   - ff/invites/{id}  public invitations. Every visitor listens and gets an in-site popup.
                      Joining is a database transaction: only the first person can take it. 30 s expiry.
   - ff/rooms/{code}  private room codes → match id.
   - ff/matches/{id}  the match. One write per turn, as a transaction that only succeeds if it is really
                      that player's turn and that turn number has not been played yet (no duplicate moves,
                      no moving the other team). The write holds the flick, the positions before it and the
                      final positions; the other phone replays the same flick with the same physics and ends
                      on exactly the stored positions. Nothing is streamed while the ball rolls.
   - ff/results/{id}  finished public matches (weekly / monthly leaderboards).
   Times (match clock, 15 s turns, 30 s invitations) use the Firebase server clock. */
const FF=(function(){
  const E=FFE,INVITE_MS=30000,TURN_MS=15000,CD_MS=3000,FORM_MS=20000;
  let MATCH_MS=120000;
  const el=id=>document.getElementById(id);
  const H_=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TS={'.sv':'timestamp'};
  const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
  const S={screen:null,me:null,popups:{},ignored:new Set(),sound:LS.get('ff.sound',true),ranks:null};
  let DB=null,skew=0;
  const db=()=>{if(!DB&&typeof NET!=='undefined'){DB=NET.db();if(DB)DB.ref('.info/serverTimeOffset').on('value',s=>{skew=s.val()||0;});}return DB;};
  const now=()=>Date.now()+skew;
  const dev=(()=>{let d=LS.get('mld-fkdev',null);if(!d){d=Math.random().toString(36).slice(2,10)+Date.now().toString(36);LS.set('mld-fkdev',d);}return d;})();
  const fmtT=ms=>{const s=Math.ceil(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

  /* ================= profiles ================= */
  const keyOf=n=>String(n).toLowerCase().replace(/[^a-z0-9]/g,'');
  const cleanName=s=>String(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,16);
  async function hashPin(id,pin){const t=id+':'+pin+':mld-flick';
    try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
    catch(e){let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))|0;return 'x'+(h>>>0).toString(16);}}
  const saved=()=>LS.get('ff.profiles',[]);
  function remember(p){const l=saved().filter(x=>x.id!==p.id);l.unshift({id:p.id,name:p.name});LS.set('ff.profiles',l.slice(0,6));LS.set('ff.me',p.id);S.me={id:p.id,name:p.name};}
  (function(){const id=LS.get('ff.me',null),p=saved().find(x=>x.id===id);if(p)S.me=p;})();
  async function createProfile(name,pin){
    const d=db();if(!d)throw new Error('offline');
    const key=keyOf(name);if(key.length<2)throw new Error('Use at least 2 letters or numbers.');
    const id=d.ref('ff/players').push().key;
    const r=await d.ref('ff/names/'+key).transaction(cur=>cur?undefined:id);
    if(!r.committed)throw new Error('That name is taken. If it is yours, use "I already have a profile".');
    await d.ref('ff/players/'+id).set({name,key,pin:await hashPin(id,pin),ts:TS,w:0,l:0,m:0,cur:0,best:0});
    remember({id,name});}
  async function signIn(name,pin){
    const d=db();if(!d)throw new Error('offline');
    const id=(await d.ref('ff/names/'+keyOf(name)).get()).val();if(!id)throw new Error('No profile with that name.');
    const p=(await d.ref('ff/players/'+id).get()).val();if(!p||p.pin!==await hashPin(id,pin))throw new Error('Wrong PIN.');
    remember({id,name:p.name});}
  async function loadPlayers(){const d=db();if(!d)return [];try{const v=(await d.ref('ff/players').get()).val()||{};
    return Object.entries(v).map(([id,p])=>({id,name:p.name,w:p.w||0,l:p.l||0,m:p.m||0,cur:p.cur||0,best:p.best||0}));}catch(e){return [];}}
  const sortBoard=L=>L.filter(p=>p.m>0||p.w+p.l>0).sort((a,b)=>b.w-a.w||(b.w/Math.max(1,b.w+b.l))-(a.w/Math.max(1,a.w+a.l))||a.l-b.l||a.name.localeCompare(b.name));

  /* ================= overlay + screens ================= */
  let root;
  function mount(){
    if(root)return;root=document.createElement('div');root.id='ff';root.hidden=true;
    root.innerHTML='<div class="fkbox" id="ffBox"></div>';document.body.appendChild(root);
    const vv=window.visualViewport; // keep inputs above the phone keyboard
    const fit=()=>{if(!vv||S.screen==='game')return;root.style.height=vv.height+'px';root.style.top=vv.offsetTop+'px';};
    if(vv){vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);}
    addEventListener('resize',()=>{if(S.screen==='game')size();});
    root.addEventListener('click',onClick);
  }
  function show(screen,html){mount();S.screen=screen;root.hidden=false;root.dataset.screen=screen;document.body.classList.add('ff-open');
    if(screen==='game'){root.style.height='';root.style.top='';}
    el('ffBox').innerHTML=html;hidePopups();}
  const top=(title,back='home')=>`<div class="fktop"><button class="fkic" data-f="${back}" aria-label="${back==='exit'?'Close the game':'Back'}">${back==='exit'?'✕':'‹'}</button><b>${title}</b><span class="fkmark">⚽</span></div>`;
  function goFull(){const d=document.documentElement;
    try{const p=!document.fullscreenElement&&(d.requestFullscreen?d.requestFullscreen({navigationUI:'hide'}):d.webkitRequestFullscreen?d.webkitRequestFullscreen():null);
      Promise.resolve(p).catch(()=>{});}catch(e){}} // full screen only; the phone is never rotated (played upright, like a reel)
  function close(){
    stopGame();cancelInvite();cancelRoom();if(S.mm){S.mm.ref.off();S.mm=null;}if(!root)return;root.hidden=true;S.screen=null;document.body.classList.remove('ff-open');
    try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}catch(e){}}
  const busy=()=>!!S.screen&&['game','form','wait','room'].includes(S.screen);

  function profileScreen(next,mode){
    S.afterProfile=next||S.afterProfile;const list=saved(),signin=mode==='signin';
    show('profile',`${top('MLD Football Flick',list.length||S.me?'home':'exit')}
      <div class="fkname">
        ${list.length&&!signin?`<div class="fksaved"><small>Your profiles on this phone</small>${list.map(p=>`<button class="fkbtn" data-f="use" data-id="${H_(p.id)}">Continue as <b>${H_(p.name)}</b></button>`).join('')}<small class="fkor">or create a new one</small></div>`:''}
        <label for="ffName">${signin?'SIGN IN TO YOUR PROFILE':'ENTER YOUR PLAYER NAME'}</label>
        <input id="ffName" maxlength="16" autocomplete="nickname" enterkeyhint="next" placeholder="Player name">
        <input id="ffPin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" enterkeyhint="done" placeholder="4-digit PIN" type="password">
        <p class="fknote">${signin?'Use the name and PIN you made before.':'Pick a 4-digit PIN. It keeps your name yours, and lets you sign in on another phone.'}</p>
        <p class="fkmsg" id="ffMsg" hidden></p>
        <button class="fkbtn red" data-f="${signin?'signin-ok':'create-ok'}">Continue</button>
        <button class="fklink" data-f="${signin?'profile':'signin'}">${signin?'Create a new profile instead':'I already have a profile'}</button></div>`);
    const i=el('ffName'),p=el('ffPin');
    [i,p].forEach(x=>x.addEventListener('focus',()=>setTimeout(()=>x.scrollIntoView({block:'center'}),320)));
    i.addEventListener('keydown',e=>{if(e.key==='Enter')p.focus();});
    p.addEventListener('keydown',e=>{if(e.key==='Enter')act(signin?'signin-ok':'create-ok');});
    if(!list.length||signin)setTimeout(()=>i.focus(),80);
  }
  function msg(t){const m=el('ffMsg');if(m){m.textContent=t;m.hidden=!t;}}

  async function homeScreen(note){
    if(!S.me)return profileScreen(homeScreen);
    const cur=LS.get('ff.cur',null),hist=LS.get('ff.history',[]);
    show('home',`${top('MLD Football Flick','exit')}
      <div class="fkhome">
        <div class="fkhero"><h2>MLD <em>Football</em> Flick</h2><p>Flick your players. Hit the ball. Score.</p>
          <div class="fkme" id="ffMe"><span class="fkav">${H_(S.me.name[0]||'?').toUpperCase()}</span><span><b>${H_(S.me.name)}</b><small id="ffMeStats">Loading stats…</small></span><button class="fklink" data-f="profile">Switch</button></div>
          ${note?`<p class="fkmsg">${H_(note)}</p>`:''}<div id="ffResume"></div></div>
        <div class="fkmenu">
          <button class="fkbtn red big" data-f="online"><span>🌐</span> PLAY ONLINE</button>
          <button class="fkbtn" data-f="cpu"><span>🤖</span> PLAY AGAINST COMPUTER</button>
          <button class="fkbtn" data-f="private"><span>🔒</span> PRIVATE ROOM</button>
          <div class="fkrow2"><button class="fkbtn" data-f="board"><span>🏆</span> LEADERBOARD</button><button class="fkbtn" data-f="how"><span>❔</span> HOW TO PLAY</button></div>
          ${hist.length?`<div class="fkhist"><small>Recent matches</small>${hist.slice(0,4).map(h=>`<span class="${h.res}"><b>${h.res==='w'?'W':'L'}</b> ${h.sa}–${h.sb} vs ${H_(h.opp)}${h.kind!=='public'?` <i>${h.kind==='cpu'?'computer':'private'}</i>`:''}</span>`).join('')}</div>`:''}
        </div></div>`);
    // stats + rank
    loadPlayers().then(L=>{const me=L.find(p=>p.id===S.me.id),b=sortBoard(L),rk=b.findIndex(p=>p.id===S.me.id)+1;const s=el('ffMeStats');
      if(s)s.textContent=me?`${me.w} W · ${me.l} L · ${me.m} played${rk?` · Rank #${rk}`:' · Unranked'}${me.cur>1?` · 🔥${me.cur} streak`:''}`:'Online stats unavailable';});
    // a match to resume?
    if(cur&&db())db().ref('ff/matches/'+cur.mid).get().then(s=>{const m=s.val(),r=el('ffResume');
      if(!m||m.status==='over'||!(m[cur.my]&&m[cur.my].id===S.me.id)){LS.set('ff.cur',null);return;}
      if(r)r.innerHTML=`<button class="fkbtn resume" data-f="resume">▶ Resume your match vs ${H_((m[E.other(cur.my)]||{}).name||'opponent')}</button>`;}).catch(()=>{});
  }

  function howScreen(back){
    const dot=(x,y,c,t)=>`<circle cx="${x}" cy="${y}" r="9" fill="${c}" stroke="${c==='#fff'?'#e3191f':'#fff'}" stroke-width="2.5"/>${t?`<text x="${x}" y="${y+3}" font-size="7" text-anchor="middle" fill="${c==='#fff'?'#e3191f':'#fff'}" font-weight="700">${t}</text>`:''}`;
    const pitch=inner=>`<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="2" y="2" width="116" height="80" rx="6" fill="#fff" stroke="#e3191f" stroke-width="3"/><path d="M4 42H116" stroke="#f3b6b8"/><circle cx="60" cy="42" r="11" fill="none" stroke="#f3b6b8"/><rect x="46" y="0" width="28" height="4" fill="#e3191f"/><rect x="46" y="80" width="28" height="4" fill="#e3191f"/>${inner}</svg>`;
    show('how',`${top('How to play',back||'home')}
      <div class="fkhow">
        <div class="fkstep">${pitch(`${dot(60,62,'#e3191f')}<path d="M60 62L74 78" stroke="#999" stroke-dasharray="3 3"/><circle cx="74" cy="78" r="4" fill="#999"/><path d="M60 62L48 46" stroke="#e3191f" stroke-width="3" marker-end="url(#a)"/><defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#e3191f"/></marker></defs><circle cx="60" cy="42" r="5" fill="#111"/>`)}<div><b>1 · Pull back</b><span>Touch one of your red players and drag backwards, like carrom. The arrow shows the direction, the ring shows the power.</span></div></div>
        <div class="fkstep">${pitch(`${dot(52,50,'#e3191f')}<circle cx="60" cy="38" r="5" fill="#111"/><path d="M62 34L72 8" stroke="#111" stroke-dasharray="3 3"/>${dot(40,20,'#fff')}${dot(80,22,'#fff')}`)}<div><b>2 · Release to flick</b><span>Your player shoots off, hits the ball and other players. Everything bounces off the walls.</span></div></div>
        <div class="fkstep">${pitch(`<circle cx="62" cy="2" r="5" fill="#111"/><text x="60" y="48" font-size="13" text-anchor="middle" fill="#e3191f" font-weight="800">GOAL!</text>`)}<div><b>3 · Score</b><span>Get the ball fully over the top goal line. After a goal everyone resets and the team that conceded kicks off.</span></div></div>
        <ul class="fkrules"><li>One flick each, taking turns. <b>15 seconds</b> per turn or it passes.</li><li>Matches last <b>2 minutes</b>. Level at the end? <b>Sudden death</b>: next goal wins.</li><li>Your team is always at the <b>bottom</b>, attacking the top goal.</li><li>Pick a <b>formation</b> before each match: 3-1, 2-2 or 1-3.</li></ul>
        <button class="fkbtn red" data-f="${back||'home'}">Got it</button></div>`);
  }

  /* ---------- formation picker ---------- */
  function formSvg(k){const f=E.FORMS[k].pos;
    return `<svg viewBox="0 0 64 118" aria-hidden="true"><rect x="1" y="1" width="62" height="116" rx="3" fill="#2f8f3e" stroke="#fff" stroke-width="1.2"/><path d="M1 59H63" stroke="rgba(255,255,255,.7)" stroke-width=".8"/><circle cx="32" cy="59" r="8" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".8"/><rect x="22" y="114" width="20" height="3" fill="#fff"/>
      ${f.map(([x,y],i)=>`<circle cx="${x/10}" cy="${y/10}" r="3.4" fill="#e3191f" stroke="#fff" stroke-width="1"/>${i===0?`<text x="${x/10}" y="${y/10+1.3}" font-size="3" text-anchor="middle" fill="#fff" font-weight="700">GK</text>`:''}`).join('')}<circle cx="32" cy="59" r="2" fill="#fff" stroke="#111" stroke-width=".6"/></svg>`;}
  function formScreen(o){ // o: {title, opp, onReady, oppState}
    S.form={pick:LS.get('ff.form','3-1'),o};
    show('form',`${top(o.title||'Choose formation',o.back||'home')}
      <div class="fkform"><p class="fkvs"><b>${H_(S.me.name)}</b> <i>vs</i> <b>${H_(o.opp)}</b></p>
        <div class="fkforms">${Object.entries(E.FORMS).map(([k,f])=>`<button class="fkform1${k===S.form.pick?' on':''}" data-f="pickform" data-k="${k}">${formSvg(k)}<b>${f.label}</b><small>${f.desc}</small></button>`).join('')}</div>
        <p class="fknote" id="ffFormNote">${o.note||''}</p>
        <button class="fkbtn red big" data-f="formready" id="ffReady">READY</button></div>`);
    if(o.auto){clearTimeout(S.formT);const t0=Date.now();S.formT=setInterval(()=>{const left=FORM_MS-(Date.now()-t0),b=el('ffReady');
      if(!b||S.screen!=='form'){clearInterval(S.formT);return;}
      if(!b.disabled)b.textContent=`READY · ${Math.ceil(left/1000)}s`;if(left<=0){clearInterval(S.formT);if(!b.disabled)act('formready');}},500);}
  }

  /* ================= invitations (public online play) ================= */
  async function playOnline(){
    const d=db();if(!d)return homeScreen('Online play is not available right now. Try Play against computer.');
    cancelInvite();const ref=d.ref('ff/invites').push();S.invite={ref,id:ref.key,t0:Date.now()};
    show('wait',`${top('Play online')}<div class="fkwait"><div class="fkspin">⚽</div><h3>Looking for an opponent…</h3>
      <p class="fknote">Everyone on the MLD website right now gets your challenge.</p>
      <div class="fkbar"><i id="ffWaitBar"></i></div><b id="ffWaitT" class="fkbig">30</b>
      <button class="fkbtn" data-f="cancelinvite">Cancel</button></div>`);
    try{await ref.onDisconnect().remove();await ref.set({by:S.me.id,name:S.me.name,dev,ts:TS,status:'open'});}catch(e){return homeScreen('Could not send the invitation.');}
    ref.on('value',s=>{const v=s.val();if(!v||!S.invite||S.invite.id!==ref.key)return;
      if(v.status==='taken'&&v.mid){const inv=S.invite;S.invite=null;clearInterval(S.waitT);ref.off();ref.onDisconnect().cancel();setTimeout(()=>ref.remove().catch(()=>{}),8000);
        openMatch(v.mid,'a');}});
    S.waitT=setInterval(()=>{if(!S.invite)return clearInterval(S.waitT);const left=INVITE_MS-(Date.now()-S.invite.t0);
      const b=el('ffWaitBar'),t=el('ffWaitT');if(b)b.style.width=Math.max(0,left/INVITE_MS*100)+'%';if(t)t.textContent=Math.max(0,Math.ceil(left/1000));
      if(left<=0){cancelInvite();expiredScreen();}},250);
  }
  function cancelInvite(){clearInterval(S.waitT);if(S.invite){const r=S.invite.ref;S.invite=null;r.off();r.onDisconnect().cancel();r.remove().catch(()=>{});}}
  function expiredScreen(){
    show('expired',`${top('Play online')}<div class="fkwait"><div class="fkspin still">😴</div><h3>Nobody joined this time</h3>
      <p class="fknote">No one accepted within 30 seconds.</p>
      <button class="fkbtn red big" data-f="cpu"><span>🤖</span> PLAY AGAINST COMPUTER</button>
      <button class="fkbtn" data-f="online"><span>🔁</span> SEARCH AGAIN</button>
      <button class="fklink" data-f="home">Back to menu</button></div>`);
  }
  // every visitor: listen for invitations and show the popup
  function listenInvites(){
    const d=db();if(!d)return;
    const q=d.ref('ff/invites').orderByChild('ts').startAt(now()-INVITE_MS-5000);
    const upd=s=>{const v=s.val(),id=s.key;if(!v)return hidePopup(id);
      const fresh=now()-(v.ts||now())<INVITE_MS;
      if(v.status==='open'&&fresh&&v.dev!==dev&&!(S.me&&v.by===S.me.id)&&!S.ignored.has(id)&&!busy()&&!(G&&G.mode==='cpu'))showPopup(id,v);else hidePopup(id);};
    q.on('child_added',upd);q.on('child_changed',upd);q.on('child_removed',s=>hidePopup(s.key));
    setInterval(()=>{Object.entries(S.popups).forEach(([id,p])=>{if(now()-p.t>INVITE_MS||busy())hidePopup(id);});},1000);
  }
  function showPopup(id,v){
    if(S.popups[id])return;let box=el('ffPops');
    if(!box){box=document.createElement('div');box.id='ffPops';box.setAttribute('aria-live','polite');document.body.appendChild(box);}
    const p=document.createElement('div');p.className='fkpop';p.setAttribute('role','alertdialog');p.setAttribute('aria-label','Football Flick invitation');
    p.innerHTML=`<div class="fkpophead">⚽ MLD FOOTBALL FLICK</div>
      <p><b>${H_(v.name)}</b> is challenging you to a football match!</p><p class="fkpopq">Would you like to join?</p>
      <div class="fkpoprow"><button class="fkbtn red" data-fkjoin="${H_(id)}">JOIN MATCH</button><button class="fkbtn" data-fkignore="${H_(id)}">IGNORE</button></div>
      <i class="fkpopbar" style="animation-duration:${Math.max(1,INVITE_MS-(now()-v.ts))}ms"></i>`;
    box.appendChild(p);S.popups[id]={p,t:v.ts};sfx('ping');
  }
  function hidePopup(id){const x=S.popups[id];if(!x)return;delete S.popups[id];x.p.classList.add('out');setTimeout(()=>x.p.remove(),300);}
  const hidePopups=()=>Object.keys(S.popups).forEach(hidePopup);
  async function join(id){
    const d=db();if(!d)return;mount();
    show('wait',`${top('Joining…')}<div class="fkwait"><div class="fkspin">⚽</div><h3>Joining the match…</h3></div>`);
    const mid=d.ref('ff/matches').push().key;let inv=null;
    try{
      const r=await d.ref('ff/invites/'+id).transaction(cur=>{if(cur===null)return null;
        if(cur.status!=='open'||now()-cur.ts>INVITE_MS||cur.by===S.me.id)return;inv=cur;
        return Object.assign({},cur,{status:'taken',guest:S.me.id,gname:S.me.name,mid});});
      const v=r.snapshot.val();
      if(!r.committed||!v||v.mid!==mid||v.guest!==S.me.id)return homeScreen('Too late: someone else already joined that match.');
      await d.ref('ff/matches/'+mid).set({kind:'public',status:'form',created:TS,a:{id:v.by,name:v.name},b:{id:S.me.id,name:S.me.name}});
      openMatch(mid,'b');
    }catch(e){homeScreen('Could not join the match.');}
  }

  /* ================= private rooms ================= */
  function privateScreen(){
    show('private',`${top('Private room')}<div class="fkpriv">
      <p class="fknote">Play a friend with a room code. Private matches do not count on the leaderboard.</p>
      <button class="fkbtn red big" data-f="mkroom"><span>➕</span> CREATE A ROOM</button>
      <div class="fkor">or join one</div>
      <div class="fkcode"><input id="ffCode" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="CODE" enterkeyhint="go"><button class="fkbtn" data-f="joinroom">JOIN</button></div>
      <p class="fkmsg" id="ffMsg" hidden></p></div>`);
    const c=el('ffCode');c.addEventListener('input',()=>{c.value=c.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
    c.addEventListener('keydown',e=>{if(e.key==='Enter')act('joinroom');});c.addEventListener('focus',()=>setTimeout(()=>c.scrollIntoView({block:'center'}),320));
  }
  async function makeRoom(){
    const d=db();if(!d)return homeScreen('Online play is not available right now.');
    const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';const mid=d.ref('ff/matches').push().key;let code=null;
    for(let k=0;k<6&&!code;k++){const c=Array.from({length:5},()=>A[Math.floor(Math.random()*A.length)]).join('');
      const r=await d.ref('ff/rooms/'+c).transaction(cur=>cur?undefined:{mid,ts:Date.now()});if(r.committed)code=c;}
    if(!code)return homeScreen('Could not make a room. Try again.');
    await d.ref('ff/matches/'+mid).set({kind:'private',status:'wait',created:TS,a:{id:S.me.id,name:S.me.name}});
    S.room={code,mid};
    show('room',`${top('Private room')}<div class="fkwait"><p class="fknote">Send this code to your friend</p><b class="fkroom">${code}</b>
      <button class="fkbtn" data-f="copycode">Copy code</button><div class="fkspin">⚽</div><h3>Waiting for your friend…</h3>
      <button class="fklink" data-f="cancelroom">Cancel</button></div>`);
    openMatch(mid,'a',true);
  }
  function cancelRoom(){const d=db();if(!S.room||!d)return;const {code,mid}=S.room;S.room=null;d.ref('ff/rooms/'+code).remove().catch(()=>{});
    d.ref('ff/matches/'+mid).transaction(c=>c&&c.status==='wait'?null:undefined).catch(()=>{});}
  async function joinRoom(){
    const d=db();const code=(el('ffCode')||{}).value||'';if(code.length!==5)return msg('Type the 5-letter code.');if(!d)return msg('Online play is not available right now.');
    const room=(await d.ref('ff/rooms/'+code).get()).val();if(!room)return msg('No room with that code.');
    const r=await d.ref('ff/matches/'+room.mid).transaction(cur=>{if(cur===null)return null;if(cur.status!=='wait'||cur.b||cur.a.id===S.me.id)return;
      return Object.assign({},cur,{b:{id:S.me.id,name:S.me.name},status:'form'});});
    if(!r.committed)return msg('That room is already full or closed.');
    d.ref('ff/rooms/'+code).remove().catch(()=>{});openMatch(room.mid,'b');
  }

  /* ================= the match (shared by online and computer) ================= */
  let G=null,cv=null,ctx=null,raf=0,aim=null;
  const clockNow=()=>G&&G.mode==='cpu'?Date.now():now();
  function gameHtml(){return `<div class="fkgame">
      <div class="fkhud">
        <div class="fkpl opp"><span class="fkdisc w"></span><span class="fknm" id="ffOppName"></span><b id="ffOppScore">0</b></div>
        <div class="fkclock"><b id="ffClock">2:00</b><small id="ffPhase">MATCH</small></div>
        <div class="fkpl me"><span class="fkdisc r"></span><span class="fknm" id="ffMyName"></span><b id="ffMyScore">0</b></div>
        <div class="fkturn" id="ffTurn"><b>YOUR TURN</b><i><s id="ffTurnBar"></s></i></div>
        <button class="fkic fkset" data-f="settings" aria-label="Settings">⚙</button>
      </div>
      <div class="fkstage" id="ffStage"><canvas id="ffCv"></canvas><div class="fkover" id="ffOver" hidden></div>
<canvas id="ffFx" class="fkfx"></canvas></div>
    </div>`;}
  function startGame(g){
    G=g;G.anim=null;aim=null;show('game',gameHtml());goFull();
    cv=el('ffCv');ctx=cv.getContext('2d');size();bindInput();
    el('ffMyName').textContent=G.names[G.my];el('ffOppName').textContent=G.names[E.other(G.my)];
    cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
    clearInterval(G.tickT);G.tickT=setInterval(tick,250);
  }
  function stopGame(){if(!G)return;clearInterval(G.tickT);clearInterval(G.pingT);clearTimeout(G.aiT);if(G.ref)G.ref.off();if(G.pingRef)G.pingRef.off();cancelAnimationFrame(raf);G=null;aim=null;}

  /* ---------- drawing ---------- */
  const PADX=14,PADY=52;let V={s:1,ox:0,oy:0};
  function size(){if(!cv)return;const st=el('ffStage');if(!st)return;const r=st.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';
    const s=Math.min(r.width/(E.W+PADX*2),r.height/(E.H+PADY*2));V={s,dpr,ox:(r.width-E.W*s)/2,oy:(r.height-E.H*s)/2};}
  const flip=()=>G&&G.my==='b';
  const tx=(x,y)=>flip()?[E.W-x,E.H-y]:[x,y];                       // field → view (player 2 sees the board turned 180°)
  const toScreen=(x,y)=>{const [a,b]=tx(x,y);return [V.ox+a*V.s,V.oy+b*V.s];};
  const toField=(sx,sy)=>{const a=(sx-V.ox)/V.s,b=(sy-V.oy)/V.s;return flip()?[E.W-a,E.H-b]:[a,b];};
  function drawPitch(c){
    const s=V.s,W=E.W,H=E.H;c.save();c.translate(V.ox,V.oy);c.scale(s,s);
    // thin MLD red-and-white edge around the grass
    c.fillStyle='#fff';rr(c,-12,-12,W+24,H+24,14);c.fill();c.fillStyle='#c40e14';rr(c,-8,-8,W+16,H+16,11);c.fill();
    // goals (behind the line): white frame, net
    [[0,-1],[H,1]].forEach(([gy,dir])=>{c.fillStyle='rgba(255,255,255,.92)';c.fillRect(E.G0,dir<0?-44:H,E.GOAL,44);
      c.strokeStyle='rgba(0,0,0,.16)';c.lineWidth=1.4;for(let x=E.G0+10;x<E.G1;x+=12){c.beginPath();c.moveTo(x,gy);c.lineTo(x,gy+dir*44);c.stroke();}
      for(let k=9;k<44;k+=11){c.beginPath();c.moveTo(E.G0,gy+dir*k);c.lineTo(E.G1,gy+dir*k);c.stroke();}
      c.strokeStyle='#fff';c.lineWidth=6;c.beginPath();c.moveTo(E.G0,gy);c.lineTo(E.G0,gy+dir*44);c.lineTo(E.G1,gy+dir*44);c.lineTo(E.G1,gy);c.stroke();});
    // grass with mowing stripes and a soft light in the middle
    if(!grassPat)grassPat=makeGrass();
    c.fillStyle='#2f8f3e';c.fillRect(0,0,W,H);
    for(let y=0,k=0;y<H;y+=H/12,k++){c.fillStyle=k%2?'#2c8a3b':'#349a43';c.fillRect(0,y,W,H/12+1);}
    if(grassPat){c.fillStyle=grassPat;c.globalAlpha=.55;c.fillRect(0,0,W,H);c.globalAlpha=1;}
    const lg=c.createRadialGradient(W/2,H/2,40,W/2,H/2,H*.75);lg.addColorStop(0,'rgba(255,255,255,.08)');lg.addColorStop(1,'rgba(0,0,0,.18)');c.fillStyle=lg;c.fillRect(0,0,W,H);
    // white pitch markings
    c.strokeStyle='rgba(255,255,255,.9)';c.fillStyle='rgba(255,255,255,.9)';c.lineWidth=4;
    c.strokeRect(2,2,W-4,H-4);c.beginPath();c.moveTo(0,H/2);c.lineTo(W,H/2);c.stroke();
    c.beginPath();c.arc(W/2,H/2,88,0,7);c.stroke();c.beginPath();c.arc(W/2,H/2,6,0,7);c.fill();
    [[0,1],[H,-1]].forEach(([y,d])=>{const bw=420,bd=175,gw=230,gd=70;
      c.strokeRect(W/2-bw/2,d>0?y:y-bd,bw,bd);c.strokeRect(W/2-gw/2,d>0?y:y-gd,gw,gd);
      c.beginPath();c.arc(W/2,y+d*125,5,0,7);c.fill();
      c.beginPath();c.arc(W/2,y+d*125,72,d>0?.29*Math.PI:1.29*Math.PI,d>0?.71*Math.PI:1.71*Math.PI);c.stroke();});
    [[0,0],[W,0],[0,H],[W,H]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,16,x?(y?Math.PI:Math.PI/2):(y?1.5*Math.PI:0),x?(y?1.5*Math.PI:Math.PI):(y?2*Math.PI:Math.PI/2));c.stroke();});
    // a small MLD touch: red centre spot ring
    c.strokeStyle='rgba(227,25,31,.85)';c.lineWidth=3;c.beginPath();c.arc(W/2,H/2,14,0,7);c.stroke();
    // posts
    c.fillStyle='#fff';c.strokeStyle='#c40e14';c.lineWidth=3;[[E.G0,0],[E.G1,0],[E.G0,H],[E.G1,H]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,E.POST+2,0,7);c.fill();c.stroke();});
    c.restore();
  }
  let grassPat=null;
  function makeGrass(){ // fine blades of grass, drawn once
    try{const o=document.createElement('canvas');o.width=o.height=64;const g=o.getContext('2d');
      for(let k=0;k<260;k++){const x=Math.random()*64,y=Math.random()*64,l=2+Math.random()*4;
        g.strokeStyle=Math.random()<.5?'rgba(20,90,35,.55)':'rgba(120,200,110,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.random()-.5)*1.5,y-l);g.stroke();}
      return ctx.createPattern(o,'repeat');}catch(e){return null;}}
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function drawBodies(c,pos,t){
    const s=V.s,mine=E.TEAM[G.my],myTurn=isMyTurn();
    for(let i=1;i<9;i++){const [x,y]=toScreen(pos[2*i],pos[2*i+1]),r=E.R*s,teamA=mine.includes(i),gk=i===1||i===5; // your team is always red on your screen
      c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.arc(x+r*.12,y+r*.18,r,0,7);c.fill();
      if(myTurn&&mine.includes(i)&&!G.anim){c.strokeStyle=`rgba(227,25,31,${.35+.25*Math.sin(t/220)})`;c.lineWidth=Math.max(2,r*.16);c.beginPath();c.arc(x,y,r*1.32,0,7);c.stroke();}
      const g=c.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);
      if(teamA){g.addColorStop(0,'#ff5a50');g.addColorStop(1,'#c40e14');}else{g.addColorStop(0,'#ffffff');g.addColorStop(1,'#dcdcdc');}
      c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();
      c.lineWidth=Math.max(1.5,r*.16);c.strokeStyle=teamA?'#fff':'#e3191f';c.beginPath();c.arc(x,y,r*.78,0,7);c.stroke();
      c.lineWidth=Math.max(1,r*.07);c.strokeStyle=teamA?'#8a070b':'#b9b9b9';c.beginPath();c.arc(x,y,r,0,7);c.stroke();
      if(gk){c.fillStyle=teamA?'#fff':'#e3191f';c.font=`700 ${Math.max(8,r*.62)}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('GK',x,y+1);}
    }
    // ball
    const [bx,by]=toScreen(pos[0],pos[1]),br=E.BR*s;
    c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.arc(bx+br*.15,by+br*.22,br,0,7);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(bx,by,br,0,7);c.fill();c.strokeStyle='#111';c.lineWidth=Math.max(1,br*.12);c.stroke();
    c.fillStyle='#111';c.beginPath();for(let k=0;k<5;k++){const a=-Math.PI/2+k*2*Math.PI/5;c.lineTo(bx+Math.cos(a)*br*.42,by+Math.sin(a)*br*.42);}c.closePath();c.fill();
    for(let k=0;k<5;k++){const a=-Math.PI/2+k*2*Math.PI/5;c.beginPath();c.arc(bx+Math.cos(a)*br*.95,by+Math.sin(a)*br*.95,br*.22,0,7);c.fill();}
  }
  function drawAim(c){
    if(!aim||!aim.p)return;const s=V.s,[dx,dy]=[G.v.st[2*aim.d],G.v.st[2*aim.d+1]],[sx,sy]=toScreen(dx,dy);
    const [px,py]=toScreen(aim.p[0],aim.p[1]);const sh=shotFromAim();
    c.setLineDash([6,6]);c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=2;c.beginPath();c.moveTo(sx,sy);c.lineTo(px,py);c.stroke();c.setLineDash([]);
    if(!sh)return;const pw=Math.sqrt(sh.vx*sh.vx+sh.vy*sh.vy)/E.MAXV,[ux,uy]=tx(sh.vx,sh.vy);const fx=flip()?-sh.vx:sh.vx,fy=flip()?-sh.vy:sh.vy,l=Math.sqrt(fx*fx+fy*fy);
    const len=(70+pw*220)*s,ex=sx+fx/l*len,ey=sy+fy/l*len;
    c.strokeStyle='#e3191f';c.lineWidth=Math.max(3,6*s);c.lineCap='round';c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
    const a=Math.atan2(fy,fx),hs=Math.max(10,22*s);c.fillStyle='#e3191f';c.beginPath();c.moveTo(ex+Math.cos(a)*hs*.6,ey+Math.sin(a)*hs*.6);
    c.lineTo(ex+Math.cos(a+2.5)*hs,ey+Math.sin(a+2.5)*hs);c.lineTo(ex+Math.cos(a-2.5)*hs,ey+Math.sin(a-2.5)*hs);c.closePath();c.fill();
    // power ring
    const r=(E.R+12)*s;c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=Math.max(4,8*s);c.beginPath();c.arc(sx,sy,r,0,7);c.stroke();
    c.strokeStyle=pw>.85?'#b30c11':'#e3191f';c.beginPath();c.arc(sx,sy,r,-Math.PI/2,-Math.PI/2+pw*2*Math.PI);c.stroke();
    c.fillStyle='#111';c.font=`700 ${Math.max(11,18*s)}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.textBaseline='bottom';c.fillText(Math.round(pw*100)+'%',sx,sy-r-6);
  }
  function frame(t){
    raf=requestAnimationFrame(frame);if(!G||!ctx)return;
    let pos=G.v.st;
    if(G.anim){const a=G.anim,k=Math.min(a.frames.length-1,Math.floor((t-(a.t0||(a.t0=t)))/(1000/120)));
      pos=a.frames[k]||pos;while(a.ev<a.events.length&&a.events[a.ev].s<=k){const e=a.events[a.ev++];sfx(e.k,e.v);}
      if(k>=a.frames.length-1){G.anim=null;a.done&&a.done();pos=G.v.st;}}
    ctx.setTransform(V.dpr,0,0,V.dpr,0,0);ctx.clearRect(0,0,cv.width,cv.height);drawPitch(ctx);drawBodies(ctx,pos,t);drawAim(ctx);
  }
  function hud(){
    if(!G)return;const v=G.v,o=E.other(G.my),n=clockNow();
    el('ffMyScore').textContent=v.score[G.my];el('ffOppScore').textContent=v.score[o];
    const pre=v.start&&n<v.start;
    el('ffClock').textContent=v.status==='sd'?'SD':fmtT(pre?MATCH_MS:v.end-n);
    el('ffPhase').textContent=v.status==='sd'?'SUDDEN DEATH':v.status==='over'?'FULL TIME':'MATCH';
    el('ffClock').parentNode.classList.toggle('sd',v.status==='sd');
    const tb=el('ffTurn');let label,mine=false;
    if(v.status==='over')label='FULL TIME';
    else if(pre)label='GET READY';
    else if(G.anim)label=G.anim.by===G.my?'…':G.mode==='cpu'?"COMPUTER'S TURN":"OPPONENT'S TURN";
    else if(v.side===G.my){label='YOUR TURN';mine=true;}
    else if(G.mode==='cpu')label=G.thinking?"COMPUTER'S TURN · thinking…":"COMPUTER'S TURN";
    else label=G.oppAway?'WAITING FOR OPPONENT':"OPPONENT'S TURN";
    tb.querySelector('b').textContent=label;tb.classList.toggle('mine',mine);
    const left=v.dl?Math.max(0,Math.min(TURN_MS,v.dl-n)):TURN_MS;el('ffTurnBar').style.width=(G.anim||pre||v.status==='over'?100:left/TURN_MS*100)+'%';
    tb.classList.toggle('hurry',!G.anim&&!pre&&left<5000&&v.status!=='over');
    // kick-off countdown
    const ov=el('ffOver');if(pre){ov.hidden=false;ov.className='fkover cd';ov.innerHTML=`<b>${Math.ceil((v.start-n)/1000)}</b><span>Kick-off</span>`;G.cdShown=true;}
    else if(G.cdShown){G.cdShown=false;if(ov.classList.contains('cd'))ov.hidden=true;}
  }
  function banner(html,ms,cls){const ov=el('ffOver');if(!ov)return;ov.className='fkover '+(cls||'');ov.innerHTML=html;ov.hidden=false;clearTimeout(G&&G.banT);if(G)G.banT=setTimeout(()=>{if(ov.className.includes(cls||'fkover'))ov.hidden=true;},ms);}
  function celebrate(team){const mine=team===G.my;sfx('goal');cheer();poppers();
    banner(`<b class="g">GOAL!</b><span>${mine?'You scored':H_(G.names[team])+' scored'}</span>`,1900,'goal'+(mine?' mine':''));}
  /* poppers: confetti bursts from all four sides */
  let fxRaf=0;
  function poppers(){
    const c=el('ffFx');if(!c)return;const st=el('ffStage').getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    c.width=st.width*dpr;c.height=st.height*dpr;c.style.width=st.width+'px';c.style.height=st.height+'px';const x=c.getContext('2d');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const W=st.width,H=st.height,cols=['#e3191f','#ffffff','#ffd23f','#3ad06a','#ff7a3c','#4ea3ff'],P=[];
    const burst=(ox,oy,ang,spread,n)=>{for(let k=0;k<n;k++){const a=ang+(Math.random()-.5)*spread,v=7+Math.random()*9;
      P.push({x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:3+Math.random()*4,c:cols[k%cols.length],rot:Math.random()*6,vr:(Math.random()-.5)*.4,life:1,shape:k%3});}};
    burst(0,H,-Math.PI/3,.8,55);burst(W,H,-2*Math.PI/3,.8,55);burst(0,H*.35,-Math.PI/8,.7,35);burst(W,H*.35,-7*Math.PI/8,.7,35);burst(W/2,0,Math.PI/2,1.4,40);
    [0,160,320,480].forEach((d,i)=>setTimeout(()=>sfx('pop'),d+i*40));
    cancelAnimationFrame(fxRaf);const t0=performance.now();
    const step=t=>{const e=(t-t0)/1000;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
      P.forEach(p=>{p.vy+=.28;p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.life=Math.max(0,1-e/2.6);
        x.save();x.globalAlpha=p.life;x.translate(p.x,p.y);x.rotate(p.rot);x.fillStyle=p.c;
        if(p.shape===0)x.fillRect(-p.r,-p.r*.45,p.r*2,p.r*.9);else if(p.shape===1){x.beginPath();x.arc(0,0,p.r*.7,0,7);x.fill();}else{x.beginPath();x.moveTo(0,-p.r);x.lineTo(p.r,p.r);x.lineTo(-p.r,p.r);x.fill();}
        x.restore();});
      if(e<2.7)fxRaf=requestAnimationFrame(step);else x.clearRect(0,0,W,H);};
    fxRaf=requestAnimationFrame(step);
  }
  function toast(t){banner(`<span class="t">${H_(t)}</span>`,1600,'toast');}

  /* ---------- input: pull back from your disc, release to flick ---------- */
  const isMyTurn=()=>G&&!G.anim&&!G.pending&&G.v.side===G.my&&(G.v.status==='play'||G.v.status==='sd')&&!(G.v.start&&clockNow()<G.v.start);
  function bindInput(){
    const pt=e=>{const r=cv.getBoundingClientRect();return toField(e.clientX-r.left,e.clientY-r.top);};
    cv.onpointerdown=e=>{if(!isMyTurn())return;const p=pt(e);let best=null,bd=1e9;
      E.TEAM[G.my].forEach(i=>{const dx=G.v.st[2*i]-p[0],dy=G.v.st[2*i+1]-p[1],d=dx*dx+dy*dy;if(d<bd){bd=d;best=i;}});
      if(best==null||bd>(E.R*2.1)**2)return;aim={d:best,p:null};cv.setPointerCapture(e.pointerId);e.preventDefault();};
    cv.onpointermove=e=>{if(!aim)return;aim.p=pt(e);};
    const up=e=>{if(!aim)return;const sh=shotFromAim();aim=null;if(sh&&isMyTurn())shoot(sh);};
    cv.onpointerup=up;cv.onpointercancel=()=>{aim=null;};
  }
  function shotFromAim(){
    if(!aim||!aim.p)return null;const dx=G.v.st[2*aim.d]-aim.p[0],dy=G.v.st[2*aim.d+1]-aim.p[1],l=Math.sqrt(dx*dx+dy*dy);
    if(l<E.R*.9)return null;const p=Math.min(1,(l-E.R*.6)/230),v=Math.max(.08,p)*E.MAXV*.999;
    return {d:aim.d,vx:Math.round(dx/l*v*100)/100,vy:Math.round(dy/l*v*100)/100};
  }
  /* play a resolved flick on screen (at double speed: 120 physics steps a second) */
  function animate(res,by,done){G.anim={frames:res.frames,events:res.events,ev:0,t0:0,by,done};if(by===G.my)sfx('flick');}

  function shoot(shot){if(!E.validShot(shot,G.my))return;if(G.mode==='cpu')return localShot(shot,G.my);return onlineShot(shot);}

  /* ================= computer matches ================= */
  function startCpu(form){
    const cf=['3-1','2-2','1-3'][Math.floor(Math.random()*3)],t=Date.now()+CD_MS;
    startGame({mode:'cpu',kind:'cpu',my:'a',names:{a:S.me.name,b:'COMPUTER'},
      v:{st:E.kickoff(form,cf),score:{a:0,b:0},status:'play',side:'a',turn:0,start:t,end:t+MATCH_MS,dl:t+TURN_MS,fa:form,fb:cf}});
  }
  function localShot(shot,side){
    const v=G.v,n=Date.now(),{res,next}=E.resolveTurn(v,shot,side,n>=v.end);
    G.pending=true;
    animate(res,side,()=>{if(!G)return;
      Object.assign(G.v,next,{turn:v.turn+1});G.pending=false;
      const after=()=>{if(!G)return;G.v.dl=Date.now()+TURN_MS;if(G.v.status==='over')finish();};
      if(res.goal){celebrate(res.goal);G.pending=true;setTimeout(()=>{if(G){G.pending=false;after();}},1900);}else after();});
  }
  function cpuTick(){
    const v=G.v,n=Date.now();if(G.anim||G.pending||v.status==='over'||n<v.start)return;
    if(v.status==='play'&&n>=v.end){if(v.score.a!==v.score.b){v.status='over';v.winner=v.score.a>v.score.b?'a':'b';return finish();}
      v.status='sd';v.dl=n+TURN_MS;toast('Sudden death! Next goal wins');return;}
    if(v.side==='b'&&!G.thinking){G.thinking=true;G.aiT=setTimeout(()=>{if(!G)return;G.thinking=false;const sh=E.aiShot(G.v.st,'b');localShot(sh,'b');},1000+Math.random()*900);return;}
    if(v.side==='a'&&n>v.dl){v.side='b';v.turn++;v.dl=n+TURN_MS;toast('Time up: turn passed');}
  }

  /* ================= online matches ================= */
  function openMatch(mid,my,quietWait){
    const d=db();if(!d)return;stopGame();LS.set('ff.cur',{mid,my});
    const ref=d.ref('ff/matches/'+mid);S.mm={mid,my,ref,t0:Date.now(),quiet:quietWait};
    ref.on('value',s=>onMatch(s.val()));
  }
  function onMatch(m){
    const c=S.mm;if(!c)return;
    if(!m){if(Date.now()-c.t0<10000)return;c.ref.off();S.mm=null;LS.set('ff.cur',null);if(!G)homeScreen('The match was closed.');return;}
    const opp=E.other(c.my);
    if(m.status==='over'&&m.noscore&&(!G||G.mid!==c.mid)){c.ref.off();S.mm=null;LS.set('ff.cur',null);return homeScreen('Your opponent left before kick-off.');}
    if(m.status==='wait')return; // private room: still waiting (room screen is showing)
    if(m.status==='form'){
      if(S.room){S.room=null;}
      if(S.screen!=='form'||!S.form||!S.form.o.online)formScreen({online:true,title:'Choose formation',opp:(m[opp]||{}).name||'Opponent',auto:true,back:'leave',
        note:'Waiting for both players to be ready…'});
      const note=el('ffFormNote');if(note)note.textContent=m['r'+opp]?`${(m[opp]||{}).name} is ready.`:`${(m[opp]||{}).name||'Opponent'} is choosing a formation…`;
      return;}
    if(!G||G.mode!=='online'||G.mid!==c.mid){ // build the game from the saved state (also used to reconnect)
      startGame({mode:'online',kind:m.kind,mid:c.mid,my:c.my,ref:c.ref,names:{a:m.a.name,b:(m.b||{}).name||'Opponent'},
        v:viewOf(m),seen:m.turn,latest:m});
      // "still here" signal on a separate path, so it never re-sends the match itself
      const pr=db().ref('ff/mping/'+c.mid);G.pingRef=pr;const beat=()=>pr.child(c.my).set(TS).catch(()=>{});beat();G.pingT=setInterval(beat,8000);
      pr.on('value',s=>{const p=(s.val()||{})[opp];if(G)G.oppAway=!!p&&now()-p>25000;});
      if(m.status==='over')setTimeout(finish,600);
      return;}
    G.latest=m;
    if(m.turn>G.seen){
      const prev=G.seen;G.seen=m.turn;const L=m.last||{};
      if(L.by===G.my&&L.n===prev&&G.mineAnim)return; // my own flick: already playing on my screen
      if(m.turn===prev+1&&L.shot&&L.n===prev&&L.by!==G.my&&!G.anim){
        const res=E.simulate(L.st0,L.shot,{frames:true});G.pending=true;
        animate(res,L.by,()=>{if(!G)return;G.pending=false;sync();if(L.goal)celebrate(L.goal);});return;}
      if(L.pass&&L.by!==undefined&&!G.anim)toast(L.by===G.my?'Time up: your turn passed':'Opponent ran out of time');
    }
    if(!G.anim&&!G.pending)sync();
  }
  const viewOf=m=>({st:m.st||E.kickoff(m.fa,m.fb),score:m.score||{a:0,b:0},status:m.status,side:m.side,turn:m.turn,start:m.start,end:m.end,dl:m.dl,fa:m.fa,fb:m.fb,winner:m.winner});
  function sync(){if(!G||!G.latest)return;const was=G.v.status;G.v=viewOf(G.latest);
    if(G.v.status==='sd'&&was==='play')toast('Sudden death! Next goal wins');
    if(G.v.status==='over'&&!G.finished)setTimeout(finish,1200);}
  function onlineShot(shot){
    const v=G.v,ref=G.ref,turn=v.turn,stJSON=JSON.stringify(v.st);
    const {res,next}=E.resolveTurn(v,shot,G.my,now()>=v.end);
    const animMs=res.frames.length*1000/120,dl=Math.round(now()+animMs+(res.goal?2200:0)+TURN_MS);
    G.mineAnim=true;G.pending=true;
    animate(res,G.my,()=>{if(!G)return;G.mineAnim=false;if(res.goal)celebrate(res.goal);
      setTimeout(()=>{if(!G)return;G.pending=false;sync();},res.goal?1900:0);});
    ref.transaction(cur=>{if(cur===null)return null;
      if(cur.turn!==turn||cur.side!==G.my||!(cur.status==='play'||cur.status==='sd')||JSON.stringify(cur.st)!==stJSON)return; // not my turn any more → refuse
      return Object.assign({},cur,{st:next.st,score:next.score,status:next.status,winner:next.winner||null,side:next.side,turn:turn+1,dl,
        last:{n:turn,by:G.my,shot,st0:cur.st,goal:res.goal||null}});
    },null,false).then(r=>{if(!G)return;if(!r.committed){G.anim=null;G.mineAnim=false;G.pending=false;toast('Move not accepted: turn already over');sync();}})
      .catch(()=>{if(G){G.anim=null;G.mineAnim=false;G.pending=false;toast('Connection problem: move not sent');sync();}});
  }
  function onlineTick(){
    const m=G.latest;if(!m||G.anim||G.pending||G.finished)return;const n=now();
    if(m.status==='play'&&n>=m.end+300){ // time up while nobody was flicking
      G.ref.transaction(cur=>{if(cur===null)return null;if(cur.status!=='play'||now()<cur.end||cur.turn!==m.turn)return;
        const sa=cur.score.a,sb=cur.score.b;return sa!==sb?Object.assign({},cur,{status:'over',winner:sa>sb?'a':'b'}):Object.assign({},cur,{status:'sd',dl:now()+TURN_MS});},null,false).catch(()=>{});return;}
    if((m.status==='play'||m.status==='sd')&&m.dl&&n>m.dl+800){ // 15 seconds passed: the turn moves on
      G.ref.transaction(cur=>{if(cur===null)return null;if(cur.turn!==m.turn||now()<=cur.dl||!(cur.status==='play'||cur.status==='sd'))return;
        return Object.assign({},cur,{side:E.other(cur.side),turn:cur.turn+1,dl:now()+TURN_MS,last:{n:cur.turn,by:cur.side,pass:true}});},null,false).catch(()=>{});}
  }
  function tick(){if(!G)return;hud();if(G.mode==='cpu')cpuTick();else onlineTick();}

  /* ---------- end of match ---------- */
  function finish(){
    if(!G||G.finished)return;G.finished=true;const v=G.v,w=v.winner,mine=w===G.my,o=E.other(G.my);
    const h=LS.get('ff.history',[]);h.unshift({opp:G.names[o],sa:v.score[G.my],sb:v.score[o],res:mine?'w':'l',kind:G.kind,ts:Date.now()});LS.set('ff.history',h.slice(0,20));
    if(G.mode==='online'){LS.set('ff.cur',null);if(G.kind==='public')record(G.latest||{},G.ref);}
    sfx(mine?'win':'lose');
    const g=G;setTimeout(()=>{if(G!==g)return;
      show('result',`<div class="fkres ${mine?'won':'lost'}"><small>${g.mode==='cpu'?'Computer match':g.kind==='private'?'Private match':'Online match'} · Full time</small>
        <h2>${mine?'YOU WIN!':'YOU LOSE'}</h2>
        <div class="fkscore"><span><b>${H_(g.names[g.my])}</b><i>${v.score[g.my]}</i></span><em>–</em><span><i>${v.score[o]}</i><b>${H_(g.names[o])}</b></span></div>
        ${(g.latest&&g.latest.forfeit)?`<p class="fknote">${mine?'Your opponent left the match.':'You left the match.'}</p>`:''}
        <p class="fknote">${g.kind==='public'?'Counted on the leaderboard.':g.mode==='cpu'?'Computer matches are not counted on the leaderboard.':'Private matches are not counted on the leaderboard.'}</p>
        <div class="fkmenu">${g.mode==='cpu'?'<button class="fkbtn red big" data-f="cpu">PLAY AGAIN</button>':'<button class="fkbtn red big" data-f="online">PLAY ONLINE AGAIN</button>'}
        <button class="fkbtn" data-f="board">LEADERBOARD</button><button class="fklink" data-f="home">Back to menu</button></div></div>`);
      stopGame();},1400);
  }
  async function record(m,ref){ // exactly once per public match (database transaction on "rec")
    const d=db();if(!d||!m.a||!m.b||!m.winner||m.noscore)return;
    try{const r=await ref.child('rec').transaction(c=>c?undefined:true);if(!r.committed)return;
      const win=m[m.winner].id,lose=m[E.other(m.winner)].id;
      await Promise.all([[win,true],[lose,false]].map(([id,won])=>d.ref('ff/players/'+id).transaction(p=>{if(!p)return p;
        p.m=(p.m||0)+1;if(won){p.w=(p.w||0)+1;p.cur=(p.cur||0)+1;p.best=Math.max(p.best||0,p.cur);}else{p.l=(p.l||0)+1;p.cur=0;}return p;})));
      await d.ref('ff/results').push({a:m.a.id,an:m.a.name,b:m.b.id,bn:m.b.name,w:win,sa:(m.score||{}).a||0,sb:(m.score||{}).b||0,ts:TS});
    }catch(e){}
  }
  function leaveMatch(){
    if(!G)return homeScreen();
    if(G.mode==='cpu'||G.v.status==='over'){stopGame();return homeScreen();}
    if(!confirm('Leave the match? It counts as a loss.'))return;
    const my=G.my,ref=G.ref;ref.transaction(cur=>{if(cur===null)return null;if(cur.status==='over')return;
      return Object.assign({},cur,{status:'over',winner:E.other(my),forfeit:true});},null,false).catch(()=>{});
  }
  function settings(){
    const ov=el('ffOver');if(!ov)return;ov.className='fkover menu';ov.hidden=false;
    ov.innerHTML=`<div class="fksetm"><b>Settings</b>
      <button class="fkbtn" data-f="sound">${S.sound?'🔊 Sound: on':'🔇 Sound: off'}</button>
      <button class="fkbtn" data-f="howin">❔ How to play</button>
      <button class="fkbtn" data-f="leave">🚪 ${G&&G.mode==='online'&&G.v.status!=='over'?'Leave match (counts as a loss)':'Leave match'}</button>
      <button class="fkbtn red" data-f="closeset">Back to the match</button></div>`;
  }

  /* ================= leaderboard ================= */
  async function boardScreen(tab){
    tab=tab||'all';
    show('board',`${top('Leaderboard')}<div class="fkboard"><div class="fktabs">${[['all','All-time'],['week','This week'],['month','This month']].map(([k,l])=>`<button class="${k===tab?'on':''}" data-f="tab" data-k="${k}">${l}</button>`).join('')}</div>
      <div id="ffBoard"><p class="fknote">Loading…</p></div><p class="fknote">Only public online matches count. Computer and private matches don't.</p></div>`);
    const d=db();const box=el('ffBoard');if(!d){box.innerHTML='<p class="fknote">The leaderboard is not available right now.</p>';return;}
    let rows=[];
    if(tab==='all')rows=sortBoard(await loadPlayers());
    else{const since=tab==='week'?weekStart():monthStart();
      // fast query once the rules (with the ts index) are pasted in Firebase; otherwise load all and filter here
      let v=await d.ref('ff/results').orderByChild('ts').startAt(since).get().catch(()=>null);if(!v)v=await d.ref('ff/results').get().catch(()=>null);
      const R=v?Object.values(v.val()||{}).filter(r=>r.ts>=since).sort((a,b)=>a.ts-b.ts):[];
      const P={};const P_=(id,name)=>P[id]=P[id]||{id,name,w:0,l:0,m:0,cur:0,best:0};
      R.forEach(r=>{[[r.a,r.an],[r.b,r.bn]].forEach(([id,nm])=>{const p=P_(id,nm);p.m++;if(r.w===id){p.w++;p.cur++;p.best=Math.max(p.best,p.cur);}else{p.l++;p.cur=0;}});});
      rows=sortBoard(Object.values(P));}
    if(S.screen!=='board')return;
    box.innerHTML=rows.length?`<table class="fktable"><thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Played</th><th>Win %</th><th>Streak</th></tr></thead><tbody>
      ${rows.slice(0,50).map((p,i)=>`<tr class="${S.me&&p.id===S.me.id?'me':''}"><td>${i+1}</td><td>${H_(p.name)}</td><td><b>${p.w}</b></td><td>${p.l}</td><td>${p.m||p.w+p.l}</td><td>${Math.round(p.w/Math.max(1,p.w+p.l)*100)}%</td><td>${p.cur?'🔥'+p.cur:'–'}</td></tr>`).join('')}</tbody></table>`
      :'<p class="fknote">No matches yet. Be the first: PLAY ONLINE!</p>';
  }
  function weekStart(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime();}
  function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).getTime();}

  /* ================= sound (tiny, made in the browser) ================= */
  let ac=null;
  function cheer(){ // a short stadium roar made from filtered noise, plus a whistle
    if(!S.sound)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
    const t=ac.currentTime,len=2.6,b=ac.createBuffer(1,ac.sampleRate*len,ac.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(.6+.4*Math.sin(i/ac.sampleRate*9));
    const src=ac.createBufferSource();src.buffer=b;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=.6;
    const g=ac.createGain();g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5,t+.25);g.gain.setValueAtTime(.5,t+1.2);g.gain.exponentialRampToValueAtTime(.001,t+len);
    src.connect(f);f.connect(g);g.connect(ac.destination);src.start(t);src.stop(t+len);
    const o=ac.createOscillator(),og=ac.createGain();o.type='sine';o.frequency.setValueAtTime(2100,t);o.frequency.setValueAtTime(2500,t+.12);o.frequency.setValueAtTime(2100,t+.24);
    og.gain.setValueAtTime(.08,t);og.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(og);og.connect(ac.destination);o.start(t);o.stop(t+.5);
  }
  function sfx(k,v){if(!S.sound)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
    const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);
    const vol=Math.min(1,(v||8)/14);
    const set=(type,f1,f2,d,a)=>{o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(a,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.02);};
    if(k==='b')set('triangle',520,260,.08,.25*vol);else if(k==='d')set('sine',300,180,.07,.18*vol);else if(k==='w'||k==='p')set('sine',160,90,.09,.15*vol);
    else if(k==='flick')set('triangle',700,380,.07,.2);else if(k==='pop')set('square',1400,180,.09,.14);else if(k==='ping')set('sine',880,1320,.18,.15);
    else if(k==='goal'){set('square',660,880,.5,.12);}else if(k==='win')set('triangle',520,1040,.6,.18);else if(k==='lose')set('triangle',400,200,.6,.15);
    else{o.disconnect();}}

  /* ================= buttons ================= */
  async function act(f,b){
    switch(f){
      case 'exit':return close();
      case 'home':return homeScreen();
      case 'profile':return profileScreen(homeScreen);
      case 'signin':return profileScreen(null,'signin');
      case 'use':{const p=saved().find(x=>x.id===b.dataset.id);if(p){remember(p);const n=S.afterProfile;S.afterProfile=null;return (n||homeScreen)();}return;}
      case 'create-ok':case 'signin-ok':{
        const name=cleanName((el('ffName')||{}).value),pin=((el('ffPin')||{}).value||'').trim();
        if(name.length<2)return msg('Type your player name (at least 2 letters).');if(!/^\d{4}$/.test(pin))return msg('The PIN must be 4 digits.');
        const btn=b;if(btn)btn.disabled=true;
        try{if(!db()){if(f==='signin-ok')throw new Error('Signing in needs the internet.');remember({id:'local-'+keyOf(name),name});}
          else if(f==='create-ok')await createProfile(name,pin);else await signIn(name,pin);
          const n=S.afterProfile;S.afterProfile=null;return (n||homeScreen)();}
        catch(e){msg(e.message==='offline'?'You are offline.':e.message);if(btn)btn.disabled=false;}return;}
      case 'online':if(!S.me)return profileScreen(playOnline);if(String(S.me.id).startsWith('local-'))return homeScreen('Online play needs an online profile. Switch profile to make one.');return playOnline();
      case 'cpu':if(!S.me)return profileScreen(()=>act('cpu'));return formScreen({title:'Play against computer',opp:'COMPUTER',cpu:true,note:'The computer picks its own formation.'});
      case 'private':if(!S.me)return profileScreen(privateScreen);return privateScreen();
      case 'mkroom':return makeRoom();
      case 'joinroom':return joinRoom();
      case 'copycode':try{await navigator.clipboard.writeText(S.room.code);b.textContent='Copied ✓';}catch(e){}return;
      case 'cancelroom':cancelRoom();if(S.mm){S.mm.ref.off();S.mm=null;}LS.set('ff.cur',null);return homeScreen();
      case 'cancelinvite':cancelInvite();return homeScreen();
      case 'board':return boardScreen();
      case 'tab':return boardScreen(b.dataset.k);
      case 'how':return howScreen('home');
      case 'resume':{const c=LS.get('ff.cur',null);if(c)openMatch(c.mid,c.my);return;}
      case 'pickform':S.form.pick=b.dataset.k;LS.set('ff.form',b.dataset.k);document.querySelectorAll('.fkform1').forEach(x=>x.classList.toggle('on',x===b));return;
      case 'formready':{const o=S.form.o,pick=S.form.pick;clearInterval(S.formT);
        if(o.cpu)return startCpu(pick);
        const c=S.mm;if(!c)return;const btn=el('ffReady');if(btn){btn.disabled=true;btn.textContent='READY ✓ · waiting…';}
        c.ref.transaction(cur=>{if(cur===null)return null;if(cur.status!=='form')return;const x=Object.assign({},cur);x['f'+c.my]=pick;x['r'+c.my]=true;
          if(x.ra&&x.rb){const t=now()+CD_MS;Object.assign(x,{status:'play',start:t,end:t+MATCH_MS,turn:0,side:'a',st:E.kickoff(x.fa,x.fb),score:{a:0,b:0},dl:t+TURN_MS});}
          return x;},null,false).catch(()=>{});return;}
      case 'leave':if(S.screen==='form'&&S.mm){const c=S.mm;c.ref.transaction(cur=>cur&&cur.status==='form'?Object.assign({},cur,{status:'over',winner:E.other(c.my),forfeit:true,noscore:true}):undefined,null,false).catch(()=>{});c.ref.off();S.mm=null;LS.set('ff.cur',null);return homeScreen();}
        return leaveMatch();
      case 'settings':return settings();
      case 'closeset':{const ov=el('ffOver');if(ov)ov.hidden=true;return;}
      case 'sound':S.sound=!S.sound;LS.set('ff.sound',S.sound);return settings();
      case 'howin':{const ov=el('ffOver');if(ov)ov.hidden=true;return toast('Drag back from your player, release to flick. Score in the top goal.');}
    }
  }
  function onClick(e){const b=e.target.closest('[data-f]');if(!b)return;e.preventDefault();act(b.dataset.f,b);}

  function open(){goFull();if(!S.me)profileScreen(homeScreen);else homeScreen();}
  document.addEventListener('click',e=>{
    const j=e.target.closest('[data-fkjoin]'),ig=e.target.closest('[data-fkignore]');
    if(ig){S.ignored.add(ig.dataset.fkignore);hidePopup(ig.dataset.fkignore);}
    if(j){const id=j.dataset.fkjoin;hidePopups();goFull();if(S.me&&!String(S.me.id).startsWith('local-'))join(id);else profileScreen(()=>join(id));}
    if(e.target.closest('[data-ff="open"]'))open();
  });
  setTimeout(()=>{if(db())listenInvites();},1500);
  return {open,_test:{setMatchMs:v=>{MATCH_MS=v;},state:()=>G,close,S,E}};
})();
