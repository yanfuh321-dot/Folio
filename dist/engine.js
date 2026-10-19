import * as mupdf from './vendor/mupdf/mupdf.js';

// The only PDF engine boundary. This module never opens a URL or writes to storage.
export function parsePages(value, count) {
  if (!value?.trim()) return Array.from({length: count}, (_, i) => i);
  const result = [];
  for (const part of value.split(',')) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw Error('Seiten als 1, 3-5 eingeben.');
    const a = +m[1], b = +(m[2] || m[1]);
    if (a < 1 || b < a || b > count) throw Error(`Seiten müssen zwischen 1 und ${count} liegen.`);
    for (let n = a; n <= b; n++) if (!result.includes(n - 1)) result.push(n - 1);
  }
  return result;
}
const copyBuffer = b => { const out = b.asUint8Array().slice(); b.destroy(); return out; };
// Never renumber objects in the active editing document: its font/resource caches
// and undo journal may still reference the old object numbers. Compact exports only.
const saveBytes = (d, options = 'compress,encrypt=none') => copyBuffer(d.saveToBuffer(options));
const hexColor = hex => [1,3,5].map(i => parseInt((hex || '#252435').slice(i, i + 2), 16) / 255);
const allPages = d => Array.from({length:d.countPages()},(_,i)=>i);

