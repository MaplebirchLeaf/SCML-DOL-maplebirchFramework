# 音频管理

**`maplebirch.audio`** 用于导入、缓存和播放模组音频。音乐数据会写入 IndexedDB，播放时由框架管理播放列表、音量、循环模式和进度。

音乐、环境音和短音效统一使用 Howler 的 WebAudio 播放。ZIP 或数据库里的音频字节在内存中解码，不创建 `blob:` URL，也不向 `data:` 地址发起请求。主音量和静音由 Howler 统一应用，模组音量仅作为各自通道的倍率。Howler 能识别正在播放的音乐，保留正常的空闲休眠。

支持格式：**`.mp3`**、**`.wav`**、**`.ogg`**、**`.m4a`**、**`.flac`**、**`.webm`**。

## 独立环境音层

`maplebirch.audio.ambience` 不占用音乐播放列表。它直接读取模组 ZIP 内的音频文件，通过 Howler 的公开接口循环播放。切换曲目时交叉淡化，不需要访问 `Howler.ctx`。文件需在音频包的 `additionFile` 中。文件不存在、请求被取消或已达到层数限制时，`play()` 返回 `false`。解码或加载失败会拒绝 Promise。

```javascript
await maplebirch.audio.ambience.play('myAudioPack', 'audio/rain.ogg', 0.25, 1200);
maplebirch.audio.ambience.setVolume(0.4);
maplebirch.audio.ambience.stop(1200);
```

两个数字分别是 0–1 的层音量和毫秒淡化时长。重复播放同一层的相同文件只更新音量，不会从头播放。环境音的曲目选择规则仍由模组决定。

最后一个参数可指定层名。例如海浪和雨声可以同时播放，层名建议加上模组前缀，避免覆盖其他模组。

```javascript
await maplebirch.audio.ambience.play('myAudioPack', 'audio/sea.ogg', 0.25, 1000, 'myMod:place');
await maplebirch.audio.ambience.play('myAudioPack', 'audio/rain.ogg', 0.4, 1000, 'myMod:weather');
maplebirch.audio.ambience.setVolume(0.2, 100, 'myMod:weather');
maplebirch.audio.ambience.stop(500, 'myMod:weather');
```

不传层名的 `play()` 和 `setVolume()` 操作 `default` 层。`stop()` 不传层名会停止全部层，模组退出自己的场景时应指定层名。最多同时保留 4 层和 4 个交叉淡出的尾音。

## 短音效与声音

`maplebirch.audio.effects` 直接读取 ZIP 音频，不打断音乐或环境音。每个模组可按 `channel` 区分动作、衣物和人物声音，同一模组的相同频道会替换旧音效。不同模组的相同频道互不覆盖。

```javascript
await maplebirch.audio.effects.play('myAudioPack', 'audio/sfx/bell.ogg', {
  volume: 0.5,
  channel: 'action',
  cooldownMs: 300
});
maplebirch.audio.effects.stop('myAudioPack', 'voice');
maplebirch.audio.effects.stop('myAudioPack');
```

默认音量为 `1`，默认频道为 `default`，默认冷却为 150 毫秒。短音效受框架总音量和静音控制。浏览器尚未解锁音频、静音、音量为零、处于冷却、文件不存在或并发已满时会跳过并返回 `false`。音效不会等待日后解锁再补播，请求超过 1.5 秒也会取消。解码或加载失败会拒绝 Promise。

已经播放过的音频上下文若因空闲自动休眠，会尝试恢复后播放当前音效。恢复仍受同一请求的过期和取消控制，不关闭 Howler 的自动休眠。

最多同时保留 3 个活动请求和 8 个空闲音效缓存，不会预加载整个音频包。模组切页或读档时应调用 `stop('myAudioPack')`，清除本模组尚未结束的音效。无参 `stop()` 会清除所有模组的活动音效。框架销毁时会释放环境音和音效缓存。

导入音频目录时，名称以 `ambience/`、`sfx/`、`voice/` 开头的文件不会加入音乐播放列表。将循环环境音、短音效与人物声音分别放在这些目录中，音乐可放在 `music/`。

## boot.json 导入

音频文件需要先写入 `boot.json` 的 **`additionFile`**，再在 `maplebirchAddon` 参数里声明要导入的目录。

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
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

| 文件                     | 作用                                            |
| :----------------------- | :---------------------------------------------- |
| `Audio.ts`               | `AudioManager`、IndexedDB、缓存、事件、对外 API |
| `AudioAddon/Track.ts`    | 音轨数据对象                                    |
| `AudioAddon/Playlist.ts` | 播放列表、播放模式、上一首/下一首/随机逻辑      |
| `AudioAddon/Ambience.ts` | 独立环境音层、交叉淡化和释放                    |
| `AudioAddon/Effects.ts`  | 短音效频道、冷却、过期取消和缓存                |
| `AudioAddon/Sound.ts`    | 避免已卸载音频执行晚到的休眠恢复回调            |
