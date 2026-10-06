// ./src/services/Repair/Engine.ts

import { RepairRecipeParser, type RepairContext, type RepairRecipe, type RepairTarget } from './Recipe';
import { NativeJSON } from './Json';

export interface RepairOverlay {
  target: Omit<RepairTarget, 'content'>;
  before: string;
  after: string;
  fingerprint: string;
  replacement?: { before: string; after: string };
}

export class RepairEngine {
  public static async prepare(proposal: RepairRecipe, context: RepairContext, resolve: (target: RepairTarget) => string | undefined): Promise<RepairOverlay[]> {
    const recipe = RepairRecipeParser.parse(NativeJSON.stringify(proposal), context);
    if (recipe.outcome !== 'repair') return [];
    const targets = new Map(context.targets.map(target => [target.id, target]));
    const overlays: RepairOverlay[] = [];
    for (const operation of recipe.operations) {
      const target = targets.get(operation.targetId)!;
      const before = resolve(target);
      if (before === undefined || before !== target.content || (await RepairRecipeParser.fingerprint(before)) !== target.fingerprint) throw new Error(`Repair target changed: ${target.id}`);
      let after = before.split(operation.find).join(operation.replace);
      if (target.kind === 'twee-replacer') {
        const binding = NativeJSON.parse(after) as { passage: string; findString: string };
        after = NativeJSON.stringify({ passage: binding.passage, findString: binding.findString });
      } else if (target.kind === 'replace-patcher' && target.path.endsWith('|binding')) {
        const binding = NativeJSON.parse(after) as { passageName?: string; fileName?: string; from: string };
        after = NativeJSON.stringify(target.path.split('|')[2] === 'twee' ? { passageName: binding.passageName, from: binding.from } : { fileName: binding.fileName, from: binding.from });
      }
      const { content: _content, ...identity } = target;
      const replacement = RepairRecipeParser.rebase(target, operation.replace);
      overlays.push({ target: identity, before, after, fingerprint: await RepairRecipeParser.fingerprint(after), ...(replacement && { replacement }) });
    }
    if (overlays.some(overlay => resolve({ ...overlay.target, content: overlay.before }) !== overlay.before)) throw new Error('Repair inputs changed during preparation');
    return overlays;
  }
}
