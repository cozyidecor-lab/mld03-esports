/* ================= MLD member login =================
   Database players log in with a password that WaCky gives them privately. Logging in proves you are
   the real person — this will gate the MLD Flick weekly challenge and (next) let you set your own photo.
   Non-members can use the whole site normally without logging in.

   Security (friendly-group grade, no private server): each player's password hash is kept in Firebase
   under `secret/{id}` which the rules make READ-BLOCKED, so the hashes can't be downloaded and cracked.
   A correct password is proven by a validated write to `login/{id}` (the rule compares it to the stored
   hash server-side). Hashing is PBKDF2-SHA256, 210k iterations, with a fixed salt. In test mode / the
   mock DB the secret is readable, so we just compare directly. Stops the spare-phone cheating; not
   bank-grade. See firebase-rules.json. */
(function(){
  const SALT='mld03-login-v1', ITER=210000;
  const el=id=>document.getElementById(id);
  const esc=window.esc||(s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const keyOf=n=>n.trim().toLowerCase().replace(/[.#$\[\]\/]/g,'').replace(/\s+/g,' ').slice(0,40);
  const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
            set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
  let me=LS.get('mld-login',null);              // {id,name} or null
  let pick=null;                                 // player chosen in the login form
  const dev=(()=>{try{let d=localStorage.getItem('mld-dev');if(!d){d=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',d);}return d;}catch(e){return 'anon';}})();
  const players=()=>typeof byName==='object'?Object.values(byName).filter(p=>!p.side):[];
  const initialsOf=n=>typeof initials==='function'?initials(n):(n[0]||'?').toUpperCase();
  const faceOf=n=>typeof photoOf==='function'?photoOf(n):null;

  async function hash(pw){const salt=new TextEncoder().encode(SALT);
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),{name:'PBKDF2'},false,['deriveBits']);
    const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},k,256);
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}

  async function verify(id,pw){const h=await hash(pw);
    let sec=null,denied=false;
    try{sec=await NET.get('secret/'+id);}catch(e){denied=true;}   // read-blocked by the rules -> rejects
    if(sec&&sec.h)return sec.h===h;        // readable (test mode / mock): compare directly
    if(!denied)return false;               // resolved but empty -> this player has no password set yet -> fail
    // read-blocked: prove the password with a write the rules only accept when the hash matches
    try{await NET.set('login/'+id+'/'+dev,{h:h,t:Date.now()});return true;}catch(e){return false;}}

  /* link the logged-in person to their MLD Football Flick profile, if they have one on this phone */
  function linkFlick(name){try{const ffid=LS.get('ff.me',null);if(ffid&&NET&&NET.set){
    NET.set('ff/players/'+ffid+'/mld',name).catch(()=>{});
    NET.set('ff/players/'+ffid+'/verified',true).catch(()=>{});  // marks the game profile as a LOGGED-IN member (leaderboard bold)
  }}catch(e){}}

  function setMe(v){me=v;if(v)LS.set('mld-login',v);else LS.del('mld-login');paintBtn();
    document.dispatchEvent(new CustomEvent('mld-auth',{detail:me}));}

  /* ---------- notifications (shown to logged-in members) ----------
     A list of announcements. To send a NEW update later, add one more object with a NEW id
     (keep the old ones too). A red dot shows on the profile icon until the member opens it.
     'action' decides what happens on tap — 'flick-event' jumps straight to the ₹25 challenge. */
  const NOTIFS=[
    {id:'flick-weekly-250',icon:'₹250',title:'₹250 Weekly Flick Challenge',
     body:'A new Flick challenge is live — win ₹250! Top this week’s leaderboard by Thu 3 Dec. Only matches where both players are logged-in members count. Tap to see the event and play.',
     cta:'See the challenge →',action:'flick-event'}
  ];
  const readIds=()=>LS.get('mld-notif-read',[]);
  const unread=()=>me?NOTIFS.filter(x=>readIds().indexOf(x.id)<0):[];
  function markRead(id){const r=readIds();if(r.indexOf(id)<0){r.push(id);LS.set('mld-notif-read',r);}paintBtn();}
  function notifHtml(){if(!NOTIFS.length)return '';const r=readIds();
    return `<div class="apsec apnotifs"><div class="apsechd">Notifications</div>
      ${NOTIFS.map(x=>{const nw=r.indexOf(x.id)<0;
        return `<button class="apnotif${nw?' new':''}" data-notifopen="${esc(x.id)}">
          <span class="apnicon">${esc(x.icon)}</span>
          <span class="apntext"><b>${esc(x.title)}</b><small>${esc(x.body)}</small>${x.cta?`<em class="apncta">${esc(x.cta)}</em>`:''}</span>
          ${nw?'<span class="apndot"></span>':''}</button>`;}).join('')}</div>`;}

  /* ---------- header button ---------- */
  function paintBtn(){const b=el('authBtn');if(!b)return;
    if(me){const u=faceOf(me.name);b.classList.add('in');b.setAttribute('aria-label','Your account · '+me.name);
      b.innerHTML=u?`<img alt="" src="${esc(u)}">`:`<span class="authini">${esc(initialsOf(me.name))}</span>`;
      const n=unread().length;b.classList.toggle('hasnotif',n>0);
      if(n>0)b.setAttribute('aria-label','Your account · '+me.name+' · '+n+' new notification'+(n>1?'s':''));}
    else{b.classList.remove('in','hasnotif');b.setAttribute('aria-label','Log in');
      b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5.5 20c0-3.6 3.2-5.6 6.5-5.6s6.5 2 6.5 5.6"/></svg>`;}}

  /* ---------- modal open/close ---------- */
  function open(html){const m=el('authModal');if(!m)return;m.hidden=false;m.className='authmodal';m.innerHTML=`<div class="authbox">${html}</div>`;
    document.body.classList.add('auth-open');}
  function close(){const m=el('authModal');if(!m||m.hidden)return false;m.hidden=true;m.innerHTML='';m.className='authmodal';pick=null;
    document.body.classList.remove('auth-open');return true;}
  window.closeAuth=close;

  /* ---------- logged-OUT: the login form ---------- */
  function openLogin(){pick=null;renderPick();}
  function renderPick(){
    open(`<button class="ibtn authx" data-authclose aria-label="Close">${X}</button>
      <h3>Member log in</h3>
      <p class="note">Only MLD database players can log in. Start typing your name and pick it from the list.</p>
      <label class="search authsearch" for="authName"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="authName" placeholder="Type your name…" autocomplete="off"></label>
      <div class="authsug" id="authSug"></div>
      <p class="note authtiny">Not in the MLD database? You can still use everything and play MLD Flick — just without logging in.</p>`);
    const i=el('authName');if(i){i.addEventListener('input',onType);setTimeout(()=>i.focus(),60);}
  }
  function onType(){const q=el('authName').value.trim().toLowerCase(),box=el('authSug');if(!box)return;
    if(!q){box.innerHTML='';return;}
    const hits=players().filter(p=>p.n.toLowerCase().includes(q))
      .sort((a,b)=>(a.n.toLowerCase().startsWith(q)?0:1)-(b.n.toLowerCase().startsWith(q)?0:1)||a.n.localeCompare(b.n)).slice(0,8);
    box.innerHTML=hits.length?hits.map(p=>{const u=faceOf(p.n);
      return `<button class="authsugi" data-pickname="${esc(p.n)}"><span class="authav">${u?`<img alt="" src="${esc(u)}">`:esc(initialsOf(p.n))}</span><b>${esc(p.n)}</b></button>`;}).join('')
      :'<p class="note" style="margin:8px 4px">No database player with that name. Check the spelling.</p>';
  }
  function renderPw(){const u=faceOf(pick);
    open(`<button class="ibtn authx" data-authback aria-label="Back">${BACK}</button>
      <h3>Hi, ${esc(pick)}</h3>
      <div class="authwho"><span class="authav big">${u?`<img alt="" src="${esc(u)}">`:esc(initialsOf(pick))}</span><div><b>${esc(pick)}</b><small>Enter your password to log in</small></div></div>
      <input id="authPw" type="password" inputmode="text" autocomplete="off" placeholder="Your password" enterkeyhint="go">
      <p class="autherr" id="authErr" hidden></p>
      <button class="fkbtn red big" id="authGo">Log in</button>
      <p class="note authtiny">Don't have your password yet? Ask <b>WaCky</b> on WhatsApp — he gives each player their own.</p>`);
    const pw=el('authPw'),go=el('authGo');
    if(pw){setTimeout(()=>pw.focus(),60);pw.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});}
    if(go)go.addEventListener('click',submit);
  }
  async function submit(){const pwEl=el('authPw'),go=el('authGo'),err=el('authErr');if(!pwEl)return;
    const pw=pwEl.value;if(!pw){return;}
    go.disabled=true;go.textContent='Checking…';err.hidden=true;
    let ok=false;try{ok=await verify(keyOf(pick),pw);}catch(e){ok=false;}
    if(ok){setMe({id:keyOf(pick),name:pick});linkFlick(pick);close();toast('Logged in as '+pick+' ✓');}
    else{go.disabled=false;go.textContent='Log in';err.textContent='That password is not right. Ask WaCky for yours.';err.hidden=false;
      pwEl.value='';pwEl.focus();}
  }

  /* ---------- logged-IN: a right-side panel with your stats + achievement progress ---------- */
  function openAccount(){const n=me.name,u=faceOf(n),p=(typeof byName==='object'&&byName[n])||null;
    const F=x=>typeof fmt==='function'?fmt(x):(x==null?'–':x);
    const tile=(v,l)=>`<div class="aptile"><b>${v}</b><span>${l}</span></div>`;
    const stats=p?`<div class="aptiles">${tile('#'+p.crk,'All-time rank')}${tile(p.g,'Goals')}${tile(F(p.r),'Avg rating')}${tile(p.pt,'Trophies')}${tile(p.ru,'Runner-up')}${tile(p.t,'Tours')}</div>`
      :'<p class="note">No stats recorded for your account yet.</p>';
    const m=el('authModal');if(!m)return;m.hidden=false;m.className='authmodal side';
    m.innerHTML=`<div class="authpanel">
      <div class="aptop">
        <button class="apme" data-apanelprofile aria-label="Open my full profile">${u?`<img class="apav" alt="" src="${esc(u)}">`:`<span class="apav authini">${esc(initialsOf(n))}</span>`}<span class="apname"><small>Logged in as</small><b>${esc(n)}</b></span></button>
        <button class="ibtn authx" data-authclose aria-label="Close">${X}</button>
      </div>
      <button class="approfbtn" data-apanelprofile>View my full profile →</button>
      ${notifHtml()}
      ${stats}
      ${window.MLDach&&MLDach.panelHtml?MLDach.panelHtml(n):''}
      <button class="fkbtn apout" id="authOut">Log out</button>
    </div>`;
    document.body.classList.add('auth-open');
    const out=el('authOut');if(out)out.addEventListener('click',()=>{setMe(null);close();toast('Logged out');});
  }

  const toast=m=>{if(typeof showToast==='function')return showToast(m);
    try{let t=el('mldToast');if(!t){t=document.createElement('div');t.id='mldToast';document.body.appendChild(t);}
      t.textContent=m;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),2200);}catch(e){}};
  const X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>';

  /* ---------- events ---------- */
  document.addEventListener('click',e=>{
    if(e.target.closest('#authBtn')){e.preventDefault();return me?openAccount():openLogin();}
    if(e.target.closest('[data-authclose]'))return close();
    if(e.target.closest('[data-apanelprofile]')){const n=me&&me.name;close();if(n&&typeof openPlayer==='function')openPlayer(n);return;}
    const no=e.target.closest('[data-notifopen]');
    if(no){const id=no.dataset.notifopen,x=NOTIFS.find(z=>z.id===id);markRead(id);close();
      if(x&&x.action==='flick-event'&&typeof FF!=='undefined'&&FF.openEvent)FF.openEvent();return;}
    if(e.target.closest('.authpanel [data-acview]'))return close();  // achievements handler does the navigation
    if(e.target.closest('[data-authback]'))return renderPick();
    const s=e.target.closest('[data-pickname]');if(s){pick=s.dataset.pickname;renderPw();return;}
    const m=el('authModal');if(m&&!m.hidden&&e.target===m)close();   // tap backdrop
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});

  window.MLDAUTH={me:()=>me,isMember:()=>!!me,open:openLogin,close};
  paintBtn();
  // announce the current login once at startup so presence (js/online.js, loaded first) writes our name
  document.dispatchEvent(new CustomEvent('mld-auth',{detail:me}));
  // if the photo for the logged-in player loads/changes later, keep the header icon fresh
  document.addEventListener('mld-photos',paintBtn);
})();
