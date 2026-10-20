import './network-guard.js';
import {inspectCertificate,signPDF} from './vendor/signing.js';
let secret=null;
self.onmessage=async({data})=>{try{
  if(data.type==='inspect'){secret={p12:data.p12,password:data.password};const result=inspectCertificate(secret.p12,secret.password);self.postMessage({id:data.id,result});}
  else if(data.type==='sign'&&secret){const result=await signPDF({...data,...secret});self.postMessage({id:data.id,result},[result.buffer]);secret.p12.fill(0);secret=null;}
  else throw Error('Bitte zuerst ein Zertifikat auswählen.');
}catch(e){if(secret){secret.p12.fill(0);secret=null;}self.postMessage({id:data.id,error:e.message});}};
