import {build} from 'esbuild';
import {readFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const result=await build({entryPoints:['src/signing.js'],outfile:'dist/vendor/signing.js',bundle:true,format:'esm',platform:'browser',target:'es2022',inject:['src/buffer-shim.js'],define:{'process.env.NODE_ENV':'"production"'},minify:true,legalComments:'eof',metafile:true});
const packages=new Set();
for(const input of Object.keys(result.metafile.inputs).filter(p=>p.includes('node_modules/'))){let dir=dirname(resolve(input));while(dir!==dirname(dir)){try{const pkg=JSON.parse(await readFile(resolve(dir,'package.json'),'utf8'));if(pkg.name){const key=pkg.name+'@'+pkg.version;if(!packages.has(key)){packages.add(key);const dest=resolve('dist/licenses/signing',pkg.name.replace('/','-'));await mkdir(dest,{recursive:true});for(const f of await readdir(dir))if(/^(license|licence|copying|notice)/i.test(f))await copyFile(resolve(dir,f),resolve(dest,f));}break;}}catch{}dir=dirname(dir);}}
console.log('Local signing bundle with license notices: '+[...packages].sort().join(', '));
