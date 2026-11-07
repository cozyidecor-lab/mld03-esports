/* ================= "N online" counter in the top bar =================
   Each open visit adds itself to presence/{id} in Firebase and is removed automatically by the
   server when the visit ends (tab closed, connection lost). Everyone listens to the total. */
(function(){
  const box=document.getElementById('onlineNow');if(!box||typeof NET==='undefined')return;
  const d=NET.db();if(!d)return;
  const me=d.ref('presence').push();
  d.ref('.info/connected').on('value',s=>{if(s.val()!==true)return;
    me.onDisconnect().remove().then(()=>me.set({t:{'.sv':'timestamp'}})).catch(()=>{});});
  d.ref('presence').on('value',s=>{const n=Math.max(1,s.numChildren());
    const b=box.querySelector('b');if(b.textContent!==String(n)){b.textContent=n;box.classList.remove('bump');void box.offsetWidth;box.classList.add('bump');}
    box.hidden=false;box.title=n===1?'Only you are on the MLD website right now':n+' people are on the MLD website right now';});
  addEventListener('pagehide',()=>{me.remove().catch(()=>{});});
})();
