// ./src/modules/AudioManager.ts

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

interface TrackMeta {
  title?: string;
  artist?: string;
}

interface AudioEventData {
  type: string;
  [key: string]: any;
}

class Track {
  title: string;
  artist: string;
  duration: number = 0;

  constructor(
    readonly key: string,
    readonly modName: string,
    meta: TrackMeta = {}
  ) {
    this.title = meta.title || key;
    this.artist = meta.artist || modName;
  }

  get id() {
    return `${this.modName}:${this.key}`;
  }
}

class Playlist {
  tracks: Track[] = [];
  currentIndex: number = -1;
  playMode: PlayMode = PlayMode.LOOP_ALL;
  shuffleOrder: number[] = [];
  shuffleIndex: number = -1;

  constructor(readonly name: string) {}

  add(track: Track | Track[]) {
    if (Array.isArray(track)) {
      this.tracks.push(...track);
    } else {
      this.tracks.push(track);
    }
  }

  remove(index: number) {
    if (index < 0 || index >= this.tracks.length) return false;
    this.tracks.splice(index, 1);
    if (index < this.currentIndex) this.currentIndex--;
    return true;
  }

  clear() {
    this.tracks = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.shuffleIndex = -1;
  }

  mode(mode: PlayMode): void {
    this.playMode = mode;
    if (mode === PlayMode.SHUFFLE) this._shuffleNow();
  }

  private _shuffleNow(): void {
    this.shuffleOrder = [...Array(this.tracks.length).keys()];
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = random(i);
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
    this.shuffleIndex = -1;
  }

  next(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) return this.tracks[this.currentIndex];
    if (this.playMode === PlayMode.SHUFFLE) {
      this.shuffleIndex++;
      if (this.shuffleIndex >= this.shuffleOrder.length) {
        this._shuffleNow();
        this.shuffleIndex = 0;
      }
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex];
    }

    this.currentIndex++;
    if (this.currentIndex >= this.tracks.length) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = 0;
      } else {
        return null;
      }
    }
    return this.tracks[this.currentIndex];
  }

  previous(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) return this.tracks[this.currentIndex];
    if (this.playMode === PlayMode.SHUFFLE) {
      if (this.shuffleIndex <= 0) return null;
      this.shuffleIndex--;
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex];
    }
    this.currentIndex--;
    if (this.currentIndex < 0) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = this.tracks.length - 1;
      } else {
        return null;
      }
    }
    return this.tracks[this.currentIndex];
  }

  get length() {
    return this.tracks.length;
  }
}

