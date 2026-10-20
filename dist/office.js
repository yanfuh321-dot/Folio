import {zipSync,strToU8} from './vendor/fflate/fflate.js';
const xml=s=>String(s??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relns='http://schemas.openxmlformats.org/package/2006/relationships';
const officens='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const pack=files=>zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,typeof v==='string'?strToU8(declaration+v):v])),{level:6});
const types=(overrides)=>`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${overrides.map(([p,t])=>`<Override PartName="/${p}" ContentType="application/vnd.openxmlformats-officedocument.${t}+xml"/>`).join('')}</Types>`;
const relations=items=>`<Relationships xmlns="${relns}">${items.map(([id,type,target])=>`<Relationship Id="${id}" Type="${officens}/${type}" Target="${xml(target)}"/>`).join('')}</Relationships>`;
const twip=n=>Math.round(n*20),emu=n=>Math.round(n*12700);
export function makeDocx(pages,{visual=false}={}){
  if(!pages.length)throw Error('Keine Seiten für Word ausgewählt.');
  const files={},rels=[],body=[];
  pages.forEach((p,i)=>{
    const [x,y,x2,y2]=p.bounds,w=x2-x,h=y2-y;
    if(w>1584||h>1584)throw Error('Word unterstützt in diesem Export Seiten bis 55,8 cm Kantenlänge.');
    const shapes=[];
    if(p.image){files[`word/media/page${i+1}.png`]=p.image;rels.push([`rId${i+1}`,'image',`media/page${i+1}.png`]);shapes.push(`<w:r><w:pict><v:shape id="Background${i}" type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:${w}pt;height:${h}pt;z-index:-251654144;mso-position-horizontal-relative:page;mso-position-vertical-relative:page" stroked="f"><v:imagedata r:id="rId${i+1}" o:title="Seite ${i+1}"/></v:shape></w:pict></w:r>`);}
    if(!visual)for(const [j,l] of p.lines.filter(l=>l.horizontal).entries()){
      const left=l.rect[0]-x,top=l.rect[1]-y,width=Math.max(1,l.rect[2]-l.rect[0]+3),height=Math.max(l.size*1.6,l.rect[3]-l.rect[1]+3);
      const font=l.font.replace(/^[A-Z]{6}\+/,'').replace(/[-,](Bold|Italic|Regular|Oblique).*/i,'');
      shapes.push(`<w:r><w:pict><v:rect id="Text${i}_${j}" style="position:absolute;margin-left:${left}pt;margin-top:${top}pt;width:${width}pt;height:${height}pt;z-index:${j+1};mso-position-horizontal-relative:page;mso-position-vertical-relative:page" filled="f" stroked="f"><v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:t"><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${twip(l.size*1.15)}" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${xml(font||'Arial')}" w:hAnsi="${xml(font||'Arial')}" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${Math.round(l.size*2)}"/><w:szCs w:val="${Math.round(l.size*2)}"/><w:color w:val="${l.color.slice(1)}"/>${/bold/i.test(l.font)?'<w:b/>':''}${/italic|oblique/i.test(l.font)?'<w:i/>':''}</w:rPr><w:t xml:space="preserve">${xml(l.text)}</w:t></w:r></w:p></w:txbxContent></v:textbox></v:rect></w:pict></w:r>`);
    }
    const section=`<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${twip(w)}" w:h="${twip(h)}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
    body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${i<pages.length-1?section:''}</w:pPr>${shapes.join('')}</w:p>${i===pages.length-1?section:''}`);
  });
  files['[Content_Types].xml']=types([['word/document.xml','wordprocessingml.document.main']]);
  files['_rels/.rels']=relations([['rId1','officeDocument','word/document.xml']]);
  files['word/_rels/document.xml.rels']=relations(rels);
  files['word/document.xml']=`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${officens}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><w:body><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr><w:r><w:pict><v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/></v:shapetype></w:pict></w:r></w:p>${body.join('')}</w:body></w:document>`;
  return pack(files);
}
const colName=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export function tableFromPage(p,{columns='',region=null}={}){
  const spans=[];
  for(const l of p.lines.filter(l=>l.horizontal)){
    let text='',start=null,last=null;
    const flush=()=>{if(text.trim())spans.push({text:text.trim(),x:start,y:l.chars[0]?.y||l.rect[1],size:l.size,right:last});text='';start=null;last=null;};
    for(const c of l.chars){if(region&&(c.x<region[0]||c.right>region[2]||c.y<region[1]||c.y>region[3])){flush();continue;}
      if(last!==null&&c.x-last>Math.max(5,l.size*.75))flush();
      if(start===null)start=c.x;text+=c.c;last=c.right;
    }flush();
  }
  spans.sort((a,b)=>a.y-b.y||a.x-b.x);const rows=[];
  for(const span of spans){let row=rows.find(r=>Math.abs(r.y-span.y)<Math.max(2,span.size*.3));if(!row){row={y:span.y,cells:[],height:span.size*1.5};rows.push(row);}row.cells.push(span);row.height=Math.max(row.height,span.size*1.5);}
  let cuts;
  if(columns.trim()){cuts=columns.split(',').map(Number);if(cuts.some(n=>!Number.isFinite(n)||n<=p.bounds[0]||n>=p.bounds[2])||cuts.some((n,i)=>i&&n<=cuts[i-1]))throw Error('Spaltengrenzen aufsteigend in PDF-Punkten eingeben, z. B. 180,350.');}
  else{
    // Use rows with the most cells as a stable column template. No inferred formulas.
    const template=[...rows].sort((a,b)=>b.cells.length-a.cells.length)[0];const starts=(template?.cells||[]).map(c=>c.x).sort((a,b)=>a-b);cuts=starts.slice(1).map(x=>x-3);
  }
  if(cuts.length>100)throw Error('Zu viele erkannte Spalten. Bitte einen Tabellenbereich auswählen.');
  return {cuts,rows:rows.map(row=>{const cells=Array.from({length:cuts.length+1},()=> '');for(const span of row.cells.sort((a,b)=>a.x-b.x)){let c=cuts.findIndex(x=>span.x<x);if(c<0)c=cuts.length;cells[c]+=(cells[c]?' ':'')+span.text;}return {...row,cells};})};
}
export function makeXlsx(pages,{visual=false,columns='',region=null,numbers=false}={}){
  if(!pages.length)throw Error('Keine Seiten für Excel ausgewählt.');const files={},overrides=[['xl/workbook.xml','spreadsheetml.sheet.main'],['xl/styles.xml','spreadsheetml.styles']],bookRels=[],sheets=[];
  for(const [i,p] of pages.entries()){
    const n=i+1,[x,y,x2,y2]=p.bounds,w=x2-x,h=y2-y;
    let content='',drawing='';
    if(visual){
      files[`xl/media/page${n}.png`]=p.image;
      overrides.push([`xl/drawings/drawing${n}.xml`,'drawing']);
      files[`xl/drawings/_rels/drawing${n}.xml.rels`]=relations([['rId1','image',`../media/page${n}.png`]]);
      files[`xl/drawings/drawing${n}.xml`]=`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officens}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${emu(w)}" cy="${emu(h)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${n}" name="PDF-Seite ${n}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
      files[`xl/worksheets/_rels/sheet${n}.xml.rels`]=relations([['rId1','drawing',`../drawings/drawing${n}.xml`]]);drawing='<drawing r:id="rId1"/>';content='<sheetData/>';
    }else{
      const table=tableFromPage(p,{columns,region});const edges=[region?.[0]??x,...table.cuts,region?.[2]??x2];
      content=`<cols>${edges.slice(0,-1).map((v,c)=>`<col min="${c+1}" max="${c+1}" width="${Math.max(4,Math.min(100,(edges[c+1]-v)/5.25)).toFixed(2)}" customWidth="1"/>`).join('')}</cols><sheetData>${table.rows.map((r,k)=>`<row r="${k+1}" ht="${Math.min(409,Math.max(15,r.height)).toFixed(1)}" customHeight="1">${r.cells.map((v,c)=>{
        const isNumber=numbers&&/^-?(?:0|[1-9]\d{0,14})(?:,\d{1,8})?$/.test(v);return isNumber?`<c r="${colName(c)}${k+1}" s="1"><v>${v.replace(',','.')}</v></c>`:`<c r="${colName(c)}${k+1}" s="1" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      }).join('')}</row>`).join('')}</sheetData>`;
    }
    overrides.push([`xl/worksheets/sheet${n}.xml`,'spreadsheetml.worksheet']);bookRels.push([`rId${n}`,'worksheet',`worksheets/sheet${n}.xml`]);sheets.push(`<sheet name="Seite ${p.page||n}" sheetId="${n}" r:id="rId${n}"/>`);
    files[`xl/worksheets/sheet${n}.xml`]=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officens}"><sheetViews><sheetView workbookViewId="0" showGridLines="${visual?0:1}"/></sheetViews>${content}<pageMargins left="0.25" right="0.25" top="0.25" bottom="0.25" header="0" footer="0"/><pageSetup orientation="${w>h?'landscape':'portrait'}" fitToWidth="1" fitToHeight="1"/>${drawing}</worksheet>`;
  }
  bookRels.push(['rIdStyles','styles','styles.xml']);files['[Content_Types].xml']=types(overrides);files['_rels/.rels']=relations([['rId1','officeDocument','xl/workbook.xml']]);files['xl/_rels/workbook.xml.rels']=relations(bookRels);
  files['xl/workbook.xml']=`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officens}"><sheets>${sheets.join('')}</sheets></workbook>`;
  files['xl/styles.xml']='<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return pack(files);
}
