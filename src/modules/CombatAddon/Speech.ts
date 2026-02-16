// ./src/modules/Combat/Speech.ts

import maplebirch from '../../core';

interface SpeechEntry {
  cond: () => boolean;
  speech: string;
  cd: number;
  current: number;
}

const _ = maplebirch.lodash;

const Speech = {
  speechs: new Map<string, SpeechEntry[]>(),

  reg: function (npc: string, cond: () => boolean, speech: string, cd: number): void {
    if (!this.speechs.has(npc)) this.speechs.set(npc, []);
    this.speechs.get(npc)!.push({ cond, speech, cd, current: 0 });
  },

  output: function (npc: string): string {
    if (!this.speechs.has(npc)) return '';
    const speechs = this.speechs.get(npc)!;
    for (const speech of speechs) {
      if (speech.current > 0) {
        speech.current--;
        continue;
      }
      try {
        if (speech.cond()) {
          speech.current = speech.cd;
          return speech.speech;
        }
      } catch {}
    }
    return '';
  },

  init: function (): void {
    this.speechs.forEach((speechs: any) => _.forEach(speechs, speech => (speech.current = 0)));
  }
};

export default Speech;
