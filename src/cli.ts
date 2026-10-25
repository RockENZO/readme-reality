import { analyze } from './core.js';
import { diskWorkspace } from './workspace.js';
import { human, clean } from './report.js';
async function main() {
  const args=process.argv.slice(2);
  if (!args.length || args.includes('--help') || args[0]==='help') { console.log('Usage: readme-reality check [root] [--readme README.md] [--format human|json]\nOffline static checks; never executes commands. Exit 0=no confirmed errors (see skips), 1=findings, 2=input/tool error.'); return; }
  if (args[0]!=='check') throw new Error('Expected check command. Use --help.');
  let root='.',readme='README.md',format='human',hasRoot=false;
  for(let i=1;i<args.length;i++) {
    const arg=args[i]!;
    if(arg==='--readme'||arg==='--format') { const value=args[++i]; if(!value||value.startsWith('--'))throw new Error(`Missing value for ${arg}`); if(arg==='--readme')readme=value;else format=value; }
    else if(arg.startsWith('-')||hasRoot)throw new Error('Unexpected argument. Use --help.');
    else {root=arg;hasRoot=true;}
  }
  if(!['human','json'].includes(format))throw new Error('Format must be human or json.');
  const report=await analyze(await diskWorkspace(root),readme);
  console.log(format==='json'?JSON.stringify(report,null,2):human(report));process.exitCode=report.summary.errors?1:0;
}
main().catch(error=>{console.error('Readme Reality: '+clean(error instanceof Error?error.message:'Input/tool error'));process.exitCode=2;});
