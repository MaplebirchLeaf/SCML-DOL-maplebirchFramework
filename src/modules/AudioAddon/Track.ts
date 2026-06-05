type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac' | 'webm';

interface TrackMeta {
  title?: string;
  artist?: string;
}

class Track {
  public title: string;
  public artist: string;
  public duration = 0;
  public format: AudioFormat = 'mp3';

  public constructor(
    readonly audioName: string,
    readonly modName: string,
    meta: TrackMeta = {}
  ) {
    this.title = meta.title || audioName;
    this.artist = meta.artist || modName;
  }
}

export default Track;
