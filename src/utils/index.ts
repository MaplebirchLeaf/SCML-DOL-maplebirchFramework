// ./src/utils/index.ts

import { clone, equal, merge, append, cover, mergeFn, appendFn, coverFn } from './object';
import { contains, randomNumber as random, randomPick as either, clamp } from './array';
import { convert, escapeHtmlText, widgets } from './string';
import { textToBytes, jsonToBytes, bytesToJson, toArrayBuffer, bytesToBase64, base64ToBytes, base64ToArrayBuffer, basicAuth } from './binary';
import { joinEncodedPath } from './path';
import { SelectCase } from './selector';
import { loadImage } from './image';
import { prototypeUtils } from './prototype';

export {
  clone,
  equal,
  merge,
  append,
  cover,
  mergeFn as mergefn,
  appendFn as appendfn,
  coverFn as coverfn,
  contains,
  random,
  either,
  clamp,
  convert,
  escapeHtmlText,
  widgets,
  textToBytes,
  jsonToBytes,
  bytesToJson,
  toArrayBuffer,
  bytesToBase64,
  base64ToBytes,
  base64ToArrayBuffer,
  basicAuth,
  joinEncodedPath,
  SelectCase,
  loadImage,
  prototypeUtils
};

export const publicUtils = Object.freeze({
  clone,
  equal,
  merge,
  append,
  cover,
  mergefn: mergeFn,
  appendfn: appendFn,
  coverfn: coverFn,
  contains,
  random,
  either,
  SelectCase,
  convert,
  clamp,
  loadImage
});
