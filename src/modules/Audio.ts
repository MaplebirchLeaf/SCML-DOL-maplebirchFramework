// ./src/modules/Audio.ts

import type { MaplebirchCore } from '../core';
import type { ScopedLog } from '../infra/Diagnostics';
import { Howler, type Howl, type HowlOptions } from 'howler';
import { bytesToBase64 } from '../utils/binary';
import Playlist, { PlayMode, type PlayModeType } from './AudioAddon/Playlist';
import Track from './AudioAddon/Track';
import Ambience from './AudioAddon/Ambience';
import Effects from './AudioAddon/Effects';
import Sound from './AudioAddon/Sound';

const PlayState = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped'
} as const;

type PlayStateType = (typeof PlayState)[keyof typeof PlayState];
type AudioConfig = string[];

const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm'] as const;
type AudioFormat = (typeof SUPPORTED_FORMATS)[number];
const FORMAT_SET = new Set<string>(SUPPORTED_FORMATS);

interface TrackMeta {
  title?: string;
  artist?: string;
}

interface AudioEventData {
  type: string;
  data?: unknown[];
  [key: string]: unknown;
}

type AudioEventHandler = (eventData: AudioEventData) => void;

interface AudioValue {
  arrayBuffer: ArrayBuffer;
  format: AudioFormat;
  title?: string;
  artist?: string;
}

interface AudioRecord {
  modName: string;
  audioName: string;
  value: AudioValue;
}

interface CacheEntry {
  howl: Howl;
  format: AudioFormat;
}

interface PendingLoad {
  promise: Promise<CacheEntry>;
  cancel(): void;
}

interface AudioProgress {
  currentTime: number;
  duration: number;
  percent: number;
}

interface AudioSnapshot {
  state: PlayStateType;
  track: Track | null;
  playlist: string;
  index: number;
  length: number;
  mode: PlayModeType;
  volume: number;
  muted: boolean;
  progress: AudioProgress;
}

class Audio {
  public readonly log!: ScopedLog;
  public readonly ambience: Ambience;
  public readonly effects: Effects;

  private readonly STORE = 'audio';

  private readonly playlists = new Map<string, Playlist>();
  private readonly playlistLoads = new Map<string, Promise<Playlist>>();
  private readonly eventListeners = new Map<string, Set<AudioEventHandler>>();
  private readonly cache = new Map<string, Map<string, CacheEntry>>();
  private readonly pendingLoads = new Map<string, PendingLoad>();
  private readonly modVolumes = new Map<string, number>();

  private activePlaylist: Playlist | null = null;
  private currentTrack: Track | null = null;
  private loadingTrack: Track | null = null;
  private currentHowl: Howl | null = null;
  private currentSoundId: number | null = null;
  private currentStarted = false;
  private state: PlayStateType = PlayState.IDLE;
  private volume = 1;
  private muted = false;
  private autoNext = true;

  private maxCache = 3;
  private cacheCount = 0;

  private playRequestId = 0;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private progressBindings = new Map<string, ReturnType<typeof setInterval>>();

  public constructor(readonly core: MaplebirchCore) {
    this.ambience = Object.seal(new Ambience(core.host.modLoader));
    this.effects = Object.seal(new Effects(core.host.modLoader, () => !this.muted && this.volume > 0));
    Howler.mute(this.muted);
    Howler.volume(this.volume);
    this.core.once(':indexedDB', () => this.initDB());
    this.core.on(':audio', (eventData: AudioEventData) => this.dispatch(eventData), 'audio manager');
    this.core.services.addonPlugin.hook<AudioConfig>('audio', async ({ modName, config }) => {
      for (const Folder of config) {
        const folder = Folder.trim()
          .replace(/\\/g, '/')
          .replace(/^\/+|\/+$/g, '');
        if (!folder) continue;
        await this.import(modName, folder);
      }
    });
  }

  private initDB(): void {
    this.core.idb(this.STORE, { keyPath: ['modName', 'audioName'] }, [
      {
        name: 'modName',
        keyPath: 'modName',
        options: { unique: false }
      },
      {
        name: 'audioName',
        keyPath: 'audioName',
        options: { unique: false }
      }
    ]);
  }

