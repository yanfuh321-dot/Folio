import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFEngine,parsePages} from '../dist/engine.js';
import * as mupdf from '../dist/vendor/mupdf/mupdf.js';
const fixture=new Uint8Array(await readFile(new URL('./fixture.pdf',import.meta.url)));
const open=()=>{const e=new PDFEngine();e.open({bytes:fixture});return e;};
const reopen=bytes=>{const e=new PDFEngine();e.open({bytes});return e;};
const text=e=>e.text({}).map(p=>p.text).join('\n');
test('Page ranges reject invalid and out-of-range input',()=>{assert.deepEqual(parsePages('1, 2-4, 2',4),[0,1,2,3]);for(const x of ['0','3-1','5','a','1,'])assert.throws(()=>parsePages(x,4));});
test('Load, render, search and extract actual PDF content',()=>{const e=open();try{assert.equal(e.info().count,2);const r=e.render({index:0});assert.deepEqual(r.bounds,[0,0,595,842]);assert.ok(r.bytes.length>1000);assert.equal(r.fields.length,3);assert.match(text(e),/SECRET-918/);assert.equal(e.search({needle:'Supplier'}).length,1);}finally{e.close();}});
test('Unicode annotations survive export and repeated edits without corrupting fonts',async()=>{const e=open();try{
  e.annotate({index:0,kind:'text',text:'Deutsch: Grüße. 中文: 你好。',rect:[45,410,530,460],size:17,color:'#6251bc',family:'Helvetica'});
  assert.match(text(e),/中文: 你好/);e.export();e.export();
  const line=e.render({index:0}).lines.find(x=>x.text==='Text replacement target');
  e.annotate({index:0,kind:'replace',text:'Text erfolgreich ersetzt',rect:line.rect,size:line.size,family:'Helvetica',color:'#000000'});
  assert.doesNotMatch(text(e),/Text replacement target/);assert.match(text(e),/Text erfolgreich ersetzt/);
  const bytes=e.export();const fresh=reopen(bytes);try{assert.match(text(fresh),/Text erfolgreich ersetzt/);assert.match(text(fresh),/中文: 你好/);}finally{fresh.close();}
  e.undo();assert.match(text(e),/Text replacement target/);e.redo();assert.match(text(e),/Text erfolgreich ersetzt/);
  if(process.env.FOLIO_TEST_OUTPUT){await mkdir(process.env.FOLIO_TEST_OUTPUT,{recursive:true});await writeFile(process.env.FOLIO_TEST_OUTPUT+'/roundtrip.pdf',bytes);await writeFile(process.env.FOLIO_TEST_OUTPUT+'/roundtrip.png',e.render({index:0}).bytes);}
}finally{e.close();}});
test('Redaction removes text; raster export has no fields, metadata, attachments or text layers',()=>{const e=open();try{
  e.annotate({index:0,kind:'redact',rect:[40,130,400,160],color:'#000000'});assert.doesNotMatch(text(e),/SECRET-918/);
  const out=e.export({raster:true,clearMetadata:true});const fresh=reopen(out);try{assert.equal(text(fresh).trim(),'');assert.equal(fresh.render({index:0}).fields.length,0);assert.equal(fresh.info().author,'');assert.equal(fresh.info().count,2);assert.equal(Object.keys(fresh.doc.getEmbeddedFiles()).length,0);}finally{fresh.close();}
  const vector=reopen(e.export());try{assert.doesNotMatch(text(vector),/SECRET-918/);}finally{vector.close();}
  e.undo();assert.match(text(e),/SECRET-918/);
}finally{e.close();}});
test('Form values and appearances survive roundtrip; flatten removes widgets',async()=>{const e=open();try{
  e.form({index:0,field:0,value:'Einhell Test'});e.form({index:0,field:1,value:''});e.form({index:0,field:2,value:'Germany'});
  const bytes=e.export();const fresh=reopen(bytes);try{const f=fresh.render({index:0}).fields;assert.deepEqual(f.map(x=>x.value),['Einhell Test','Yes','Germany']);assert.match(text(fresh),/Einhell Test/);}finally{fresh.close();}
  const flat=reopen(e.export({flatten:true}));try{assert.equal(flat.render({index:0}).fields.length,0);assert.match(text(flat),/Einhell Test/);}finally{flat.close();}
  if(process.env.FOLIO_TEST_OUTPUT)await writeFile(process.env.FOLIO_TEST_OUTPUT+'/form.pdf',bytes);
}finally{e.close();}});
test('AES-256 password protects export, wrong password fails, active document remains usable',()=>{const e=open();try{
  const out=e.export({password:'Folio-test-2026'});const d=new mupdf.PDFDocument(out);assert.equal(d.needsPassword(),true);assert.equal(d.authenticatePassword('wrong'),0);assert.ok(d.authenticatePassword('Folio-test-2026'));assert.match(d.getMetaData('encryption'),/256/);d.destroy();
  assert.throws(()=>e.export({password:'a,b'}));assert.equal(e.info().count,2);const plain=new mupdf.PDFDocument(e.export());assert.equal(plain.needsPassword(),false);plain.destroy();
}finally{e.close();}});
test('Page rotation, cropping, ordering, duplicate, delete, blank and merge remain valid',()=>{const e=open();try{
  e.pages({action:'rotate',index:0});assert.deepEqual(e.render({index:0,details:false}).bounds,[0,0,842,595]);
  e.annotate({index:0,kind:'crop',rect:[20,30,600,500]});const b=e.render({index:0,details:false}).bounds;assert.equal(b[2]-b[0],580);assert.equal(b[3]-b[1],470);
  e.undo();e.undo();e.pages({action:'duplicate',index:1});assert.equal(e.info().count,3);e.pages({action:'blank',index:0});assert.equal(e.info().count,4);e.pages({action:'move',index:3,to:0});assert.match(e.text({pages:[0]})[0].text,/Second page/);
  e.pages({action:'delete',index:1});assert.equal(e.info().count,3);e.merge({bytes:fixture});assert.equal(e.info().count,5);
  const out=reopen(e.export({range:'1,4-5'}));assert.equal(out.info().count,3);out.close();
}finally{e.close();}});
test('Drawing, shapes, marks, notes, images and metadata are exported',()=>{const e=open();try{
  for(const kind of ['highlight','underline','strike','rect','ellipse','note','arrow','draw'])e.annotate({index:1,kind,rect:[40,130,200,170],text:'Review note',points:[[40,200],[100,210],[180,190]],color:'#6251bc',width:2});
  const image=e.render({index:0,scale:.1,details:false}).bytes;e.annotate({index:1,kind:'image',bytes:image,rect:[50,300,170,470]});
  e.stamp({kind:'numbers',text:'Seite '});e.stamp({kind:'watermark',text:'ENTWURF'});e.metadata({title:'Roundtrip',author:'Folio',subject:'Test'});
  const f=reopen(e.export());assert.equal(f.info().author,'Folio');assert.ok(f.render({index:1}).annotations.length>=11);f.close();
  const clean=reopen(e.export({clearMetadata:true}));assert.equal(clean.info().title,'');assert.equal(clean.info().author,'');clean.close();
}finally{e.close();}});
test('Text PDF contains actual selectable Latin and CJK text',()=>{const e=open();try{const data=e.textPDF({text:'Grüße aus Shanghai\nEnglish translation\n中文翻译：你好。'});const f=reopen(data);assert.match(text(f),/Grüße aus Shanghai/);assert.match(text(f),/中文翻译/);assert.equal(f.render({index:0}).annotations.length,0);f.close();}finally{e.close();}});
test('Too-small text boxes fail without deleting original content',()=>{const e=open();try{assert.throws(()=>e.annotate({index:0,kind:'replace',text:'This will not fit in a tiny rectangle. '.repeat(50),rect:[45,130,90,135],size:14,family:'Helvetica',color:'#000000'}));assert.match(text(e),/SECRET-918/);}finally{e.close();}});
