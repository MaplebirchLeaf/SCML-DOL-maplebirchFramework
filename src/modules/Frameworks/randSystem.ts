// .src/modules/Frameworks/randSystem.ts

import maplebirch, { createlog } from '../../core';

const _ = maplebirch.lodash;

interface randState {
  seed: number | null;
  history: number[];
  pointer: number;
}

class randSystem {
  static log = createlog('rand');
  static create() {
    return new randSystem();
  }
  log = randSystem.log;
  state: randState;

  constructor() {
    this.state = {
      seed: null,
      history: [],
      pointer: 0
    };
  }

  set Seed(seed: number) {
    this.state.seed = _.parseInt(seed.toString()) & 0x7fffffff;
    this.state.history = [];
    this.state.pointer = 0;
  }

  get Seed() {
    return this.state.seed;
  }

  get(max: number) {
    if (this.state.seed === null) this.state.seed = Date.now() & 0x7fffffff;
    if (this.state.pointer < this.state.history.length) {
      const value = this.state.history[this.state.pointer];
      this.state.pointer++;
      return value % (max + 1);
    }
    this.state.seed = (this.state.seed * 1103515245 + 12345) & 0x7fffffff;
    const value = _.floor((this.state.seed / 0x7fffffff) * 101);
    this.state.history.push(value);
    if (this.state.history.length > 100) {
      this.state.history.shift();
      this.state.pointer = _.max([0, this.state.pointer - 1]);
    }
    this.state.pointer++;
    return value % (max + 1);
  }

  get rng() {
    if (this.state.seed === null) this.state.seed = Date.now() & 0x7fffffff;
    if (this.state.pointer < this.state.history.length) {
      const value = this.state.history[this.state.pointer];
      this.state.pointer++;
      return (value % 100) + 1;
    }
    this.state.seed = (this.state.seed * 1103515245 + 12345) & 0x7fffffff;
    const value = _.floor((this.state.seed / 0x7fffffff) * 101);
    this.state.history.push(value);
    if (this.state.history.length > 100) {
      this.state.history.shift();
      this.state.pointer = _.max([0, this.state.pointer - 1]);
    }
    this.state.pointer++;
    return (value % 100) + 1;
  }

  get history() {
    return [...this.state.history];
  }

  get pointer() {
    return this.state.pointer;
  }

  backtrack(steps = 1) {
    if (steps <= 0) return;
    let newPointer = this.state.pointer - steps;
    if (newPointer < 0) newPointer = 0;
    this.state.pointer = newPointer;
  }
}

export default randSystem;
