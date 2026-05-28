# Audio Manager

**`maplebirch.audio`** imports, caches, and plays mod audio. Audio data is stored in IndexedDB, then decoded and played through the framework with playlist, volume, play mode, and progress support.

Supported formats: **`.mp3`**, **`.wav`**, **`.ogg`**, **`.m4a`**, **`.flac`**, **`.webm`**.

## Importing From boot.json

Audio files must be listed in **`additionFile`** so ModLoader can provide them. Then declare the folders to import in the `maplebirchAddon` params.

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^required framework version",
  "params": {
    "audio": ["audio"]
  }
}
```

Multiple folders:

```json
{
  "params": {
    "audio": ["audio/bgm", "audio/se"]
  }
}
```

## Playback

```javascript
await maplebirch.audio.playFromMod('myMod', 'battle_theme');
await maplebirch.audio.playFromMod('myMod'); // Play the first track in the mod playlist

maplebirch.audio.pause();
maplebirch.audio.resume();
maplebirch.audio.stop();
maplebirch.audio.togglePlayPause();

await maplebirch.audio.previous();
await maplebirch.audio.next();
```

Seeking:

```javascript
maplebirch.audio.seek(50); // Percent
maplebirch.audio.seekTo(30); // Seconds
```

## Importing And Removing

```javascript
await maplebirch.audio.import('myMod', 'audio');
await maplebirch.audio.import('myMod', 'audio/bgm');

await maplebirch.audio.addFile(file, 'customMod');
await maplebirch.audio.delete('myMod', 'battle_theme');
await maplebirch.audio.clearAudio('myMod');
```

## Playlists

```javascript
const playlist = await maplebirch.audio.getPlaylist('myMod');
const cached = maplebirch.audio.playlist('myMod');

playlist.clear();
playlist.remove('battle_theme');
playlist.setMode('shuffle');
```

Play modes:

| Value        | Meaning                |
| :----------- | :--------------------- |
| `sequential` | Play in order          |
| `loop_all`   | Loop the playlist      |
| `loop_one`   | Loop the current track |
| `shuffle`    | Shuffle playback       |

```javascript
maplebirch.audio.PlayMode = 'loop_all';
maplebirch.audio.cyclePlayMode();
```

## State And Progress

```javascript
const track = maplebirch.audio.CurrentTrack;
const state = maplebirch.audio.State;
const progress = maplebirch.audio.progress;
const snapshot = maplebirch.audio.snapshot;

maplebirch.audio.formatTime(progress.currentTime);
```

Common properties:

| Property         | Description                                          |
| :--------------- | :--------------------------------------------------- |
| `Volume`         | Volume from `0` to `1`                               |
| `Mute`           | Whether playback is muted                            |
| `PlayMode`       | Current play mode                                    |
| `State`          | `idle`, `loading`, `playing`, `paused`, or `stopped` |
| `CurrentTrack`   | Current track                                        |
| `ActivePlaylist` | Current playlist                                     |
| `currentTime`    | Current playback position in seconds                 |
| `duration`       | Current track duration in seconds                    |
| `progress`       | `{ currentTime, duration, percent }`                 |
| `snapshot`       | Current player state snapshot                        |

### Binding A Progress Bar

```html
<input id="music-progress" type="range" min="0" max="100" step="0.1" /> <span id="music-time"></span>
```

```javascript
maplebirch.audio.bindProgress('music-progress', 'music-time');
maplebirch.audio.unbindProgress('music-progress', 'music-time');
```

## Internal Structure

The public module entry remains **`src/modules/Audio.ts`**, registered as **`maplebirch.audio`**. Supporting classes live in **`src/modules/AudioAddon/`**:

| File                              | Purpose                                              |
| :-------------------------------- | :--------------------------------------------------- |
| `Audio.ts`                        | `AudioManager`, IndexedDB, cache, events, public API |
| `AudioAddon/Track.ts`             | Track data object                                    |
| `AudioAddon/Playlist.ts`          | Playlist, play modes, previous/next/shuffle logic    |
| `AudioAddon/AudioBufferPlayer.ts` | WebAudio playback, pause, seek, and release          |
