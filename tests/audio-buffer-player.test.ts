import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import AudioBufferPlayer from '../src/modules/AudioAddon/AudioBufferPlayer';

interface TestSource {
  buffer: AudioBuffer | null;
  onended: (() => void) | null;
  starts: Array<[number, number]>;
  stopped: boolean;
  disconnected: boolean;
  connect(node: GainNode): void;
  start(when: number, offset: number): void;
  stop(): void;
  disconnect(): void;
}

const originalClamp = Math.clamp;

beforeEach(() => {
  Math.clamp = (value: unknown, min: number, max: number): number => Math.min(Math.max(Number(value), min), max);
});

afterEach(() => {
  if (originalClamp) Math.clamp = originalClamp;
  else delete (Math as unknown as Record<string, unknown>).clamp;
});

function createFixture(): {
  player: AudioBufferPlayer;
  context: AudioContext & { currentTime: number };
  gain: GainNode & { connected: boolean };
  sources: TestSource[];
  ended: () => number;
} {
  const sources: TestSource[] = [];
  let endCalls: number = 0;
  const gainState = { connected: false };
  const gain = {
    gain: { value: 0 },
    get connected(): boolean {
      return gainState.connected;
    },
    connect() {
      gainState.connected = true;
    },
    disconnect() {
      gainState.connected = false;
    }
  } as unknown as GainNode & { connected: boolean };
  const context = {
    currentTime: 0,
    destination: {},
    resume: async (): Promise<void> => undefined,
    createGain: (): GainNode => gain,
    createBufferSource: (): AudioBufferSourceNode => {
      const source: TestSource = {
        buffer: null,
        onended: null,
        starts: [],
        stopped: false,
        disconnected: false,
        connect() {},
        start(when: number, offset: number) {
          this.starts.push([when, offset]);
        },
        stop() {
          this.stopped = true;
        },
        disconnect() {
          this.disconnected = true;
        }
      };
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    }
  } as unknown as AudioContext & { currentTime: number };
  const buffer = { duration: 10 } as AudioBuffer;
  const player = new AudioBufferPlayer(context, buffer, 0.4, () => endCalls++);
  return { player, context, gain, sources, ended: () => endCalls };
}

describe('AudioBufferPlayer', () => {
  test('plays once, tracks position, and handles natural completion', () => {
    const fixture = createFixture();
    fixture.player.play();
    fixture.player.play();
    fixture.context.currentTime = 4;

    expect(fixture.sources).toHaveLength(1);
    expect(fixture.sources[0].starts).toEqual([[0, 0]]);
    expect(fixture.player.seek()).toBe(4);
    expect(fixture.player.duration()).toBe(10);

    fixture.sources[0].onended?.();
    expect(fixture.ended()).toBe(1);
    expect(fixture.player.seek()).toBe(0);
  });

  test('pauses, resumes from the offset, seeks while playing, and clamps values', () => {
    const fixture = createFixture();
    fixture.player.play();
    fixture.context.currentTime = 3;
    fixture.player.pause();

    expect(fixture.sources[0].stopped).toBeTrue();
    expect(fixture.player.seek()).toBe(3);

    fixture.player.play();
    expect(fixture.sources[1].starts).toEqual([[0, 3]]);
    expect(fixture.player.seek(20)).toBe(10);
    expect(fixture.sources[1].stopped).toBeTrue();
    expect(fixture.sources[2].starts).toEqual([[0, 10]]);
  });

  test('updates volume, stops safely, and disconnects resources on unload', () => {
    const fixture = createFixture();
    fixture.player.pause();
    fixture.player.volume(0.8);
    expect(fixture.gain.gain.value).toBe(0.8);

    fixture.player.play();
    fixture.sources[0].stop = (): void => {
      throw new Error('already stopped');
    };
    fixture.player.stop();
    fixture.player.unload();

    expect(fixture.sources[0].disconnected).toBeTrue();
    expect(fixture.gain.connected).toBeFalse();
    expect(fixture.player.seek()).toBe(0);
  });
});
