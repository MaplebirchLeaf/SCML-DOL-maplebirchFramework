import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import Diagnostics from '../../infra/Diagnostics';
import type Modules from '../Modules';

type FileType = 'Module' | 'Script';

export interface FileConfig {
  module?: unknown;
  script?: unknown;
}

export interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}

class Files {
  public readonly scripts: FileItem[] = [];
  public readonly modules: FileItem[] = [];
  private modulesReady = false;
  private scriptsReady = false;

  public constructor(
    private readonly scope: Modules,
    private readonly disabled: () => readonly string[],
    private readonly log: (message: string, level: 'WARN' | 'ERROR', error?: unknown) => void
  ) {}

  public get started(): boolean {
    return this.modulesReady;
  }

  public async load(modName: string, modZip: ModZipReader, config: FileConfig): Promise<void> {
    const late = this.modulesReady;
    await this.read(modName, modZip, config.module, 'Module', late);
    await this.read(modName, modZip, config.script, 'Script', late);
  }

  public async run(type: FileType): Promise<void> {
    if (type === 'Module') {
      await this.execute(this.modules, type);
      this.modulesReady = true;
    } else {
      await this.execute(this.scripts, type);
      this.scriptsReady = true;
    }
  }

  private async read(modName: string, modZip: ModZipReader, paths: unknown, type: FileType, late: boolean): Promise<void> {
    if (!Array.isArray(paths)) return;
    const target = type === 'Module' ? this.modules : this.scripts;
    const loaded: FileItem[] = [];
    for (const filePath of paths) {
      if (typeof filePath !== 'string') {
        this.log(`${type} 文件路径无效: ${String(filePath)} (来自 ${modName})`, 'WARN');
        continue;
      }
      try {
        if (target.some(file => file.modName === modName && file.filePath === filePath)) continue;
        const file = modZip.zip.file(filePath);
        if (!file) {
          this.log(`${type} 文件未找到: ${filePath} (来自 ${modName})`, 'WARN');
          continue;
        }
        const entry = { modName, filePath, content: await file.async('string') };
        target.push(entry);
        if (late) loaded.push(entry);
      } catch (error) {
        this.log(`加载 ${type} 文件失败: ${filePath} (来自 ${modName}): ${Diagnostics.message(error)}`, 'ERROR', error);
      }
    }
    // 晚到的文件立即执行，普通脚本仍须等到脚本阶段开始。
    if (loaded.length && (type === 'Module' || this.scriptsReady)) await this.execute(loaded, type);
  }

  private async execute(files: FileItem[], type: FileType): Promise<void> {
    if (!files.length) return;
    const disabled = type === 'Script' ? new Set(this.disabled()) : null;
    for (const file of files) {
      const key = `[${file.modName}]:${file.filePath}`;
      if (disabled?.has(key)) {
        file.content = '';
        continue;
      }
      const run = async () => {
        const func = new Function(file.content);
        const result: unknown = func();
        if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') await result;
      };
      try {
        if (type === 'Module') await this.scope.with(file.modName, run);
        else await run();
      } catch (error) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${Diagnostics.message(error)}`, 'ERROR', error);
      } finally {
        file.content = '';
      }
    }
  }
}

export default Files;
