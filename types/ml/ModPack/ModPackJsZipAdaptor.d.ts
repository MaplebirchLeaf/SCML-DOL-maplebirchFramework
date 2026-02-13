import { ModPackFileReader } from './ModPack';
interface OutputByType {
    base64: string;
    string: string;
    text: string;
    binarystring: string;
    array: number[];
    uint8array: Uint8Array;
    arraybuffer: ArrayBuffer;
    blob: Blob;
}
interface InputByType {
    base64: string;
    string: string;
    text: string;
    binarystring: string;
    array: number[];
    uint8array: Uint8Array;
    arraybuffer: ArrayBuffer;
    blob: Blob;
}
type InputFileFormat = InputByType[keyof InputByType] | Promise<InputByType[keyof InputByType]>;
interface JSZipSupport {
    arraybuffer: boolean;
    uint8array: boolean;
    blob: boolean;
    nodebuffer: boolean;
}
type Compression = 'STORE' | 'DEFLATE';
interface JSZipObjectOptions {
    compression: Compression;
}
export declare class ModPackJsZipObjectAdaptor {
    protected readonly ref: ModPackFileReader;
    protected readonly parent: ModPackJsZipObjectAdaptor | undefined;
    protected myPathInFileTree: string[];
    protected treeLevelRef: Record<string, any>;
    protected _isFile: boolean;
    protected _isFolder: boolean;
    protected _isValid: boolean;
    constructor(filePath: string, ref: ModPackFileReader, parent: ModPackJsZipObjectAdaptor | undefined);
    get dir(): boolean;
    get name(): string;
    get path(): string;
    async<T extends keyof OutputByType>(type: T, onUpdate_Useless?: any): Promise<OutputByType[T]>;
    protected _files?: Record<string, ModPackJsZipObjectAdaptor>;
    get files(): Record<string, ModPackJsZipObjectAdaptor>;
    get isFile(): boolean;
    get isFolder(): boolean;
    get isValid(): boolean;
    get options(): JSZipObjectOptions;
}
export declare class ModPackFileReaderJsZipAdaptor extends ModPackFileReader {
    get is_JeremieModLoader_ModPack(): boolean;
    protected _files?: Record<string, ModPackJsZipObjectAdaptor>;
    protected _isPrepared: boolean;
    protected zipAdaptorPassword?: string;
    prepareSetPassword(password: string | undefined): void;
    prepareForZipAdaptor(): Promise<void>;
    get files(): Record<string, ModPackJsZipObjectAdaptor>;
    file(path: string): ModPackJsZipObjectAdaptor | null;
    file(path: RegExp): ModPackJsZipObjectAdaptor[] | null;
    forEach(callback: (relativePath: string, file: ModPackJsZipObjectAdaptor) => void): void;
    filter(predicate: (relativePath: string, file: ModPackJsZipObjectAdaptor) => boolean): ModPackJsZipObjectAdaptor[];
    get support(): JSZipSupport;
    static checkByHash(modPackBuffer: Uint8Array): Promise<boolean>;
    loadAsync(data: InputFileFormat, options?: any & {
        password?: string;
        base64?: boolean;
    }): Promise<ModPackFileReaderJsZipAdaptor | undefined>;
}
export {};
