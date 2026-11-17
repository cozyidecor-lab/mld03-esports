/* ================= Online presence (who's here right now) =================
   Each open visit writes presence/{deviceId} = {t, n?} in Firebase (n = the logged-in member's name,
   if any) and is removed automatically when the visit ends. Everyone listens to the whole node, so we
   can show the count, the list of named members online, and a green dot on a profile.
   Exposes window.isOnline(name) and a `mld-online` event. Works with ?mock=1 too (two tabs). */
(function(){
  const box=document.getElementById('onlineNow');
  const esc=window.esc||(s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const net=()=>typeof NET!=='undefined'&&NET.available()?NET:null;
  const dev=(()=>{try{let v=localStorage.getItem('mld-dev');if(!v){v=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',v);}return v;}catch(e){return 'anon';}})();
  const meLogin=()=>(window.MLDAUTH&&MLDAUTH.me&&MLDAUTH.me())||null;
  const sheetName=()=>typeof sheetOpen!=='undefined'?sheetOpen:null;

  let ONLINE={count:1,names:[],guests:1};
  window.isOnline=n=>ONLINE.names.indexOf(n)>=0;
  window.MLDonline=()=>ONLINE;

  function myVal(){const m=meLogin();return m?{t:Date.now(),n:m.name}:{t:Date.now()};}
  function paintCount(){if(!box)return;const n=Math.max(1,ONLINE.count);
    const b=box.querySelector('b');if(b.textContent!==String(n)){b.textContent=n;box.classList.remove('bump');void box.offsetWidth;box.classList.add('bump');}
    box.hidden=false;box.title=n===1?'1 person online — tap to see who':n+' people online — tap to see who';}

  /* ---------- the "who's online" popover (tap the top dot) ---------- */
  function closePop(){const p=document.getElementById('onlPop');if(p)p.remove();return !!p;}
  window.closeOnlinePop=closePop;
  function openPop(){closePop();
    const names=ONLINE.names.slice().sort((a,b)=>a.localeCompare(b)),guests=ONLINE.guests;
    const av=nm=>typeof avatar==='function'?avatar(nm,'onlav'):`<span class="onlav">${esc(nm[0]||'?')}</span>`;
    const rows=names.length
      ? names.map(nm=>`<button class="onlrow" data-p="${esc(nm)}">${av(nm)}<b>${esc(nm)}</b><span class="onldot"></span></button>`).join('')
      : '<p class="onlnone">No logged-in members online right now.</p>';
    const el=document.createElement('div');el.className='onlpop';el.id='onlPop';
    el.innerHTML=`<div class="onlhead"><span class="onldot"></span><b>${Math.max(1,ONLINE.count)}</b> online now</div>
      <div class="onllist">${rows}</div>
      ${guests?`<p class="onlguest">+ ${guests} ${guests===1?'guest':'guests'} not logged in</p>`:''}`;
    document.body.appendChild(el);
    const r=box.getBoundingClientRect();
    el.style.top=(r.bottom+8)+'px';el.style.right=Math.max(8,innerWidth-r.right)+'px';
  }
  function updatePop(){if(document.getElementById('onlPop'))openPop();}

  /* ---------- green dot on an open profile ---------- */
  function updateProfDot(){const name=sheetName(),dot=document.querySelector('#sheetBody [data-profdot]');if(!dot)return;dot.hidden=!(name&&window.isOnline(name));}

  /* ---------- start ---------- */
  const x=net();
  if(x){
    const path='presence/'+dev,write=()=>x.set(path,myVal()).catch(()=>{});
    x.onDisc(path);write();
    setInterval(write,25000);
    addEventListener('pagehide',()=>{x.remove(path);});
    document.addEventListener('mld-auth',write);
    x.on('presence',v=>{v=v||{};const es=Object.values(v);
      const names=[...new Set(es.filter(e=>e&&e.n).map(e=>e.n))];
      const guests=es.filter(e=>!e||!e.n).length;
      ONLINE={count:names.length+guests,names,guests};
      paintCount();updatePop();updateProfDot();
      document.dispatchEvent(new CustomEvent('mld-online',{detail:ONLINE}));});
  }
  // keep the profile dot live + add it when a profile opens
  if(typeof openPlayer==='function'){const base=openPlayer;openPlayer=function(n){base(n);updateProfDot();};}

  document.addEventListener('click',e=>{
    if(box&&e.target.closest('#onlineNow')){e.preventDefault();return document.getElementById('onlPop')?closePop():openPop();}
    if(!e.target.closest('#onlPop')&&!e.target.closest('#onlineNow'))closePop();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closePop();});
})();
