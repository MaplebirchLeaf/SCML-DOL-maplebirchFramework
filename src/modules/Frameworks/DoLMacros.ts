import dol from '../../host/DoL';
import defineMacros from './macros';

export default class DoLMacros extends defineMacros {
  public statChange(statType: string, amount: number, colorClass: string, condition: () => boolean = () => true): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value === 0) return fragment;
    if (dol.variables.settings.blindStatsEnabled || !condition()) return fragment;
    const span = document.createElement('span');
    span.className = colorClass;
    span.textContent = `${value < 0 ? '- ' : '+ '}`.repeat(Math.abs(value)) + statType;
    fragment.appendChild(document.createTextNode(' | '));
    fragment.appendChild(span);
    return fragment;
  }

  public grace(amount: number, expectedRank?: string): DocumentFragment {
    const value = Math.trunc(Number(amount));
    const ranks = ['prospective', 'initiate', 'monk', 'priest', 'bishop'];
    const playerRank = ranks.indexOf(dol.variables.temple_rank);
    const expected = expectedRank == null ? -1 : ranks.indexOf(expectedRank);
    if (!Number.isFinite(value) || value === 0) return document.createDocumentFragment();
    if (dol.variables.settings.blindStatsEnabled) return document.createDocumentFragment();
    if (playerRank === -1) return document.createDocumentFragment();
    if (expected > 1 && playerRank >= expected) return document.createDocumentFragment();
    return this.statChange('Grace', value, value > 0 ? 'green' : 'red');
  }
}
