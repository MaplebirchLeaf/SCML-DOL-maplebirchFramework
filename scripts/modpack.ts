import AdmZip from 'adm-zip';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createZip, resolvePackageInfo, type PackageAsset } from './zip';

const MAGIC_NUMBER = new Uint8Array([0x4a, 0x65, 0x72, 0x65, 0x6d, 0x69, 0x65, 0x4d, 0x6f, 0x64, 0x4c, 0x6f, 0x61, 0x64, 0x65, 0x72]);
const MOD_META_PROTOCOL_VERSION = 1;
const BLOCK_SIZE = 64;
const U64_MASK = (1n << 64n) - 1n;
const TEXT_ENCODER = new TextEncoder();

const XXH_PRIME64_1 = 11400714785074694791n;
const XXH_PRIME64_2 = 14029467366897019727n;
const XXH_PRIME64_3 = 1609587929392839161n;
const XXH_PRIME64_4 = 9650029242287828579n;
const XXH_PRIME64_5 = 2870177450012600261n;

interface FileMeta {
  b: number;
  e: number;
  l: number;
}

interface Meta {
  magicNumber: string;
  name: string;
  protocolVersion: number;
  blockSize: number;
  fileTreeBlock: FileMeta;
  bootJsonFile: FileMeta;
  fileMeta: Record<string, FileMeta>;
}

interface BlockData {
  blocks: number;
  dataLength: number;
  paddedData: Uint8Array;
  paddedDataLength: number;
}

interface FileBlock extends BlockData {
  filePath: string;
}

interface Parts {
  magic: BlockData;
  meta: BlockData;
  boot: BlockData;
  files: FileBlock[];
  tree: BlockData;
  rawMetaLength: number;
}

function padToBlockSize(data: Uint8Array, pad = 0): BlockData {
  const blocks = Math.max(1, Math.ceil(data.length / BLOCK_SIZE));
  const paddedData = new Uint8Array(blocks * BLOCK_SIZE);
  paddedData.set(data);
  if (paddedData.length > data.length) paddedData.fill(pad & 0xff, data.length);
  return {
    blocks,
    dataLength: data.length,
    paddedData,
    paddedDataLength: paddedData.length
  };
}

function createFileTree(fileList: string[]): Record<string, any> {
  const fileTree: Record<string, any> = {};
  for (const filePath of fileList) {
    const parts = filePath.split(/[\\/]/).filter(Boolean);
    let current = fileTree;
    for (const part of parts) {
      current[part] ??= {};
      current = current[part];
    }
    current._f_ = true;
  }
  return fileTree;
}

function serializeBsonDocument(value: Record<string, any>): Uint8Array {
  const chunks: Uint8Array[] = [];
  let contentLength = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    contentLength += bytes.length;
  };

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    let type = 0x00;

    if (typeof item === "string") type = 0x02;
    else if (typeof item === "number") type = 0x10;
    else if (typeof item === "boolean") type = 0x08;
    else if (item && typeof item === "object" && !Array.isArray(item)) type = 0x03;
    else throw new Error(`Unsupported BSON value for key "${key}"`);

    push(Uint8Array.of(type));
    push(TEXT_ENCODER.encode(`${key}\0`));

    if (typeof item === 'string') {
      const content = TEXT_ENCODER.encode(item);
      const bsonString = new Uint8Array(4 + content.length + 1);
      new DataView(bsonString.buffer).setInt32(0, content.length + 1, true);
      bsonString.set(content, 4);
      push(bsonString);
      continue;
    }

    if (typeof item === 'number') {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setInt32(0, item, true);
      push(bytes);
      continue;
    }

    if (typeof item === 'boolean') {
      push(Uint8Array.of(item ? 1 : 0));
      continue;
    }

    push(serializeBsonDocument(item));
  }

  const result = new Uint8Array(4 + contentLength + 1);
  new DataView(result.buffer).setInt32(0, result.length, true);

  let offset = 4;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function u64(value: bigint): bigint {
  return value & U64_MASK;
}

