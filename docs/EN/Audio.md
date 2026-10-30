# Audio Manager

**`maplebirch.audio`** imports, caches, and plays mod audio. Music data is stored in IndexedDB, then played through the framework with playlist, volume, play mode, and progress support.

Music, ambience, and short effects all use Howler's WebAudio playback. Audio bytes from ZIP files or the database are decoded in memory without creating `blob:` URLs or requesting `data:` addresses. Howler applies master volume and mute once, while mod volumes remain channel multipliers. Howler tracks active music and retains its normal idle suspension.

Supported formats: **`.mp3`**, **`.wav`**, **`.ogg`**, **`.m4a`**, **`.flac`**, **`.webm`**.

## Independent Ambience Layers

`maplebirch.audio.ambience` does not occupy the music playlist. It reads audio directly from a mod ZIP and loops it through Howler's public API, crossfading when tracks change without accessing `Howler.ctx`. Include the file in the audio pack's `additionFile`. `play()` returns `false` if the file is missing, the request is cancelled, or the layer limit is reached. Decoding or loading failures reject its promise.

```javascript
await maplebirch.audio.ambience.play('myAudioPack', 'audio/rain.ogg', 0.25, 1200);
maplebirch.audio.ambience.setVolume(0.4);
maplebirch.audio.ambience.stop(1200);
```

The two numbers are layer volume from 0–1 and fade duration in milliseconds. Replaying the same file on the same layer only updates its volume, without restarting it. The mod still owns the rules for choosing ambience tracks.

The final argument can name a layer. For example, sea and rain can play together. Prefix layer names with the mod name to avoid replacing another mod's ambience.

```javascript
await maplebirch.audio.ambience.play('myAudioPack', 'audio/sea.ogg', 0.25, 1000, 'myMod:place');
await maplebirch.audio.ambience.play('myAudioPack', 'audio/rain.ogg', 0.4, 1000, 'myMod:weather');
maplebirch.audio.ambience.setVolume(0.2, 100, 'myMod:weather');
maplebirch.audio.ambience.stop(500, 'myMod:weather');
```

Without a layer name, `play()` and `setVolume()` use the `default` layer. Calling `stop()` without a layer name stops every layer. Mods should name their own layers when leaving a scene. Up to 4 layers and 4 crossfading tails are retained at once.

## Short Effects and Voices

`maplebirch.audio.effects` reads audio directly from a mod ZIP without interrupting music or ambience. Use `channel` to separate actions, clothing, and character voices. A new effect replaces the previous effect on the same mod's channel. Channels with the same name in different mods remain independent.

```javascript
await maplebirch.audio.effects.play('myAudioPack', 'audio/sfx/bell.ogg', {
  volume: 0.5,
  channel: 'action',
  cooldownMs: 300
});
maplebirch.audio.effects.stop('myAudioPack', 'voice');
maplebirch.audio.effects.stop('myAudioPack');
```

Volume defaults to `1`, channel to `default`, and cooldown to 150 milliseconds. Effects follow the framework's master volume and mute setting. Playback is skipped and returns `false` when audio has not been unlocked, is muted or silent, is cooling down, the file is missing, or the concurrency limit is reached. Effects never wait for a later audio unlock. Requests also expire after 1.5 seconds. Decoding or loading failures reject the promise.

If an audio context that previously played audio is suspended while idle, playback first tries to resume it. The same request expiry and cancellation rules still apply. Howler's automatic suspension remains enabled.

Up to 3 active requests and 8 idle effects are retained. The entire audio pack is not preloaded. Call `stop('myAudioPack')` when changing passages or loading a save to cancel that mod's unfinished effects. Calling `stop()` without arguments cancels active effects from all mods. Destroying the audio manager releases ambience and effect caches.

When importing an audio folder, files whose audio names start with `ambience/`, `sfx/`, or `voice/` stay out of the music playlist. Place ambience loops, short effects, and voices in these folders, and music in `music/`.

## Importing From boot.json

Audio files must be listed in **`additionFile`** so ModLoader can provide them. Then declare the folders to import in the `maplebirchAddon` params.

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
<input id="music-progress" type="range" min="0" max="100" step="0.1" />
<span id="music-time"></span>
```

```javascript
maplebirch.audio.bindProgress('music-progress', 'music-time');
maplebirch.audio.unbindProgress('music-progress', 'music-time');
```

## Internal Structure

The public module entry remains **`src/modules/Audio.ts`**, registered as **`maplebirch.audio`**. Supporting classes live in **`src/modules/AudioAddon/`**:

| File                     | Purpose                                              |
| :----------------------- | :--------------------------------------------------- |
| `Audio.ts`               | `AudioManager`, IndexedDB, cache, events, public API |
| `AudioAddon/Track.ts`    | Track data object                                    |
| `AudioAddon/Playlist.ts` | Playlist, play modes, previous/next/shuffle logic    |
| `AudioAddon/Ambience.ts` | Independent ambience layers, crossfades, and cleanup |
| `AudioAddon/Effects.ts`  | Effect channels, cooldowns, expiry, and cache        |
| `AudioAddon/Sound.ts`    | Guards late context-resume callbacks after unload    |
