import './network-guard.js';
import {PDFEngine} from './engine.js';
const engine = new PDFEngine();
self.onmessage = async ({data:{id,method,args}}) => {
  try {
    if(typeof engine[method]!=='function'||method==='constructor')throw Error('Unbekannte Aktion');
    const result=await engine[method](args);
    const transfers=[];
    if(result instanceof Uint8Array)transfers.push(result.buffer);
    else if(result?.bytes instanceof Uint8Array)transfers.push(result.bytes.buffer);
    self.postMessage({id,result},transfers);
  } catch(e){self.postMessage({id,error:e.message||String(e)});}
};
self.postMessage({ready:true});
