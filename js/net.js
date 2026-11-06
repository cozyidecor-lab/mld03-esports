/* ================= MLD online: names, matchmaking, match channels, leaderboard =================
   Uses the Firebase Realtime Database in js/firebase-config.js.
   Open the site with ?mock=1 to use an in-browser stand-in (two tabs can play each other) for testing. */
const NET=(function(){
  const MOCK=/[?&]mock=1/.test(location.search);
  let L=null; // low-level store: get,set,update,remove,on,txn,onDiscRemove,onDiscSet,key

  /* ---------- Firebase store ---------- */
  function firebaseStore(){
    if(!window.firebase||!window.MLD_FIREBASE)return null;
    try{
      const app=firebase.apps.length?firebase.app():firebase.initializeApp(window.MLD_FIREBASE);
      const db=app.database();const r=p=>db.ref(p);
      return {
        get:p=>r(p).get().then(s=>s.val()),
        set:(p,v)=>r(p).set(v),
        update:(p,v)=>r(p).update(v),
        remove:p=>r(p).remove(),
        on:(p,cb)=>{const ref=r(p);const h=s=>cb(s.val());ref.on('value',h);return ()=>ref.off('value',h);},
        txn:(p,fn)=>r(p).transaction(fn).then(res=>res.committed),
        onDiscRemove:p=>r(p).onDisconnect().remove(),
        onDiscSet:(p,v)=>r(p).onDisconnect().set(v),
        key:()=>db.ref().push().key,
      };
    }catch(e){console.warn('Firebase failed to start',e);return null;}
  }
  /* ---------- in-browser stand-in (localStorage + BroadcastChannel) ---------- */
  function mockStore(){
    const K='mld-mockdb',bc=new BroadcastChannel('mld-mockdb'),subs=[];const disc=[];
    const load=()=>{try{return JSON.parse(localStorage.getItem(K))||{};}catch(e){return {};}};
    const save=d=>{localStorage.setItem(K,JSON.stringify(d));bc.postMessage(1);notify();};
    const seg=p=>p.split('/').filter(Boolean);
    const getAt=(d,p)=>seg(p).reduce((o,k)=>o==null?undefined:o[k],d);
    const setAt=(d,p,v)=>{const s=seg(p);let o=d;for(let i=0;i<s.length-1;i++){if(typeof o[s[i]]!=='object'||o[s[i]]===null)o[s[i]]={};o=o[s[i]];}
      if(v===null||v===undefined)delete o[s[s.length-1]];else o[s[s.length-1]]=JSON.parse(JSON.stringify(v));};
    function notify(){const d=load();subs.forEach(s=>{const v=getAt(d,s.p);const j=JSON.stringify(v);if(j!==s.last){s.last=j;s.cb(v==null?null:JSON.parse(j));}});}
    bc.onmessage=notify;
    addEventListener('pagehide',()=>{const d=load();disc.forEach(([p,v])=>setAt(d,p,v));localStorage.setItem(K,JSON.stringify(d));bc.postMessage(1);});
    let n=0;
    return {
      get:async p=>{const v=getAt(load(),p);return v==null?null:v;},
      set:async(p,v)=>{const d=load();setAt(d,p,v);save(d);},
      update:async(p,v)=>{const d=load();Object.entries(v).forEach(([k,x])=>setAt(d,p+'/'+k,x));save(d);},
      remove:async p=>{const d=load();setAt(d,p,null);save(d);},
      on:(p,cb)=>{const s={p,cb,last:undefined};subs.push(s);setTimeout(notify,0);return ()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1);};},
      txn:async(p,fn)=>{const d=load();const cur=getAt(d,p);const nv=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));if(nv===undefined)return false;setAt(d,p,nv);save(d);return true;},
      onDiscRemove:p=>{disc.push([p,null]);},
      onDiscSet:(p,v)=>{disc.push([p,v]);},
      key:()=>Date.now().toString(36).padStart(9,'0')+(n++).toString(36).padStart(3,'0')+Math.random().toString(36).slice(2,7),
    };
  }
  function store(){if(L)return L;L=MOCK?mockStore():firebaseStore();return L;}
  const available=()=>!!store();
  const keyOf=name=>name.trim().toLowerCase().replace(/[.#$\[\]\/]/g,'').replace(/\s+/g,' ').slice(0,40);
  const cleanName=s=>String(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);

  /* ---------- names ---------- */
  async function names(){const s=store();if(!s)return [];try{const v=await s.get('players')||{};return Object.values(v).map(x=>x&&x.name).filter(Boolean).sort((a,b)=>a.localeCompare(b));}catch(e){return [];}}
  function saveName(name){const s=store();if(!s)return;s.update('players/'+keyOf(name),{name,last:Date.now()}).catch(()=>{});try{localStorage.setItem('mld-name',name);}catch(e){}}

  /* ---------- leaderboard ---------- */
  function addWin(game,name){const s=store();if(!s||!name)return;
    s.txn(`leaderboard/${game}/${keyOf(name)}`,cur=>({name,wins:((cur&&cur.wins)||0)+1})).catch(()=>{});}
  function onLeaderboard(game,cb){const s=store();if(!s){cb(null);return ()=>{};}
    return s.on('leaderboard/'+game,v=>cb(Object.values(v||{}).filter(x=>x&&x.name).sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name))));}

  /* ---------- matchmaking: oldest waiting player claims the next one ---------- */
  const LOBBY_FRESH=75000; /* a waiting player refreshes their entry every 25 s */
  /* who is waiting for a match right now (for the home page banner) */
  function onLobby(game,cb){const s=store();if(!s){cb([]);return ()=>{};}
    let last=null;const off=s.on('lobby/'+game,v=>{last=v;emit();});
    const emit=()=>cb(Object.values(last||{}).filter(x=>x&&x.name&&!x.m&&Date.now()-(x.t||0)<LOBBY_FRESH).sort((a,b)=>a.t-b.t));
    const tick=setInterval(emit,15000);return ()=>{off();clearInterval(tick);};}
  function findMatch(game,name,onMatch){
    const s=store();if(!s)return ()=>{};
    const myId=s.key(),lp=`lobby/${game}/${myId}`;let done=false,claiming=false;
    s.set(lp,{name,t:Date.now()});s.onDiscRemove(lp);
    const beat=setInterval(()=>{if(!done)s.update(lp,{t:Date.now()}).catch(()=>{});},25000);
    const off=s.on('lobby/'+game,lobby=>{
      if(done)return;lobby=lobby||{};const mine=lobby[myId];
      if(mine&&mine.m){done=true;clearInterval(beat);off();s.remove(lp);onMatch({mid:mine.m,me:1,opp:mine.on||'Opponent'});return;}
      const waiting=Object.entries(lobby).filter(([k,v])=>v&&v.name&&!v.m&&Date.now()-(v.t||0)<LOBBY_FRESH).sort((a,b)=>a[0]<b[0]?-1:1);
      if(!claiming&&waiting.length>=2&&waiting[0][0]===myId){
        const [gid,g]=waiting[1];claiming=true;
        s.txn(`lobby/${game}/${gid}`,cur=>{if(!cur||cur.m)return undefined;cur.m=myId;cur.on=name;return cur;}).then(ok=>{
          claiming=false;if(!ok||done)return;done=true;clearInterval(beat);off();
          s.set(`matches/${game}/${myId}`,{a:name,b:g.name,t:Date.now()}).then(()=>{s.remove(lp);onMatch({mid:myId,me:0,opp:g.name});});
        }).catch(()=>{claiming=false;});
      }
    });
    return ()=>{if(done)return;done=true;clearInterval(beat);off();s.remove(lp);};
  }
  /* ---------- a match: each side writes its own node and listens to the other ---------- */
  function channel(game,mid,me){
    const s=store(),base=`matches/${game}/${mid}`,mine=`${base}/p${me}`,opp=`${base}/p${1-me}`;const offs=[];
    s.update(mine,{on:true,left:null});s.onDiscSet(mine+'/left',true);
    return {
      send:patch=>s.update(mine,patch).catch(()=>{}),
      onOpp:cb=>{offs.push(s.on(opp,v=>cb(v||{})));},
      close:()=>{offs.forEach(f=>f());s.update(mine,{left:true}).catch(()=>{});
        if(me===0)setTimeout(()=>s.remove(base).catch(()=>{}),15000);},
    };
  }

  /* ---------- name picker with suggestions from earlier players ---------- */
  function askName(gameName){
    return new Promise(resolve=>{
      const wrap=document.createElement('div');wrap.className='nmodal';
      let last='';try{last=localStorage.getItem('mld-name')||'';}catch(e){}
      wrap.innerHTML=`<div class="nbox" role="dialog" aria-modal="true" aria-labelledby="nTitle">
        <b class="flbig" id="nTitle">Your name</b><p class="note" style="margin:0">Wins in ${gameName} are saved on the Mini Games leaderboard under this name. Pick yours if it shows up.</p>
        <label class="search" for="nIn" style="margin:0"><input id="nIn" maxlength="20" autocomplete="off" placeholder="Type your name" value=""></label>
        <div class="nlist" id="nList"></div>
        <div class="flrow"><button class="flbtn red" id="nGo">Find match</button><button class="flbtn" id="nCancel">Cancel</button></div></div>`;
      document.body.appendChild(wrap);
      const inp=wrap.querySelector('#nIn'),list=wrap.querySelector('#nList');let all=[];
      const render=()=>{const q=inp.value.trim().toLowerCase();
        const hits=(q?all.filter(n=>n.toLowerCase().includes(q)):all).sort((a,b)=>(a.toLowerCase().startsWith(q)?0:1)-(b.toLowerCase().startsWith(q)?0:1)).slice(0,8);
        list.innerHTML=hits.map(n=>`<button class="nsug" data-n="${n.replace(/"/g,'&quot;')}">${n.replace(/</g,'&lt;')}${n===last?' <small>last used</small>':''}</button>`).join('')||(q?`<p class="note" style="margin:4px 2px">New name: <b>${cleanName(inp.value).replace(/</g,'&lt;')}</b></p>`:'');};
      names().then(n=>{all=n;if(last&&!all.includes(last))all.unshift(last);render();});
      inp.addEventListener('input',render);
      const finish=v=>{wrap.remove();resolve(v);};
      list.addEventListener('click',e=>{const b=e.target.closest('[data-n]');if(b){inp.value=b.dataset.n;render();go();}});
      const go=()=>{const v=cleanName(inp.value);if(!v){inp.focus();return;}saveName(v);finish(v);};
      wrap.querySelector('#nGo').onclick=go;wrap.querySelector('#nCancel').onclick=()=>finish(null);
      inp.addEventListener('keydown',e=>{if(e.key==='Enter')go();if(e.key==='Escape')finish(null);});
      setTimeout(()=>inp.focus(),50);
    });
  }
  /* ---------- profile likes: one per device ---------- */
  function deviceId(){try{let d=localStorage.getItem('mld-dev');if(!d){d=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',d);}return d;}catch(e){return 'anon';}}
  function onLikes(name,cb){const s=store();if(!s){cb(null);return ()=>{};}
    return s.on('likes/'+keyOf(name)+'/n',v=>cb(v||0));}
  function like(name){const s=store();if(!s)return Promise.resolve(false);const dev=deviceId();
    return s.txn('likes/'+keyOf(name),cur=>{cur=cur||{n:0,by:{}};cur.by=cur.by||{};if(cur.by[dev])return undefined;cur.by[dev]=true;cur.n=(cur.n||0)+1;return cur;}).catch(()=>false);}
  return {available,names,saveName,addWin,onLeaderboard,findMatch,channel,askName,MOCK,onLikes,like,onLobby};
})();
