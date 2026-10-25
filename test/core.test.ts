import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, memoryWorkspace, resolvePath } from '../src/core.js';
import { examples } from '../web/fixtures.js';
const shell=(s:string)=>'```bash\n'+s+'\n```';
async function scan(markdown:string,files:Record<string,string>={}) { return analyze(memoryWorkspace({'README.md':markdown,...files})); }
const cases:[string,string,Record<string,string>,number,number][] = [
 ['valid link','[guide](docs/guide.md)',{'docs/guide.md':'ok'},0,1],
 ['missing link','[guide](docs/missing.md)',{},1,0],
 ['image with quoted title','![preview]("art image.png" "title")',{'art image.png':''},0,0],
 ['encoded space','![preview](art%20image.png)',{'art image.png':''},0,1],
 ['reference link','[guide][g]\n\n[g]: docs/a.md',{'docs/a.md':''},0,1],
 ['reference image','![guide][g]\n\n[g]: missing.png',{},1,0],
 ['link anchor','[guide](docs/a.md#hello)',{'docs/a.md':''},0,1],
 ['directory link','[docs](docs)',{'docs/a.md':''},0,1],
 ['external links are not fetched','[x](https://example.com) [mail](mailto:a@b.c) [anchor](#hi)',{},0,0],
 ['path traversal','[no](../secret.md)',{},1,0],
 ['encoded traversal','[no](%2e%2e/secret.md)',{},1,0],
 ['normal npm script',shell('npm run dev'),{'package.json':'{"scripts":{"dev":"vite"}}'},0,1],
 ['missing npm script',shell('npm run start'),{'package.json':'{"scripts":{"dev":"vite"}}'},1,0],
 ['pnpm script',shell('pnpm run build'),{'package.json':'{"scripts":{"build":"vite"}}'},0,1],
 ['yarn script',shell('yarn run build'),{'package.json':'{"scripts":{"build":"vite"}}'},0,1],
 ['wrong script type',shell('npm run bad'),{'package.json':'{"scripts":{"bad":3}}'},1,0],
 ['blank script',shell('npm run bad'),{'package.json':'{"scripts":{"bad":"  "}}'},1,0],
 ['prototype name is not own script',shell('npm run toString'),{'package.json':'{}'},1,0],
 ['invalid manifest',shell('npm run dev'),{'package.json':'{'},1,0],
 ['null manifest',shell('npm run dev'),{'package.json':'null'},1,0],
 ['no manifest',shell('npm run dev'),{},1,0],
 ['workspace deliberately skipped',shell('pnpm run dev --filter web'),{'package.json':'{}'},0,0],
 ['python script',shell('python3 scripts/run.py'),{'scripts/run.py':''},0,1],
 ['quoted python path',shell('python "scripts/my run.py" --help'),{'scripts/my run.py':''},0,1],
 ['missing python script',shell('python scripts/missing.py'),{},1,0],
 ['third-party python module skipped',shell('python -m streamlit run app.py'),{},0,0],
 ['python flags skipped',shell('python -u foo.py'),{},0,0],
 ['requirements',shell('pip install -r requirements.txt'),{'requirements.txt':''},0,1],
 ['python pip',shell('python3 -m pip install --requirement=requirements.txt'),{'requirements.txt':''},0,1],
 ['multiple requirements',shell('pip install -r a.txt -r b.txt'),{'a.txt':''},1,1],
 ['requirements argument missing',shell('pip install -r'),{},1,0],
 ['dynamic path skipped',shell('python "$SCRIPT"'),{},0,0],
 ['complex shell invalidates cwd',shell('cd web && npm run dev\npython missing.py'),{},0,0],
 ['unclosed quote skipped',shell('python "missing.py'),{},0,0],
 ['comment',shell('# python missing.py'),{},0,0],
 ['shell prompt',shell('$ python run.py'),{'run.py':''},0,1],
 ['non-shell code ignored','```python\nprint("hi")\n```',{},0,0],
 ['clone setup not simulated',shell('git clone https://example.com/repo.git\ncd repo\npython missing.py'),{},0,0],
 ['directory failure',shell('cd missing\npython missing.py'),{},1,0],
 ['ancestor manifest',shell('cd web\nnpm run dev'),{'web/file.txt':'','package.json':'{"scripts":{"dev":"vite"}}'},0,2],
 ['directory and per-fence reset',shell('cd web\npython run.py')+'\n\n'+shell('python root.py'),{'web/run.py':'','root.py':''},0,3]
];
for (const [name,markdown,files,errors,passes]of cases) test(name,async()=>{ const r=await scan(markdown,files);assert.equal(r.summary.errors,errors);assert.equal(r.summary.passed,passes);assert.equal(r.summary.checked,r.summary.errors+r.summary.passed); });
test('all three examples use the same live engine',async()=>{for(const e of examples){const broken=await scan(e.broken,e.files);const fixed=await scan(e.fixed,e.files);assert.ok(broken.summary.errors>0);assert.equal(fixed.summary.errors,0);if(e.id==='mixed')assert.ok(fixed.summary.skipped>0);}});
test('nested Markdown paths are relative to their document',async()=>{const r=await analyze(memoryWorkspace({'docs/start.md':'[guide](guide.md)\n'+shell('python main.py'),'docs/guide.md':'','main.py':''}),'docs/start.md');assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,2);});
test('positions and repository evidence remain inspectable',async()=>{const r=await scan('# Hi\n\n'+shell('npm run missing'),{'package.json':'{"scripts":{"dev":"ok"}}'});assert.equal(r.findings[0]?.line,4);assert.equal(r.findings[0]?.evidence,'package.json');assert.deepEqual(r.findings[0]?.suggestions,['dev']);});
test('no support is not presented as full coverage',async()=>{const r=await scan(shell('python -m streamlit run app.py'));assert.equal(r.status,'partial');assert.equal(r.summary.checked,0);assert.equal(r.summary.skipped,1);});
test('Markdown input required, not a credential file',async()=>{await assert.rejects(analyze(memoryWorkspace({'.env':'SECRET'}),'.env'),/Markdown/);});
test('root and path normalization',()=>{assert.equal(resolvePath('docs','../README.md'),'README.md');for(const p of ['../../x','/etc/passwd','C:\\secret','x\0y'])assert.equal(resolvePath('.',p),null);});

