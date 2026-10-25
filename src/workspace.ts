import { lstat, realpath, readdir, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { MAX_TEXT_BYTES, resolvePath, type Workspace, type Kind } from './core.js';
export async function diskWorkspace(directory: string): Promise<Workspace> {
  const root = await realpath(resolve(directory));
  if (!(await lstat(root)).isDirectory()) throw new Error('Repository root must be a directory.');
  async function inspect(path: string): Promise<Kind> {
    const normalized = resolvePath('.', path); if (!normalized) return 'blocked';
    let current = root;
    try {
      const parts = normalized === '.' ? [] : normalized.split('/');
      for (let i = 0; i < parts.length; i++) {
        current = join(current, parts[i]!); const s = await lstat(current);
        if (s.isSymbolicLink() || (!s.isFile() && !s.isDirectory()) || (i < parts.length - 1 && !s.isDirectory())) return 'blocked';
      }
      const s = await lstat(current); return s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'blocked';
    } catch (e) { if (['ENOENT', 'ENOTDIR'].includes((e as NodeJS.ErrnoException).code ?? '')) return 'missing'; throw e; }
  }
  return {
    inspect,
    async readText(path) {
      if (await inspect(path) !== 'file') throw new Error('Only regular in-repository files can be read.');
      const target = join(root, path); const expected = await lstat(target);
      const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
      try {
        const actual = await handle.stat();
        if (!actual.isFile() || actual.ino !== expected.ino || actual.dev !== expected.dev || await inspect(path) !== 'file') throw new Error('File changed during inspection.');
        if (actual.size > MAX_TEXT_BYTES) throw new Error('Text input exceeds 2 MB limit.');
        const buffer = Buffer.alloc(MAX_TEXT_BYTES + 1); let size=0;
        while(size<buffer.length){const {bytesRead}=await handle.read(buffer,size,buffer.length-size,size);if(!bytesRead)break;size+=bytesRead;}
        if (size > MAX_TEXT_BYTES) throw new Error('Text input exceeds 2 MB limit.');
        const after=await handle.stat();
        if(after.size!==actual.size||after.mtimeMs!==actual.mtimeMs)throw new Error('File changed during inspection.');
        return new TextDecoder('utf-8', {fatal:true}).decode(buffer.subarray(0, size));
      } finally { await handle.close(); }
    },
    async list(path) { if (await inspect(path) !== 'directory') return []; return (await readdir(join(root, path),{withFileTypes:true})).filter(n => n.isFile()&&!n.name.startsWith('.')).slice(0, 200).map(n=>n.name).sort(); }
  };
}
