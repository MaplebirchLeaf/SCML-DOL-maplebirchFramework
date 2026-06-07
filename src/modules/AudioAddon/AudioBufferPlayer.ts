class AudioBufferPlayer {
  private source: AudioBufferSourceNode | null = null;
  private readonly gain: GainNode;
  private startedAt = 0;
  private offset = 0;
  private playing = false;

  public constructor(
    private readonly context: AudioContext,
    private readonly buffer: AudioBuffer,
    volume: number,
    private readonly onend: () => void
  ) {
    this.gain = context.createGain();
    this.gain.gain.value = volume;
    this.gain.connect(context.destination);
  }

  public play(): void {
    if (this.playing) return;
    void this.context.resume?.();
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.gain);
    source.onended = () => {
      if (this.source !== source || !this.playing) return;
      this.source = null;
      this.playing = false;
      this.offset = 0;
      this.onend();
    };
    this.source = source;
    this.startedAt = this.context.currentTime - this.offset;
    this.playing = true;
    source.start(0, Math.min(this.offset, this.buffer.duration));
  }

  public pause(): void {
    if (!this.playing) return;
    this.offset = this.seek();
    this.stopSource();
    this.playing = false;
  }

  public stop(): void {
    this.offset = 0;
    this.stopSource();
    this.playing = false;
  }

  public seek(value?: number): number {
    if (typeof value !== 'number') return this.playing ? Math.min(this.context.currentTime - this.startedAt, this.buffer.duration) : this.offset;
    this.offset = Math.clamp(value, 0, this.buffer.duration);
    if (this.playing) {
      this.stopSource();
      this.playing = false;
      this.play();
    }
    return this.offset;
  }

  public duration(): number {
    return this.buffer.duration;
  }

  public volume(value: number): void {
    this.gain.gain.value = value;
  }

  public unload(): void {
    this.stop();
    this.gain.disconnect();
  }

  private stopSource(): void {
    const source = this.source;
    if (!source) return;
    this.source = null;
    source.onended = null;
    try {
      source.stop();
    } catch {}
    source.disconnect();
  }
}

export default AudioBufferPlayer;
