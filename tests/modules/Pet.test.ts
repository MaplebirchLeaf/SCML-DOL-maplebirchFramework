import '../support/runtime';
import { expect, test } from 'bun:test';
import type Character from '../../src/modules/Character';
import Pet, { FloatingPet, type PetOptions } from '../../src/modules/CharacterAddon/Pet';

class PetBox extends EventTarget {
  public readonly style: Record<string, string> = {};
  public readonly classes = new Set<string>();
  public readonly captures = new Set<number>();
  public readonly classList = {
    add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach(name => this.classes.delete(name))
  };
  public replaceChildren(): void {}
  public removeAttribute(name: string): void {
    if (name === 'style') for (const key of Object.keys(this.style)) delete this.style[key];
  }
  public getBoundingClientRect(): { left: number; top: number } {
    return { left: parseFloat(this.style.left) || 0, top: parseFloat(this.style.top) || 0 };
  }
  public setPointerCapture(id: number): void {
    this.captures.add(id);
  }
  public hasPointerCapture(id: number): boolean {
    return this.captures.has(id);
  }
  public releasePointerCapture(id: number): void {
    this.captures.delete(id);
  }
}

class TestPet extends FloatingPet {
  public readonly testCanvas = { style: {} as Record<string, string>, getContext: () => null };
  public constructor() {
    super({ mask: () => '' }, { elementId: 'test-pet', storageKey: 'test.pet.position', className: 'pet', fallback: () => ({ left: 120, top: 140 }) });
  }
  public show(box: PetBox, options: PetOptions = {}): void {
    this.configure(options);
    this.mount(box as unknown as HTMLElement, {} as CanvasModel, this.testCanvas as unknown as HTMLCanvasElement);
  }
  protected draw(): void {}
}

function pointer(box: PetBox, type: string, x: number, y: number): Event {
  const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y });
  box.dispatchEvent(event);
  return event;
}

