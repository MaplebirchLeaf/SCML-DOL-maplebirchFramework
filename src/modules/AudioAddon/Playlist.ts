import Track from './Track';

export const PlayMode = {
  SEQUENTIAL: 'sequential',
  LOOP_ALL: 'loop_all',
  LOOP_ONE: 'loop_one',
  SHUFFLE: 'shuffle'
} as const;

export type PlayModeType = (typeof PlayMode)[keyof typeof PlayMode];

class Playlist {
  public tracks: Track[] = [];
  public currentIndex = -1;
  public playMode: PlayModeType = PlayMode.LOOP_ALL;

  private shuffleOrder: number[] = [];
  private shuffleIndex = -1;

  public constructor(readonly name: string) {}

  public add(input: Track | Track[]): void {
    const tracks = Array.isArray(input) ? input : [input];
    for (const track of tracks) {
      const index = this.tracks.findIndex(item => item.modName === track.modName && item.audioName === track.audioName);
      if (index >= 0) {
        this.tracks[index] = track;
      } else {
        this.tracks.push(track);
      }
    }
    this.resetShuffle();
  }

  public removeAt(index: number): boolean {
    if (index < 0 || index >= this.tracks.length) return false;
    this.tracks.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      this.currentIndex = Math.min(this.currentIndex, this.tracks.length - 1);
    }
    if (this.tracks.length === 0) this.currentIndex = -1;
    this.resetShuffle();
    return true;
  }

  public remove(audioName: string): boolean {
    const index = this.tracks.findIndex(track => track.audioName === audioName);
    return this.removeAt(index);
  }

  public clear(): void {
    this.tracks = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.shuffleIndex = -1;
  }

  public setMode(mode: PlayModeType): void {
    this.playMode = mode;
    if (mode === PlayMode.SHUFFLE) this.shuffle();
  }

  public select(index: number): Track | null {
    if (index < 0 || index >= this.tracks.length) return null;
    this.currentIndex = index;
    if (this.playMode === PlayMode.SHUFFLE) this.shuffleIndex = this.shuffleOrder.indexOf(index);
    return this.tracks[index] || null;
  }

  public next(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) {
      if (this.currentIndex < 0) this.currentIndex = 0;
      return this.tracks[this.currentIndex] || null;
    }
    if (this.playMode === PlayMode.SHUFFLE) {
      if (this.shuffleOrder.length !== this.tracks.length) this.shuffle();
      this.shuffleIndex++;
      if (this.shuffleIndex >= this.shuffleOrder.length) {
        this.shuffle();
        this.shuffleIndex = 0;
      }
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex] || null;
    }

    this.currentIndex++;
    if (this.currentIndex >= this.tracks.length) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = 0;
      } else {
        this.currentIndex = this.tracks.length - 1;
        return null;
      }
    }
    return this.tracks[this.currentIndex] || null;
  }

  public previous(): Track | null {
    if (this.tracks.length === 0) return null;
    if (this.playMode === PlayMode.LOOP_ONE) {
      if (this.currentIndex < 0) this.currentIndex = 0;
      return this.tracks[this.currentIndex] || null;
    }
    if (this.playMode === PlayMode.SHUFFLE) {
      if (this.shuffleIndex <= 0) return null;
      this.shuffleIndex--;
      this.currentIndex = this.shuffleOrder[this.shuffleIndex];
      return this.tracks[this.currentIndex] || null;
    }
    this.currentIndex--;
    if (this.currentIndex < 0) {
      if (this.playMode === PlayMode.LOOP_ALL) {
        this.currentIndex = this.tracks.length - 1;
      } else {
        this.currentIndex = 0;
        return null;
      }
    }
    return this.tracks[this.currentIndex] || null;
  }

  public get length(): number {
    return this.tracks.length;
  }

  private resetShuffle(): void {
    this.shuffleOrder = [];
    this.shuffleIndex = -1;
    if (this.playMode === PlayMode.SHUFFLE) this.shuffle();
  }

  private shuffle(): void {
    this.shuffleOrder = [...Array(this.tracks.length).keys()];
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.random(i);
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
    this.shuffleIndex = -1;
  }
}

export default Playlist;