function rotl64(value: bigint, bits: bigint): bigint {
  return u64((value << bits) | (value >> (64n - bits)));
}

function xxhRound(acc: bigint, input: bigint): bigint {
  return u64(rotl64(u64(acc + u64(input * XXH_PRIME64_2)), 31n) * XXH_PRIME64_1);
}

function xxhMergeRound(acc: bigint, value: bigint): bigint {
  return u64(u64(acc ^ xxhRound(0n, value)) * XXH_PRIME64_1 + XXH_PRIME64_4);
}

function xxHash64(data: Uint8Array): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  let h64: bigint;

  if (data.length >= 32) {
    let v1 = u64(XXH_PRIME64_1 + XXH_PRIME64_2);
    let v2 = XXH_PRIME64_2;
    let v3 = 0n;
    let v4 = u64(-XXH_PRIME64_1);
    const limit = data.length - 32;

    while (offset <= limit) {
      v1 = xxhRound(v1, view.getBigUint64(offset, true));
      offset += 8;
      v2 = xxhRound(v2, view.getBigUint64(offset, true));
      offset += 8;
      v3 = xxhRound(v3, view.getBigUint64(offset, true));
      offset += 8;
      v4 = xxhRound(v4, view.getBigUint64(offset, true));
      offset += 8;
    }

    h64 = u64(rotl64(v1, 1n) + rotl64(v2, 7n) + rotl64(v3, 12n) + rotl64(v4, 18n));
    h64 = xxhMergeRound(h64, v1);
    h64 = xxhMergeRound(h64, v2);
    h64 = xxhMergeRound(h64, v3);
    h64 = xxhMergeRound(h64, v4);
  } else {
    h64 = XXH_PRIME64_5;
  }

  h64 = u64(h64 + BigInt(data.length));

  while (offset + 8 <= data.length) {
    h64 = u64(rotl64(u64(h64 ^ xxhRound(0n, view.getBigUint64(offset, true))), 27n) * XXH_PRIME64_1 + XXH_PRIME64_4);
    offset += 8;
  }

  if (offset + 4 <= data.length) {
    h64 = u64(rotl64(u64(h64 ^ u64(BigInt(view.getUint32(offset, true)) * XXH_PRIME64_1)), 23n) * XXH_PRIME64_2 + XXH_PRIME64_3);
    offset += 4;
  }

  while (offset < data.length) {
    h64 = u64(rotl64(u64(h64 ^ u64(BigInt(data[offset]) * XXH_PRIME64_5)), 11n) * XXH_PRIME64_1);
    offset++;
  }

  h64 = u64(h64 ^ (h64 >> 33n));
  h64 = u64(h64 * XXH_PRIME64_2);
  h64 = u64(h64 ^ (h64 >> 29n));
  h64 = u64(h64 * XXH_PRIME64_3);
  h64 = u64(h64 ^ (h64 >> 32n));

  return h64;
}

export function createModPackFromZip(modName: string, zipBuffer: Buffer): Buffer {
  const files = readZipFiles(zipBuffer);
  const bootFile = files.get('boot.json');
  if (!bootFile) throw new Error('boot.json not found in zip');
  return buildModPack(createParts(modName, files, bootFile));
}

export async function createModPackPackage(rootDir: string, zipBuffer?: Buffer): Promise<PackageAsset> {
  const info = await resolvePackageInfo(rootDir);
  return {
    fileName: `${info.baseName}.modpack`,
    buffer: createModPackFromZip(info.name, zipBuffer ?? (await createZip(rootDir)))
  };
}

function readZipFiles(zipBuffer: Buffer): Map<string, Uint8Array> {
  const zip = new AdmZip(zipBuffer);
  const files = new Map<string, Uint8Array>();
  for (const entry of zip.getEntries()) if (!entry.isDirectory) files.set(entry.entryName.replace(/\\/g, '/'), entry.getData());
  return files;
}

