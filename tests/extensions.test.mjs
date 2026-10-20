import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PDFEngine} from '../dist/engine.js';
import {makeDocx,makeXlsx,tableFromPage} from '../dist/office.js';
import {splitTranslation,translateCloud,listModels} from '../dist/openrouter.js';
import {inspectCertificate,signPDF} from '../dist/vendor/signing.js';
import {unzipSync,strFromU8} from 'fflate';
const fixture=new Uint8Array(await readFile(new URL('./fixture.pdf',import.meta.url)));
const out=process.env.FOLIO_TEST_OUTPUT||'/tmp/folio-v2-tests';await mkdir(out,{recursive:true});
const text=e=>e.text({}).map(p=>p.text).join('\n');
test('Paragraph replacement removes old content, wraps, moves, preserves neighbors and remains editable',async()=>{
 const e=new PDFEngine();e.open({bytes:fixture});try{
 const old=e.render({index:0}).blocks.find(b=>b.text.includes('Text replacement target'));assert.ok(old);
 e.annotate({index:0,kind:'paragraph',oldRect:old.rect,rect:[45,390,400,480],text:'Ein frei bearbeitbarer Absatz mit Zeilenumbruch. Grüße aus Shanghai und 中文. Dieser Text ist länger als die alte Zeile.',size:14,color:'#222222',family:'Helvetica',align:'left'});
 assert.doesNotMatch(text(e),/Text replacement target/);assert.match(text(e),/SECRET-918/);assert.match(text(e),/Ein frei bearbeitbarer/);
 const ann=e.render({index:0}).annotations.find(a=>a.type==='FreeText');assert.equal(ann.size,14);
 e.annotate({index:0,kind:'paragraph',annotation:ann.index,rect:[60,400,420,490],text:'Ein zweites Mal geändert.\n中文 bleibt erhalten.',size:16,color:'#6251bc',family:'Helvetica',align:'center'});
 assert.doesNotMatch(text(e),/Ein frei bearbeitbarer/);assert.match(text(e),/zweites Mal geändert/);
 await writeFile(out+'/paragraph.pdf',e.export());await writeFile(out+'/paragraph.png',e.render({index:0}).bytes);
 e.undo();assert.match(text(e),/Ein frei bearbeitbarer/);e.undo();assert.match(text(e),/Text replacement target/);
 assert.throws(()=>e.annotate({index:0,kind:'paragraph',oldRect:old.rect,rect:[40,130,60,145],text:'Does not fit '.repeat(40),size:14,family:'Helvetica'}));assert.match(text(e),/Text replacement target/);
 }finally{e.close();}
});
test('Word and Excel produce real OOXML packages and leave the PDF intact',async()=>{
 const e=new PDFEngine();e.open({bytes:fixture});try{
 const before=text(e),p=await e.officePage({index:0,background:true}),v=e.officePage({index:0,visual:true});assert.equal(text(e),before);assert.ok(p.image.length>1000);await writeFile(out+'/word-background.png',p.image);
 for(const [name,bytes] of [['editable.docx',makeDocx([p,p])],['visual.docx',makeDocx([v,v],{visual:true})],['editable.xlsx',makeXlsx([p])],['visual.xlsx',makeXlsx([v],{visual:true})]]){const zip=unzipSync(bytes);assert.ok(zip['[Content_Types].xml']);await writeFile(out+'/'+name,bytes);}
 const docx=unzipSync(makeDocx([p]));assert.match(strFromU8(docx['word/document.xml']),/SECRET-918/);assert.ok(docx['word/media/page1.png']);
 }finally{e.close();}
});
function line(y,cells){return {horizontal:true,size:12,font:'Helvetica',color:'#000000',rect:[40,y-12,500,y+2],text:cells.map(c=>c[1]).join(' '),chars:cells.flatMap(([x,t])=>[...t].map((c,i)=>({c,x:x+i*6,right:x+(i+1)*6,y})))};}
test('Excel reconstructs tabular cells and protects identifiers and formula-like text',async()=>{
 const p={bounds:[0,0,595,842],lines:[line(60,[[40,'Artikel'],[220,'Menge'],[350,'Preis']]),line(85,[[40,'00123'],[220,'12'],[350,'9,95']]),line(110,[[40,'=HYPERLINK("evil")'],[220,'2'],[350,'99,00']])]};
 const t=tableFromPage(p);assert.deepEqual(t.rows[1].cells,['00123','12','9,95']);assert.throws(()=>tableFromPage(p,{columns:'350,180'}));
 const bytes=makeXlsx([p],{numbers:true});const x=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);assert.match(x,/00123/);assert.match(x,/<v>9.95<\/v>/);assert.doesNotMatch(x,/<f>/);await writeFile(out+'/table.xlsx',bytes);
});
test('OpenRouter sends only selected text with key, strict provider policy and no cookies',async()=>{
 const requests=[],response={ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'Translation'}}],usage:{cost:0.001}})};
 const result=await translateCloud({text:'Hallo',key:'test-key',model:'test/model',source:'de',target:'en'},async(u,o)=>{requests.push([u,o]);return response;});assert.equal(result.text,'Translation');assert.equal(result.cost,0.001);
 const [url,opts]=requests[0],body=JSON.parse(opts.body);assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.deepEqual(body.provider,{data_collection:'deny',zdr:true});assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(body.messages[1].content,'Hallo');assert.equal(opts.headers.Authorization,'Bearer test-key');assert.equal(body.tools,undefined);
});
test('Cloud cancellation, partial errors and truncated output cannot look complete',async()=>{
 const base={text:'A'.repeat(5500),key:'test',model:'model',source:'de',target:'en'};let n=0;
 await assert.rejects(translateCloud(base,async()=>++n===1?{ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'First'}}]})}:{ok:false,status:402}),e=>e.partial==='First'&&e.completed===1&&e.total===2);
 await assert.rejects(translateCloud({...base,text:'Hi'},async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'Partial'}}]})})),e=>e.partial===''&&/Token-Limit/.test(e.message));
 const c=new AbortController();c.abort();n=0;await assert.rejects(translateCloud({...base,signal:c.signal},async()=>n++));assert.equal(n,0);
 const unicode='你好🙂\n'.repeat(2500);assert.equal(splitTranslation(unicode).join(''),unicode);assert.ok(splitTranslation(unicode).every(p=>!/[\uD800-\uDBFF]$/.test(p)));
});
test('Browser signing bundle creates a signature independently verified by OpenSSL',async()=>{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-keyout',out+'/key.pem','-out',out+'/cert.pem','-days','2','-nodes','-subj','/CN=Folio Synthetic Test/O=QA'],{stdio:'ignore'});
 execFileSync('openssl',['pkcs12','-export','-inkey',out+'/key.pem','-in',out+'/cert.pem','-out',out+'/cert.p12','-passout','pass:folio-test'],{stdio:'ignore'});
 const p12=new Uint8Array(await readFile(out+'/cert.p12'));assert.throws(()=>inspectCertificate(p12,'wrong'));assert.match(inspectCertificate(p12,'folio-test').subject,/Folio Synthetic Test/);
 const bytes=await signPDF({pdf:fixture,p12,password:'folio-test',reason:'Test'});await writeFile(out+'/signed.pdf',bytes);const str=Buffer.from(bytes).toString('latin1');const range=str.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/).slice(1).map(Number);assert.equal(range[0],0);assert.equal(range[2]+range[3],bytes.length);
 const sigHex=str.slice(range[1]+1,range[2]-1);const der=Buffer.from(sigHex,'hex');await writeFile(out+'/signature.der',der);const content=Buffer.concat([bytes.slice(range[0],range[1]),bytes.slice(range[2],range[2]+range[3])]);await writeFile(out+'/signed-content.bin',content);
 execFileSync('openssl',['cms','-verify','-binary','-inform','DER','-in',out+'/signature.der','-content',out+'/signed-content.bin','-noverify','-out',out+'/verified.bin'],{stdio:'ignore'});
 content[50]^=1;await writeFile(out+'/tampered.bin',content);assert.throws(()=>execFileSync('openssl',['cms','-verify','-binary','-inform','DER','-in',out+'/signature.der','-content',out+'/tampered.bin','-noverify','-out',out+'/tampered-out.bin'],{stdio:'ignore'}));
 const e=new PDFEngine();e.open({bytes});assert.equal(e.info().signed,true);e.close();await assert.rejects(signPDF({pdf:bytes,p12,password:'folio-test'}),/bereits eine Signatur/);
});
