// ./src/utils/twine.ts

import maplebirch from '../core';

export type Replacement = [RegExp, string];

type TwineAssetMode = 'append' | 'replace' | 'patch';

export function replace(content: string, replacements: Replacement[], label = 'replace'): string {
  const unmatched: number[] = [];
  let result = content;
  for (let i = 0; i < replacements.length; i++) {
    const [regex, replacement] = replacements[i];
    regex.lastIndex = 0;
    if (!regex.test(result)) {
      unmatched.push(i + 1);
      continue;
    }
    regex.lastIndex = 0;
    result = result.replace(regex, replacement);
  }
  if (unmatched.length) maplebirch.log(`${label}: 以下正则未匹配到内容 - ${unmatched.join(',')}`, 'WARN');
  return result;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/[\\/]+/g, '\\')
    .toLowerCase();
}

function findAsset(text: string, kind: string, targetName: string) {
  const regex = new RegExp(`^\\/\\*[ \\t]*${kind}[ \\t]+#(\\d+):[ \\t]*"([^"]+)"[ \\t]*\\*\\/[ \\t]*$`, 'gm');
  let maxId = 0;
  let found: {
    start: number;
    contentStart: number;
    end: number;
    id: number;
    name: string;
  } | null = null;
  let previous: RegExpExecArray | null = null;
  for (const match of text.matchAll(regex)) {
    const id = Number(match[1]);
    if (Number.isSafeInteger(id) && id > maxId) maxId = id;
    if (previous && normalizeName(previous[2]) === targetName) {
      found = {
        start: previous.index,
        contentStart: previous.index + previous[0].length,
        end: match.index,
        id: Number(previous[1]),
        name: previous[2]
      };
      break;
    }
    previous = match;
  }
  if (!found && previous && normalizeName(previous[2]) === targetName) {
    found = {
      start: previous.index,
      contentStart: previous.index + previous[0].length,
      end: text.length,
      id: Number(previous[1]),
      name: previous[2]
    };
  }
  return {
    found,
    maxId
  };
}

export function defineTwineAsset(type: 'script' | 'style', name: string, content: string | ((current: string) => string), mode: TwineAssetMode = 'append'): void {
  const story = document.getElementsByTagName('tw-storydata')[0];
  if (!story) return;
  const node = story.getElementsByTagName(type)[0];
  if (!node) return;
  const text = node.textContent ?? '';
  const kind = type === 'script' ? 'twine-user-script' : 'twine-user-stylesheet';
  const targetName = normalizeName(name);
  const { found, maxId } = findAsset(text, kind, targetName);
  if (found) {
    if (mode === 'append') return;
    const current = text
      .slice(found.contentStart, found.end)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, '');
    const next = typeof content === 'function' ? content(current) : content;
    const normalized = next.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    node.textContent = text.slice(0, found.start) + `/* ${kind} #${found.id}: "${found.name}" */\n` + `${normalized}\n` + text.slice(found.end).replace(/^\r?\n/, '');
    return;
  }
  if (mode === 'patch') {
    maplebirch.log(`Twine asset patch: 未找到资产 ${name}，已跳过追加以避免重复脚本`, 'WARN');
    return;
  }
  const next = typeof content === 'function' ? content('') : content;
  const normalized = next.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  const separator = !text ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  node.textContent = text + separator + `/* ${kind} #${maxId + 1}: "${name}" */\n` + normalized;
}
