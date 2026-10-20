import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const copy=async(from,to)=>{await mkdir(dirname(resolve(root,to)),{recursive:true});await cp(resolve(root,'node_modules',from),resolve(root,to));};
for(const name of ['mupdf.js','mupdf-wasm.js','mupdf-wasm.wasm'])await copy('mupdf/dist/'+name,'dist/vendor/mupdf/'+name);
for(const name of ['tesseract.esm.min.js','worker.min.js'])await copy('tesseract.js/dist/'+name,'dist/vendor/ocr/'+name);
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const core=require.resolve('tesseract.js-core/tesseract-core-lstm.wasm.js',{paths:[resolve(root,'node_modules/tesseract.js')]});await cp(core,resolve(root,'dist/vendor/ocr/tesseract-core-lstm.wasm.js'));await cp(resolve(dirname(core),'LICENSE'),resolve(root,'dist/licenses/Tesseract-core.txt'));
await copy('fflate/esm/browser.js','dist/vendor/fflate/fflate.js');
for(const lang of ['deu','eng','chi_sim'])await copy(`@tesseract.js-data/${lang}/${lang==='chi_sim'?'4.0.0':'4.0.0_best_int'}/${lang}.traineddata.gz`,`dist/vendor/lang/${lang}.traineddata.gz`);
for(const [src,dst] of [['mupdf/LICENSE','MuPDF.txt'],['tesseract.js/LICENSE.md','Tesseract.txt'],['fflate/LICENSE','fflate.txt']])await copy(src,'dist/licenses/'+dst);
console.log('Pinned runtime dependencies copied. No runtime CDN is used.');

for(const [src,dst] of [['pdf-lib/LICENSE.md','pdf-lib.txt'],['node-forge/LICENSE','node-forge.txt'],['buffer/LICENSE','buffer.txt'],['@signpdf/signpdf/LICENSE','signpdf.txt']])await copy(src,'dist/licenses/'+dst);
