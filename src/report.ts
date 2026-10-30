import type { Report, BatchReport } from './core.js';
export function clean(s: string): string { return s.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`); }
function escapeHtml(s: string): string { return clean(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
export function human(report: Report | BatchReport): string {
  const {errors,passed,skipped}=report.summary;
  return [`Readme Reality · ${report.status.toUpperCase()}`, `${passed} passed · ${errors} errors · ${skipped} not checked`, ...('kind' in report?[`${report.summary.documents} selected documents · ${report.summary.inputErrors} input errors`, ...report.documents.map(d=>d.status==='invalid'?`INPUT ${clean(d.file)}: ${clean(d.inputError)}`:`${clean(d.file)}: ${d.status} (${d.summary.passed} passed, ${d.summary.errors} errors, ${d.summary.skipped} not checked)`)]:[]), '', ...report.findings.map(f => `${f.outcome==='error'?'✗':f.outcome==='pass'?'✓':'−'} ${clean(f.file)}:${f.line} ${f.rule} ${clean(f.subject)}\n  ${clean(f.message)}${f.evidence?' Evidence: '+clean(f.evidence):''}${f.suggestions.length?' Candidates: '+f.suggestions.map(clean).join(', '):''}`), '', report.scope].join('\n');
}
function data(s: string): string { return clean(s).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'); }
function property(s: string): string { return data(s).replace(/:/g,'%3A').replace(/,/g,'%2C'); }
export function annotations(report: Report | BatchReport): string {
  const inputErrors='kind' in report?report.documents.filter(d=>d.status==='invalid').map(d=>`::error::${data('Input error in '+d.file+': '+d.inputError)}`):[];
  return [...inputErrors,...report.findings.filter(f=>f.outcome!=='pass').map(f=>`::${f.outcome==='error'?'error':'notice'} file=${property(f.file)},line=${f.line},title=${property(f.rule)}::${data(f.message+' '+f.evidence)}`)].join('\n');
}
export function summary(report: Report | BatchReport): string { return `<h2>Readme Reality: ${report.status}</h2>\n<pre>${escapeHtml(human(report))}</pre>\n`; }
