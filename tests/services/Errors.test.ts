import { expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(import.meta.dir, '..', '..', 'src');

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
    else if (entry.name.endsWith('.ts')) files.push(file);
  }
  return files;
}

test('source error handlers do not contain empty catch blocks', async () => {
  const empty: string[] = [];
  for (const file of await sourceFiles(root)) {
    const source = await readFile(file, 'utf8');
    for (const pattern of [/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g, /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g]) {
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        empty.push(`${path.relative(root, file)}:${line}`);
      }
    }
  }
  expect(empty).toEqual([]);
});
