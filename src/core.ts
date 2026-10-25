import { unified } from 'unified';
import remarkParse from 'remark-parse';

export type Kind = 'file' | 'directory' | 'missing' | 'blocked';
export interface Workspace {
  inspect(path: string): Promise<Kind>;
  readText(path: string): Promise<string>;
  list(path: string): Promise<string[]>;
}
export interface Finding {
  rule: string; outcome: 'pass' | 'error' | 'skip'; file: string; line: number;
  subject: string; message: string; evidence: string; suggestions: string[];
}
export interface Report {
  schemaVersion: 1; file: string; status: 'passed' | 'failed' | 'partial';
  summary: { checked: number; passed: number; errors: number; skipped: number };
  findings: Finding[];
  scope: string;
}
interface Ast {
  type: string; url?: string; identifier?: string; value?: string; lang?: string | null;
  position?: { start: { line: number } }; children?: Ast[];
}
export const MAX_TEXT_BYTES = 2_000_000;
export const SCOPE = 'Static snapshot checks only. Commands are never executed. File existence and script declarations do not prove runtime success. Unsupported constructs are explicitly skipped.';
export function resolvePath(base: string, input: string): string | null {
  if (/^[\\/]|^[a-zA-Z]:|[\0-\x1f\x7f]/.test(input) || input.includes('\\')) return null;
  const parts = base === '.' ? [] : base.split('/');
  for (const p of input.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') { if (!parts.length) return null; parts.pop(); }
    else parts.push(p);
  }
  return parts.join('/') || '.';
}
function parent(path: string): string { return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.'; }
function words(line: string): string[] | null {
  const result: string[] = []; let token = ''; let quote = ''; let started = false;
  for (const c of line) {
    if (quote) {
      if (c === quote) quote = '';
      else if (c === '$' || c === '`' || c === '\\') return null;
      else token += c;
      started = true;
    } else if (c === '"' || c === "'") { quote = c; started = true; }
    else if (/\s/.test(c)) { if (started) { result.push(token); token = ''; started = false; } }
    else if (c === '#' && !started) break;
    else if (/[|&;<>$`\\*?\[\]{}~()]/.test(c)) return null;
    else { token += c; started = true; }
  }
  if (quote) return null;
  if (started) result.push(token);
  return result;
}
export async function analyze(workspace: Workspace, readme = 'README.md'): Promise<Report> {
  if (!/\.(?:md|markdown)$/i.test(readme)) throw new Error('Choose a Markdown file (.md or .markdown).');
  const file = resolvePath('.', readme);
  if (!file || await workspace.inspect(file) !== 'file') throw new Error('README must be a regular file inside the repository (symlinks are not followed).');
  const markdown = await workspace.readText(file);
  if (new TextEncoder().encode(markdown).length > MAX_TEXT_BYTES) throw new Error('README exceeds 2 MB limit.');
  const root = unified().use(remarkParse).parse(markdown) as unknown as Ast;
  const nodes: Ast[] = [];
  function visit(n: Ast) { nodes.push(n); for (const c of n.children ?? []) visit(c); }
  visit(root);
  const definitions = new Map<string, string>();
  for (const n of nodes.filter(n => n.type === 'definition')) if (!definitions.has(n.identifier!)) definitions.set(n.identifier!, n.url!);
  const findings: Finding[] = [];
  function add(rule: string, outcome: Finding['outcome'], line: number, subject: string, message: string, evidence = '', suggestions: string[] = []) {
    findings.push({ rule, outcome, file: file!, line, subject, message, evidence, suggestions });
  }
  async function checkFile(rule: string, base: string, target: string, line: number, subject: string) {
    const path = resolvePath(base, target);
    if (path === null) { add(rule, 'error', line, subject, 'Path is outside the repository or is not supported.', 'No outside path was accessed.'); return; }
    const kind = await workspace.inspect(path);
    if (kind === 'file') add(rule, 'pass', line, subject, 'File exists in this snapshot.', path);
    else {
      const candidates = kind === 'missing' ? (await workspace.list(parent(path))).filter(p => p.endsWith(target.includes('.') ? '.' + target.split('.').pop() : '')).slice(0, 5) : [];
      add(rule, 'error', line, subject, kind === 'blocked' ? 'Symlink or special file is not inspected.' : 'Expected file is absent from this snapshot.', `${path}: ${kind}. Generated/downloaded files may require a documented prerequisite.`, candidates);
    }
  }
  async function checkRequirement(target: string, line: number, subject: string, cwd: string) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) { add('RR004', 'skip', line, subject, 'Remote or scheme-based requirements are not fetched or checked.'); return; }
    await checkFile('RR004', cwd, target, line, subject);
  }
  for (const n of nodes) {
    if (!['link', 'image', 'linkReference', 'imageReference'].includes(n.type)) continue;
    const url = n.url ?? definitions.get(n.identifier ?? ''); const line = n.position?.start.line ?? 1;
    if (!url) { add('RR001', 'skip', line, n.identifier ?? '', 'Reference destination is unavailable.'); continue; }
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) { add('RR001', 'skip', line, url, 'External, anchor-only or host-root URL; not fetched.'); continue; }
    let target: string;
    try { target = decodeURIComponent(url.split(/[?#]/)[0]!); } catch { add('RR001', 'error', line, url, 'Invalid URL encoding.'); continue; }
    const path = resolvePath(parent(file), target);
    if (path && await workspace.inspect(path) === 'directory') add('RR001', 'pass', line, url, 'Directory exists; anchors and rendering are not checked.', path);
    else await checkFile('RR001', parent(file), target, line, url);
  }
  for (const block of nodes.filter(n => n.type === 'code')) {
    if (!block.value?.trim()) continue;
    if (!['sh', 'bash', 'shell', 'console', 'zsh'].includes((block.lang ?? '').toLowerCase())) {
      add('RR000', 'skip', block.position?.start.line ?? 1, block.lang ?? 'unlabelled block', 'Non-shell code block is not analyzed.'); continue;
    }
    let cwd: string | null = '.';
    const lines = block.value.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let raw = lines[i]!.trim().replace(/^\$ /, ''); const line = (block.position?.start.line ?? 1) + i + 1;
      // Join only a literal, unquoted trailing continuation; no shell execution.
      while(raw.endsWith('\\') && !raw.includes('#') && words(raw.slice(0,-1)) !== null && i+1<lines.length) {
        raw=raw.slice(0,-1)+' '+lines[++i]!.trim();
      }
      if (!raw || raw.startsWith('#')) continue;
      const tokens = words(raw);
      if (!tokens) { add('RR000', 'skip', line, raw, 'Complex shell or dynamic syntax; subsequent working directory is unknown.'); cwd = null; continue; }
      if (!tokens.length) continue;
      if (cwd === null) { add('RR000', 'skip', line, raw, 'Working directory is unknown; start a separate code block for repository-root checks.'); continue; }
      const command = tokens[0];
      // Unquoted shell reserved words introduce control flow or execution scopes.
      // We do not evaluate branches/loops, so no later command in this fence is
      // safe to interpret as an unconditional repository-root instruction.
      if (/^(?:if|then|elif|else|fi|for|select|while|until|do|done|case|in|esac|function|coproc|time|!)(?:\s|$)/.test(raw)) {
        add('RR000', 'skip', line, raw, 'Shell control flow is not simulated; subsequent working directory is unknown.');
        cwd = null; continue;
      }
      if (command === 'cd') {
        if (tokens.length !== 2 || !tokens[1] || tokens[1].startsWith('-')) { add('RR005', 'skip', line, raw, 'Only a single literal cd destination is supported.'); cwd = null; continue; }
        const next = resolvePath(cwd, tokens[1]!);
        const kind = next === null ? 'blocked' : await workspace.inspect(next);
        add('RR005', kind === 'directory' ? 'pass' : 'error', line, raw, kind === 'directory' ? 'Working directory resolved.' : 'Directory is absent or blocked in this snapshot.', `${next ?? 'outside root'}: ${kind}`);
        cwd = kind === 'directory' ? next : null; continue;
      }
      if (/^[A-Za-z_][A-Za-z_0-9]*=/.test(command!) || command === 'git' && tokens[1] === 'clone' || ['source', '.', 'pushd', 'popd', 'mkdir', 'eval'].includes(command!)) {
        add('RR000', 'skip', line, raw, 'Setup or shell state is not simulated; working directory becomes unknown.'); cwd = null; continue;
      }
      if (['npm', 'pnpm', 'yarn'].includes(command!) && tokens[1] === 'run') {
        if (!tokens[2] || tokens[2].startsWith('-') || tokens.some(t => /^(?:--workspace(?:=|$)|--workspaces$|-w$|--filter(?:=|$))/.test(t))) { add('RR002', 'skip', line, raw, 'Workspace selectors and dynamic script names are not supported.'); continue; }
        const separator = tokens.indexOf('--', 3);
        const options = tokens.slice(3, separator < 0 ? undefined : separator);
        if (options.some(t => t.startsWith('-'))) { add('RR002', 'skip', line, raw, 'Package-manager options (including directory overrides) are not interpreted.'); continue; }
        let dir = cwd; let manifest = '';
        while (true) {
          const candidate = resolvePath(dir, 'package.json')!; const kind = await workspace.inspect(candidate);
          if (kind === 'file') { manifest = candidate; break; }
          if (kind === 'blocked') { add('RR002', 'error', line, raw, 'Manifest is a blocked file.', candidate); break; }
          if (dir === '.') break; dir = parent(dir);
        }
        if (!manifest) { if (findings.at(-1)?.line !== line) add('RR002', 'error', line, raw, 'No package.json found in this directory or repository ancestors.'); continue; }
        let pkg: {scripts?: unknown};
        try { pkg = JSON.parse(await workspace.readText(manifest)); if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error(); }
        catch { add('RR002', 'error', line, raw, 'Manifest is unreadable or invalid JSON.', manifest); continue; }
        const scripts = pkg.scripts && typeof pkg.scripts === 'object' && !Array.isArray(pkg.scripts) ? pkg.scripts as Record<string, unknown> : {};
        const exists = Object.hasOwn(scripts, tokens[2]) && typeof scripts[tokens[2]] === 'string' && Boolean((scripts[tokens[2]] as string).trim());
        if (!exists && command === 'npm' && (['env','restart'].includes(tokens[2]) || tokens[2]==='start' && await workspace.inspect(resolvePath(parent(manifest),'server.js')!)==='file')) { add('RR002','skip',line,raw,'npm built-in/default lifecycle behavior is not validated.',manifest);continue; }
        add('RR002', exists ? 'pass' : 'error', line, raw, exists ? 'Script is declared; its body is not executed.' : 'Named script is not declared as a nonempty string.', manifest, exists ? [] : Object.keys(scripts).slice(0, 8)); continue;
      }
      let pip = tokens;
      if (/^python(?:3)?$/.test(command!) && tokens[1] === '-m' && tokens[2] === 'pip') pip = ['pip', ...tokens.slice(3)];
      if (['pip', 'pip3'].includes(pip[0]!) && pip[1] === 'install' && pip.some(t => t === '-r' || t === '--requirement' || t.startsWith('--requirement='))) {
        for (let j = 2; j < pip.length; j++) {
          const arg = pip[j]!;
          if (arg === '-r' || arg === '--requirement') {
            const value = pip[++j];
            if (!value || value.startsWith('-')) add('RR004', 'error', line, raw, 'Requirements flag needs a literal filename.');
            else await checkRequirement(value, line, raw, cwd);
          } else if (arg.startsWith('--requirement=')) await checkRequirement(arg.slice(14), line, raw, cwd);
        }
        continue;
      }
      if (/^python(?:3)?$/.test(command!) && tokens[1]?.endsWith('.py') && !tokens[1].startsWith('-')) {
        await checkFile('RR003', cwd, tokens[1], line, raw); continue;
      }
      add('RR000', 'skip', line, raw, 'Command is outside the supported static checks.');
    }
  }
  findings.sort((a, b) => a.line - b.line);
  const errors = findings.filter(f => f.outcome === 'error').length;
  const passed = findings.filter(f => f.outcome === 'pass').length;
  const skipped = findings.filter(f => f.outcome === 'skip').length;
  return { schemaVersion: 1, file, status: errors ? 'failed' : skipped || !passed ? 'partial' : 'passed', summary: { checked: errors + passed, errors, passed, skipped }, findings, scope: SCOPE };
}
export function memoryWorkspace(files: Record<string, string>): Workspace {
  return {
    async inspect(path) { return Object.hasOwn(files, path) ? 'file' : path === '.' || Object.keys(files).some(k => k.startsWith(path + '/')) ? 'directory' : 'missing'; },
    async readText(path) { if (!Object.hasOwn(files, path)) throw new Error('File unavailable'); return files[path]!; },
    async list(path) { const prefix = path === '.' ? '' : path + '/'; return Object.keys(files).filter(k => k.startsWith(prefix) && !k.slice(prefix.length).includes('/')).map(k => k.slice(prefix.length)); }
  };
}