test('environment-prefixed clone cannot create a false missing cd finding',async()=>{const r=await scan(shell('GIT_LFS_SKIP_SMUDGE=1 git clone https://example.com/repo.git\ncd repo\npython run.py'));assert.equal(r.summary.errors,0);assert.equal(r.summary.skipped,3);});
test('npm default lifecycle paths are not false missing scripts',async()=>{for(const cmd of ['npm run env','npm run restart','npm run start']){const r=await scan(shell(cmd),{'package.json':'{}','server.js':''});assert.equal(r.summary.errors,0);assert.equal(r.summary.skipped,1);}});
test('no applicable references is partial coverage',async()=>{assert.equal((await scan('# Empty')).status,'partial');});

test('literal multiline Python command preserves first source line',async()=>{
 const r=await scan(shell('python scripts/train.py '+String.fromCharCode(92)+'\n  --data dataset.csv'));
 assert.equal(r.summary.errors,1);assert.equal(r.findings[0]?.line,2);assert.equal(r.findings[0]?.rule,'RR003');
});
test('quoted backslashes and incomplete continuations remain skipped',async()=>{
 for(const command of ['python "foo'+String.fromCharCode(92)+'\n.py"','python missing.py '+String.fromCharCode(92)]){
 const r=await scan(shell(command));assert.equal(r.summary.errors,0);assert.ok(r.summary.skipped>0);}
});

test('historical NLP snapshot detects the three genuinely absent scripts',async()=>{
 const {readFile}=await import('node:fs/promises');
 const fixture=JSON.parse(await readFile(new URL('../examples/historical-nlp.json',import.meta.url),'utf8'));
 const r=await analyze(memoryWorkspace(fixture.files));
 const missing=r.findings.filter(f=>f.rule==='RR003'&&f.outcome==='error');
 assert.equal(missing.length,3);
 for(const script of fixture.expected_missing_scripts)assert.ok(missing.some(f=>f.subject.includes(script)));
 assert.deepEqual(missing.map(f=>f.line),[106,112,119]);
});

