## 音频管理 (AudioManager)

### 基本介绍

`AudioManager` 是框架提供的音频管理系统，允许模组制作者在游戏中管理背景音乐、音效等音频资源。它支持多种音频格式、播放列表、播放模式、音量控制等功能，并集成了 IndexedDB 存储以实现音频的快速加载和缓存。

---

### 在 boot.json 中配置音频导入

除了通过 JavaScript API 导入音频外，框架还支持在 `boot.json` 文件中通过 `addonPlugin` 配置来批量导入音频文件。

#### 配置结构

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "audio": true
  }
}
```

#### 配置选项说明

- 要加载的音频需要在 `boot.json` 文件中 `additionFile` 里填写路径
- `audio: true`：导入模组默认路径(`audio/` 文件夹)下的所有音频文件
- `audio: ["自定义路径1", "自定义路径2"]`：导入指定路径下的音频文件

#### 支持的文件格式

- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- M4A (`.m4a`)
- FLAC (`.flac`)
- WebM (`.webm`)

#### 配置示例

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "audio": true
  }
}
```

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "audio": ["bgm", "sfx/weapons", "sfx/ui"]
  }
}
```

---

### JavaScript API 使用

#### 音频管理器实例

```javascript
// 获取音频管理器实例
const audioManager = maplebirch.audio;
```

#### 播放控制

##### **播放音频**

```javascript
// 播放指定模组的音频
await audioManager.modPlay('myMod', 'background_music');

// 播放特定音轨
await audioManager.modPlay('myMod', 'battle_bgm');
```

##### **播放/暂停控制**

```javascript
// 播放
await audioManager.play(track);

// 暂停
audioManager.pause();

// 恢复播放
audioManager.resume();

// 停止
audioManager.stop();

// 切换播放/暂停
audioManager.togglePlayPause();
```

##### **播放列表控制**

```javascript
// 下一曲
await audioManager.next();

// 上一曲
await audioManager.previous();

// 跳转到指定位置(百分比)
audioManager.seek(50); // 跳转到50%位置

// 跳转到指定时间(秒)
audioManager.seekTo(30); // 跳转到30秒位置
```

#### 音量控制

```javascript
// 获取当前音量
const currentVolume = audioManager.Volume; // 0.0 - 1.0

// 设置音量
audioManager.Volume = 0.8; // 设置音量为80%

// 静音切换
audioManager.Mute = true; // 静音
audioManager.Mute = false; // 取消静音
```

#### 播放模式

```javascript
// 播放模式常量
const PlayMode = {
  SEQUENTIAL: 'sequential', // 顺序播放
  LOOP_ALL: 'loop_all', // 列表循环
  LOOP_ONE: 'loop_one', // 单曲循环
  SHUFFLE: 'shuffle' // 随机播放
};

// 设置播放模式
audioManager.PlayMode = PlayMode.SHUFFLE;
```

#### 音频导入管理

```javascript
// 导入模组音频
await audioManager.importAllAudio('myMod');
await audioManager.importAllAudio('myMod', 'custom/audio/path');

// 从文件导入音频
const fileInput = document.getElementById('audioFile');
const file = fileInput.files[0];
await audioManager.addAudioFromFile(file, 'customMod');

// 删除音频
await audioManager.deleteAudio('track_key', 'modName');

// 清空模组音频
await audioManager.modAudioClearAll('modName');
```

#### 播放列表管理

```javascript
// 获取模组播放列表
const playlist = await audioManager.modPlaylist('myMod');

// 添加音轨到播放列表
playlist.add(
  new Track('new_track', 'myMod', {
    title: 'New Track',
    artist: 'Composer'
  })
);

// 移除音轨
playlist.remove(0); // 移除第一首

// 清空播放列表
playlist.clear();

// 设置播放模式
playlist.mode(PlayMode.SHUFFLE);
```

### 音频管理器属性

| 属性           | 类型    | 说明               |
| :------------- | :------ | :----------------- |
| `Volume`       | number  | 当前音量(0.0-1.0)  |
| `Mute`         | boolean | 是否静音           |
| `PlayMode`     | string  | 当前播放模式       |
| `currentTime`  | number  | 当前播放时间(秒)   |
| `duration`     | number  | 当前音轨总时长(秒) |
| `currentTrack` | Track   | 当前播放的音轨     |
