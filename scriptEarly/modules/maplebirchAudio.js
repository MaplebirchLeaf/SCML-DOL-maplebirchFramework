(async() => {
  'use strict';
  if (!window.maplebirch) {
    console.log('%c[maplebirch] 错误: 核心系统未初始化', 'color: #C62828; font-weight: bold;');
    return;
  }

  const maplebirch = window.maplebirch;

  class ModAudioPlayer {
    constructor(audioManager, modName) {
      this.audioManager = audioManager;        // 音频管理器实例
      this.modName = modName;                  // 所属模块名称
      this.activeSources = new Map();          // 当前活动的音频源
      this.pausedStates = new Map();           // 暂停状态的音频
      this.volume = 1.0;                       // 全局音量
      this.globalGainNode = null;              // 全局增益节点
      this.loopCounters = new Map();           // 音频循环计数器
      this.defaultLoopCount = 100;             // 默认循环次数
      this.initGainNode();                     // 初始化增益节点
    }

    initGainNode() {
      if (!this.audioManager.audioContext) return;
      this.globalGainNode = this.audioManager.audioContext.createGain();
      this.globalGainNode.connect(this.audioManager.audioContext.destination);
      this.globalGainNode.gain.value = this.volume;
    }

    play(key, options = {}) {
      if (!this.audioManager.audioBuffers.has(key)) {
        maplebirch.log(`[AudioPlayer] Audio not found: ${key}`, 'WARN');
        return null;
      }

      const baseFullKey = `${this.modName}:${key}`;
      const allowOverlap = !!options.allowOverlap;
      const instanceKey = allowOverlap ? `${baseFullKey}|${Date.now()}|${Math.random().toString(36).slice(2,6)}` : baseFullKey;

      if (!allowOverlap && this.activeSources.has(baseFullKey)) {
        if (options.stopOthers === false) {
          return null;
        } else {
          const existing = this.activeSources.get(baseFullKey);
          try { existing.source.stop(); } catch(e) {}
          this.activeSources.delete(baseFullKey);
          this.loopCounters.delete(baseFullKey);
        }
      }

      if (options.stopOthers) {
        this.stopAll();
      }

      const source = this.audioManager.audioContext.createBufferSource();
      source.buffer = this.audioManager.audioBuffers.get(key);
      const gainNode = this.audioManager.audioContext.createGain();
      gainNode.gain.value = (options.volume !== undefined) ? options.volume : this.volume;
      source.connect(gainNode);
      gainNode.connect(this.globalGainNode || this.audioManager.audioContext.destination);
      const startTime = this.audioManager.audioContext.currentTime;
      const offset = options.offset || 0;
      const duration = options.duration;
      const loopRequested = !!options.loop;
      const loopCount = (options.loopCount !== undefined) ? options.loopCount : (loopRequested ? Infinity : 1);

      if (loopRequested && loopCount === Infinity) {
        source.loop = true;
        if (options.loopStart !== undefined) source.loopStart = options.loopStart;
        if (options.loopEnd !== undefined) source.loopEnd = options.loopEnd;
        this.loopCounters.set(instanceKey, Infinity);
      } else if (loopRequested && loopCount > 1) {
        this.loopCounters.set(instanceKey, loopCount);
      }

      try {
        source.start(startTime, offset, duration);
      } catch (e) {
        maplebirch.log(`[AudioPlayer] Failed to start source for ${key}`, 'WARN', e);
        return null;
      }

      const audioSource = {
        source,
        gainNode,
        startTime,
        playStartTime: startTime,
        currentOffset: offset,
        options,
        key: instanceKey,
        logicalKey: baseFullKey
      };

      this.activeSources.set(instanceKey, audioSource);
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        const lc = this.loopCounters.get(instanceKey);

        if (lc === Infinity) {
          this.activeSources.delete(instanceKey);
          this.loopCounters.delete(instanceKey);
          if (options.onEnded) options.onEnded();
          return;
        }

        if (lc && lc > 1) {
          this.loopCounters.set(instanceKey, lc - 1);
          source.disconnect();
          gainNode.disconnect();
          setTimeout(() => {
            this.play(key, {
              ...options,
              offset: 0,
              loop: lc - 1 > 0 && !!options.loop,
              loopCount: lc - 1,
              stopOthers: false,
              allowOverlap: false
            });
          }, 0);
          this.activeSources.delete(instanceKey);
          return;
        }

        this.activeSources.delete(instanceKey);
        this.loopCounters.delete(instanceKey);
        if (options.onEnded) options.onEnded();
      };

      return audioSource;
    }

    stop(key) {
      const baseFullKey = `${this.modName}:${key}`;
      const matchKey = Array.from(this.activeSources.keys()).find(k => k.startsWith(baseFullKey));

      if (matchKey) {
        const audioSource = this.activeSources.get(matchKey);
        try {
          audioSource.source.stop();
          audioSource.source.disconnect();
          audioSource.gainNode.disconnect();
        } catch(e) {}
        this.activeSources.delete(matchKey);
        this.loopCounters.delete(matchKey);
      }
      
      this.pausedStates.delete(baseFullKey);
    }

    stopAll() {
      this.activeSources.forEach((source, k) => {
        try { source.source.stop(); } catch(e) {}
        this.loopCounters.delete(k);
      });
      this.activeSources.clear();
      this.pausedStates.clear();
    }

    setVolume(volume) {
      this.volume = volume;
      if (this.globalGainNode) {
        this.globalGainNode.gain.value = volume;
      }
      this.activeSources.forEach(source => {
        try { source.gainNode.gain.value = volume; } catch(e) {}
      });
    }

    setVolumeFor(key, volume) {
      const baseFullKey = `${this.modName}:${key}`;
      const matchKey = Array.from(this.activeSources.keys()).find(k => k.startsWith(baseFullKey));
      if (matchKey) {
        const audioSource = this.activeSources.get(matchKey);
        audioSource.gainNode.gain.value = volume;
      }
    }

    togglePause(key) {
      const baseFullKey = `${this.modName}:${key}`;
      const matchKey = Array.from(this.activeSources.keys()).find(k => k.startsWith(baseFullKey));

      if (matchKey) {
        const audioSource = this.activeSources.get(matchKey);
        const currentTime = this.audioManager.audioContext.currentTime;
        const elapsed = currentTime - audioSource.playStartTime;
        const currentOffset = (audioSource.currentOffset || 0) + elapsed;

        try { 
          audioSource.source.stop();
          audioSource.source.disconnect();
          audioSource.gainNode.disconnect();
        } catch (e) {}
        this.activeSources.delete(matchKey);
        this.pausedStates.set(baseFullKey, {
          offset: currentOffset,
          options: {
            ...audioSource.options,
            loop: !!audioSource.source.loop,
            loopStart: audioSource.source.loopStart,
            loopEnd: audioSource.source.loopEnd
          }
        });

        return { status: 'paused', offset: currentOffset };
      }

      if (this.pausedStates.has(baseFullKey)) {
        const pausedState = this.pausedStates.get(baseFullKey);
        this.pausedStates.delete(baseFullKey);
        const audioSource = this.play(key, {
          ...pausedState.options,
          offset: pausedState.offset,
          stopOthers: false,
          allowOverlap: false
        });

        if (audioSource) {
          return { status: 'resumed', audioSource };
        } else {
          this.pausedStates.set(baseFullKey, pausedState);
          return { status: 'failed' };
        }
      }

      return { status: 'not-found' };
    }

    isPlaying() {
      const playingKeys = new Set();
      for (const [fullKey] of this.activeSources) {
        const prefix = `${this.modName}:`;
        if (!fullKey.startsWith(prefix)) continue;
        const rest = fullKey.substring(prefix.length);
        const logical = rest.split('|')[0];
        playingKeys.add(logical);
      }
      return Array.from(playingKeys);
    }

    get audioKeys() {
      return Array.from(this.audioManager.audioBuffers.keys());
    }

    getDuration(key) {
      const buffer = this.audioManager.audioBuffers.get(key);
      return buffer ? buffer.duration : 0;
    }

    setLoopCount(key, count) {
      const baseFullKey = `${this.modName}:${key}`;
      Array.from(this.activeSources.keys()).forEach(k => {
        if (k.startsWith(baseFullKey)) {
          this.loopCounters.set(k, count);
        }
      });
    }
  };

  class AudioManager {
    static ModAudioPlayer = ModAudioPlayer

    static arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return window.btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes.buffer;
    }

    constructor() {
      this.audioContext = null;            // Web Audio API上下文
      this.audioBuffers = new Map();       // 音频缓冲区
      this.modPlayers = new Map();         // 模块播放器实例
      this.initAudioContext();             // 初始化音频上下文
    }

    initAudioContext() {
      if (this.audioContext) return;
      try {
        this.audioContext = new window.AudioContext();
      } catch (e) {
        maplebirch.log('[AudioManager] AudioContext init failed', 'WARN', e);
      }
    }
    
    initStorage() {
      if (!V.maplebirch?.audio?.storage) return
      if (Object.keys(V.maplebirch.audio.storage).length === 0) return;
      for (const [key, base64] of Object.entries(V.maplebirch.audio.storage)) {
        try {
          const arrayBuffer = AudioManager.base64ToArrayBuffer(base64);
          this.loadAudio(key, arrayBuffer);
          maplebirch.log(`[AudioManager] Restored audio: ${key}`);
        } catch (e) {
          maplebirch.log(`[AudioManager] Failed to restore audio: ${key}`, 'WARN', e);
        }
      }
    }
    
    #saveToStorage(key, arrayBuffer) {
      if (!V.maplebirch && !V.maplebirch.audio) return;
      if (!V.maplebirch.audio.storage) V.maplebirch.audio.storage = {};
      V.maplebirch.audio.storage[key] = AudioManager.arrayBufferToBase64(arrayBuffer);
    }

    async loadAudio(key, arrayBuffer) {
      if (!this.audioContext) return false;
      if (this.audioBuffers.has(key)) return true;
      
      return new Promise((resolve) => {
        this.audioContext.decodeAudioData(arrayBuffer.slice(0), 
          (buffer) => {
            this.audioBuffers.set(key, buffer);
            resolve(true);
          },
          (error) => {
            maplebirch.log(`[AudioManager] Failed to decode ${key}`, 'WARN', error);
            resolve(false);
          }
        );
      });
    }

    async importAllAudio(modName, audioFolder = 'audio') {
      const modLoader = maplebirch.modLoader;
      if (!modLoader) return false;
      const modZip = modLoader.getModZip(modName);
      if (!modZip || !modZip.modInfo || !modZip.modInfo.bootJson || !modZip.modInfo.bootJson.additionFile) return false;
      const allAudioFiles = [];
      modZip.zip.forEach((path, file) => {
        if (path.startsWith(`${audioFolder}/`) && !file.dir) {
          const ext = path.split('.').pop().toLowerCase();
          if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) allAudioFiles.push(path);
        }
      });
      const additionFileSet = new Set(modZip.modInfo.bootJson.additionFile);
      allAudioFiles.forEach(path => { if (!additionFileSet.has(path)) modLoader.logger.error(`[AudioManager] Audio file "${path}" found in mod but not listed in additionFile`); });
      const audioFiles = [];
      modZip.modInfo.bootJson.additionFile.forEach(path => {
        if (path.startsWith(`${audioFolder}/`)) {
          const ext = path.split('.').pop().toLowerCase();
          if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
            let key = path.substring(audioFolder.length + 1);
            const lastDotIndex = key.lastIndexOf('.');
            if (lastDotIndex > 0) key = key.substring(0, lastDotIndex);
            audioFiles.push({ path, key });
          }
        }
      });
      
      for (const { path, key } of audioFiles) {
        const file = modZip.zip.file(path);
        if (!file) continue;
        try {
          const arrayBuffer = await file.async('arraybuffer');
          await this.loadAudio(key, arrayBuffer);
        } catch (e) {
          maplebirch.log(`[AudioManager] Failed to load ${key}`, 'WARN', e);
        }
      }
      
      if (!this.modPlayers.has(modName)) {
        this.modPlayers.set(modName, new AudioManager.ModAudioPlayer(this, modName));
      }
      
      return true;
    }

    async addAudioFromFile(file, modName = 'maplebirch-audio') {
      if (!file) return false;
      const fileName = file.name;
      const fileExt = fileName.split('.').pop().toLowerCase();
      if (!['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(fileExt)) {
        maplebirch.log(`[AudioManager] Unsupported file format: ${fileExt}`, 'WARN');
        return false;
      }
      const key = fileName.substring(0, fileName.lastIndexOf('.'));
      try {
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        const success = await this.loadAudio(key, arrayBuffer);
        if (success) {
          if (!this.modPlayers.has(modName)) this.modPlayers.set(modName, new AudioManager.ModAudioPlayer(this, modName));
          this.#saveToStorage(key, arrayBuffer);
          maplebirch.log(`[AudioManager] Audio added successfully: ${key}`);
          return true;
        }
        return false;
      } catch (error) {
        maplebirch.log(`[AudioManager] Failed to add audio from file: ${error}`, 'WARN');
        return false;
      }
    }

    getPlayer(modName) {
      return this.modPlayers.get(modName) || null;
    }
    
    getModAudioKeys(modName) {
      const player = this.getPlayer(modName);
      return player ? player.audioKeys : [];
    }

    get allAudioKeys() {
      return Array.from(this.audioBuffers.keys());
    }

    Init() {
      this.initStorage();
    }

    loadInit() {
      this.initStorage();
    }
  }

  await maplebirch.register('audio', new AudioManager(), []);
})();