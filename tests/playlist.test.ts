import { afterEach, describe, expect, test } from 'bun:test';
import Playlist, { PlayMode } from '../src/modules/AudioAddon/Playlist';
import Track from '../src/modules/AudioAddon/Track';

const originalRandom = Math.random;

afterEach(() => {
  Math.random = originalRandom;
});

function tracks(): Track[] {
  return [new Track('one', 'mod'), new Track('two', 'mod'), new Track('three', 'mod')];
}

describe('Playlist', () => {
  test('adds tracks, replaces duplicate identities, and maintains selection while removing', () => {
    const playlist = new Playlist('test');
    const [one, two, three] = tracks();
    const replacement = new Track('one', 'mod', { title: 'Replacement' });

    playlist.add([one, two, three]);
    playlist.add(replacement);
    expect(playlist.length).toBe(3);
    expect(playlist.tracks[0]).toBe(replacement);

    expect(playlist.select(1)).toBe(two);
    expect(playlist.remove('one')).toBeTrue();
    expect(playlist.currentIndex).toBe(0);
    expect(playlist.removeAt(9)).toBeFalse();
    expect(playlist.select(-1)).toBeNull();

    playlist.clear();
    expect(playlist.length).toBe(0);
    expect(playlist.currentIndex).toBe(-1);
  });

  test('supports sequential boundaries and loop modes', () => {
    const playlist = new Playlist('test');
    const [one, two] = tracks();
    playlist.add([one, two]);

    playlist.setMode(PlayMode.SEQUENTIAL);
    expect(playlist.next()).toBe(one);
    expect(playlist.next()).toBe(two);
    expect(playlist.next()).toBeNull();
    expect(playlist.previous()).toBe(one);
    expect(playlist.previous()).toBeNull();

    playlist.setMode(PlayMode.LOOP_ALL);
    expect(playlist.previous()).toBe(two);
    expect(playlist.next()).toBe(one);

    playlist.setMode(PlayMode.LOOP_ONE);
    playlist.currentIndex = -1;
    expect(playlist.next()).toBe(one);
    expect(playlist.previous()).toBe(one);
  });

  test('shuffle returns each track in a valid deterministic order', () => {
    Math.random = ((max?: number): number => (max == null ? 0.5 : Math.floor((max + 1) * 0.5))) as typeof Math.random;
    const playlist = new Playlist('test');
    const expected = tracks();
    playlist.add(expected);
    playlist.setMode(PlayMode.SHUFFLE);

    const cycle = [playlist.next(), playlist.next(), playlist.next()];

    expect(cycle.every((track: Track | null) => track instanceof Track)).toBeTrue();
    expect(new Set(cycle)).toEqual(new Set(expected));
    expect(playlist.previous()).not.toBeNull();
  });

  test('returns null navigation results for an empty playlist', () => {
    const playlist = new Playlist('empty');
    expect(playlist.next()).toBeNull();
    expect(playlist.previous()).toBeNull();
  });
});
