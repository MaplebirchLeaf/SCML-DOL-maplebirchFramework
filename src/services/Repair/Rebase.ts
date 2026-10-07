// ./src/services/Repair/Rebase.ts

import { diffArrays } from 'diff';

interface SourceEdit {
  start: number;
  end: number;
  text: string;
}

export class RepairRebase {
  private static readonly limit = 32000;

  private static unique(source: string, text: string): boolean {
    const start = source.indexOf(text);
    return !!text && start >= 0 && source.indexOf(text, start + 1) < 0;
  }

  private static inherited(original: string, replacement: string): { start: number; end: number } | undefined {
    const search = original.replaceAll('\r\n', '\n');
    const body = replacement.replaceAll('\r\n', '\n');
    const start = body.indexOf(search);
    if (start < 0) return;
    if (!RepairRebase.unique(body, search)) throw new Error('Ambiguous inherited source');
    return { start: RepairRebase.rawOffset(replacement, start), end: RepairRebase.rawOffset(replacement, start + search.length) };
  }

  private static rawOffset(source: string, position: number): number {
    let actual = 0;
    for (let index = 0; index < position; index++, actual++) {
      if (source[actual] === '\r' && source[actual + 1] === '\n') actual++;
    }
    return actual;
  }

  private static tokens(source: string): string[] {
    return (
      source.match(
        /"(?:\\[\s\S]|[^"\\])*(?:"|\\?$)|'(?:\\[\s\S]|[^'\\])*(?:'|\\?$)|`(?:\\[\s\S]|[^`\\])*(?:`|\\?$)|\/\*[\s\S]*?(?:\*\/|$)|<!--[\s\S]*?(?:-->|$)|\/%[\s\S]*?(?:%\/|$)|\/\/[^\r\n]*|\r\n|<<|>>|\[\[|\]\]|[$_\p{ID_Start}][$_\p{ID_Continue}]*(?:\.[$_\p{ID_Start}][$_\p{ID_Continue}]*)*|(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)n?|[\t ]+|[\s\S]/gu
      ) || []
    );
  }

  private static edits(original: string, updated: string): SourceEdit[] {
    const changes = diffArrays(RepairRebase.tokens(original), RepairRebase.tokens(updated.replaceAll('\r\n', '\n')), { maxEditLength: 2048, timeout: 100 });
    if (!changes) throw new Error('Source differences exceed migration limits');
    const edits: SourceEdit[] = [];
    let position = 0;
    let updatedPosition = 0;
    let edit: SourceEdit | undefined;
    for (const change of changes) {
      const text = change.value.join('');
      if (change.added || change.removed) {
        if (edits.length === 32) throw new Error('Too many source changes to migrate');
        edit ||= { start: position, end: position, text: '' };
        if (change.added) {
          const start = RepairRebase.rawOffset(updated, updatedPosition);
          updatedPosition += text.length;
          edit.text += updated.slice(start, RepairRebase.rawOffset(updated, updatedPosition));
        } else edit.end = position += text.length;
      } else {
        if (edit) edits.push(edit);
        edit = undefined;
        position += text.length;
        updatedPosition += text.length;
      }
    }
    if (edit) edits.push(edit);
    return edits.map(edit => RepairRebase.insertion(original, edit));
  }

  private static insertion(source: string, edit: SourceEdit): SourceEdit {
    if (edit.start !== edit.end || source.slice(edit.start - 2, edit.start) !== '<<' || !edit.text.endsWith('<<')) return edit;
    const text = '<<' + edit.text.slice(0, -2);
    return /^<<\s*set\b/.test(text) ? { start: edit.start - 2, end: edit.end - 2, text } : edit;
  }

  private static assignment(source: string): string | undefined {
    const match = /^\s*<<\s*set\s+((?:\$[A-Za-z_]\w*|_[A-Za-z]\w*)(?:\.[A-Za-z_$][\w$]*){0,8})\s*(?:to\s+|=\s*)(?:-?\d+(?:\.\d+)?|true|false|null)\s*>>\s*$/.exec(source);
    if (!match) return;
    const path = match[1];
    if (path.split('.').some(part => ['constructor', 'prototype', '__proto__'].includes(part))) return;
    return path;
  }

  private static independent(left: SourceEdit, right: SourceEdit): boolean {
    if (left.start !== left.end || right.start !== right.end || left.start !== right.start) return false;
    const a = RepairRebase.assignment(left.text);
    const b = RepairRebase.assignment(right.text);
    return !!a && !!b && a !== b && !a.startsWith(b + '.') && !b.startsWith(a + '.');
  }

  private static boundary(source: string, index: number): boolean {
    const before = source[index - 1] || '';
    const after = source[index] || '';
    if (['\r\n', '<<', '>>', '[[', ']]', '/*', '*/', '//'].includes(before + after)) return false;
    return !(/[\uD800-\uDBFF]/.test(before) && /[\uDC00-\uDFFF]/.test(after));
  }

  private static result(value: string): string {
    if (value.length > RepairRebase.limit) throw new Error('Rebased replacement exceeds size limit');
    return value;
  }

  private static complete(before: string, after: string): boolean {
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start++;
    let end = before.length;
    let updatedEnd = after.length;
    while (end > start && updatedEnd > start && before[end - 1] === after[updatedEnd - 1]) {
      end--;
      updatedEnd--;
    }
    return [start, end].every(position => RepairRebase.boundary(before, position)) && [start, updatedEnd].every(position => RepairRebase.boundary(after, position));
  }

  private static project(original: string, current: string, edit: SourceEdit, changes: SourceEdit[]): SourceEdit {
    const overlaps = changes.filter(change => !(edit.end < change.start || change.end < edit.start));
    if (overlaps.length && (overlaps.length !== 1 || !RepairRebase.independent(edit, overlaps[0]))) throw new Error('Mod and current source edits overlap');
    const insertion = overlaps[0]?.text.replaceAll('\r\n', '\n') || '';
    const preceding = changes.filter(change => change.end < edit.start);
    const following = changes.find(change => edit.end < change.start);
    const left = Math.max(0, edit.start - 64, preceding.length ? preceding.at(-1)!.end + 1 : 0);
    const right = Math.min(original.length, edit.end + 64, following ? following.start - 1 : original.length);
    const anchor = original.slice(left, right);
    const expected = anchor.slice(0, edit.start - left) + insertion + anchor.slice(edit.start - left);
    const shift = preceding.reduce((offset, change) => offset + change.text.length - (change.end - change.start), 0);
    if (!RepairRebase.unique(original, anchor) || !RepairRebase.unique(current, expected) || current.slice(left + shift, right + shift + insertion.length) !== expected)
      throw new Error('Mod edit has no unique unchanged context');
    return { start: edit.start + shift + insertion.length, end: edit.end + shift + insertion.length, text: edit.text };
  }

  public static apply(originalSearch: string, originalReplacement: string, currentSearch: string, inheritedBranch?: () => string | undefined): string {
    const sources = [originalSearch, originalReplacement, currentSearch];
    if (sources.some(value => typeof value !== 'string' || !value || value.length > RepairRebase.limit)) throw new Error('Invalid rebase source');
    if (sources.some(value => /\$(?:[$&'`\d]|<)/.test(value))) throw new Error('Replacement-string tokens cannot be rebased');
    if (originalSearch === currentSearch || originalSearch === originalReplacement) throw new Error('Rebase requires changed source and an existing mod edit');

    const branch = inheritedBranch?.();
    if (branch !== undefined) return RepairRebase.result(branch);

    const inherited = RepairRebase.inherited(originalSearch, originalReplacement);
    if (inherited) return RepairRebase.result(originalReplacement.slice(0, inherited.start) + currentSearch + originalReplacement.slice(inherited.end));

    const original = originalSearch.replaceAll('\r\n', '\n');
    const current = currentSearch.replaceAll('\r\n', '\n');
    const changes = RepairRebase.edits(original, current);
    const edits = RepairRebase.edits(original, originalReplacement).map(edit => {
      if (!RepairRebase.complete(original.slice(edit.start, edit.end), edit.text.replaceAll('\r\n', '\n'))) throw new Error('Mod edit splits a source token');
      return RepairRebase.project(original, current, edit, changes);
    });
    let result = currentSearch;
    for (const edit of edits.reverse()) {
      const start = RepairRebase.rawOffset(currentSearch, edit.start);
      const end = RepairRebase.rawOffset(currentSearch, edit.end);
      result = result.slice(0, start) + edit.text + result.slice(end);
    }
    return RepairRebase.result(result);
  }
}
