import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const common={bundle:true,platform:'node',target:'node22',sourcemap:false,legalComments:'eof'};
await build({...common,entryPoints:['src/cli.ts'],outfile:'dist/cli.mjs',format:'esm',banner:{js:'#!/usr/bin/env node'}});
const core=await build({...common,entryPoints:['src/core.ts'],outfile:'dist/core.mjs',format:'esm',metafile:true});
await build({...common,entryPoints:['src/action.ts'],outfile:'action/index.cjs',format:'cjs',minify:true});
const packages=[...new Set(Object.keys(core.metafile.inputs).map(path=>path.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean))].sort();
let notices='# Third-party notices\n\nThe bundled parser retains the licenses below. Generated from the locked build dependencies.\n';
for(const name of packages){
 const base='node_modules/'+name;const pkg=JSON.parse(await readFile(base+'/package.json','utf8'));let license;
 for(const file of ['license','LICENSE','LICENSE.md','license.md','LICENSE-MIT']){try{license=await readFile(base+'/'+file,'utf8');break;}catch{}}
 if(!license)throw new Error('License text missing for '+name);
 notices+=`\n## ${name} ${pkg.version}\n\n${license.trim()}\n`;
}
await writeFile('THIRD_PARTY_NOTICES.md',notices);
