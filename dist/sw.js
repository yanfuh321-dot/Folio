// Only known application assets are cached. No PDF, Blob, text or password is stored.
const CACHE='folio-a4e80c3ee8248ce3';
const ASSETS=["THIRD_PARTY.html","app.js","assets.json","engine.js","icon.svg","index.html","licenses/MuPDF.txt","licenses/Tesseract-core.txt","licenses/Tesseract.txt","licenses/fflate.txt","manifest.webmanifest","network-guard.js","ocr-worker.js","source.zip","style.css","sw.js","vendor/fflate/fflate.js","vendor/lang/chi_sim.traineddata.gz","vendor/lang/deu.traineddata.gz","vendor/lang/eng.traineddata.gz","vendor/mupdf/mupdf-wasm.js","vendor/mupdf/mupdf-wasm.wasm","vendor/mupdf/mupdf.js","vendor/ocr/tesseract-core-lstm.wasm.js","vendor/ocr/tesseract.esm.min.js","vendor/ocr/worker.min.js","worker.js"];
const base=new URL('./',self.location.href);
const allowed=new Set(ASSETS.map(x=>new URL(x,base).href));allowed.add(base.href);
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('folio-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const req=event.request,u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==base.origin)return;
  const key=req.mode==='navigate'?new URL('index.html',base).href:u.href;
  if(!allowed.has(key))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(key);if(hit)return hit;const response=await fetch(key);if(response.ok&&!response.redirected)await cache.put(key,response.clone());return response;})());
});
self.addEventListener('message',event=>{if(event.data?.type!=='CACHE_APP')return;const port=event.ports[0];event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);let current=0;for(const asset of ASSETS){const key=new URL(asset,base).href;if(!await cache.match(key)){const response=await fetch(key);if(!response.ok||response.redirected)throw Error('Offline-Datei konnte nicht geladen werden: '+asset);await cache.put(key,response);}port.postMessage({current:++current,total:ASSETS.length});}const index=await cache.match(new URL('index.html',base).href);await cache.put(base.href,index);port.postMessage({done:true});}catch(e){port.postMessage({error:e.message});}})());});
