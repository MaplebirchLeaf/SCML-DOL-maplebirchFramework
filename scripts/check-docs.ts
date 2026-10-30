import path from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'acorn';
import { load } from 'js-yaml';
import { marked, type Tokens } from 'marked';

const root = path.join(import.meta.dir, '..');
const errors: string[] = [];
const headings = new Map<string, Set<string>>();
const references = new Map<string, Set<string>>();
let examples = 0;

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : entry.name.endsWith('.md') ? [file] : [];
  });
}

function report(file: string, message: string): void {
  errors.push(`${path.relative(root, file)}: ${message}`);
}

function anchors(file: string): Set<string> {
  const cached = headings.get(file);
  if (cached) return cached;
  const result = new Set<string>();
  const counts = new Map<string, number>();
  for (const token of marked.lexer(readFileSync(file, 'utf8'))) {
    if (token.type !== 'heading') continue;
    const slug = token.text
      .replace(/<[^>]*>/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}_\s-]/gu, '')
      .replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  headings.set(file, result);
  return result;
}

function columns(row: string): number {
  const content = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  let count = 1;
  let backslashes = 0;
  for (const char of content) {
    if (char === '|' && backslashes % 2 === 0) count++;
    backslashes = char === '\\' ? backslashes + 1 : 0;
  }
  return count;
}

function checkSource(file: string, source: string): void {
  let fence: { char: string; length: number } | undefined;
  for (const [index, line] of source.split('\n').entries()) {
    const delimiter = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (delimiter) {
      const [, marker, info] = delimiter;
      if (!fence) fence = { char: marker[0], length: marker.length };
      else if (marker[0] === fence.char && marker.length >= fence.length && !info.trim()) fence = undefined;
      continue;
    }
    if (fence) continue;
    if (/^\s*(?:[-*]\s+)?\+(?=\S)|^\s*(?:<<<<<<<|=======|>>>>>>>)/.test(line)) report(file, `line ${index + 1}: leftover patch marker`);
  }
  if (fence) report(file, 'unclosed code fence');
}

function checkExample(file: string, token: Tokens.Code): void {
  const language = token.lang?.split(/\s/)[0];
  const code = token.text;
  try {
    if (language === 'json') {
      try {
        JSON.parse(code);
      } catch {
        JSON.parse(`{${code}}`);
      }
    } else if (language === 'yaml' || language === 'yml') load(code);
    else if (language === 'javascript' || language === 'js') {
      try {
        parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
      } catch {
        parse(`({\n${code}\n})`, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
      }
    } else if (language === 'typescript' || language === 'ts') new Bun.Transpiler({ loader: 'ts' }).transformSync(code);
    else return;
    examples++;
  } catch (error) {
    report(file, `invalid ${language} example (${code.split('\n')[0]}): ${String(error)}`);
  }
}

const documents = [
  ...files(path.join(root, 'docs')),
  ...readdirSync(root)
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(root, name)),
  path.join(root, 'scripts/types-package/README.md')
];

for (const file of documents) {
  const source = readFileSync(file, 'utf8');
  checkSource(file, source);
  const tokens = marked.lexer(source);
  if (file.startsWith(path.join(root, 'docs') + path.sep) && tokens.filter(token => token.type === 'heading' && token.depth === 1).length !== 1) report(file, 'expected one top-level title');
  const targets = new Set<string>();
  references.set(file, targets);
  marked.walkTokens(tokens, token => {
    if (token.type === 'code') checkExample(file, token as Tokens.Code);
    if (token.type === 'table') {
      const table = token as Tokens.Table;
      for (const row of table.raw.trim().split('\n')) if (columns(row) !== table.header.length) report(file, `table column mismatch: ${row}`);
    }
    if (token.type !== 'link' && token.type !== 'image') return;
    const href = (token as Tokens.Link).href;
    if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return;
    const [relative, fragment] = href.split('#');
    const target = path.resolve(path.dirname(file), decodeURIComponent(relative.split('?')[0] || path.basename(file)));
    if (token.type === 'link') targets.add(target);
    if (!existsSync(target)) report(file, `missing link: ${href}`);
    else if (fragment && target.endsWith('.md') && !anchors(target).has(decodeURIComponent(fragment))) report(file, `missing heading: ${href}`);
  });
}

for (const language of ['CN', 'EN']) {
  const directory = path.join(root, 'docs', language);
  const index = path.join(directory, 'README.md');
  for (const file of files(directory)) if (file !== index && !references.get(index)?.has(file)) report(index, `topic missing from index: ${path.relative(directory, file)}`);
  const readme = path.join(root, language === 'CN' ? 'README.md' : 'README.EN.md');
  if (!references.get(readme)?.has(path.join(directory, 'Combat/Companions.md'))) report(readme, 'combat companion guide missing from feature catalog');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Checked ${documents.length} Markdown documents and ${examples} code examples.`);
