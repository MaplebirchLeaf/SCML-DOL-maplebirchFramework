import type ModLoader from '../host/ModLoader';
import dol from '../host/DoL';
import type Translator from '../services/Translator';

class ModI18N {
  private installed = false;

  public constructor(
    private readonly translator: Translator,
    private readonly modloader: ModLoader
  ) {}

  public install(): void {
    if (this.installed || !this.modloader.modUtils.getModListNameNoAlias().includes('ModI18N')) return;
    for (const key of ['NPC_CN_NAME', 'NPC_CN_TITLE'] as const) {
      const original = dol.setup[key];
      if (typeof original !== 'function') continue;
      dol.setup[key] = (text: string) => {
        if (!text || typeof text !== 'string') return text;
        const result = original(text);
        return result !== text ? result : this.translator.has(text) ? this.translator.auto(text) : text;
      };
    }
    this.installed = true;
  }
}

export default ModI18N;
