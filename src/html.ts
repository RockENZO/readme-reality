import { parseFragment, type DefaultTreeAdapterTypes as Html } from 'parse5';

export interface HtmlSpan { start: number; end: number; html: string }
export interface HtmlReference { url: string; line: number; skip?: string }

/** Parse only Markdown's raw-HTML spans, retaining their original line numbers.
 * Parsed HTML values omit Markdown quote/list prefixes without changing lines.
 * Masking other Markdown also preserves context across inline <code> tags while
 * excluding fenced/indented code and backtick literals from HTML interpretation.
 */
export function htmlReferences(markdown: string, spans: HtmlSpan[]): HtmlReference[] {
  if (!spans.length) return [];
  const parts: string[] = []; let cursor = 0;
  for (const span of spans.slice().sort((a,b) => a.start-b.start)) {
    parts.push(markdown.slice(cursor,span.start).replace(/[^\r\n]/g,' '),span.html);
    cursor=span.end;
  }
  parts.push(markdown.slice(cursor).replace(/[^\r\n]/g,' '));
  const root=parseFragment(parts.join(''),{sourceCodeLocationInfo:true});
  const refs: HtmlReference[] = []; let hasBase=false;
  const stack: Html.Node[] = [root];
  while(stack.length) {
    const node=stack.pop()!;
    if ('tagName' in node) {
      if(node.tagName==='base') hasBase=true;
      for(const attr of node.attrs) {
        if(!['href','src','srcset','poster'].includes(attr.name)) continue;
        const line=node.sourceCodeLocation?.attrs?.[attr.name]?.startLine ?? node.sourceCodeLocation?.startLine ?? 1;
        // HTML URL attributes discard ASCII tabs/newlines and edge whitespace.
        const url=attr.value.replace(/[\t\r\n]/g,'').replace(/^[\x00-\x20]+|[\x00-\x20]+$/g,'');
        const supported=node.namespaceURI==='http://www.w3.org/1999/xhtml' && !attr.namespace && (node.tagName==='a'&&attr.name==='href'||node.tagName==='img'&&attr.name==='src');
        const skip=!supported ? 'Only HTML a[href] and img[src] are supported; this attribute is not checked.'
          : !url ? 'Empty HTML URL; no local file target is checked.'
          : /\{\{|\{%|\$\{|<%/.test(url) ? 'Dynamic HTML URL is not resolved.' : undefined;
        refs.push({url,line,...(skip?{skip}:{})});
      }
    }
    const inert='tagName' in node && ['code','pre','script','style','textarea','title','template','noscript'].includes(node.tagName);
    if(!inert && 'childNodes' in node) for(let i=node.childNodes.length-1;i>=0;i--)stack.push(node.childNodes[i]!);
  }
  // A base element changes HTML URL resolution. Do not guess its render/sanitizer
  // semantics; keep Markdown references independent and abstain for HTML URLs.
  if(hasBase)for(const ref of refs)if(!ref.skip)ref.skip='HTML base URL is not interpreted; HTML references are not checked.';
  return refs;
}