test('duplicate reference definitions follow Markdown first-definition semantics',async()=>{
 const r=await scan('[guide][g]\n\n[g]: exists.md\n[g]: missing.md',{'exists.md':''});
 assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,1);
});
test('parenthesized shell syntax is skipped without claiming file verification',async()=>{
 const r=await scan(shell('python missing.py (invalid)'));
 assert.equal(r.summary.errors,0);assert.equal(r.summary.skipped,1);
});

test('package-manager directory options never inspect the wrong manifest',async()=>{
 for(const cmd of ['npm run dev --prefix frontend','npm run dev --prefix=frontend','pnpm run dev --dir frontend','pnpm run dev -Cfrontend','yarn run dev --cwd frontend','npm run dev --if-present']){
  for(const scripts of [{},{dev:'vite'}]){
   const r=await scan(shell(cmd),{'package.json':JSON.stringify({scripts}),'frontend/package.json':'{"scripts":{"dev":"vite"}}'});
   assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,0);assert.equal(r.summary.skipped,1);
  }
 }
 const forwarded=await scan(shell('npm run dev -- --prefix frontend'),{'package.json':'{"scripts":{"dev":"vite"}}'});
 assert.equal(forwarded.summary.passed,1);
});
test('remote requirements are unsupported without local reads',async()=>{
 for(const command of ['pip install -r https://example.com/requirements.txt','pip3 install --requirement http://example.com/r.txt','python -m pip install --requirement=https://example.com/r.txt','pip install -r file:///tmp/r.txt']){
  const r=await scan(shell(command));assert.equal(r.summary.errors,0);assert.equal(r.summary.skipped,1);
 }
 const mixed=await scan(shell('pip install -r https://example.com/r.txt -r local.txt'),{'local.txt':''});
 assert.equal(mixed.summary.errors,0);assert.equal(mixed.summary.passed,1);assert.equal(mixed.summary.skipped,1);
});
test('cd previous-directory and flags invalidate cwd instead of reporting missing files',async()=>{
 for(const destination of ['-','-P','--','""']){
  const r=await scan(shell('cd app\ncd '+destination+'\npython run.py'),{'app/keep.txt':'','run.py':''});
  assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,1);assert.equal(r.summary.skipped,2);
 }
});

test('conditional, loop and function bodies are never interpreted as unconditional commands',async()=>{
 for(const command of [
  'if false\nthen\npython optional.py\nfi',
  'if test -d optional\nthen\ncd optional\npython run.py\nfi',
  'for item in one two\ndo\npython optional.py\ndone',
  'while false\ndo\npython optional.py\ndone',
  'until true\ndo\npython optional.py\ndone',
  'function optional\n{\npython optional.py\n}',
  'case value in\npattern)\npython optional.py\n;;\nesac',
  '! cd optional\npython optional.py',
  'time cd optional\npython optional.py',
 ]){
  const r=await scan(shell(command));assert.equal(r.summary.errors,0,command);assert.equal(r.summary.passed,0,command);assert.ok(r.summary.skipped>0,command);assert.equal(r.status,'partial');
 }
});
test('control-flow uncertainty persists until a new fence, preserving source lines',async()=>{
 const r=await scan(shell('python known.py\nif false\nthen\npython optional.py\nfi\npython after.py')+'\n\n'+shell('python missing.py'),{'known.py':''});
 assert.equal(r.summary.passed,1);assert.equal(r.summary.errors,1);assert.equal(r.summary.skipped,5);
 assert.equal(r.findings.find(f=>f.outcome==='error')?.line,11);
 assert.match(r.findings.find(f=>f.subject==='if false')!.message,/control flow/);
});
test('keywords in script paths, script names and quoted arguments retain normal checks',async()=>{
 const r=await scan(shell('npm run if\npython "while.py"\npip install -r then.txt'),{'package.json':'{"scripts":{"if":"node index.js"}}','while.py':'','then.txt':''});
 assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,3);
});
