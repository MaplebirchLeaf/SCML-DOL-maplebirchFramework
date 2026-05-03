// ./src/modules/Audio.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { random } from '../utils';

const PlayMode = {
  SEQUENTIAL: 'sequential',
  LOOP_ALL: 'loop_all',
  LOOP_ONE: 'loop_one',
  SHUFFLE: 'shuffle'
} as const;

type PlayMode = (typeof PlayMode)[keyof typeof PlayMode];

const PlayState = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped'
} as const;

type PlayState = (typeof PlayState)[keyof typeof PlayState];
const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm'] as const;
type AudioFormat = (typeof SUPPORTED_FORMATS)[number];
const FORMAT_SET = new Set<string>(SUPPORTED_FORMATS);

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  webm: 'audio/webm'
};

interface TrackMeta {
  title?: string;
  artist?: string;
}

interface AudioEventData {
  type: string;
  data?: any[];
  [key: string]: any;
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
  howl: any;
  url: string;
}

class Track {
  title: string;
  artist: string;
  duration = 0;
  format: AudioFormat = 'mp3';

  constructor(
    readonly audioName: string,
    readonly modName: string,
    meta: TrackMeta = {}
  ) {
    this.title = meta.title || audioName;
    this.artist = meta.artist || modName;
  }
}

class Playlist {
  tracks: Track[] = [];
  currentIndex = -1;
  playMode: PlayMode = PlayMode.LOOP_ALL;

  private shuffleOrder: number[] = [];
  private shuffleIndex = -1;

  constructor(readonly name: string) {}

  add(input: Track | Track[]): void {
    const tracks = Array.isArray(input) ? input : [input];
    for (const track of tracks) {
      const index = this.tracks.findIndex(item => item.modName === track.modName && item.audioName === track.audioName);
      if (index >= 0) {
        this.tracks[index] = track;
      } else {
        this.tracks.push(track);
      }
    }
    this.resetShuffle();
  }

  removeAt(index: number): boolean {
    if (index < 0 || index >= this.tracks.length) return false;
    this.tracks.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      this.currentIndex = Math.min(this.currentIndex, this.tracks.length - 1);
    }
    if (this.tracks.length === 0) this.currentIndex = -1;
    this.resetShuffle();
    return true;
  }

  remove(audioName: string): boolean {
    const index = this.tracks.findIndex(track => track.audioName === audioName);
    return this.removeAt(index);
  }

  clear(): void {
    this.tracks = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.shuffleIndex = -1;
  }

  setMode(mode: PlayMode): void {
    this.playMode = mode;
    if (mode === PlayMode.SHUFFLE) this.shuffle();
  }

  select(index: number): Track | null {
    if (index < 0 || index >= this.tracks.length) return null;
    this.currentIndex = index;
    if (this.playMode === PlayMode.SHUFFLE) this.shuffleIndex = this.shuffleOrder.indexOf(index);
    return this.tracks[index] || null;
  }

  next(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) {
      if (this.currentIndex < 0) this.currentIndex = 0;
      return this.tracks[this.currentIndex] || null;
    }
    if (this.playMode === PlayMode.SHUFFLE) {
      if (this.shuffleOrder.length !== this.tracks.length) this.shuffle();
      this.shuffleIndex++;
      if (this.shuffleIndex >= this.shuffleOrder.length) {
        this.shuffle();
        this.shuffleIndex = 0;
      }
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex] || null;
    }

    this.currentIndex++;
    if (this.currentIndex >= this.tracks.length) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = 0;
      } else {
        this.currentIndex = this.tracks.length - 1;
        return null;
      }
    }
    return this.tracks[this.currentIndex] || null;
  }

  previous(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) {
      if (this.currentIndex < 0) this.currentIndex = 0;
      return this.tracks[this.currentIndex] || null;
    }
    if (this.playMode === PlayMode.SHUFFLE) {
      if (this.shuffleIndex <= 0) return null;
      this.shuffleIndex--;
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex] || null;
    }
    this.currentIndex--;
    if (this.currentIndex < 0) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = this.tracks.length - 1;
      } else {
        this.currentIndex = 0;
        return null;
      }
    }
    return this.tracks[this.currentIndex] || null;
  }

  get length(): number {
    return this.tracks.length;
  }

  private resetShuffle(): void {
    this.shuffleOrder = [];
    this.shuffleIndex = -1;
    if (this.playMode === PlayMode.SHUFFLE) this.shuffle();
  }

  private shuffle(): void {
    this.shuffleOrder = [...Array(this.tracks.length).keys()];
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = random(i);
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
    this.shuffleIndex = -1;
  }
}

