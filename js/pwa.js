/* ================= Install as an app =================
   manifest.webmanifest + sw.js make the site installable (home-screen icon, opens full screen).
   The menu shows an "Install the MLD app" button: Android/Chrome gets the real install prompt,
   iPhone gets the two-step "Share → Add to Home Screen" instructions. Hidden once installed. */
(function(){
  if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferred=null;
  const btn=()=>document.getElementById('installApp');
  const show=on=>{const b=btn();if(b)b.hidden=!on;};
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show(true);});
  addEventListener('appinstalled',()=>{deferred=null;show(false);});
  document.addEventListener('DOMContentLoaded',()=>{if(!standalone()&&ios)show(true);});
  if(document.readyState!=='loading'&&!standalone()&&ios)show(true);
  function iosHelp(){
    const o=document.createElement('div');o.className='pcard';o.setAttribute('role','dialog');o.setAttribute('aria-label','Install the MLD app');
    o.innerHTML=`<div class="insbox"><img alt="" src="images/app-icon-192.png"><b>Install the MLD app</b>
      <ol><li>Tap the <span class="insic">Share</span> button <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg> at the bottom of Safari</li>
      <li>Scroll down and tap <span class="insic">Add to Home Screen</span></li></ol>
      <button class="flbtn red" data-insclose="1">Got it</button></div>`;
    document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-insclose]'))o.remove();});
  }
  document.addEventListener('click',async e=>{if(!e.target.closest('#installApp'))return;
    if(deferred){deferred.prompt();try{await deferred.userChoice;}catch(err){}deferred=null;show(false);}
    else if(ios)iosHelp();});
})();
