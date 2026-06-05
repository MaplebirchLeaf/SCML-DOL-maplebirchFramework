// .src/modules/Frameworks/RandSystem.ts

import { createlog } from '../../core';

export interface RandState {
  seed: number | null;
  history: number[];
  index: number;
}

class randSystem {
  public static readonly log = createlog('rand');

  public static create(state: Partial<RandState> = {}): randSystem {
    return new randSystem(state);
  }

  public readonly log = randSystem.log;
  public readonly state: RandState;

  private readonly maxHistory = 100;
  private readonly modulus = 0x100000000;

  public constructor(state: Partial<RandState> = {}) {
    this.state = state as RandState;
    this.normalize();
  }

  public reset(seed: number = Date.now()): void {
    const value = Math.trunc(Number(seed));
    this.state.seed = Number.isFinite(value) ? value >>> 0 : Date.now() >>> 0;
    this.state.history = [];
    this.state.index = 0;
  }

  public int(max: number): number {
    const limit = Math.max(0, Math.floor(Number(max) || 0));
    return Math.floor((this.next() / this.modulus) * (limit + 1));
  }

  public percent(): number {
    return Math.floor((this.next() / this.modulus) * 100) + 1;
  }

  public back(steps = 1): void {
    if (steps <= 0) return;
    this.state.index = Math.max(0, this.state.index - Math.floor(steps));
  }

  public forward(steps = 1): void {
    if (steps <= 0) return;
    this.state.index = Math.min(this.state.history.length, this.state.index + Math.floor(steps));
  }

  public get seed(): number | null {
    return this.state.seed;
  }

  public set seed(value: number) {
    this.reset(value);
  }

  public get history(): number[] {
    return [...this.state.history];
  }

  public get index(): number {
    return this.state.index;
  }

  private next(): number {
    if (this.state.seed === null) this.reset();
    if (this.state.index < this.state.history.length) return this.state.history[this.state.index++];
    this.state.seed = (Math.imul(this.state.seed!, 1664525) + 1013904223) >>> 0;
    this.state.history.push(this.state.seed);
    if (this.state.history.length > this.maxHistory) {
      this.state.history.shift();
      this.state.index = Math.max(0, this.state.index - 1);
    }
    this.state.index++;
    return this.state.seed;
  }

  private normalize(): void {
    const seed = Math.trunc(Number(this.state.seed));
    this.state.seed = Number.isFinite(seed) ? seed >>> 0 : null;
    if (Array.isArray(this.state.history)) {
      this.state.history = this.state.history
        .map(value => Math.trunc(Number(value)))
        .filter(Number.isFinite)
        .map(value => value >>> 0)
        .slice(-this.maxHistory);
    } else {
      this.state.history = [];
    }
    const index = Math.trunc(Number(this.state.index));
    this.state.index = Number.isFinite(index) ? Math.max(0, Math.min(index, this.state.history.length)) : 0;
  }
}

export default randSystem;