class AudioManager {
  readonly log: ReturnType<typeof createlog>;

  private readonly STORE = 'audio';

  private readonly playlists = new Map<string, Playlist>();
  private readonly eventListeners = new Map<string, Set<AudioEventHandler>>();
  private readonly cache = new Map<string, Map<string, CacheEntry>>();

  private activePlaylist: Playlist | null = null;
  private currentTrack: Track | null = null;
  private currentHowl: any = null;
  private state: PlayState = PlayState.IDLE;
  private volume = 1;
  private muted = false;
  private autoNext = true;

  private maxCache = 3;
  private cacheCount = 0;

  private playRequestId = 0;
  private progressTimer: ReturnType<typeof setInterval> | null = null;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('audio');
    this.core.howler.Howler.mute(this.muted);
    this.core.howler.Howler.volume(this.volume);
    this.core.once(':indexedDB', () => this.initDB());
    this.core.on(':audio', eventData => this.dispatch(eventData), 'audio manager');
  }

  private initDB(): void {
    this.core.idb.register(this.STORE, { keyPath: ['modName', 'audioName'] }, [
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

  on(event: string, handler: AudioEventHandler): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set());
    this.eventListeners.get(event)!.add(handler);
  }

  off(event: string, handler: AudioEventHandler): boolean {
    return this.eventListeners.get(event)?.delete(handler) || false;
  }

  once(event: string, handler: AudioEventHandler): void {
    const wrapper: AudioEventHandler = eventData => {
      handler(eventData);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  async play(track: Track): Promise<boolean> {
    const requestId = ++this.playRequestId;
    try {
      this.stopCurrent(false);
      this.state = PlayState.LOADING;
      this.emit('loading', track);
      const { howl } = await this.load(track);
      if (requestId !== this.playRequestId) return false;
      this.currentTrack = track;
      this.currentHowl = howl;
      howl.volume(this.volume);
      howl.play();
      this.state = PlayState.PLAYING;
      this.startProgressTimer();
      this.emit('play', track);
      return true;
    } catch (error) {
      if (requestId === this.playRequestId) {
        this.state = PlayState.IDLE;
        this.currentTrack = null;
        this.currentHowl = null;
        this.stopProgressTimer();
        this.emit('error', error, track);
        this.log(`播放失败: ${track.modName}/${track.audioName}`, 'ERROR', error);
      }
      return false;
    }
  }

  pause(): boolean {
    if (!this.currentHowl || this.state !== PlayState.PLAYING) return false;
    this.currentHowl.pause();
    this.state = PlayState.PAUSED;
    this.stopProgressTimer();
    this.emit('pause', this.currentTrack);
    return true;
  }

  resume(): boolean {
    if (!this.currentHowl || this.state !== PlayState.PAUSED) return false;
    this.currentHowl.play();
    this.state = PlayState.PLAYING;
    this.startProgressTimer();
    this.emit('resume', this.currentTrack);
    return true;
  }

  stop(): boolean {
    this.playRequestId++;
    return this.stopCurrent(true);
  }

  togglePlayPause(): void {
    if (this.state === PlayState.PLAYING) {
      this.pause();
      return;
    }
    if (this.state === PlayState.PAUSED) this.resume();
  }

  async next(): Promise<boolean> {
    const track = this.activePlaylist?.next();
    return track ? await this.play(track) : false;
  }

  async previous(): Promise<boolean> {
    const track = this.activePlaylist?.previous();
    return track ? await this.play(track) : false;
  }

  seek(percent: number): boolean {
    const duration = this.duration;
    if (!this.currentHowl || duration <= 0) return false;
    const safePercent = Math.max(0, Math.min(100, percent));
    const targetTime = (safePercent / 100) * duration;
    this.currentHowl.seek(targetTime);
    this.emit('seek', targetTime, duration);
    return true;
  }

  seekTo(seconds: number): boolean {
    const duration = this.duration;
    if (!this.currentHowl || duration <= 0) return false;
    const targetTime = Math.max(0, Math.min(duration, seconds));
    this.currentHowl.seek(targetTime);
    this.emit('seek', targetTime, duration);
    return true;
  }

  async getPlaylist(modName: string): Promise<Playlist> {
    const cached = this.playlists.get(modName);
    if (cached) return cached;
    const playlist = this.playlist(modName);
    const records = await this.readRecords(modName);
    playlist.clear();
    playlist.add(
      records.map(record => {
        const track = new Track(record.audioName, record.modName, {
          title: record.value.title,
          artist: record.value.artist
        });
        track.format = record.value.format;
        return track;
      })
    );
    return playlist;
  }

  async playFromMod(modName: string, audioName?: string): Promise<boolean> {
    const playlist = await this.getPlaylist(modName);
    this.activePlaylist = playlist;
    if (playlist.length <= 0) return false;
    if (!audioName) {
      const firstTrack = playlist.select(0);
      return firstTrack ? await this.play(firstTrack) : false;
    }
    const index = playlist.tracks.findIndex(track => track.audioName === audioName);
    if (index < 0) {
      this.log(`播放失败，模组 ${modName} 中没有音频: ${audioName}`, 'WARN');
      return false;
    }
    const track = playlist.select(index);
    return track ? await this.play(track) : false;
  }

  async import(modName: string, audioFolder = 'audio'): Promise<boolean> {
    const folder = audioFolder.replace(/^\/+|\/+$/g, '');
    const prefix = `${folder}/`;
    const modZip = maplebirch.modLoader?.getModZip(modName);
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
    this.playlists.delete(modName);
    await this.getPlaylist(modName);
    this.log(`导入 ${successCount}/${audioFiles.length} 个音频`, 'INFO');
    return successCount > 0;
  }

  async addFile(file: File, modName = 'custom'): Promise<boolean> {
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
    return true;
  }

  async delete(modName: string, audioName: string): Promise<boolean> {
    if (this.currentTrack?.modName === modName && this.currentTrack.audioName === audioName) this.stop();
    try {
      await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => await tx.objectStore(this.STORE).delete([modName, audioName]));
      this.unloadCache(modName, audioName);
      this.playlists.get(modName)?.remove(audioName);
      return true;
    } catch (error) {
      this.log(`删除音频失败: ${modName}/${audioName}`, 'ERROR', error);
      return false;
    }
  }

  async clearAudio(modName: string): Promise<boolean> {
    try {
      if (this.currentTrack?.modName === modName) this.stop();
      const records = await this.readRecords(modName);
      await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => {
        const store = tx.objectStore(this.STORE);
        for (const record of records) {
          await store.delete([record.modName, record.audioName]);
          this.unloadCache(record.modName, record.audioName);
        }
      });
      this.playlists.delete(modName);
      if (this.activePlaylist?.name === modName) this.activePlaylist = null;
      return true;
    } catch (error) {
      this.log(`清空模组音频失败: ${modName}`, 'ERROR', error);
      return false;
    }
  }

  clearCache(): void {
    this.stop();
    for (const modCache of this.cache.values()) for (const entry of modCache.values()) this.release(entry);
    this.cache.clear();
    this.cacheCount = 0;
  }

  destroy(): void {
    this.stop();
    this.clearCache();
    this.eventListeners.clear();
    this.playlists.clear();
    this.activePlaylist = null;
    this.currentTrack = null;
    this.currentHowl = null;
  }

  playlist(modName: string): Playlist {
    let playlist = this.playlists.get(modName);
    if (!playlist) {
      playlist = new Playlist(modName);
      this.playlists.set(modName, playlist);
    }
    return playlist;
  }

  get Mute(): boolean {
    return this.muted;
  }

  set Mute(value: boolean) {
    if (this.muted === value) return;
    this.muted = value;
    this.core.howler.Howler.mute(value);
    this.emit('mutechange', value);
  }

  get Volume(): number {
    return this.volume;
  }

  set Volume(value: number) {
    const volume = Math.max(0, Math.min(1, value));
    if (this.volume === volume) return;
    this.volume = volume;
    this.core.howler.Howler.volume(volume);
    this.currentHowl?.volume(volume);
    this.emit('volumechange', volume);
  }

  get PlayMode(): PlayMode {
    return this.activePlaylist?.playMode || PlayMode.LOOP_ALL;
  }

  set PlayMode(mode: PlayMode) {
    if (!this.activePlaylist) return;
    this.activePlaylist.setMode(mode);
    this.emit('modechange', mode);
  }

  get AutoNext(): boolean {
    return this.autoNext;
  }

  set AutoNext(value: boolean) {
    this.autoNext = value;
  }

  get State(): PlayState {
    return this.state;
  }

  get CurrentTrack(): Track | null {
    return this.currentTrack;
  }

  get ActivePlaylist(): Playlist | null {
    return this.activePlaylist;
  }

  get currentTime(): number {
    if (!this.currentHowl) return 0;
    const value = this.currentHowl.seek();
    return typeof value === 'number' ? value : 0;
  }

  get duration(): number {
    if (!this.currentHowl) return 0;
    const value = this.currentHowl.duration();
    return typeof value === 'number' ? value : 0;
  }

  async preInit(): Promise<void> {
    const records = await this.readRecords();
    this.playlists.clear();
    const groups = new Map<string, AudioRecord[]>();
    for (const record of records) {
      if (!groups.has(record.modName)) groups.set(record.modName, []);
      groups.get(record.modName)!.push(record);
    }
    for (const [modName, modRecords] of groups) {
      const playlist = new Playlist(modName);
      playlist.add(
        modRecords.map(record => {
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
    const cached = this.cache.get(track.modName)?.get(track.audioName);
    if (cached) {
      cached.howl.volume(this.volume);
      return cached;
    }
    const record = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => await tx.objectStore(this.STORE).get([track.modName, track.audioName]));
    if (!record) throw new Error(`音频不存在: ${track.modName}/${track.audioName}`);
    const audioRecord = record as AudioRecord;
    const { arrayBuffer, format } = audioRecord.value;
    const url = URL.createObjectURL(new Blob([arrayBuffer], { type: MIME_TYPES[format] || MIME_TYPES.mp3 }));
    track.format = format;
    const howl = await new Promise<any>((resolve, reject) => {
      const instance = new this.core.howler.Howl({
        src: [url],
        html5: false,
        volume: this.volume,
        format: [format],
        onload: () => {
          track.duration = instance.duration();
          resolve(instance);
        },
        onloaderror: (_: any, error: any) => {
          URL.revokeObjectURL(url);
          reject(error);
        },
        onend: () => this.handleTrackEnd(track)
      });
    });
    const entry = { howl, url };
    this.cacheAudio(track.modName, track.audioName, entry);
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
      await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => await tx.objectStore(this.STORE).put(record));
      return true;
    } catch (error) {
      this.log(`存储音频失败: ${modName}/${audioName}`, 'ERROR', error);
      return false;
    }
  }

  private async readRecords(modName?: string): Promise<AudioRecord[]> {
    try {
      const records = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => {
        const store = tx.objectStore(this.STORE);
        if (modName) return await store.index('modName').getAll(modName);
        return await store.getAll();
      });
      return records as AudioRecord[];
    } catch {
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
    const modCache = this.cache.get(modName);
    const entry = modCache?.get(audioName);
    if (!modCache || !entry) return;
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
          if (isCurrent) continue;
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
    entry.howl?.unload?.();
    if (entry.url.startsWith('blob:')) URL.revokeObjectURL(entry.url);
  }

  private stopCurrent(emitEvent: boolean): boolean {
    if (!this.currentHowl && this.state !== PlayState.LOADING) return false;
    const track = this.currentTrack;
    this.currentHowl?.stop?.();
    this.currentHowl = null;
    this.currentTrack = null;
    this.state = PlayState.STOPPED;
    this.stopProgressTimer();
    if (emitEvent) this.emit('stop', track);
    return true;
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state !== PlayState.PLAYING || !this.currentHowl) return;
      const current = this.currentTime;
      const duration = this.duration;
      const percent = duration > 0 ? (current / duration) * 100 : 0;
      this.emit('timeupdate', current, duration, percent);
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
    this.stopProgressTimer();
    this.emit('end', track);
    if (!this.autoNext) {
      this.state = PlayState.STOPPED;
      return;
    }
    void this.next().then(success => {
      const stillSameTrack = this.currentTrack?.modName === track.modName && this.currentTrack.audioName === track.audioName;
      if (!success && stillSameTrack) {
        this.state = PlayState.STOPPED;
        this.emit('stop', track);
      }
    });
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

  private emit(event: string, ...args: any[]): void {
    void this.core.trigger(':audio', {
      type: event,
      data: args
    });
  }
}

(function (maplebirch): void {
  'use strict';
  maplebirch.register('audio', Object.seal(new AudioManager(maplebirch)), ['tool']);
})(maplebirch);

export default AudioManager;
