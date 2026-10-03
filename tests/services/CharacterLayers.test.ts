import './runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

mock.module('../../src/core', () => ({ default: {} }));

const { default: Character } = await import('../../src/modules/Character');

function withCharacterLayers(run: (character: InstanceType<typeof Character>, create: (layers: CanvasLayerMap) => CanvasModel) => void): void {
  const originalRenderer = Object.getOwnPropertyDescriptor(globalThis, 'Renderer');
  Object.defineProperty(globalThis, 'Renderer', { value: { CanvasModels: {} }, configurable: true });
  const core = { host: { modLoader: undefined }, once() {}, tool: { define() {}, defineS() {} } } as unknown as MaplebirchCore;
  const character = new Character(core);
  class BaseModel {
    public readonly name: string;
    public readonly layers: CanvasLayerMap;
    public readonly layerList: LayerConfig[];
    public constructor(options: CanvasModelOptions) {
      this.name = options.name;
      this.layers = options.layers;
      this.layerList = Object.values(this.layers);
    }
    public preprocess(): void {}
    public postprocess(): void {}
  }
  try {
    const PatchedModel = character.patchCanvasModel(BaseModel as unknown as CanvasModelConstructor);
    run(character, layers => new PatchedModel({ name: 'main', width: 256, height: 256, layers }));
  } finally {
    if (originalRenderer) Object.defineProperty(globalThis, 'Renderer', originalRenderer);
    else Reflect.deleteProperty(globalThis, 'Renderer');
  }
}

test('show-only layer patches retain the native source function, receiver and side effects', () => {
  withCharacterLayers((character, create) => {
    let calls = 0;
    const native: LayerConfig = {
      src: 'img/nnpc',
      srcfn() {
        calls++;
        return `${this.src}/robin.png`;
      }
    };
    character.use({ nnpc: { showfn: options => options.show_nnpc === true } }, 'main');
    const layer = create({ nnpc: native }).layers.nnpc;
    expect(layer.srcfn?.({ show_nnpc: true })).toBe('img/nnpc/robin.png');
    expect(layer.srcfn).toBe(native.srcfn);
    expect(calls).toBe(1);
    expect(layer.showfn?.({ show_nnpc: false })).toBe(false);
    expect(layer.showfn?.({ show_nnpc: true })).toBe(true);
  });
});

test('supplied source functions remain guarded and use the merged layer as their receiver', () => {
  withCharacterLayers((character, create) => {
    let calls = 0;
    character.use(
      {
        nnpc: {
          src: 'img/custom-nnpc',
          showfn: options => options.show_nnpc === true,
          srcfn(options) {
            calls++;
            return `${this.src}/${options.partner}.png`;
          }
        }
      },
      'main'
    );
    const layer = create({ nnpc: { src: 'img/native.png' } }).layers.nnpc;
    expect(layer.srcfn?.({ show_nnpc: false, partner: 'robin' })).toBe('');
    expect(calls).toBe(0);
    expect(layer.srcfn?.({ show_nnpc: true, partner: 'robin' })).toBe('img/custom-nnpc/robin.png');
    expect(calls).toBe(1);
  });
});

test('supplied static layer sources remain guarded by their visibility function', () => {
  for (const src of ['img/custom-nnpc/robin.png', '']) {
    withCharacterLayers((character, create) => {
      character.use({ nnpc: { src, showfn: options => options.show_nnpc === true } }, 'main');
      const layer = create({ nnpc: { srcfn: () => 'img/native.png' } }).layers.nnpc;
      expect(layer.srcfn?.({ show_nnpc: false })).toBe('');
      expect(layer.srcfn?.({ show_nnpc: true })).toBe(src);
    });
  }
});