function createParts(modName: string, files: Map<string, Uint8Array>, bootFile: Uint8Array): Parts {
  const filePathList = [...files.keys()].filter(file => file !== 'boot.json').sort();
  const boot = padToBlockSize(bootFile);
  const tree = padToBlockSize(serializeBsonDocument(createFileTree(filePathList)));
  const fileBlocks = filePathList.map(filePath => ({
    filePath,
    ...padToBlockSize(files.get(filePath)!)
  }));
  const meta = createMeta(modName, boot, fileBlocks, tree);
  const rawMeta = serializeBsonDocument(meta);

  return {
    magic: padToBlockSize(MAGIC_NUMBER),
    meta: padToBlockSize(rawMeta),
    boot,
    files: fileBlocks,
    tree,
    rawMetaLength: rawMeta.length
  };
}

function createMeta(modName: string, boot: BlockData, files: FileBlock[], tree: BlockData): Meta {
  const meta: Meta = {
    magicNumber: Buffer.from(MAGIC_NUMBER).toString('base64').replace(/=+$/g, ''),
    name: modName,
    protocolVersion: MOD_META_PROTOCOL_VERSION,
    blockSize: BLOCK_SIZE,
    bootJsonFile: {
      b: 0,
      e: boot.blocks - 1,
      l: boot.dataLength
    },
    fileTreeBlock: {
      b: 0,
      e: 0,
      l: tree.dataLength
    },
    fileMeta: {}
  };

  let blockIndex = boot.blocks;

  for (const file of files) {
    meta.fileMeta[file.filePath] = {
      b: blockIndex,
      e: blockIndex + file.blocks - 1,
      l: file.dataLength
    };

    blockIndex += file.blocks;
  }

  meta.fileTreeBlock = {
    b: blockIndex,
    e: blockIndex + tree.blocks - 1,
    l: tree.dataLength
  };

  return meta;
}

function buildModPack(parts: Parts): Buffer {
  const size = parts.magic.paddedDataLength + BLOCK_SIZE + parts.meta.paddedDataLength + parts.boot.paddedDataLength + parts.files.reduce((sum, file) => sum + file.paddedDataLength, 0) + parts.tree.paddedDataLength + 8;
  const buffer = new Uint8Array(size);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  offset = writeBlock(buffer, offset, parts.magic);

  view.setBigUint64(offset, BigInt(parts.magic.paddedDataLength + BLOCK_SIZE), true);
  view.setBigUint64(offset + 8, BigInt(parts.magic.paddedDataLength + BLOCK_SIZE + parts.rawMetaLength), true);
  view.setBigUint64(offset + 16, BigInt(parts.magic.paddedDataLength + BLOCK_SIZE + parts.meta.paddedDataLength), true);
  offset += BLOCK_SIZE;

  offset = writeBlock(buffer, offset, parts.meta);
  offset = writeBlock(buffer, offset, parts.boot);

  for (const file of parts.files) offset = writeBlock(buffer, offset, file);

  offset = writeBlock(buffer, offset, parts.tree);
  view.setBigUint64(offset, xxHash64(buffer.subarray(0, offset)), true);

  return Buffer.from(buffer);
}

function writeBlock(target: Uint8Array, offset: number, block: BlockData): number {
  target.set(block.paddedData, offset);
  return offset + block.paddedDataLength;
}

async function main() {
  const rootDir = path.join(import.meta.dir, '..');
  const packageDir = path.join(rootDir, 'package');
  const modPackPackage = await createModPackPackage(rootDir);
  const target = path.join(packageDir, modPackPackage.fileName);
  await mkdir(packageDir, { recursive: true });
  await Bun.write(target, modPackPackage.buffer);
  console.log(`ModPack generated: ${target}`);
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
