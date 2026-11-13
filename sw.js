/* MLD 03 app: always loads the newest version from the internet; the saved copy is only used when offline. */
const CACHE='mld03-v1';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));}return res;})
    .catch(()=>caches.match(r).then(m=>m||caches.match('/'))));
});
self.addEventListener('notificationclick',e=>{e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if('focus'in c){try{c.navigate&&c.navigate(url);}catch(err){}return c.focus();}}
    if(clients.openWindow)return clients.openWindow(url);
  }));
});
