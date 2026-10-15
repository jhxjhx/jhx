// Only public, same-origin static assets may be cached.
const CACHE='jhx-music-v4';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/jhx/manifest.json','/jhx/icon-192.png','/jhx/icon-512.png'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jhx-music-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||u.search||u.hash)return;
 if(!/\.(css|js|png|jpg|webp|json)$/.test(u.pathname)||u.pathname.endsWith('cloud-config.js')||u.pathname.endsWith('community-data.json'))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));
});
