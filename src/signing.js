import {Buffer} from 'buffer';
import forge from 'node-forge';
import {PDFDocument,PDFName,PDFDict} from 'pdf-lib';
import {pdflibAddPlaceholder} from '@signpdf/placeholder-pdf-lib';
import {P12Signer} from '@signpdf/signer-p12';
import {SignPdf} from '@signpdf/signpdf';
// Use the browser's cryptographic random source for RSA blinding. Never entropy heuristics.
function secureBytes(count){if(!globalThis.crypto?.getRandomValues)throw Error('Sichere Zufallsquelle fehlt. Bitte HTTPS oder localhost verwenden.');let out='';for(let n=0;n<count;n+=65536){const a=new Uint8Array(Math.min(65536,count-n));globalThis.crypto.getRandomValues(a);for(const byte of a)out+=String.fromCharCode(byte);}return out;}
forge.random.getBytesSync=secureBytes;
forge.random.getBytes=(count,callback)=>{try{const bytes=secureBytes(count);if(callback){callback(null,bytes);return;}return bytes;}catch(e){if(callback){callback(e);return;}throw e;}};
export function inspectCertificate(bytes,password='') {
  let p12;
  try {p12=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(Buffer.from(bytes).toString('binary')),false,password);}
  catch {throw Error('Zertifikat nicht lesbar. Prüfe Datei und Passwort (RSA, PKCS#12 / P12 / PFX).');}
  const keys=p12.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[];
  const certs=p12.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[];
  if(keys.length!==1||!keys[0].key?.n)throw Error('Benötigt wird genau ein verschlüsselter RSA-Privatschlüssel im P12/PFX. EC-Schlüssel werden nicht unterstützt.');
  const key=keys[0].key,cert=certs.find(x=>x.cert?.publicKey?.n?.equals(key.n)&&x.cert.publicKey.e.equals(key.e))?.cert;
  if(!cert)throw Error('Kein passendes RSA-Zertifikat zum privaten Schlüssel gefunden.');
  const now=new Date();if(now<cert.validity.notBefore||now>cert.validity.notAfter)throw Error('Das Zertifikat ist noch nicht oder nicht mehr gültig.');
  const usage=cert.getExtension('keyUsage');if(usage&&!usage.digitalSignature&&!usage.nonRepudiation)throw Error('Dieses Zertifikat erlaubt keine digitale Signatur.');
  const name=x=>x.attributes.map(a=>`${a.shortName||a.name}: ${a.value}`).join(', ');
  return {subject:name(cert.subject),name:cert.subject.getField('CN')?.value||'Unterzeichner',issuer:name(cert.issuer),validFrom:cert.validity.notBefore.toISOString(),validTo:cert.validity.notAfter.toISOString(),fingerprint:forge.md.sha256.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex().match(/../g).join(':')};
}
export async function signPDF({pdf,p12,password='',reason='',location='',name=''}) {
  const cert=inspectCertificate(p12,password);
  const doc=await PDFDocument.load(pdf,{updateMetadata:false});
  for(const [,obj] of doc.context.enumerateIndirectObjects())if(obj instanceof PDFDict&&(obj.has(PDFName.of('ByteRange'))||obj.get(PDFName.of('Type'))===PDFName.of('Sig')))throw Error('Diese PDF enthält bereits eine Signatur. Mehrfachsignaturen werden nicht unterstützt.');
  // PDFString metadata in the upstream placeholder is single-byte: use ASCII only.
  const ascii=t=>t.normalize('NFKD').replace(/[^\x20-\x7e]/g,'').slice(0,180);
  pdflibAddPlaceholder({pdfDoc:doc,reason:ascii(reason),contactInfo:'',name:ascii(name||cert.name),location:ascii(location),signatureLength:32768,appName:'Folio'});
  const signer=new P12Signer(Buffer.from(p12),{passphrase:password});
  try {return new Uint8Array(await new SignPdf().sign(Buffer.from(await doc.save({useObjectStreams:false})),signer));}
  finally {signer.options.passphrase='';signer.cert.clear();}
}
