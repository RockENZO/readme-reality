import { appendFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { analyze, analyzeMany } from './core.js';
import { diskWorkspace } from './workspace.js';
import { annotations, summary, clean } from './report.js';
async function main() {
  const workspace=resolve(process.env.GITHUB_WORKSPACE??'.');
  const root=await realpath(resolve(workspace,process.env.INPUT_ROOT||'.'));
  const canonicalWorkspace=await realpath(workspace);
  const rel=relative(canonicalWorkspace,root);
  if(rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel))throw new Error('Action root must remain inside GITHUB_WORKSPACE.');
  const readmes=(process.env.INPUT_README||'README.md').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const workspaceAdapter=await diskWorkspace(root);
  const report=readmes.length===1?await analyze(workspaceAdapter,readmes[0]!):await analyzeMany(workspaceAdapter,readmes);
  const annotationReport={...report,findings:report.findings.map(f=>({...f,file:rel?rel.split(/[/\\]/).join('/')+'/'+f.file:f.file}))};
  const output=annotations(annotationReport);if(output)console.log(output);
  console.log(`${report.summary.passed} passed, ${report.summary.errors} errors, ${report.summary.skipped} not checked. ${report.scope}`);
  if('kind' in report)console.log(`${report.summary.documents} selected documents; ${report.summary.inputErrors} input errors.`);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary(report));
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`errors=${report.summary.errors}\nskipped=${report.summary.skipped}\nstatus=${report.status}\ndocuments=${'kind' in report?report.summary.documents:1}\ninput-errors=${'kind' in report?report.summary.inputErrors:0}\n`);
  process.exitCode=('kind' in report&&report.summary.inputErrors)?2:report.summary.errors?1:0;
}
main().catch(error=>{console.error('::error::'+clean(error instanceof Error?error.message:'Input/tool error').replace(/%/g,'%25'));process.exitCode=2;});
