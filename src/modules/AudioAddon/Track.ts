type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac' | 'webm';

interface TrackMeta {
  title?: string;
  artist?: string;
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

export default Track;
