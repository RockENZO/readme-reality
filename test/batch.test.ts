import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyze, analyzeMany, memoryWorkspace, MAX_DOCUMENTS, type Workspace } from '../src/core.js';
import { diskWorkspace } from '../src/workspace.js';
import { human, annotations, summary } from '../src/report.js';

async function fixture(run:(dir:string)=>Promise<void>) {
  const dir=await mkdtemp(join(tmpdir(),'rr-batch-'));
  try { await mkdir(join(dir,'docs'));await writeFile(join(dir,'README.md'),'```sh\npython absent.py\n```');await writeFile(join(dir,'docs/start.md'),'[local](present.txt)');await writeFile(join(dir,'docs/present.txt'),'fixture');await run(dir); }
  finally { await rm(dir,{recursive:true,force:true}); }
}
const cli=(dir:string,paths:string[])=>spawnSync(process.execPath,['--import','tsx','src/cli.ts','check',dir,...paths.flatMap(p=>['--readme',p]),'--format','json'],{encoding:'utf8'});
test('batch results equal independent checks; file order, local links and fence roots remain independent',async()=>{
 const w=memoryWorkspace({'README.md':'```sh\ncd docs\npython child.py\n```','docs/start.md':'[local](present.txt)\n```sh\npython root.py\n```','docs/child.py':'not executed','root.py':'not executed','docs/present.txt':'fixture'});
 const single=await Promise.all(['README.md','docs/start.md'].map(file=>analyze(w,file)));
 const batch=await analyzeMany(w,['README.md','docs/start.md']);
 assert.equal(batch.status,'passed');assert.deepEqual(batch.findings,single.flatMap(r=>r.findings));assert.equal(batch.summary.passed,4);assert.equal(batch.summary.documents,2);
 assert.deepEqual(batch.documents.map(d=>d.file),['README.md','docs/start.md']);
});
test('repeated CLI selections do not silently discard earlier errors',()=>fixture(async dir=>{
 const expected=await analyzeMany(await diskWorkspace(dir),['README.md','docs/start.md']);const result=cli(dir,['README.md','docs/start.md']);
 assert.equal(result.status,1);assert.deepEqual(JSON.parse(result.stdout),expected);assert.equal(expected.summary.errors,1);assert.equal(expected.summary.passed,1);
}));
test('input errors do not suppress valid-document findings and take exit-code precedence',()=>fixture(async dir=>{
 const result=cli(dir,['README.md','missing.md','docs/start.md']);assert.equal(result.status,2);
 const report=JSON.parse(result.stdout);assert.equal(report.status,'invalid');assert.equal(report.summary.inputErrors,1);assert.equal(report.summary.errors,1);assert.equal(report.summary.passed,1);
 assert.deepEqual(report.documents.map((d:{status:string})=>d.status),['failed','invalid','passed']);assert.equal(report.findings[1].file,'docs/start.md');
}));
test('single-file CLI schema and result stay unchanged',()=>fixture(async dir=>{
 const result=cli(dir,['README.md']);assert.equal(result.status,1);assert.deepEqual(JSON.parse(result.stdout),await analyze(await diskWorkspace(dir)));assert.ok(!('kind' in JSON.parse(result.stdout)));
}));
test('normalized duplicate paths are counted once',async()=>{
 const report=await analyzeMany(memoryWorkspace({'README.md':'[file](README.md)'}),['README.md','./README.md','docs/../README.md']);
 assert.equal(report.summary.documents,1);assert.equal(report.findings.length,1);
});
test('batch limit rejects oversized selections before inspecting anything',async()=>{
 let inspections=0;const w:Workspace={...memoryWorkspace({}),inspect:async()=>{inspections++;return 'missing';}};
 await assert.rejects(analyzeMany(w,Array.from({length:MAX_DOCUMENTS+1},(_,n)=>`doc${n}.md`)),/between 1 and 25/);
 await assert.rejects(analyzeMany(w,[]),/between 1 and 25/);assert.equal(inspections,0);
 const max=await analyzeMany(memoryWorkspace(Object.fromEntries(Array.from({length:MAX_DOCUMENTS},(_,n)=>[`doc${n}.md`,'# No supported references']))),Array.from({length:MAX_DOCUMENTS},(_,n)=>`doc${n}.md`));
 assert.equal(max.summary.documents,MAX_DOCUMENTS);assert.equal(max.status,'partial');
});
test('outside paths are invalid without outside inspection or reads',async()=>{
 const inspected:string[]=[],reads:string[]=[];const base=memoryWorkspace({'README.md':'[ok](README.md)'});
 const w:Workspace={...base,inspect:async p=>{inspected.push(p);return base.inspect(p);},readText:async p=>{reads.push(p);return base.readText(p);}};
 const r=await analyzeMany(w,['../outside.md','README.md']);assert.equal(r.summary.inputErrors,1);assert.deepEqual(reads,['README.md']);assert.ok(inspected.every(p=>!p.includes('..')));
});
test('one invalid UTF8 or oversized document does not cancel the rest',()=>fixture(async dir=>{
 await writeFile(join(dir,'bad.md'),Buffer.from([255]));await writeFile(join(dir,'big.md'),'x'.repeat(2_000_001));
 const r=await analyzeMany(await diskWorkspace(dir),['bad.md','big.md','docs/start.md']);assert.equal(r.summary.inputErrors,2);assert.equal(r.summary.passed,1);
}));
test('symlinked document remains an input failure',{skip:process.platform==='win32'},()=>fixture(async dir=>{
 await symlink(join(dir,'README.md'),join(dir,'alias.md'));const r=await analyzeMany(await diskWorkspace(dir),['alias.md','docs/start.md']);assert.equal(r.summary.inputErrors,1);assert.equal(r.summary.passed,1);
}));
test('Action multiline input matches aggregate counts and workspace-relative annotation paths',()=>fixture(async dir=>{
 await mkdir(join(dir,'nested'));await writeFile(join(dir,'nested/guide.md'),'```sh\npython absent.py\n```');
 const out=join(dir,'output'),summ=join(dir,'summary');
 const result=spawnSync(process.execPath,['--import','tsx','src/action.ts'],{encoding:'utf8',env:{...process.env,GITHUB_WORKSPACE:dir,INPUT_ROOT:'nested',INPUT_README:'guide.md\r\n\r\nmissing.md\r\n',GITHUB_OUTPUT:out,GITHUB_STEP_SUMMARY:summ}});
 assert.equal(result.status,2);assert.match(result.stdout,/file=nested\/guide.md,line=2/);assert.match(result.stdout,/::error::Input error in missing.md/);
 assert.match(await readFile(out,'utf8'),/errors=1\nskipped=0\nstatus=invalid\ndocuments=2\ninput-errors=1/);assert.match(await readFile(summ,'utf8'),/2 selected documents/);
}));
test('filenames with spaces are literal selections and batch diagnostics are escaped',()=>fixture(async dir=>{
 await writeFile(join(dir,'space name.md'),'[exists](README.md)');assert.equal(cli(dir,['space name.md','docs/start.md']).status,0);
 const r=await analyzeMany(memoryWorkspace({'README.md':'# heading'}),['../bad.md\n::warning::fake','README.md']);
 assert.ok(!human(r).includes('\n::warning::fake'));assert.equal(annotations(r).split('\n').length,1);assert.ok(!summary(r).includes('\n::warning::fake'));
}));
test('human summaries identify documents with no supported checks',async()=>{
 const r=await analyzeMany(memoryWorkspace({'README.md':'[self](README.md)','empty.md':'# Heading'}),['README.md','empty.md']);
 assert.equal(r.status,'partial');assert.match(human(r),/empty\.md: partial \(0 passed, 0 errors, 0 not checked\)/);
});
