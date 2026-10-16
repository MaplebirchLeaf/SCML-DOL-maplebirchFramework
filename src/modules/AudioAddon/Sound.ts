import { Howl, type HowlCallback, type HowlErrorCallback } from 'howler';

class Sound extends Howl {
  public override once(event: string, callback: HowlCallback | HowlErrorCallback, id?: number): this {
    if (event !== 'resume') return super.once(event, callback, id);
    return super.once(
      event,
      (soundId: number, error: unknown) => {
        // Howler may already have queued its resume callback before off()/unload().
        if (this.state() !== 'unloaded') (callback as HowlErrorCallback).call(this, soundId, error);
      },
      id
    );
  }
}

export default Sound;
