/* ================= MLD online: shared Firebase connection (likes, One Touch Football) =================
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

  /* ---------- profile likes: one per device ---------- */
  function deviceId(){try{let d=localStorage.getItem('mld-dev');if(!d){d=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem('mld-dev',d);}return d;}catch(e){return 'anon';}}
  function onLikes(name,cb){const s=store();if(!s){cb(null);return ()=>{};}
    return s.on('likes/'+keyOf(name)+'/n',v=>cb(v||0));}
  function like(name){const s=store();if(!s)return Promise.resolve(false);const dev=deviceId();
    return s.txn('likes/'+keyOf(name),cur=>{cur=cur||{n:0,by:{}};cur.by=cur.by||{};if(cur.by[dev])return undefined;cur.by[dev]=true;cur.n=(cur.n||0)+1;return cur;}).catch(()=>false);}
  /* the Firebase database itself, for the One Touch Football game (js/otf.js) */
  function db(){if(MOCK||!store())return null;try{return firebase.app().database();}catch(e){return null;}}
  return {available,keyOf,cleanName,MOCK,onLikes,like,db};
})();
