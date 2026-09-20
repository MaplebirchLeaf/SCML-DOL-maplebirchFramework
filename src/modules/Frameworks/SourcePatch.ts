import { errorMessage } from '../../utils/error';
import type { PatchResult } from '../Addon/Diagnostics';

export interface SourcePatch {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
  expected?: number;
}

export interface SourcePatchResult extends Pick<PatchResult, 'pattern' | 'matches' | 'applied' | 'status' | 'expected' | 'error'> {
  content: string;
}

export function applySourcePatch(source: string, patch: SourcePatch): SourcePatchResult {
  const pattern = patch.src || patch.srcmatch || patch.srcmatchgroup;
  const result: SourcePatchResult = { content: source, pattern: String(pattern ?? ''), matches: 0, applied: 0, status: 'invalid', expected: patch.expected };
  if ([patch.src, patch.srcmatch, patch.srcmatchgroup].filter(value => value !== undefined).length !== 1) return result;
  if ([patch.to, patch.applyafter, patch.applybefore].filter(value => value !== undefined).length !== 1) return result;
  if (!pattern || (patch.to === undefined && patch.applyafter === undefined && patch.applybefore === undefined)) return result;
  if (patch.expected !== undefined && (!Number.isSafeInteger(patch.expected) || patch.expected < 0)) return result;
  try {
    const escaped = typeof pattern === 'string' ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern.source;
    const flags = typeof pattern === 'string' ? '' : pattern.flags;
    const candidates = new RegExp(escaped, flags.includes('g') ? flags : `${flags}g`);
    result.matches = [...source.matchAll(candidates)].length;
    if (patch.expected !== undefined && result.matches !== patch.expected) return { ...result, status: 'mismatch' };
    if (result.matches === 0) return { ...result, status: 'unmatched' };
    const all = pattern === patch.srcmatchgroup || flags.includes('g');
    const matcher = new RegExp(escaped, all && !flags.includes('g') ? `${flags}g` : flags);
    result.content =
      patch.to !== undefined ? source.replace(matcher, patch.to) : source.replace(matcher, match => (patch.applyafter !== undefined ? match + patch.applyafter : patch.applybefore + match));
    result.applied = all ? result.matches : 1;
    result.status = 'applied';
  } catch (error) {
    result.status = 'error';
    result.error = errorMessage(error);
  }
  return result;
}