function textLayout(text, rect, wantedSize = 14, family = 'Helvetica', fit = false) {
  const latin = new mupdf.Font(family), cjk = new mupdf.Font('zh-Hans');
  const fontFor = c => latin.encodeCharacter(c.codePointAt(0)) ? latin : cjk;
  const width = (c, size) => {const f=fontFor(c); return f.advanceGlyph(f.encodeCharacter(c.codePointAt(0))) * size;};
  const linesAt = size => {
    const lines = []; let line='', w=0;
    for (const c of text.replace(/\r/g,'').replace(/\t/g,'    ')) {
      if(c==='\n') {lines.push(line); line='';w=0;continue;}
      const cw=width(c,size);
      if(w+cw > rect[2]-rect[0]-4 && line) {
        const pos=line.lastIndexOf(' ');
        if(pos>line.length/2 && c!==' ') { const tail=line.slice(pos+1); lines.push(line.slice(0,pos));line=tail;w=[...tail].reduce((a,c)=>a+width(c,size),0); }
        else {lines.push(line);line='';w=0;}
      }
      line+=c;w+=cw;
    }
    lines.push(line); return lines;
  };
  let size=wantedSize, lines=linesAt(size);
  while(fit && lines.length*size*1.25 > rect[3]-rect[1]-2 && size>6){size-=0.5;lines=linesAt(size);}
  if(lines.length*size*1.25 > rect[3]-rect[1]+1){latin.destroy();cjk.destroy();throw Error('Der Text passt nicht in den Bereich. Größeren Rahmen oder kleinere Schrift wählen.');}
  return {size,lines,fontFor,destroy(){latin.destroy();cjk.destroy();}};
}
function placeText(page, text, rect, size=14, color='#252435', family='Helvetica', fit=false, opacity=1) {
  const l=textLayout(text,rect,size,family,fit);
  const list=new mupdf.DisplayList(rect), dev=new mupdf.DisplayListDevice(list);
  try {
    l.lines.forEach((line,i)=>{
      let x=rect[0]+2;const y=rect[1]+l.size+i*l.size*1.25;
      const t=new mupdf.Text();
      for(const c of line){const f=l.fontFor(c);const g=f.encodeCharacter(c.codePointAt(0));t.showGlyph(f,[l.size,0,0,-l.size,x,y],g,c.codePointAt(0));x+=f.advanceGlyph(g)*l.size;}
      dev.fillText(t,mupdf.Matrix.identity,mupdf.ColorSpace.DeviceRGB,hexColor(color),1);t.destroy();
    });
    dev.close();
    const a=page.createAnnotation('FreeText');
    a.setRect(rect);a.setContents(text);a.setDefaultAppearance('Helv',l.size,hexColor(color));a.setBorderWidth(0);a.setFlags(4);a.setOpacity(opacity);a.update();
    a.setAppearanceFromDisplayList('N',null,mupdf.Matrix.identity,list);
    return a;
  }finally{l.destroy();dev.destroy();list.destroy();}
}
function makeImagePage(d, bytes, width, height) {
  const img=new mupdf.Image(bytes), ref=d.addImage(img);
  const obj=d.addPage([0,0,width,height],0,{XObject:{Im:ref}},`q ${width} 0 0 ${height} 0 0 cm /Im Do Q`);
  d.insertPage(-1,obj);obj.destroy();ref.destroy();img.destroy();
}
export class PDFEngine {
  doc=null; redacted=false;
  close(){this.doc?.destroy();this.doc=null;this.redacted=false;mupdf.emptyStore();return true;}
  open({bytes,password=''}){
    const d=new mupdf.PDFDocument(bytes);
    if(d.needsPassword()&&!d.authenticatePassword(password)){d.destroy();throw Error('PASSWORD_REQUIRED');}
    if(d.countPages()<1){d.destroy();throw Error('Dieses PDF hat keine Seiten.');}
    this.close();this.doc=d;d.disableJS();d.enableJournal();return this.info();
  }
  newDocument(){this.close();this.doc=new mupdf.PDFDocument();this.doc.insertPage(-1,this.doc.addPage([0,0,595,842],0,{},''));this.doc.enableJournal();return this.info();}
  info(){
    const d=this.doc;if(!d)throw Error('Bitte zuerst eine PDF öffnen.');
    return {count:d.countPages(),undo:d.canUndo(),redo:d.canRedo(),redacted:this.redacted,title:d.getMetaData('info:Title')||'',author:d.getMetaData('info:Author')||'',subject:d.getMetaData('info:Subject')||'',outline:d.loadOutline()||[],encrypted:d.getMetaData('encryption')||''};
  }
  transaction(label, fn){
    if(!this.doc)throw Error('Bitte zuerst eine PDF öffnen.');
    this.doc.beginOperation(label);
    try{fn();this.doc.endOperation();}catch(e){this.doc.abandonOperation();throw e;}
    return this.info();
  }
  withPage(index,fn){const p=this.doc.loadPage(index);try{return fn(p);}finally{p.destroy();}}
  render({index,scale=1.3,details=true,format='png',quality=80}){
    return this.withPage(index,p=>{
      const bounds=p.getBounds();const w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];
      scale=Math.min(scale,5000/Math.max(w,h),Math.sqrt(12000000/(w*h)));
      const pix=p.toPixmap(mupdf.Matrix.scale(scale,scale),mupdf.ColorSpace.DeviceRGB,false,true);
      const bytes=(format==='jpg'?pix.asJPEG(quality):pix.asPNG()).slice();
      const result={bytes,bounds,width:pix.getWidth(),height:pix.getHeight(),lines:[],annotations:[],fields:[]};pix.destroy();
      if(details){
        const st=p.toStructuredText('');let line;
        st.walk({beginLine(bbox,wmode,dir){line={rect:bbox,text:'',size:12,horizontal:Math.abs(dir[1])<0.05};},onChar(c,origin,font,size){line.text+=c;line.size=size;},endLine(){if(line.text.trim())result.lines.push(line);}});st.destroy();
        result.annotations=p.getAnnotations().map((a,i)=>({index:i,type:a.getType(),rect:a.getBounds(),text:a.getContents()}));
        result.fields=p.getWidgets().map((a,i)=>({index:i,type:a.getFieldType(),rect:a.getBounds(),label:a.getLabel()||a.getName()||`Feld ${i+1}`,value:a.getValue(),readOnly:a.isReadOnly(),options:a.isChoice()?a.getOptions():[],checkbox:a.isCheckbox(),radio:a.isRadioButton(),multiline:a.isMultiline()}));
      }return result;
    });
  }
  text({pages}){return (pages||allPages(this.doc)).map(i=>this.withPage(i,p=>{const list=p.toDisplayList(true);const t=list.toStructuredText('');const text=t.asText();t.destroy();list.destroy();return {page:i+1,text};}));}
  search({needle}){const hits=[];for(let i=0;i<this.doc.countPages();i++)this.withPage(i,p=>{for(const quads of p.search(needle))hits.push({page:i,quads});});return hits;}
  annotate(a){return this.transaction('Anmerkung',()=>this.withPage(a.index,p=>{
    if(a.kind==='text'){placeText(p,a.text,a.rect,a.size,a.color,a.family,a.fit);return;}
    if(a.kind==='replace'){
      const l=textLayout(a.text,a.rect,a.size,a.family,true);l.destroy();
      const r=p.createAnnotation('Redact');r.setRect(a.rect);r.update();
      p.applyRedactions(false,mupdf.PDFPage.REDACT_IMAGE_PIXELS,mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,0);
      placeText(p,a.text,a.rect,a.size,a.color,a.family,true);return;
    }
    if(a.kind==='crop'){p.setPageBox('CropBox',a.rect);return;}
    if(a.kind==='image'){
      const im=new mupdf.Image(a.bytes),an=p.createAnnotation('Stamp');an.setRect(a.rect);an.setStampImage(im);an.setFlags(4);an.update();im.destroy();return;
    }
    const types={highlight:'Highlight',underline:'Underline',strike:'StrikeOut',rect:'Square',ellipse:'Circle',draw:'Ink',redact:'Redact',note:'Text',arrow:'Line'};
    const an=p.createAnnotation(types[a.kind]);an.setFlags(4);an.setColor(hexColor(a.color));
    if(a.kind==='draw'){an.setInkList([a.points]);an.setBorderWidth(a.width||2);}
    else if(['highlight','underline','strike'].includes(a.kind)){const r=a.rect;an.setQuadPoints([[r[0],r[1],r[2],r[1],r[0],r[3],r[2],r[3]]]);an.setOpacity(a.kind==='highlight'?0.45:1);}
    else if(a.kind==='arrow'){an.setLine(a.points[0],a.points[1]);an.setLineEndingStyles('None','ClosedArrow');an.setBorderWidth(a.width||2);}
    else {an.setRect(a.rect);if(a.kind==='note'){an.setContents(a.text);an.setIcon('Comment');}else if(a.kind!=='redact')an.setBorderWidth(a.width||2);}
    an.update();
    if(a.kind==='redact'){p.applyRedactions(true,2,2,0);this.redacted=true;}
  }));}
  deleteAnnotation({index,annotation}){return this.transaction('Anmerkung entfernen',()=>this.withPage(index,p=>p.deleteAnnotation(p.getAnnotations()[annotation])));}
  form({index,field,value}){return this.transaction('Formular ausfüllen',()=>this.withPage(index,p=>{const w=p.getWidgets()[field];if(w.isReadOnly())throw Error('Dieses Feld ist schreibgeschützt.');if(w.isCheckbox()||w.isRadioButton())w.toggle();else if(w.isText()){if(!w.setTextValue(value))throw Error('Feldwert wurde abgelehnt.');}else if(w.isChoice()){if(!w.setChoiceValue(value))throw Error('Feldwert wurde abgelehnt.');}else throw Error('Dieser Feldtyp wird nicht unterstützt.');w.update();p.update();}));}
  pages({action,index,to,pages}){return this.transaction('Seiten bearbeiten',()=>{
    const d=this.doc;
    if(action==='rotate')for(const i of pages||[index]){const p=d.findPage(i);p.put('Rotate',((p.getInheritable('Rotate').asNumber()||0)+90)%360);}
    else if(action==='delete'){const list=pages||[index];if(list.length>=d.countPages())throw Error('Mindestens eine Seite muss bleiben.');for(const i of [...list].sort((a,b)=>b-a))d.deletePage(i);}
    else if(action==='blank'){const p=d.addPage([0,0,595,842],0,{},'');d.insertPage(index+1,p);p.destroy();}
    else if(action==='duplicate'){const order=allPages(d);order.splice(index+1,0,index);d.rearrangePages(order);}
    else if(action==='move'){const order=allPages(d);order.splice(to,0,order.splice(index,1)[0]);d.rearrangePages(order);}
    else if(action==='order'){if(pages.length!==d.countPages()||new Set(pages).size!==pages.length)throw Error('Jede Seite genau einmal angeben.');d.rearrangePages(pages);}
  });}
  merge({bytes,password=''}){
    const src=new mupdf.PDFDocument(bytes);
    try{
      if(src.needsPassword()&&!src.authenticatePassword(password))throw Error('PASSWORD_REQUIRED');
      // Bake the imported copy to preserve the visual appearance of forms/annotations.
      src.disableJS();src.bake(true,true);
      return this.transaction('PDF anhängen',()=>{const graft=this.doc.newGraftMap();try{for(let i=0;i<src.countPages();i++)graft.graftPage(-1,src,i);}finally{graft.destroy();}});
    }finally{src.destroy();}
  }
  images({images}){return this.transaction('Bildseiten hinzufügen',()=>{for(const image of images){const im=new mupdf.Image(image.bytes);const w=im.getWidth(),h=im.getHeight();im.destroy();const scale=Math.min(595/w,842/h);makeImagePage(this.doc,image.bytes,w*scale,h*scale);}});}
  stamp({text,kind,range}){return this.transaction(kind==='numbers'?'Seitennummern':'Wasserzeichen',()=>{for(const i of parsePages(range,this.doc.countPages()))this.withPage(i,p=>{const b=p.getBounds(),w=b[2],h=b[3];if(kind==='numbers')placeText(p,`${text||''}${i+1} / ${this.doc.countPages()}`,[w/2-70,h-36,w/2+100,h-12],10,'#666666','Helvetica',true);else placeText(p,text,[35,h/2-30,w-35,h/2+50],36,'#777777','Helvetica',true,0.2);});});}
  metadata({title,author,subject,clear}){return this.transaction('Dokumentinformationen',()=>{if(clear){this.doc.getTrailer().delete('Info');this.doc.getTrailer().get('Root').delete('Metadata');}else for(const [k,v] of Object.entries({Title:title,Author:author,Subject:subject}))this.doc.setMetaData('info:'+k,v||'');});}
  undo(){this.doc.undo();return this.info();} redo(){this.doc.redo();return this.info();}
  export({range='',password='',flatten=false,raster=false,dpi=144,quality=85,clearMetadata=false}={}){
    if(password && (password.includes(',')||/[\x00-\x1f]/.test(password)||new TextEncoder().encode(password).length>100))throw Error('Passwort: keine Kommas oder Steuerzeichen, maximal 100 UTF-8-Bytes.');
    const indices=parsePages(range,this.doc.countPages());
    let d;
    if(raster){
      d=new mupdf.PDFDocument();for(const i of indices){const img=this.render({index:i,scale:dpi/72,details:false,format:'jpg',quality});makeImagePage(d,img.bytes,img.bounds[2]-img.bounds[0],img.bounds[3]-img.bounds[1]);}
    }else{d=new mupdf.PDFDocument(saveBytes(this.doc));if(range.trim())d.rearrangePages(indices);if(flatten)d.bake(true,true);}
    try{
      if(clearMetadata){d.getTrailer().delete('Info');d.getTrailer().get('Root').delete('Metadata');}
      const options='compress,compress-fonts,compress-images,garbage=4'+(password?`,encrypt=aes-256,user-password=${password},owner-password=${password}`:',encrypt=none');
      return saveBytes(d,options);
    }finally{d.destroy();}
  }
  textPDF({text,title='Textausgabe'}){
    const d=new mupdf.PDFDocument();
    try{
      const rect=[45,58,550,790];const l=textLayout(text,[45,58,550,10000000],11,'Helvetica',false);
      const perPage=50;
      for(let start=0;start<l.lines.length;start+=perPage){d.insertPage(-1,d.addPage([0,0,595,842],0,{},''));const p=d.loadPage(d.countPages()-1);placeText(p,l.lines.slice(start,start+perPage).join('\n'),rect,11);placeText(p,`${d.countPages()}`,[280,810,320,835],9,'#777777');p.destroy();}
      l.destroy();d.setMetaData('info:Title',title);d.bake(true,true);return saveBytes(d);
    }finally{d.destroy();}
  }
}
