import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createWorker} from 'tesseract.js';
import {PDFEngine} from '../dist/engine.js';

test('Bundled DE / EN / ZH models recognize a local raster with the distributed OCR core',async()=>{
  const temp=await mkdtemp(tmpdir()+'/folio-ocr-');const e=new PDFEngine();
  try{
    e.newDocument();e.annotate({index:0,kind:'text',text:'Folio local OCR test\nNachhaltigkeit\n中文翻译 你好',rect:[50,50,500,180],size:25,color:'#000000',family:'Helvetica'});
    const input=resolve(temp,'input.png');await writeFile(input,e.render({index:0,scale:2,details:false}).bytes);
    const core=resolve(temp,'core.cjs');await copyFile(new URL('../dist/vendor/ocr/tesseract-core-lstm.wasm.js',import.meta.url),core);
    for(const lang of ['eng','deu','chi_sim']){
      const worker=await createWorker(lang,1,{langPath:resolve('dist/vendor/lang'),corePath:core,cacheMethod:'none'});
      try{const {data}=await worker.recognize(input);assert.match(data.text,/Folio/);if(lang==='deu')assert.match(data.text,/Nachhaltigkeit/);if(lang==='chi_sim')assert.match(data.text,/中\s*文/);}finally{await worker.terminate();}
    }
  }finally{e.close();await rm(temp,{recursive:true,force:true});}
});