class AudioManager {
  readonly log: ReturnType<typeof createlog>;
  private readonly playlists = new Map<string, Playlist>();
  private activePlaylist: Playlist | null = null;
  private currentTrack: Track | null = null;
  private currentHowl: any = null;
  private state: PlayState = PlayState.IDLE;
  private volume: number = 1.0;
  private muted: boolean = false;
  private autoNext: boolean = true;
  private cache = new Map<string, { howl: any; url: string }>();
  private maxCache: number = 3;
  private progressTimer: any = null;
  private events = new Map<string, Set<Function>>();

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('audio');
    this.core.howler.Howler.mute(this.muted);
    this.core.howler.Howler.volume(this.volume);
    this.core.once(':IndexedDB', () => this.initDB());
    this.core.on(':audio', (eventData: AudioEventData) => this.handleAudioEvent(eventData));
  }

  private initDB() {
    this.core.idb.register('audio-buffers', { keyPath: 'key' }, [{ name: 'mod', keyPath: 'mod', options: { unique: false } }]);
  }

  private handleAudioEvent(eventData: AudioEventData) {
    const listeners = this.events.get(eventData.type);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(eventData);
      } catch (error) {
        this.log(`音频事件处理错误: ${eventData.type}`, 'ERROR', error);
      }
    }
  }

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: Function): boolean {
    const listeners = this.events.get(event);
    if (!listeners) return false;
    return listeners.delete(handler);
  }

  once(event: string, handler: Function): void {
    const onceHandler = (eventData: AudioEventData) => {
      handler(eventData);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  private emit(event: string, ...args: any[]): void {
    void this.core.trigger(':audio', { type: event, data: args });
  }

  private async store(key: string, arrayBuffer: ArrayBuffer, modName: string): Promise<boolean> {
    try {
      await this.core.idb.withTransaction(['audio-buffers'], 'readwrite', async (tx: any) => await tx.objectStore('audio-buffers').put({ key, arrayBuffer, mod: modName }));
      return true;
    } catch {
      this.log(`存储音频失败: ${key}`, 'ERROR');
      return false;
    }
  }

  private async get(key: string): Promise<ArrayBuffer | null> {
    try {
      return await this.core.idb.withTransaction(['audio-buffers'], 'readonly', async (tx: any) => {
        const record = await tx.objectStore('audio-buffers').get(key);
        return record ? record.arrayBuffer : null;
      });
    } catch {
      return null;
    }
  }

  private async modKeys(modName: string): Promise<string[]> {
    try {
      return await this.core.idb.withTransaction(['audio-buffers'], 'readonly', async (tx: any) => {
        const index = tx.objectStore('audio-buffers').index('mod');
        const records = await index.getAll(modName);
        return records.map((r: any) => r.key);
      });
    } catch {
      return [];
    }
  }

  private async delete(key: string): Promise<boolean> {
    try {
      await this.core.idb.withTransaction(['audio-buffers'], 'readwrite', async (tx: any) => await tx.objectStore('audio-buffers').delete(key));
      return true;
    } catch {
      return false;
    }
  }

  async modAudioClear(modName: string): Promise<boolean> {
    const keys = await this.modKeys(modName);
    for (const key of keys) await this.delete(key);
    return true;
  }

  private async loadTrack(track: Track): Promise<{ howl: any; url: string }> {
    if (this.cache.has(track.id)) return this.cache.get(track.id)!;
    const arrayBuffer = await this.get(track.key);
    if (!arrayBuffer) throw new Error(`音频未找到: ${track.key}`);
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const howl = await new Promise<any>((resolve, reject) => {
      const h = new this.core.howler.Howl({
        src: [url],
        html5: false,
        volume: this.volume,
        onload: () => {
          track.duration = h.duration();
          resolve(h);
        },
        onloaderror: (_: any, err: any) => reject(err),
        onend: () => this.onEnd()
      });
    });
    this.cacheAdd(track.id, { howl, url });
    return { howl, url };
  }

  private cacheAdd(id: string, data: { howl: any; url: string }) {
    if (this.cache.has(id)) return;
    this.cache.set(id, data);
    if (this.cache.size > this.maxCache) {
      const first = this.cache.keys().next().value;
      const old = this.cache.get(first);
      if (old?.howl) old.howl.unload();
      if (old?.url) URL.revokeObjectURL(old.url);
      this.cache.delete(first);
    }
  }

  async play(track: Track): Promise<boolean> {
    if (!track) return false;
    try {
      if (this.currentHowl) {
        this.currentHowl.stop();
        this.stopProgress();
      }
      this.state = PlayState.LOADING;
      this.emit('loading', track);
      const { howl } = await this.loadTrack(track);
      this.currentTrack = track;
      this.currentHowl = howl;
      howl.play();
      this.state = PlayState.PLAYING;
      this.emit('play', track);
      this.startProgress();
      return true;
    } catch (err) {
      this.log(`播放失败: ${track.key}`, 'ERROR');
      this.state = PlayState.IDLE;
      this.emit('error', err, track);
      return false;
    }
  }

  pause(): boolean {
    if (!this.currentHowl || this.state !== PlayState.PLAYING) return false;
    this.currentHowl.pause();
    this.state = PlayState.PAUSED;
    this.emit('pause');
    this.stopProgress();
    return true;
  }

  resume(): boolean {
    if (!this.currentHowl || this.state !== PlayState.PAUSED) return false;
    this.currentHowl.play();
    this.state = PlayState.PLAYING;
    this.emit('resume');
    this.startProgress();
    return true;
  }

  stop(): boolean {
    if (!this.currentHowl) return false;
    this.currentHowl.stop();
    this.state = PlayState.STOPPED;
    this.emit('stop');
    this.stopProgress();
    return true;
  }

  togglePlayPause(): void {
    if (this.state === PlayState.PLAYING) this.pause();
    else if (this.state === PlayState.PAUSED) this.resume();
  }

  async next(): Promise<boolean> {
    if (!this.activePlaylist) return false;
    const track = this.activePlaylist.next();
    if (!track) return false;
    await this.play(track);
    return true;
  }

  async previous(): Promise<boolean> {
    if (!this.activePlaylist) return false;
    const track = this.activePlaylist.previous();
    if (!track) return false;
    await this.play(track);
    return true;
  }

  seek(percent: number): boolean {
    if (!this.currentHowl) return false;
    const duration = this.currentHowl.duration();
    this.currentHowl.seek((percent / 100) * duration);
    this.emit('seek', this.currentTime, duration);
    return true;
  }

  seekTo(seconds: number): boolean {
    if (!this.currentHowl) return false;
    this.currentHowl.seek(seconds);
    this.emit('seek', seconds, this.duration);
    return true;
  }

  get Mute(): boolean {
    return this.muted;
  }

  set Mute(mute: boolean) {
    if (this.muted === mute) return;
    this.muted = mute;
    this.core.howler.Howler.mute(mute);
    this.emit('mutechange', mute);
  }

  get Volume(): number {
    return this.volume;
  }

  set Volume(vol: number) {
    const newVol = Math.max(0, Math.min(1, vol));
    if (this.volume === newVol) return;
    this.volume = newVol;
    this.core.howler.Howler.volume(this.volume);
    if (this.currentHowl) this.currentHowl.volume(this.volume);
    this.emit('volumechange', this.volume);
  }

  get currentTime(): number {
    return this.currentHowl ? this.currentHowl.seek() : 0;
  }

  get duration(): number {
    return this.currentHowl ? this.currentHowl.duration() : 0;
  }

  private startProgress(): void {
    this.stopProgress();
    this.progressTimer = setInterval(() => {
      if (this.state === PlayState.PLAYING && this.currentHowl) {
        const current = this.currentHowl.seek();
        const duration = this.currentHowl.duration();
        this.emit('timeupdate', current, duration, (current / duration) * 100);
      }
    }, 100);
  }

  private stopProgress(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private onEnd(): void {
    this.stopProgress();
    this.emit('end', this.currentTrack);
    if (this.autoNext) void this.next();
  }

  async modPlaylist(modName: string): Promise<Playlist> {
    if (this.playlists.has(modName)) return this.playlists.get(modName)!;
    const playlist = new Playlist(modName);
    const keys = await this.modKeys(modName);
    const tracks = keys.map(key => new Track(key, modName));
    playlist.add(tracks);
    this.playlists.set(modName, playlist);
    return playlist;
  }

  async modPlay(modName: string, key?: string): Promise<void> {
    const playlist = await this.modPlaylist(modName);
    this.activePlaylist = playlist;
    if (key) {
      const index = playlist.tracks.findIndex(t => t.key === key);
      if (index !== -1) {
        playlist.currentIndex = index;
        await this.play(playlist.tracks[index]);
      }
    } else if (playlist.length > 0) {
      playlist.currentIndex = 0;
      await this.play(playlist.tracks[0]);
    }
  }

  set PlayMode(mode: PlayMode) {
    if (!this.activePlaylist) return;
    this.activePlaylist.mode(mode);
    this.emit('modechange', mode);
  }

  set AutoNext(enabled: boolean) {
    this.autoNext = enabled;
  }

  async importAllAudio(modName: string, audioFolder: string = 'audio'): Promise<boolean> {
    const modLoader = maplebirch.modLoader;
    if (!modLoader) return false;
    const modZip = modLoader.getModZip(modName);
    if (!modZip?.modInfo?.bootJson?.additionFile) return false;
    const audioFiles: Array<{ path: string; key: string }> = [];
    modZip.modInfo.bootJson.additionFile.forEach((path: string) => {
      if (path.startsWith(`${audioFolder}/`)) {
        const ext = path.split('.').pop()?.toLowerCase();
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm'].includes(ext || '')) {
          let key = path.substring(audioFolder.length + 1);
          const lastDot = key.lastIndexOf('.');
          if (lastDot > 0) key = key.substring(0, lastDot);
          audioFiles.push({ path, key });
        }
      }
    });
    for (const { path, key } of audioFiles) {
      const file = modZip.zip.file(path);
      if (!file) continue;
      try {
        const arrayBuffer = await file.async('arraybuffer');
        await this.store(key, arrayBuffer, modName);
      } catch {
        this.log(`加载失败: ${path}`, 'WARN');
      }
    }
    this.log(`导入 ${audioFiles.length} 个音频`, 'INFO');
    return true;
  }

  async addAudioFromFile(file: File, modName: string = 'custom'): Promise<boolean> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm'].includes(ext || '')) {
      this.log('不支持的格式', 'WARN');
      return false;
    }
    const key = file.name.substring(0, file.name.lastIndexOf('.'));
    const arrayBuffer = await file.arrayBuffer();
    const success = await this.store(key, arrayBuffer, modName);
    if (success) {
      const playlist = await this.modPlaylist(modName);
      playlist.add(new Track(key, modName));
    }
    return success;
  }

  async deleteAudio(key: string, modName: string): Promise<boolean> {
    return await this.delete(key);
  }

  async modAudioClearAll(modName: string): Promise<boolean> {
    const success = await this.modAudioClear(modName);
    this.playlists.delete(modName);
    return success;
  }

  clearCache(): void {
    this.cache.forEach(({ howl, url }) => {
      if (howl) howl.unload();
      if (url) URL.revokeObjectURL(url);
    });
    this.cache.clear();
  }

  destroy(): void {
    this.stop();
    this.clearCache();
    this.events.clear();
  }
}

(function (maplebirch): void {
  'use strict';
  void maplebirch.register('audio', Object.seal(new AudioManager(maplebirch)), ['tool']);
})(maplebirch);

export default AudioManager;
