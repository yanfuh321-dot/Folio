import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFEngine} from '../dist/engine.js';
import {nativeAnchors,ocrAnchors,validateLayout,translatePDFPage} from '../dist/layout-translation.js';
const out=process.env.FOLIO_TEST_OUTPUT||'/tmp/folio-layout-tests';await mkdir(out,{recursive:true});
const fixture=new Uint8Array(await readFile(new URL('./fixture.pdf',import.meta.url)));
const block={id:'t0',source:'证书',translation:'Certificate',box:[100,100,400,160],target_box:[100,100,600,180],font_size:18,align:'center',color:'#222222',action:'translate'};
test('Native PDF request includes only a visual single-page PDF, strict JSON and selected provider policy',async()=>{
 const e=new PDFEngine();e.open({bytes:fixture});try{const p=e.translationPage({index:0});let called=0;
 const result=await translatePDFPage({...p,key:'test-key',model:'test/pdf',anchors:[],source:'zh',target:'en'},async(url,options)=>{called++;assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.plugins[0].pdf.engine,'native');assert.equal(body.response_format.type,'json_schema');assert.equal(body.provider.zdr,true);assert.equal(body.provider.data_collection,'deny');assert.equal(body.provider.require_parameters,true);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');const file=body.messages[1].content.find(c=>c.type==='file');assert.equal(file.file.filename,'document-page.pdf');const bytes=new Uint8Array(Buffer.from(file.file.file_data.split(',')[1],'base64'));const fresh=new PDFEngine();fresh.open({bytes});assert.equal(fresh.info().count,1);assert.equal(fresh.text({})[0].text.trim(),'');assert.equal(fresh.render({index:0}).fields.length,0);assert.equal(fresh.info().author,'');fresh.close();return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({blocks:[block],warnings:[]})}}],usage:{cost:0.02}})};});assert.equal(called,1);assert.equal(result.blocks[0].text,'Certificate');assert.equal(result.cost,.02);
 }finally{e.close();}
});
test('Layout validates bounds, IDs and incomplete responses; known OCR coordinates stay authoritative',()=>{
 const context={width:600,height:800,anchors:[{id:'t0',source:'证书',box:[90,90,400,160]},{id:'t1',source:'编号',box:[100,250,300,300]}]};
 const r=validateLayout({blocks:[block],warnings:[]},context);assert.deepEqual(r.blocks[0].sourceRect,[54,72,240,128]);assert.equal(r.blocks[1].enabled,false);assert.match(r.warnings[0],/nicht zugeordnet/);
 for(const bad of [{...block,target_box:[0,0,2000,300]}, {...block,translation:''}])assert.throws(()=>validateLayout({blocks:[bad],warnings:[]},context));assert.throws(()=>validateLayout({blocks:[block,block],warnings:[]},context));
 const anchors=ocrAnchors({blocks:[{paragraphs:[{text:'中文',bbox:{x0:100,y0:200,x1:700,y1:250}}]}]},1000,2000);assert.deepEqual(anchors[0].box,[100,100,700,125]);
});
test('Truncated, malformed and failed cloud responses never produce a seemingly complete layout',async()=>{
 const args={pdf:new Uint8Array([1]),width:600,height:800,key:'test',model:'test/pdf'};
 await assert.rejects(translatePDFPage(args,async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'{}'}}]})})),/abgeschnitten/);
 await assert.rejects(translatePDFPage(args,async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'not json'}}]})})),/gültiges Layout/);
 await assert.rejects(translatePDFPage(args,async()=>({ok:false,status:400})),/native PDFs/);
 const abort=new AbortController();abort.abort();let calls=0;await assert.rejects(translatePDFPage({...args,signal:abort.signal},async()=>{calls++;}));assert.equal(calls,0);
});
test('Scanned Chinese certificate becomes a labelled English PDF while original stays intact',async()=>{
 const e=new PDFEngine();e.newDocument();const source=[
 {source:'质量认证证书',text:'QUALITY CERTIFICATE',rect:[100,70,500,125],size:24,align:'center'},
 {source:'认证编号：CN-2026-0088',text:'Certificate No.: CN-2026-0088',rect:[65,180,520,225],size:16,align:'left'},
 {source:'企业名称：示例制造有限公司',text:'Company: Example Manufacturing Co., Ltd.',rect:[65,260,520,305],size:16,align:'left'},
 {source:'产品：电动工具',text:'Product: Power tools',rect:[65,340,520,380],size:16,align:'left'},
 {source:'有效期：2026年01月01日至2029年01月01日',text:'Valid from 1 January 2026 to 1 January 2029',rect:[65,430,520,495],size:14,align:'left'}];
 try{e.annotate({index:0,kind:'rect',rect:[30,30,565,800],color:'#21414a',width:2});for(const b of source)e.annotate({index:0,kind:'text',text:b.source,rect:b.rect,size:b.size,color:'#21414a',family:'Helvetica'});e.annotate({index:0,kind:'ellipse',rect:[410,640,510,740],color:'#bd3030',width:3});e.annotate({index:0,kind:'text',text:'示例印章',rect:[422,680,505,710],size:14,color:'#bd3030',family:'Helvetica',fit:true});
 const scan=e.export({raster:true,dpi:144,quality:95});e.open({bytes:scan});assert.equal(e.text({})[0].text.trim(),'');const p=e.translationPage({index:0});assert.equal(nativeAnchors(p.layout).length,0);
 const blocks=source.map((b,i)=>({id:'b'+i,source:b.source,text:b.text,sourceRect:b.rect,rect:b.rect,size:b.size,color:'#21414a',align:b.align,background:'auto',enabled:true}));const result=e.translatedDocument({pages:[{...p,blocks}],target:'en',preview:true});assert.ok(result.image.length>1000);assert.equal(result.issues.filter(x=>x.severity==='error').length,0);assert.equal(e.text({})[0].text.trim(),'');
 const fresh=new PDFEngine();fresh.open({bytes:result.bytes});const text=fresh.text({})[0].text;assert.match(text,/QUALITY CERTIFICATE/);assert.match(text,/CN-2026-0088/);assert.match(text,/Not the original certificate/);assert.deepEqual(fresh.render({index:0}).bounds,[0,0,595,866]);fresh.close();await writeFile(out+'/certificate-original.png',p.image);await writeFile(out+'/certificate-translated.png',result.image);await writeFile(out+'/certificate-translated.pdf',result.bytes);
 const failed=e.translatedDocument({pages:[{...p,blocks:[{...blocks[0],rect:[50,50,70,60],text:'Does not fit '.repeat(30)}]}],preview:true});assert.equal(failed.issues.filter(x=>x.severity==='error').length,1);assert.ok(failed.image.length>1000);
 const preserved=e.translatedDocument({pages:[{...p,blocks:[{...blocks[0],enabled:false}]}]});const f=new PDFEngine();f.open({bytes:preserved.bytes});assert.doesNotMatch(f.text({})[0].text,/QUALITY CERTIFICATE/);f.close();
 }finally{e.close();}
});
