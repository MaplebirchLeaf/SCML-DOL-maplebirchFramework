export interface FileMeta {
    b: number;
    e: number;
    l: number;
}
export interface CryptoInfo {
    Xchacha20NonceBase64: string;
    PwhashSaltBase64: string;
}
export declare const MagicNumber: Uint8Array<ArrayBuffer>;
export declare const ModMetaProtocolVersion = 1;
export declare const BlockSize = 64;
export interface ModMeta {
    magicNumber: string;
    name: string;
    protocolVersion: number;
    blockSize: number;
    cryptoInfo?: CryptoInfo;
    fileTreeBlock: FileMeta;
    bootJsonFile: FileMeta;
    fileMeta: Record<string, FileMeta>;
}
