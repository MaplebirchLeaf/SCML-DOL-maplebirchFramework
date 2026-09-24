# 音频管理

**`maplebirch.audio`** 用于导入、缓存和播放模组音频。音频数据会写入 IndexedDB，播放时由框架解码并管理播放列表、音量、循环模式和进度。

支持格式：**`.mp3`**、**`.wav`**、**`.ogg`**、**`.m4a`**、**`.flac`**、**`.webm`**。

## 独立环境音通道

`maplebirch.audio.ambience` 不占用音乐播放列表。它直接读取模组 ZIP 内的音频文件，通过 Howler 的公开接口循环播放；切换曲目时交叉淡化，不需要访问 `Howler.ctx`。文件需在音频包的 `additionFile` 中。`play()` 返回 `false` 表示文件不存在；解码或加载失败会拒绝 Promise。

```javascript
await maplebirch.audio.ambience.play('myAudioPack', 'audio/rain.ogg', 0.25, 1200);
maplebirch.audio.ambience.setVolume(0.4);
maplebirch.audio.ambience.stop(1200);
```

后两个数字分别是 0–1 的通道音量和毫秒淡化时长；重复播放同一文件只更新音量。环境音的曲目选择规则仍由模组决定。

## boot.json 导入

音频文件需要先写入 `boot.json` 的 **`additionFile`**，再在 `maplebirchAddon` 参数里声明要导入的目录。

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^需要的框架版本",
  "params": {
    "audio": ["audio"]
  }
}
```

多个目录：

```json
{
  "params": {
    "audio": ["audio/bgm", "audio/se"]
  }
}
```

## 播放

```javascript
await maplebirch.audio.playFromMod('myMod', 'battle_theme');
await maplebirch.audio.playFromMod('myMod'); // 播放该模组播放列表第一首

maplebirch.audio.pause();
maplebirch.audio.resume();
maplebirch.audio.stop();
maplebirch.audio.togglePlayPause();

await maplebirch.audio.previous();
await maplebirch.audio.next();
```

跳转：

```javascript
maplebirch.audio.seek(50); // 按百分比跳转
maplebirch.audio.seekTo(30); // 跳到第 30 秒
```

## 导入和删除

```javascript
await maplebirch.audio.import('myMod', 'audio');
await maplebirch.audio.import('myMod', 'audio/bgm');

await maplebirch.audio.addFile(file, 'customMod');
await maplebirch.audio.delete('myMod', 'battle_theme');
await maplebirch.audio.clearAudio('myMod');
```

## 播放列表

```javascript
const playlist = await maplebirch.audio.getPlaylist('myMod');
const cached = maplebirch.audio.playlist('myMod');

playlist.clear();
playlist.remove('battle_theme');
playlist.setMode('shuffle');
```

播放模式：

| 值           | 说明     |
| :----------- | :------- |
| `sequential` | 顺序播放 |
| `loop_all`   | 列表循环 |
| `loop_one`   | 单曲循环 |
| `shuffle`    | 随机播放 |

```javascript
maplebirch.audio.PlayMode = 'loop_all';
maplebirch.audio.cyclePlayMode();
```

## 状态和进度

```javascript
const track = maplebirch.audio.CurrentTrack;
const state = maplebirch.audio.State;
const progress = maplebirch.audio.progress;
const snapshot = maplebirch.audio.snapshot;

maplebirch.audio.formatTime(progress.currentTime);
```

常用属性：

| 属性             | 说明                                              |
| :--------------- | :------------------------------------------------ |
| `Volume`         | 音量，范围 `0` 到 `1`                             |
| `Mute`           | 是否静音                                          |
| `PlayMode`       | 当前播放模式                                      |
| `State`          | `idle`、`loading`、`playing`、`paused`、`stopped` |
| `CurrentTrack`   | 当前音轨                                          |
| `ActivePlaylist` | 当前播放列表                                      |
| `currentTime`    | 当前播放时间，单位秒                              |
| `duration`       | 当前音轨长度，单位秒                              |
| `progress`       | `{ currentTime, duration, percent }`              |
| `snapshot`       | 播放器当前状态快照                                |

### 绑定进度条

```html
<input id="music-progress" type="range" min="0" max="100" step="0.1" /> <span id="music-time"></span>
```

```javascript
maplebirch.audio.bindProgress('music-progress', 'music-time');
maplebirch.audio.unbindProgress('music-progress', 'music-time');
```

## 内部结构

音频模块入口仍然是 **`src/modules/Audio.ts`**，对外注册为 **`maplebirch.audio`**。辅助类拆到 **`src/modules/AudioAddon/`**：

| 文件                              | 作用                                            |
| :-------------------------------- | :---------------------------------------------- |
| `Audio.ts`                        | `AudioManager`、IndexedDB、缓存、事件、对外 API |
| `AudioAddon/Track.ts`             | 音轨数据对象                                    |
| `AudioAddon/Playlist.ts`          | 播放列表、播放模式、上一首/下一首/随机逻辑      |
| `AudioAddon/AudioBufferPlayer.ts` | WebAudio 播放、暂停、跳转和释放                 |
