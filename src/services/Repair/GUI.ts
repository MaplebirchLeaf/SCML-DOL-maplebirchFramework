// ./src/services/Repair/GUI.ts

import { Config, Languages } from '../../constants';
import type Repair from '../Repair';
import type { RepairMemory } from '../Repair';
import type Translator from '../Translator';
import type { RepairConnectionInput } from './Connection';
import type { RepairOverlay } from './Engine';
import type { RepairRecipe } from './Recipe';

type RepairStatus = keyof typeof Config.RepairStatus;

export default class RepairGUI {
  private static readonly ANALYSIS_TIMEOUT = 900000;

  public readonly connection: RepairConnectionInput;
  public tab: 'analysis' | 'connection' | 'memory' = 'analysis';
  public busy = false;
  public models: string[] = [];
  public manualModel = true;
  public status: string[] = [];
  public reason = '';
  public proposal?: RepairRecipe;
  public overlays: RepairOverlay[] = [];
  public memories: RepairMemory[] = [];
  private controller?: AbortController;
  private dialog?: HTMLDialogElement;
  private destroyed = false;

  public constructor(
    private readonly repair: Repair,
    private readonly translator: Translator,
    private readonly refresh: () => void
  ) {
    this.connection = repair.connection;
  }

  public get connectionSaved(): boolean {
    return this.repair.connectionSaved;
  }

  public async open(): Promise<void> {
    if (this.destroyed) return;
    const dialog = document.getElementById('maplebirch-repair');
    if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
    this.dialog = dialog;
    dialog.onclose = () => this.controller?.abort('cancelled');
    dialog.showModal();
    if (!this.connection.apiUrl || !this.connection.model) this.tab = 'connection';
    try {
      await this.refreshMemory();
      if (this.repair.storageError) this.status = Config.RepairStatus.storage;
    } catch {
      this.status = Config.RepairStatus.storage;
    } finally {
      if (!this.destroyed) this.refresh();
    }
  }

  public close(): void {
    this.controller?.abort('cancelled');
    this.dialog?.close();
  }

  public destroy(): void {
    this.destroyed = true;
    this.close();
  }

  public changeApi(): void {
    this.models = [];
    this.manualModel = true;
    this.connection.model = '';
    this.proposal = undefined;
    this.overlays = [];
    this.status = [];
    this.reason = '';
  }

  public fetchModels(): Promise<void> {
    return this.run(
      'loadingModels',
      async signal => {
        const response = await this.repair.fetchModels(signal);
        if (!signal.aborted && !this.destroyed) {
          this.models = response.models;
          this.manualModel = !response.models.length;
        }
        return response.result === 'success' ? 'completed' : response.result;
      },
      'configuration',
      20000
    );
  }

  public saveConnection(): Promise<void> {
    return this.run(
      'saving',
      async () => {
        await this.repair.saveConnection();
        return 'completed';
      },
      'saveFailed'
    );
  }

  public testConnection(): Promise<void> {
    return this.run('testing', signal => this.repair.test(signal), 'configuration', 20000);
  }

  public analyze(): Promise<void> {
    return this.run(
      'analyzing',
      async signal => {
        this.proposal = undefined;
        this.overlays = [];
        const response = await this.repair.analyze(signal, this.translator.language);
        if (!signal.aborted && !this.destroyed) {
          this.reason = response.reason || '';
          if (response.result === 'success') {
            this.proposal = response.recipe;
            this.overlays = response.overlays ?? [];
          }
        }
        return response.result === 'success' ? (response.recipe?.outcome === 'insufficient-context' ? 'insufficient' : 'completed') : response.result;
      },
      'preflight',
      RepairGUI.ANALYSIS_TIMEOUT
    );
  }

  public stage(): Promise<void> {
    return this.run(
      'saving',
      async () => {
        await this.repair.stage();
        await this.refreshMemory();
        this.proposal = undefined;
        this.overlays = [];
        this.tab = 'memory';
        return 'reload';
      },
      'saveFailed'
    );
  }

  public toggle(memory: RepairMemory): Promise<void> {
    return this.updateMemory(() => this.repair.setEnabled(memory.id, !memory.enabled));
  }

  public remove(memory: RepairMemory): Promise<void> {
    return this.updateMemory(() => this.repair.remove(memory.id));
  }

  public confirm(memory: RepairMemory): Promise<void> {
    return this.updateMemory(() => this.repair.confirm(memory.id), 'completed');
  }

  public state(memory: RepairMemory): string {
    return Config.Repair.States[memory.state][Languages.indexOf(this.translator.language)];
  }

  private async refreshMemory(): Promise<void> {
    this.memories = await this.repair.list();
  }

  private updateMemory(task: () => Promise<void>, result: RepairStatus = 'reload'): Promise<void> {
    return this.run(
      'saving',
      async () => {
        await task();
        await this.refreshMemory();
        return result;
      },
      'storage'
    );
  }

  private async run(status: RepairStatus, task: (signal: AbortSignal) => Promise<RepairStatus>, failure: RepairStatus, timeout?: number): Promise<void> {
    if (this.destroyed || this.busy) return;
    this.busy = true;
    this.reason = '';
    this.status = Config.RepairStatus[status];
    const controller = (this.controller = new AbortController());
    const timer = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
    try {
      const result = await task(controller.signal);
      this.status = Config.RepairStatus[result];
    } catch {
      this.repair.write(`Repair GUI action failed: ${status}`, 'WARN');
      if (status === 'analyzing') this.reason = 'Repair analysis failed';
      this.status = Config.RepairStatus[this.repair.storageError ? 'storage' : failure];
    } finally {
      if (controller.signal.aborted) {
        this.reason = '';
        this.status = Config.RepairStatus[controller.signal.reason === 'cancelled' ? 'cancelled' : timeout === RepairGUI.ANALYSIS_TIMEOUT ? 'analysisTimeout' : 'timeout'];
      }
      clearTimeout(timer);
      this.controller = undefined;
      this.busy = false;
      if (!this.destroyed) this.refresh();
    }
  }
}
