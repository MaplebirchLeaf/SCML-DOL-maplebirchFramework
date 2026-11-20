import type { MaplebirchCore } from '../../core';
import dol from '../../host/DoL';

class Options {
  private installed = false;

  public constructor(private readonly core: MaplebirchCore) {}

  public install(): void {
    if (this.installed) return;
    this.installed = true;
    $(document).on(
      'change',
      [
        'select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]',
        'select[name="lanListbox-optionsmaplebirchnpcsidebarfacestyle"]',
        'select[name="lanListbox-optionsmaplebirchcharactercharartselect"]',
        'select[name="lanListbox-optionsmaplebirchcharactercloseupselect"]'
      ].join(', '),
      () => this.refresh()
    );
    $(document).on('change', 'select.maplebirch-npc-model-primary, select.maplebirch-npc-model-secondary', event => {
      const select = event.currentTarget as HTMLSelectElement;
      const sidebar = dol.variables.options.maplebirch.npcsidebar;
      // 保留刚选的 NPC，清空另一侧的重复选项。
      if (sidebar.primary_npc && sidebar.primary_npc === sidebar.secondary_npc) {
        const primaryChanged = select.classList.contains('maplebirch-npc-model-primary');
        if (primaryChanged) sidebar.secondary_npc = '';
        else sidebar.primary_npc = '';
        const previous = document.querySelector<HTMLSelectElement>(primaryChanged ? 'select.maplebirch-npc-model-secondary' : 'select.maplebirch-npc-model-primary');
        if (previous) previous.selectedIndex = 0;
      }
      this.sidebar();
    });
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacevariant"]', () => this.sidebar());
    $(document).on('change', 'input[name*="optionsmaplebirchcharacterpet"]', () => this.pet());
    $(document).on('change', 'input[name*="optionsmaplebirchnpcsidebarpet"]', () => this.sidebar());
    $(document).on('change', 'input[name*="optionsmaplebirchpetlocked"]', () => {
      if (!this.ready) return;
      this.pet();
      try {
        this.core.npc.Sidebar.pet.sync();
      } catch (error) {
        this.report('NPC pet canvas update error:', error);
      }
    });
  }

  private get ready(): boolean {
    return this.core.services.modules.initPhase.preInitCompleted;
  }

  private report(message: string, error: unknown): void {
    this.core.infra.diagnostics.write(message, 'ERROR', 'options', error);
  }

  private refresh(): void {
    if (!this.ready) return;
    try {
      $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>');
    } catch (error) {
      this.report('选项界面刷新错误:', error);
    }
  }

  private sidebar(): void {
    if (!this.ready) return;
    try {
      $.wiki('<<updatesidebarimg>>');
    } catch (error) {
      this.report('Sidebar canvas update error:', error);
    }
  }

  private pet(): void {
    if (!this.ready) return;
    try {
      this.core.char.pet.sync();
    } catch (error) {
      this.report('Pet canvas update error:', error);
    }
  }
}

export default Options;
