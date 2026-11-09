/* Cache app shell only. Family records are never cached in HTTP caches. */
const CACHE="nestling-shell-v3-3",PREFIX="nestling-shell-",ASSETS=["./","./index.html","./app.js","./storage.js","./backup.js","./schedule.js","./i18n.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil((async()=>{const all=await caches.keys();await Promise.all(all.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
event.respondWith((async()=>{const cache=await caches.open(CACHE),match=await cache.match(req,{ignoreSearch:true});if(match)return match;try{return await fetch(req)}catch{if(req.mode==="navigate"){const shell=await cache.match("./index.html");if(shell)return shell}return Response.error()}})());});
self.addEventListener("message",event=>{if(event.data?.type==="ACTIVATE_UPDATE")self.skipWaiting();});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});const home=clients.find(c=>new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));if(home){await home.focus();return}await self.clients.openWindow("./")})())});
