import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,access} from 'node:fs/promises';
const guard=await readFile(new URL('../dist/network-guard.js',import.meta.url),'utf8');
function env(){const requests=[];const self={location:{href:'https://example.test/folio/worker.js'},fetch:async(...a)=>{requests.push(a);return {ok:true};},navigator:{sendBeacon:()=>true},WebSocket:class{},EventSource:class{}};vm.runInNewContext(guard,{self,URL,Error,Set,Object});return {self,requests};}
test('Only pinned local program files may be fetched',async()=>{const {self,requests}=env();await self.fetch('https://example.test/folio/vendor/mupdf/mupdf-wasm.wasm');assert.equal(requests.length,1);for(const url of ['https://evil.test/collect','https://example.test/folio/upload','https://example.test/folio/index.html?text=secret','https://example.test/folio/../collect','https://example.test/another/app.js'])await assert.rejects(self.fetch(url));assert.equal(requests.length,1);});
test('All uploads and outbound socket/beacon channels are blocked',async()=>{const {self,requests}=env();await assert.rejects(self.fetch('https://example.test/folio/index.html',{method:'POST',body:'PDF'}));await assert.rejects(self.fetch('https://example.test/folio/index.html',{headers:{secret:'PDF'}}));await assert.rejects(self.fetch('https://example.test/folio/index.html',{body:'PDF'}));assert.throws(()=>new self.WebSocket('wss://example.test'));assert.throws(()=>new self.EventSource('/collect'));assert.equal(self.navigator.sendBeacon('/collect','PDF'),false);assert.equal(requests.length,0);});
test('Offline asset manifest contains only available program files',async()=>{const assets=JSON.parse(await readFile(new URL('../dist/assets.json',import.meta.url)));for(const p of assets){assert.ok(!/\.pdf$/i.test(p));assert.ok(!p.includes('..'));await access(new URL('../dist/'+p,import.meta.url));}for(const lang of ['deu','eng','chi_sim'])assert.ok(assets.includes('vendor/lang/'+lang+'.traineddata.gz'));});
test('App keeps keys/documents out of persistent storage and explicitly declares cloud CSP',async()=>{const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(html,/Content-Security-Policy/);assert.match(html,/connect-src 'self'/);assert.doesNotMatch(app,/fetch\(|XMLHttpRequest|indexedDB|sendBeacon\(/);const writes=app.match(/localStorage\.setItem\([^;]+/g);assert.equal(writes.length,1);assert.match(writes[0],/folio-theme/);assert.match(app,/cacheMethod:'none'/);assert.match(app,/new URL\('\.\/ocr-worker.js'/);});
test('Only the main window can call the two exact OpenRouter endpoints',async()=>{
 const worker=env();await assert.rejects(worker.self.fetch('https://openrouter.ai/api/v1/models'));
 const requests=[];const self={location:{href:'https://example.test/folio/'},fetch:async(...a)=>requests.push(a)};
 vm.runInNewContext(guard,{self,document:{},URL,Error,Set,Object});
 await self.fetch('https://openrouter.ai/api/v1/models');await self.fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',body:'{}',headers:{Authorization:'Bearer test','Content-Type':'application/json'}});
 assert.equal(requests.length,2);assert.equal(requests[1][1].credentials,'omit');assert.equal(requests[1][1].redirect,'error');
 for(const url of ['https://openrouter.ai/api/v1/other','https://openrouter.ai/api/v1/models?secret=pdf','https://openrouter.ai.evil.test/api/v1/models'])await assert.rejects(self.fetch(url));
 await assert.rejects(self.fetch('https://openrouter.ai/api/v1/models',{method:'POST',body:'PDF'}));assert.equal(requests.length,2);
});
