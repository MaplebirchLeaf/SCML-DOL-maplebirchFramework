import type { MaplebirchCore } from '../../core';
import dol from '../../host/DoL';

class OptionEvents {
  private installed = false;

  public constructor(private readonly core: MaplebirchCore) {}

  public install(): void {
    if (this.installed) return;
    this.installed = true;
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]', () => this.refreshOptions());
    $(document).on('change', 'select.maplebirch-npc-model-primary, select.maplebirch-npc-model-secondary', event => {
      const select = event.currentTarget as HTMLSelectElement;
      const sidebar = dol.variables.options.maplebirch.npcsidebar;
      if (sidebar.primary_npc && sidebar.primary_npc === sidebar.secondary_npc) {
        const primaryChanged = select.classList.contains('maplebirch-npc-model-primary');
        if (primaryChanged) sidebar.secondary_npc = '';
        else sidebar.primary_npc = '';
        const previous = document.querySelector<HTMLSelectElement>(primaryChanged ? 'select.maplebirch-npc-model-secondary' : 'select.maplebirch-npc-model-primary');
        if (previous) previous.selectedIndex = 0;
      }
      this.updateSidebar();
    });
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacestyle"]', () => this.refreshOptions());
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacevariant"]', () => this.updateSidebar());
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercharartselect"]', () => this.refreshOptions());
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercloseupselect"]', () => this.refreshOptions());
    $(document).on('change', 'input[name*="optionsmaplebirchcharacterpet"]', () => this.updatePet());
    $(document).on('change', 'input[name*="optionsmaplebirchnpcsidebarpet"]', () => this.updateSidebar());
    $(document).on('change', 'input[name*="optionsmaplebirchpetlocked"]', () => {
      if (!this.ready) return;
      this.updatePet();
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

  private refreshOptions(): void {
    if (!this.ready) return;
    try {
      $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>');
    } catch (error) {
      this.report('选项界面刷新错误:', error);
    }
  }

  private updateSidebar(): void {
    if (!this.ready) return;
    try {
      $.wiki('<<updatesidebarimg>>');
    } catch (error) {
      this.report('Sidebar canvas update error:', error);
    }
  }

  private updatePet(): void {
    if (!this.ready) return;
    try {
      this.core.char.pet.sync();
    } catch (error) {
      this.report('Pet canvas update error:', error);
    }
  }
}

export default OptionEvents;
