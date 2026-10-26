import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, memoryWorkspace } from '../src/core.js';
async function scan(markdown:string,files:Record<string,string>={}){return analyze(memoryWorkspace({'README.md':markdown,...files}));}
const cases:[string,string,Record<string,string>,number,number][]=[
 ['HTML image','<img src="assets/demo.gif">',{'assets/demo.gif':''},0,1],
 ['missing HTML image','<img src="assets/missing.gif">',{},1,0],
 ['HTML anchor','<a href="docs/start.md">Start</a>',{'docs/start.md':''},0,1],
 ['single/unquoted uppercase attributes',"<IMG SRC='a.png'><img src=b.png>",{'a.png':'','b.png':''},0,2],
 ['HTML entities and URI encoding','<img src="a&amp;b%20c.png">',{'a&b c.png':''},0,1],
 ['HTML numeric entities','<img src="a&#32;b.png">',{'a b.png':''},0,1],
 ['HTML link directory and fragment','<a href="docs#intro">Docs</a>',{'docs/a.md':''},0,1],
 ['external HTML links','<a href="https://example.com">x</a><img src="//example.com/a.png"><img src="data:image/png;base64,eA=="><a href="#hello">Hello</a>',{},0,0],
 ['HTML comments','<!-- <img src="missing.png"> -->',{},0,0],
 ['fenced HTML examples','```html\n<img src="missing.png">\n```',{},0,0],
 ['inline code literals','`<img src="missing.png">`',{},0,0],
 ['indented HTML example','    <img src="missing.png">',{},0,0],
 ['pre/code samples','<pre><code><a href="missing.md">example</a></code></pre>',{},0,0],
 ['inline code context','Before <code><img src="missing.png"></code> after.',{},0,0],
 ['script/style strings','<script>const x=\'<img src="missing.png">\'</script>\n<style>.x{content:"<img src=bad>"}</style>',{},0,0],
 ['templates are inert','<template><img src="missing.png"></template>',{},0,0],
 ['unsupported srcset','<picture><source srcset="a.png 1x, b.png 2x"><img src="c.png"></picture>',{'c.png':''},0,1],
 ['dynamic HTML URL','<img src="{{ root }}/a.png">',{},0,0],
 ['empty HTML URL','<img src="">',{},0,0],
 ['HTML base abstention','<base href="docs/"><a href="guide.md">Guide</a>',{},0,0],
 ['HTML whitespace URL normalization','<img src="  a.png  "><a href="ht&#10;tps://example.com">x</a>',{'a.png':''},0,1],
 ['HTML encoded traversal','<img src="%2e%2e/private.png">',{},1,0],
 ['quoted greater-than in attr','<img title="look > here" src="a.png">',{'a.png':''},0,1],
 ['inline nested tags','See <a href="guide.md"><img src="a.png"></a>.',{'guide.md':'','a.png':''},0,2],
 ['markdown and HTML references','[guide](guide.md)\n\n<img src="a.png">',{'guide.md':'','a.png':''},0,2],
 ['raw text containers','<textarea><img src="missing.png"></textarea>',{},0,0]
];
for(const [name,markdown,files,errors,passed] of cases)test(name,async()=>{const r=await scan(markdown,files);assert.equal(r.summary.errors,errors);assert.equal(r.summary.passed,passed);});
test('multiline HTML attributes preserve original README lines',async()=>{
 const r=await scan('# Title\n\n<table>\n<tr><td>\n<img\n  alt="demo"\n  src="missing.png"\n>\n</td></tr>\n</table>');assert.equal(r.summary.errors,1);assert.equal(r.findings[0]!.line,7);assert.equal(r.findings[0]!.subject,'missing.png');
});
test('HTML paths resolve relative to selected Markdown, not repository root',async()=>{const r=await analyze(memoryWorkspace({'docs/start.md':'<img src="a.png"><a href="../README.md">Home</a>','docs/a.png':'','README.md':''}),'docs/start.md');assert.equal(r.summary.errors,0);assert.equal(r.summary.passed,2);});
test('unsupported attributes remain explicitly unverified',async()=>{const r=await scan('<img srcset="one.png 1x, two.png 2x">');assert.equal(r.status,'partial');assert.equal(r.summary.skipped,1);assert.match(r.findings[0]!.message,/not checked/);});
test('HTML traversal never requests an outside path',async()=>{const paths:string[]=[];const w=memoryWorkspace({'README.md':'<img src="..&#47;secret.png">'});const inspect=w.inspect;w.inspect=async p=>{paths.push(p);return inspect(p);};const r=await analyze(w);assert.equal(r.summary.errors,1);assert.deepEqual(paths,['README.md']);});

test('active unsupported resource attributes are skipped, not silently passed',async()=>{const r=await scan('<img src="a.png"><script src="missing.js"></script>',{'a.png':''});assert.equal(r.summary.passed,1);assert.equal(r.summary.skipped,1);assert.equal(r.status,'partial');});
test('HTML locations preserve CRLF and non-BMP text offsets',async()=>{const r=await scan('🧰 Toolkit\r\n\r\n<p>\r\n<img src="missing.gif">\r\n</p>');assert.equal(r.findings[0]!.line,4);assert.equal(r.summary.errors,1);});
test('foreign namespace links remain unverified',async()=>{const r=await scan('<svg><a href="missing.svg">x</a></svg>');assert.equal(r.summary.errors,0);assert.equal(r.summary.skipped,1);});
