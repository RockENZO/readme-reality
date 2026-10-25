import { analyze, memoryWorkspace, type Report } from '../src/core';
import { examples } from './fixtures';
import './style.css';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let current = examples[0]!; let version: 'broken' | 'fixed' = 'broken'; let report: Report | null = null; let filter='all'; let sequence=0;
const editor=byId<HTMLTextAreaElement>('readme');
function text(tag:string, content:string, className='') { const node=document.createElement(tag);node.textContent=content;node.className=className;return node; }
function lines() { byId('gutter').textContent=editor.value.split('\n').map((_,i)=>i+1).join('\n'); }
function source() {
 editor.value=current[version];lines();byId('scenario-note').textContent=current.subtitle;
 for(const id of ['broken','fixed'])byId(id).setAttribute('aria-pressed',String(version===id));
 byId('tree').replaceChildren(...Object.keys(current.files).map(path=>text('li',path)));
 for(const button of byId('examples').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.id===current.id));
}
function render() {
 if(!report)return;
 const {errors,passed,skipped}=report.summary;
 byId('status-pill').textContent=errors?'Needs attention':skipped||!passed?'Partial coverage':'Checked';byId('status-pill').className=errors?'pill error':skipped?'pill skip':'pill pass';
 const summary=byId('result-summary');summary.replaceChildren();
 const metrics=document.createElement('div');metrics.className='metrics';
 for(const [value,label,kind]of [[errors,'ERRORS','error'],[passed,'PASSED','pass'],[skipped,'NOT CHECKED','skip']] as const){const metric=text('div','',kind);metric.append(text('strong',String(value)),text('span',label));metrics.append(metric);}
 summary.append(metrics,text('p',errors?'The snapshot and the instructions disagree.':!passed&&!skipped?'No supported references found. No runtime behavior was tested.':skipped?'No confirmed errors. Some instructions are outside our scope.':'Every supported reference in this example exists.','verdict'));
 byId('filters').replaceChildren();
 for(const [id,label]of [['all','All findings'],['error','Errors'],['skip','Not checked']]){const b=text('button',label!);b.setAttribute('aria-pressed',String(filter===id));b.onclick=()=>{filter=id!;render();};byId('filters').append(b);}
 const list=byId('findings');list.replaceChildren();
 for(const f of report.findings.filter(f=>filter==='all'||f.outcome===filter)){
  const card=document.createElement('article');card.className='finding '+f.outcome;
  const top=text('div','', 'finding-top');top.append(text('span',f.rule),text('span','LINE '+f.line));
  card.append(top,text('h3',f.message),text('code',f.subject));
  if(f.evidence||f.suggestions.length){const details=document.createElement('details');details.append(text('summary','View repository evidence'));details.append(text('p',f.evidence||'No file read.'));if(f.suggestions.length)details.append(text('p','Existing candidates: '+f.suggestions.join(', ')));card.append(details);}
  const locate=text('button','Show line '+f.line,'locate');locate.onclick=()=>{const ls=editor.value.split('\n');const start=ls.slice(0,f.line-1).reduce((n,l)=>n+l.length+1,0);editor.focus();editor.setSelectionRange(start,start+(ls[f.line-1]?.length??0));editor.scrollTop=Math.max(0,(f.line-4)*23);};card.append(locate);list.append(card);
 }
 if(!list.children.length)list.append(text('p','No findings in this filter.','empty'));
}
async function run() {
 const id=++sequence;const button=byId<HTMLButtonElement>('run');button.disabled=true;button.textContent='Checking…';
 try {
  const result=await analyze(memoryWorkspace({...current.files,'README.md':editor.value}));
  if(id!==sequence)return;report=result;render();
 } catch(error){report=null;byId('status-pill').textContent='Input error';byId('status-pill').className='pill error';byId('result-summary').replaceChildren(text('p',error instanceof Error?error.message:'Unable to inspect this input.','verdict'));byId('findings').replaceChildren();byId('filters').replaceChildren();}
 finally{if(id===sequence){button.disabled=false;button.textContent='Run check ↗';}}
}
for(const example of examples){const b=text('button',example.name);b.dataset.id=example.id;b.setAttribute('aria-pressed',String(current.id===example.id));b.onclick=()=>{current=example;version='broken';filter='all';source();void run();};byId('examples').append(b);}
for(const v of ['broken','fixed'] as const)byId(v).onclick=()=>{version=v;source();void run();};
editor.oninput=()=>{lines();byId('status-pill').textContent='Edited · run check';};editor.onscroll=()=>{byId('gutter').scrollTop=editor.scrollTop;};
byId('run').onclick=()=>void run();
byId('copy').onclick=async()=>{try{await navigator.clipboard.writeText('node dist/cli.mjs check .');byId('message').textContent='Command copied.';}catch{byId('message').textContent='Copy unavailable. Select the command in the terminal example.';}};
source();void run();
