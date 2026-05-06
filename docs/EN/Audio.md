# Audio Manager

`AudioManager` lets a mod import and play audio files through the framework. It is useful for background music, sound effects, playlists, volume control, and mod-local audio libraries.

Access it with:

```javascript
const audioManager = maplebirch.audio;
```

## Importing Audio From boot.json

Audio files should also be listed in `additionFile` so ModLoader can provide them to the mod.

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^required framework version",
  "params": {
    "audio": true
  }
}
```

`audio: true` imports audio from the default `audio/` folder. Use an array when your mod keeps audio in custom folders:

```json
{
  "params": {
    "audio": ["bgm", "sfx/ui", "sfx/events"]
  }
}
```

Supported formats include `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`, and `.webm`.

## Playback

```javascript
await maplebirch.audio.modPlay('myMod', 'battle_theme');

maplebirch.audio.pause();
maplebirch.audio.resume();
maplebirch.audio.stop();
maplebirch.audio.togglePlayPause();
```

Playlist controls:

```javascript
await maplebirch.audio.next();
await maplebirch.audio.previous();

maplebirch.audio.seek(50);   // percent
maplebirch.audio.seekTo(30); // seconds
```

## Volume And Mode

```javascript
maplebirch.audio.Volume = 0.8;
maplebirch.audio.Mute = false;

maplebirch.audio.PlayMode = 'shuffle';
```

Common play modes:

| Mode | Meaning |
| :--- | :--- |
| `sequential` | Play tracks in order |
| `loop_all` | Loop the whole playlist |
| `loop_one` | Loop the current track |
| `shuffle` | Shuffle playback |

## Import And Playlist APIs

```javascript
await maplebirch.audio.importAllAudio('myMod');
await maplebirch.audio.importAllAudio('myMod', 'custom/audio/path');

const playlist = await maplebirch.audio.modPlaylist('myMod');
playlist.mode('shuffle');
playlist.clear();
```

To remove imported audio:

```javascript
await maplebirch.audio.deleteAudio('track_key', 'myMod');
await maplebirch.audio.modAudioClearAll('myMod');
```

## Useful Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `Volume` | number | Current volume, from `0` to `1` |
| `Mute` | boolean | Whether playback is muted |
| `PlayMode` | string | Current playback mode |
| `currentTime` | number | Current playback position in seconds |
| `duration` | number | Current track duration in seconds |
| `currentTrack` | Track | Current track object |