function withPet(run: (pet: TestPet, box: PetBox, viewport: EventTarget & { innerWidth: number; innerHeight: number }, storage: Map<string, string>) => void): void {
  const saved = [
    [globalThis, 'window'],
    [globalThis, 'document'],
    [globalThis, 'localStorage'],
    [Math, 'clamp']
  ].map(([target, key]) => ({ target: target as object, key: key as string, descriptor: Object.getOwnPropertyDescriptor(target, key as string) }));
  const viewport = Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 });
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { value: viewport, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: { getElementById: () => null }, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
    configurable: true
  });
  Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
  const pet = new TestPet();
  try {
    run(pet, new PetBox(), viewport, storage);
  } finally {
    pet.unmount();
    for (const { target, key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
}

test('locked floating pets pass clicks through both the container and canvas', () =>
  withPet((pet, box) => {
    pet.show(box, { locked: true });
    expect(box.style.pointerEvents).toBe('none');
    expect(pet.testCanvas.style.pointerEvents).toBe('none');
    expect(box.style.touchAction).toBe('auto');
    expect(pointer(box, 'pointerdown', 130, 150).defaultPrevented).toBe(false);
    pointer(box, 'pointermove', 230, 250);
    expect(box.getBoundingClientRect()).toEqual({ left: 120, top: 140 });
    expect(box.captures.size).toBe(0);
  }));

test('unlocking restores dragging and preserves the saved position', () =>
  withPet((pet, box, _viewport, storage) => {
    storage.set('test.pet.position', JSON.stringify({ left: 160, top: 180 }));
    pet.show(box, { locked: true });
    pet.show(box, { locked: false });
    expect(box.style.pointerEvents).toBe('auto');
    expect(box.style.cursor).toBe('grab');
    expect(box.getBoundingClientRect()).toEqual({ left: 160, top: 180 });
    expect(pointer(box, 'pointerdown', 170, 190).defaultPrevented).toBe(true);
    pointer(box, 'pointermove', 220, 230);
    pointer(box, 'pointerup', 220, 230);
    expect(box.getBoundingClientRect()).toEqual({ left: 210, top: 220 });
    expect(JSON.parse(storage.get('test.pet.position')!)).toEqual({ left: 210, top: 220 });
    expect(box.captures.size).toBe(0);
  }));

test('locking during a drag releases capture and fixes the current position', () =>
  withPet((pet, box, _viewport, storage) => {
    pet.show(box);
    pointer(box, 'pointerdown', 130, 150);
    pointer(box, 'pointermove', 180, 210);
    expect(box.captures.size).toBe(1);
    pet.show(box, { locked: true });
    expect(box.captures.size).toBe(0);
    expect(box.getBoundingClientRect()).toEqual({ left: 170, top: 200 });
    expect(JSON.parse(storage.get('test.pet.position')!)).toEqual({ left: 170, top: 200 });
    pointer(box, 'pointermove', 300, 300);
    expect(box.getBoundingClientRect()).toEqual({ left: 170, top: 200 });
  }));

test('locked pets remain inside a resized viewport', () =>
  withPet((pet, box, viewport) => {
    pet.show(box, { locked: true });
    viewport.innerWidth = 200;
    viewport.innerHeight = 180;
    viewport.dispatchEvent(new Event('resize'));
    expect(box.getBoundingClientRect()).toEqual({ left: 0, top: 0 });
    expect(box.style.pointerEvents).toBe('none');
  }));

test('pet unmount removes drag and resize handlers', () =>
  withPet((pet, box, viewport, storage) => {
    pet.show(box);
    pet.unmount();
    pointer(box, 'pointerdown', 10, 10);
    pointer(box, 'pointermove', 100, 100);
    viewport.dispatchEvent(new Event('resize'));
    expect(box.style).toEqual({});
    expect(storage.size).toBe(0);
  }));

test('PC pet sync uses the shared lock state and defaults old settings to unlocked', () => {
  const saved = ['V', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const clamp = Object.getOwnPropertyDescriptor(Math, 'clamp');
  const options: { petLocked?: boolean; character: { pet: { enabled: boolean } } } = { petLocked: true, character: { pet: { enabled: true } } };
  const frames: Array<FrameRequestCallback> = [];
  try {
    Object.defineProperty(globalThis, 'V', { value: { options: { maplebirch: options } }, configurable: true });
    Object.defineProperty(globalThis, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => frames.push(callback), configurable: true });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', { value: () => {}, configurable: true });
    Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
    const pet = new Pet({} as Character);
    const rendered: PetOptions[] = [];
    pet.render = (_target, options = {}) => {
      rendered.push(options);
      return true;
    };
    pet.sync();
    frames.shift()!(0);
    expect(rendered[0].locked).toBe(true);
    delete options.petLocked;
    pet.sync();
    frames.shift()!(0);
    expect(rendered[1].locked).toBe(false);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (clamp) Object.defineProperty(Math, 'clamp', clamp);
    else Reflect.deleteProperty(Math, 'clamp');
  }
});

test('PC pet sync handles missing active options and rechecks queued settings', () => {
  const saved = ['V', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const clamp = Object.getOwnPropertyDescriptor(Math, 'clamp');
  let state: Record<string, unknown> = { options: {} };
  const frames: FrameRequestCallback[] = [];
  let unmounted = 0;
  const rendered: PetOptions[] = [];
  try {
    Object.defineProperty(globalThis, 'V', { get: () => state, configurable: true });
    Object.defineProperty(globalThis, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => frames.push(callback), configurable: true });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', { value: () => {}, configurable: true });
    Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
    const pet = new Pet({} as Character);
    pet.unmount = () => {
      unmounted++;
    };
    pet.render = (_target, options = {}) => {
      rendered.push(options);
      return true;
    };

    for (const options of [{}, undefined, { maplebirch: {} }, { maplebirch: { petLocked: true } }]) {
      state = { options };
      expect(pet.sync()).toBe(false);
      expect(frames).toHaveLength(0);
    }
    expect(unmounted).toBe(4);

    state = { options: { maplebirch: { petLocked: true, character: { pet: { enabled: true, mask: 20 } } } } };
    expect(pet.sync()).toBe(true);
    state = { options: {} };
    frames.shift()!(0);
    expect(rendered).toHaveLength(0);
    expect(unmounted).toBe(5);

    state = { options: { maplebirch: { petLocked: true, character: { pet: { enabled: true, mask: 20 } } } } };
    expect(pet.sync()).toBe(true);
    state = { options: { sidebarAnimations: false, maplebirch: { petLocked: false, character: { pet: { enabled: true, mask: 0, rotation: 0, scale: 0.8 } } } } };
    frames.shift()!(0);
    expect(rendered).toHaveLength(1);
    expect(rendered[0]).toMatchObject({ locked: false, animated: false, mask: 0, rotation: 0, scale: 0.8 });
    expect(state).toEqual({ options: { sidebarAnimations: false, maplebirch: { petLocked: false, character: { pet: { enabled: true, mask: 0, rotation: 0, scale: 0.8 } } } } });
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (clamp) Object.defineProperty(Math, 'clamp', clamp);
    else Reflect.deleteProperty(Math, 'clamp');
  }
});