  protected on(event: string, handler: AudioEventHandler): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event)!.add(handler);
  }

  protected off(event: string, handler: AudioEventHandler): boolean {
    return this.eventListeners.get(event)?.delete(handler) || false;
  }

  protected once(event: string, handler: AudioEventHandler): void {
    const wrapper: AudioEventHandler = eventData => {
      this.off(event, wrapper);
      handler(eventData);
    };
    this.on(event, wrapper);
  }

  protected create(options: HowlOptions): Howl {
    if (!Howler.usingWebAudio) throw new Error('WebAudio is not available');
    return new Sound(options);
  }

  public async play(track: Track): Promise<boolean> {
    const requestId = ++this.playRequestId;
    try {
      if (this.loadingTrack) this.cancelLoad(this.loadingTrack.modName, this.loadingTrack.audioName);
      this.stopCurrent(false);
      this.state = PlayState.LOADING;
      this.loadingTrack = track;
      this.emit('loading', track);
      if (requestId !== this.playRequestId) return false;
      const { howl } = await this.load(track);
      if (requestId !== this.playRequestId) return false;
      if (this.cache.get(track.modName)?.get(track.audioName)?.howl !== howl) throw new Error(`音频加载已取消: ${track.modName}/${track.audioName}`);
      this.currentTrack = track;
      this.loadingTrack = null;
      this.currentHowl = howl;
      this.currentStarted = false;
      howl.volume(this.trackVolume);
      this.currentSoundId = howl.play();
      this.state = PlayState.PLAYING;
      this.startProgressTimer();
      this.emit('play', track);
      return true;
    } catch (error) {
      if (requestId === this.playRequestId) {
        this.currentHowl = null;
        this.currentSoundId = null;
        this.unloadCache(track.modName, track.audioName);
        this.state = PlayState.IDLE;
        this.currentTrack = null;
        this.loadingTrack = null;
        this.stopProgressTimer();
        this.emit('error', error, track);
        this.log(`播放失败: ${track.modName}/${track.audioName}`, 'ERROR', error);
      }
      return false;
    }
  }

  public pause(): boolean {
    if (!this.currentHowl || this.state !== PlayState.PLAYING) return false;
    if (this.currentStarted) this.currentHowl.pause();
    else {
      this.currentHowl = null;
      this.currentSoundId = null;
      this.unloadCache(this.currentTrack!.modName, this.currentTrack!.audioName);
    }
    this.state = PlayState.PAUSED;
    this.stopProgressTimer();
    this.emit('pause', this.currentTrack);
    return true;
  }

  public resume(): boolean {
    if (!this.currentTrack || this.state !== PlayState.PAUSED) return false;
    if (!this.currentHowl) {
      void this.play(this.currentTrack);
      return true;
    }
    this.currentStarted = false;
    try {
      this.currentSoundId = this.currentHowl.play();
    } catch (error) {
      this.handlePlaybackError(this.currentHowl, this.currentTrack, error);
      return false;
    }
    this.state = PlayState.PLAYING;
    this.startProgressTimer();
    this.emit('resume', this.currentTrack);
    return true;
  }

  public stop(): boolean {
    this.playRequestId++;
    if (this.loadingTrack) this.cancelLoad(this.loadingTrack.modName, this.loadingTrack.audioName);
    this.loadingTrack = null;
    return this.stopCurrent(true);
  }

  public togglePlayPause(): void {
    if (this.state === PlayState.PLAYING) {
      this.pause();
      return;
    }
    if (this.state === PlayState.PAUSED) this.resume();
  }

  public async next(): Promise<boolean> {
    const track = this.activePlaylist?.next();
    return track ? await this.play(track) : false;
  }

  public async previous(): Promise<boolean> {
    const track = this.activePlaylist?.previous();
    return track ? await this.play(track) : false;
  }

  public async playAt(modName: string, index: number): Promise<boolean> {
    const playlist = await this.getPlaylist(modName);
    this.activePlaylist = playlist;
    const track = playlist.select(index);
    return track ? await this.play(track) : false;
  }

  public seek(percent: number): boolean {
    const duration = this.duration;
    if (!this.currentHowl || duration <= 0) return false;
    const safePercent = Math.clamp(percent, 0, 100);
    const targetTime = (safePercent / 100) * duration;
    this.currentHowl.seek(targetTime);
    this.emit('seek', targetTime, duration, this.progress.percent);
    return true;
  }

  public seekTo(seconds: number): boolean {
    const duration = this.duration;
    if (!this.currentHowl || duration <= 0) return false;
    const targetTime = Math.clamp(seconds, 0, duration);
    this.currentHowl.seek(targetTime);
    this.emit('seek', targetTime, duration, this.progress.percent);
    return true;
  }

  public async getPlaylist(modName: string): Promise<Playlist> {
    const pending = this.playlistLoads.get(modName);
    if (pending) return pending;
    const cached = this.playlists.get(modName);
    if (cached) return cached;
    const playlist = this.playlist(modName);
    const task = Promise.resolve().then(async () => {
      const records = await this.readRecords(modName);
      if (this.playlistLoads.get(modName) !== task) return playlist;
      playlist.clear();
      playlist.add(
        records
          .filter(record => !/^(?:ambience|sfx|voice)\//i.test(record.audioName))
          .map(record => {
            const track = new Track(record.audioName, record.modName, {
              title: record.value.title,
              artist: record.value.artist
            });
            track.format = record.value.format;
            return track;
          })
      );
      return playlist;
    });
    this.playlistLoads.set(modName, task);
    try {
      return await task;
    } finally {
      if (this.playlistLoads.get(modName) === task) this.playlistLoads.delete(modName);
    }
  }

  public async playFromMod(modName: string, audioName?: string): Promise<boolean | string> {
    const playlist = await this.getPlaylist(modName);
    this.activePlaylist = playlist;
    if (playlist.length <= 0) return false;
    const index = audioName ? playlist.tracks.findIndex(track => track.audioName === audioName) : 0;
    if (index < 0) {
      this.log(`播放失败，模组 ${modName} 中没有音频: ${audioName}`, 'WARN');
      return false;
    }
    const track = playlist.select(index);
    if (!track) return false;
    const success = await this.play(track);
    return success ? modName : false;
  }

  public async import(modName: string, audioFolder = 'audio'): Promise<boolean> {
    const folder = audioFolder.replace(/^\/+|\/+$/g, '');
    const prefix = `${folder}/`;
    const modZip = this.core.host.modLoader.modLoader?.getModZip(modName);
    if (!modZip?.modInfo?.bootJson?.additionFile) return false;
    const audioFiles: Array<{
      path: string;
      audioName: string;
      format: AudioFormat;
    }> = [];
    for (const path of modZip.modInfo.bootJson.additionFile as string[]) {
      if (!path.startsWith(prefix)) continue;
      const format = path.split('.').pop()?.toLowerCase();
      if (!FORMAT_SET.has(format || '')) continue;
      const relativePath = path.substring(prefix.length);
      const dotIndex = relativePath.lastIndexOf('.');
      const audioName = dotIndex > 0 ? relativePath.substring(0, dotIndex) : relativePath;
      audioFiles.push({
        path,
        audioName,
        format: format as AudioFormat
      });
    }
    let successCount = 0;
    for (const { path, audioName, format } of audioFiles) {
      const file = modZip.zip.file(path);
      if (!file) continue;
      try {
        const uint8 = await file.async('uint8array');
        const arrayBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;
        if (await this.save(modName, audioName, arrayBuffer, format)) successCount++;
      } catch (error) {
        this.log(`加载失败: ${modName}/${path}`, 'WARN', error);
      }
    }
    this.playlistLoads.delete(modName);
    this.playlists.delete(modName);
    await this.getPlaylist(modName);
    this.log(`导入 ${successCount}/${audioFiles.length} 个音频`, 'DEBUG');
    return successCount > 0;
  }

  public async addFile(file: File, modName = 'custom'): Promise<boolean | string> {
    if (!file) return false;
    const format = file.name.split('.').pop()?.toLowerCase();
    if (!FORMAT_SET.has(format || '')) return false;
    const dotIndex = file.name.lastIndexOf('.');
    const audioName = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;
    const arrayBuffer = await file.arrayBuffer();
    const success = await this.save(modName, audioName, arrayBuffer, format as AudioFormat);
    if (!success) return false;
    const playlist = await this.getPlaylist(modName);
    const track = new Track(audioName, modName);
    track.format = format as AudioFormat;
    playlist.add(track);
    return modName;
  }

  public async delete(modName: string, audioName: string): Promise<boolean> {
    if (this.currentTrack?.modName === modName && this.currentTrack.audioName === audioName) this.stop();
    try {
      await this.core.with([this.STORE], 'readwrite', async tx => await tx.objectStore(this.STORE).delete([modName, audioName]));
      this.unloadCache(modName, audioName);
      this.playlists.get(modName)?.remove(audioName);
      return true;
    } catch (error) {
      this.log(`删除音频失败: ${modName}/${audioName}`, 'ERROR', error);
      return false;
    }
  }

  public async clearAudio(modName: string): Promise<boolean | string> {
    try {
      if (this.currentTrack?.modName === modName) this.stop();
      const records = await this.readRecords(modName);
      await this.core.with([this.STORE], 'readwrite', async tx => {
        const store = tx.objectStore(this.STORE);
        for (const record of records) {
          await store.delete([record.modName, record.audioName]);
          this.unloadCache(record.modName, record.audioName);
        }
      });
      this.playlistLoads.delete(modName);
      this.playlists.delete(modName);
      if (this.activePlaylist?.name === modName) this.activePlaylist = null;
      return modName;
    } catch (error) {
      this.log(`清空模组音频失败: ${modName}`, 'ERROR', error);
      return false;
    }
  }

  public clearCache(): void {
    this.stop();
    for (const pending of this.pendingLoads.values()) pending.cancel();
    this.pendingLoads.clear();
    for (const modCache of this.cache.values()) for (const entry of modCache.values()) this.release(entry);
    this.cache.clear();
    this.cacheCount = 0;
  }

  public destroy(): void {
    this.ambience.stop(0);
    this.effects.destroy();
    this.clearCache();
    for (const timer of this.progressBindings.values()) clearInterval(timer);
    this.progressBindings.clear();
    this.eventListeners.clear();
    this.playlistLoads.clear();
    this.playlists.clear();
    this.activePlaylist = null;
    this.currentTrack = null;
    this.currentHowl = null;
  }

  public playlist(modName: string): Playlist {
    let playlist = this.playlists.get(modName);
    if (!playlist) {
      playlist = new Playlist(modName);
      this.playlists.set(modName, playlist);
    }
    return playlist;
  }

  public get Mute(): boolean {
    return this.muted;
  }

  public set Mute(value: boolean) {
    if (this.muted === value) return;
    this.muted = value;
    if (value) this.effects.stop();
    Howler.mute(value);
    this.currentHowl?.volume(this.trackVolume);
    this.emit('mutechange', value);
  }

  public get Volume(): number {
    return this.volume;
  }

  public set Volume(value: number) {
    const volume = Math.clamp(value, 0, 1);
    if (this.volume === volume) return;
    this.volume = volume;
    if (!volume) this.effects.stop();
    Howler.volume(volume);
    this.currentHowl?.volume(this.trackVolume);
    this.emit('volumechange', volume);
  }

  /** Set a mod's music multiplier without changing the master volume. */
  public setModVolume(modName: string, value: number): void {
    const volume = Number.isFinite(value) ? Math.clamp(value, 0, 1) : 0;
    if ((this.modVolumes.get(modName) ?? 1) === volume) return;
    if (volume === 1) this.modVolumes.delete(modName);
    else this.modVolumes.set(modName, volume);
    if (this.currentTrack?.modName === modName) this.currentHowl?.volume(this.trackVolume);
    this.emit('modvolumechange', modName, volume);
  }

  public get PlayMode(): PlayModeType {
    return this.activePlaylist?.playMode || PlayMode.LOOP_ALL;
  }

  public set PlayMode(mode: PlayModeType) {
    if (!this.activePlaylist) return;
    this.activePlaylist.setMode(mode);
    this.emit('modechange', mode);
  }

  public cyclePlayMode(): PlayModeType {
    const nextMode =
      this.PlayMode === PlayMode.SEQUENTIAL
        ? PlayMode.LOOP_ALL
        : this.PlayMode === PlayMode.LOOP_ALL
          ? PlayMode.LOOP_ONE
          : this.PlayMode === PlayMode.LOOP_ONE
            ? PlayMode.SHUFFLE
            : PlayMode.SEQUENTIAL;
    this.PlayMode = nextMode;
    return nextMode;
  }

  public get AutoNext(): boolean {
    return this.autoNext;
  }

  public set AutoNext(value: boolean) {
    this.autoNext = value;
  }

  public get State(): PlayStateType {
    return this.state;
  }

  public get CurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public get ActivePlaylist(): Playlist | null {
    return this.activePlaylist;
  }

  public get currentTime(): number {
    if (!this.currentHowl) return 0;
    const value = this.currentHowl.seek();
    return typeof value === 'number' ? value : 0;
  }

  public get duration(): number {
    if (!this.currentHowl) return 0;
    const value = this.currentHowl.duration();
    return typeof value === 'number' ? value : 0;
  }

  public get progress(): AudioProgress {
    const currentTime = this.currentTime;
    const duration = this.duration;
    return {
      currentTime,
      duration,
      percent: duration > 0 ? Math.clamp((currentTime / duration) * 100, 0, 100) : 0
    };
  }

  public get snapshot(): AudioSnapshot {
    return {
      state: this.state,
      track: this.currentTrack,
      playlist: this.activePlaylist?.name || '',
      index: this.activePlaylist?.currentIndex ?? -1,
      length: this.activePlaylist?.length ?? 0,
      mode: this.PlayMode,
      volume: this.volume,
      muted: this.muted,
      progress: this.progress
    };
  }

  public formatTime(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  public bindProgress(sliderId: string, timeId: string, interval = 250): void {
    const key = `${sliderId}:${timeId}`;
    const update = () => {
      const slider = document.getElementById(sliderId) as HTMLInputElement | null;
      const time = document.getElementById(timeId);
      if (!slider || !time) {
        this.unbindProgress(sliderId, timeId);
        return;
      }
      const { currentTime, duration, percent } = this.progress;
      if (document.activeElement !== slider) slider.value = String(percent);
      time.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
      if (!this.currentTrack || this.state === PlayState.IDLE || this.state === PlayState.STOPPED) this.unbindProgress(sliderId, timeId);
    };

    this.unbindProgress(sliderId, timeId);
    const timer = setTimeout(() => {
      const slider = document.getElementById(sliderId) as HTMLInputElement | null;
      if (slider) {
        slider.oninput = () => {
          this.seek(Number(slider.value));
          update();
        };
      }
      update();
      this.progressBindings.set(key, setInterval(update, interval));
    }, 0);
    this.progressBindings.set(key, timer);
  }

  public unbindProgress(sliderId: string, timeId: string): void {
    const key = `${sliderId}:${timeId}`;
    const timer = this.progressBindings.get(key);
    if (!timer) return;
    clearInterval(timer);
    this.progressBindings.delete(key);
    const slider = document.getElementById(sliderId) as HTMLInputElement | null;
    if (slider) slider.oninput = null;
  }

  public async preInit(): Promise<void> {
    const records = await this.readRecords();
    this.playlistLoads.clear();
    this.playlists.clear();
    const groups = new Map<string, AudioRecord[]>();
    for (const record of records) {
      if (!groups.has(record.modName)) groups.set(record.modName, []);
      groups.get(record.modName)!.push(record);
    }
    for (const [modName, modRecords] of groups) {
      const playlist = new Playlist(modName);
      playlist.add(
        modRecords
          .filter(record => !/^(?:ambience|sfx|voice)\//i.test(record.audioName))
          .map(record => {
            const track = new Track(record.audioName, record.modName, {
              title: record.value.title,
              artist: record.value.artist
            });
            track.format = record.value.format;
            return track;
          })
      );
      this.playlists.set(modName, playlist);
    }
  }

  private async load(track: Track): Promise<CacheEntry> {
    let entry = this.cache.get(track.modName)?.get(track.audioName);
    if (!entry) {
      const key = JSON.stringify([track.modName, track.audioName]);
      let pending = this.pendingLoads.get(key);
      if (!pending) {
        let loading: Howl | undefined;
        let cancel: (() => void) | undefined;
        const task: PendingLoad = {
          promise: null!,
          cancel: () => {
            cancel?.();
            loading?.off();
            loading?.unload();
          }
        };
        task.promise = Promise.resolve()
          .then(async () => {
            const record = await this.core.with([this.STORE], 'readonly', async tx => await tx.objectStore(this.STORE).get([track.modName, track.audioName]));
            if (this.pendingLoads.get(key) !== task) throw new Error(`音频加载已取消: ${track.modName}/${track.audioName}`);
            if (!record) throw new Error(`音频不存在: ${track.modName}/${track.audioName}`);
            const { arrayBuffer, format } = (record as AudioRecord).value;
            const howl = await new Promise<Howl>((resolve, reject) => {
              cancel = () => reject(new Error(`音频加载已取消: ${track.modName}/${track.audioName}`));
              loading = this.create({
                src: [`data:audio/${format};base64,${bytesToBase64(new Uint8Array(arrayBuffer))}`],
                format: [format],
                volume: this.trackVolume,
                pool: 1,
                onload: () => resolve(loading!),
                onloaderror: (_id, error) => reject(error),
                onplay: id => {
                  if (this.currentHowl === loading && this.currentSoundId === id) this.currentStarted = true;
                },
                onplayerror: (id, error) => {
                  if (this.currentHowl === loading && this.currentSoundId === id) this.handlePlaybackError(loading!, track, error);
                },
                onend: id => {
                  if (this.currentHowl === loading && this.currentSoundId === id) this.handleTrackEnd(track);
                }
              });
            });
            // A cleared or replaced task must not recreate an unloaded cache entry.
            if (this.pendingLoads.get(key) !== task) throw new Error(`音频加载已取消: ${track.modName}/${track.audioName}`);
            const loaded: CacheEntry = { howl, format };
            this.cacheAudio(track.modName, track.audioName, loaded);
            return loaded;
          })
          .catch(error => {
            loading?.off();
            loading?.unload();
            throw error;
          });
        this.pendingLoads.set(key, task);
        pending = task;
      }
      try {
        entry = await pending.promise;
      } finally {
        if (this.pendingLoads.get(key) === pending) this.pendingLoads.delete(key);
      }
    }
    track.format = entry.format;
    track.duration = entry.howl.duration();
    entry.howl.volume(this.trackVolume);
    return entry;
  }

  private async save(modName: string, audioName: string, arrayBuffer: ArrayBuffer, format: AudioFormat, meta: TrackMeta = {}): Promise<boolean> {
    try {
      const record: AudioRecord = {
        modName,
        audioName,
        value: {
          arrayBuffer,
          format,
          title: meta.title,
          artist: meta.artist
        }
      };
      await this.core.with([this.STORE], 'readwrite', async tx => await tx.objectStore(this.STORE).put(record));
      this.unloadCache(modName, audioName);
      return true;
    } catch (error) {
      this.log(`存储音频失败: ${modName}/${audioName}`, 'ERROR', error);
      return false;
    }
  }

  private async readRecords(modName?: string): Promise<AudioRecord[]> {
    try {
      const records = await this.core.with([this.STORE], 'readonly', async tx => {
        const store = tx.objectStore(this.STORE);
        if (modName) return await store.index('modName').getAll(modName);
        return await store.getAll();
      });
      return records as AudioRecord[];
    } catch (error) {
      this.log('读取音频记录失败', 'WARN', error);
      return [];
    }
  }

  private cacheAudio(modName: string, audioName: string, entry: CacheEntry): void {
    let modCache = this.cache.get(modName);
    if (!modCache) {
      modCache = new Map<string, CacheEntry>();
      this.cache.set(modName, modCache);
    }
    if (modCache.has(audioName)) {
      this.release(entry);
      return;
    }
    modCache.set(audioName, entry);
    this.cacheCount++;
    this.trimCache();
  }

  private unloadCache(modName: string, audioName: string): void {
    this.cancelLoad(modName, audioName);
    const modCache = this.cache.get(modName);
    const entry = modCache?.get(audioName);
    if (!modCache || !entry) return;
    if (this.currentHowl === entry.howl) this.stop();
    this.release(entry);
    modCache.delete(audioName);
    this.cacheCount--;
    if (modCache.size === 0) this.cache.delete(modName);
  }

  private trimCache(): void {
    while (this.cacheCount > this.maxCache) {
      let removed = false;
      for (const [modName, modCache] of this.cache) {
        for (const [audioName, entry] of modCache) {
          const isCurrent = this.currentTrack?.modName === modName && this.currentTrack.audioName === audioName;
          const isLoading = this.loadingTrack?.modName === modName && this.loadingTrack.audioName === audioName;
          if (isCurrent || isLoading) continue;
          this.release(entry);
          modCache.delete(audioName);
          this.cacheCount--;
          if (modCache.size === 0) this.cache.delete(modName);
          removed = true;
          break;
        }
        if (removed) break;
      }
      if (!removed) break;
    }
  }

  private release(entry: CacheEntry): void {
    entry.howl.off();
    entry.howl.unload();
  }

  private cancelLoad(modName: string, audioName: string): void {
    const key = JSON.stringify([modName, audioName]);
    const pending = this.pendingLoads.get(key);
    this.pendingLoads.delete(key);
    pending?.cancel();
  }

  private stopCurrent(emitEvent: boolean): boolean {
    if (!this.currentHowl && !this.currentTrack && this.state !== PlayState.LOADING) return false;
    const track = this.currentTrack;
    const howl = this.currentHowl;
    this.currentHowl = null;
    this.currentSoundId = null;
    if (howl && this.currentStarted) howl.stop();
    else if (howl && track) this.unloadCache(track.modName, track.audioName);
    this.currentStarted = false;
    this.currentTrack = null;
    this.state = PlayState.STOPPED;
    this.stopProgressTimer();
    if (emitEvent) this.emit('stop', track);
    return true;
  }

  // Howler applies the master volume and mute once for every channel.
  private get trackVolume(): number {
    const modName = (this.currentTrack ?? this.loadingTrack)?.modName;
    return modName ? (this.modVolumes.get(modName) ?? 1) : 1;
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state !== PlayState.PLAYING || !this.currentHowl) return;
      const { currentTime, duration, percent } = this.progress;
      this.emit('timeupdate', currentTime, duration, percent);
    }, 250);
  }

  private stopProgressTimer(): void {
    if (!this.progressTimer) return;
    clearInterval(this.progressTimer);
    this.progressTimer = null;
  }

  private handleTrackEnd(track: Track): void {
    const isCurrent = this.currentTrack?.modName === track.modName && this.currentTrack.audioName === track.audioName;
    if (!isCurrent) return;
    const requestId = this.playRequestId;
    const howl = this.currentHowl;
    const soundId = this.currentSoundId;
    this.stopProgressTimer();
    this.emit('end', track);
    if (requestId !== this.playRequestId || this.currentHowl !== howl || this.currentSoundId !== soundId || this.state !== PlayState.PLAYING) return;
    if (!this.autoNext) {
      this.state = PlayState.STOPPED;
      return;
    }
    void this.next().then(success => {
      if (!success && requestId === this.playRequestId && this.currentHowl === howl && this.currentSoundId === soundId && this.state === PlayState.PLAYING) {
        this.state = PlayState.STOPPED;
        this.emit('stop', track);
      }
    });
  }

  private handlePlaybackError(howl: Howl, track: Track, error: unknown): void {
    if (this.currentHowl !== howl) return;
    this.currentHowl = null;
    this.currentSoundId = null;
    this.currentTrack = null;
    this.currentStarted = false;
    this.state = PlayState.IDLE;
    this.unloadCache(track.modName, track.audioName);
    this.stopProgressTimer();
    this.emit('error', error, track);
    this.log(`播放失败: ${track.modName}/${track.audioName}`, 'ERROR', error);
  }

  private dispatch(eventData: AudioEventData): void {
    const listeners = this.eventListeners.get(eventData.type);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(eventData);
      } catch (error) {
        this.log(`音频事件处理错误: ${eventData.type}`, 'ERROR', error);
      }
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    void this.core.trigger(':audio', {
      type: event,
      data: args
    });
  }
}

export default Audio;
