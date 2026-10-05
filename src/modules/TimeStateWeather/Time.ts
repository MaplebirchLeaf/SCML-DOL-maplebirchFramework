// ./src/modules/TimeStateWeather/Time.ts

import maplebirch from '../../core';

export function patchTimeAsset(content: string): string {
  if (content.includes('maplebirch.dynamic.Time.patchTime(Time)')) return content;
  return maplebirch.host.modLoader.replace(content, [[/(\r?\n?window\.Time\s*=\s*Time\s*;)/, '\nmaplebirch.dynamic.Time.patchTime(Time);$1']], 'Time asset patch');
}

interface TimeHandlers {
  pass?: (seconds: number) => unknown;
  timeTravel?: (date: DateTime) => unknown;
}

export const vanillaTime: TimeHandlers = {};

export function bindTimeHandlers(time: TimeAPI, handlers: TimeHandlers): void {
  for (const [name, handler] of Object.entries(handlers)) if (handler) Object.defineProperty(time, name, { value: handler, writable: true, configurable: true });
}

function patchTime(time: TimeAPI): void {
  vanillaTime.pass = typeof time.pass === 'function' ? time.pass.bind(time) : undefined;
  vanillaTime.timeTravel = typeof time.timeTravel === 'function' ? time.timeTravel.bind(time) : undefined;
}

export default patchTime;
