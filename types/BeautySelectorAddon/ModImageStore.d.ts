import type { LogWrapper } from "../ml/ModLoadController";
import type { ModUtils } from "../ml/Utils";
import { ZipFile } from "./utils/traverseZipFolder";
import { IDBPDatabase, DBSchema } from 'idb';
export interface CachedFileListDbSchema extends DBSchema {
    cachedFileList: {
        value: {
            modName: string;
            modHashString: string;
            type: string;
            fileList: ZipFile[];
            hashKey: string;
        };
        key: string;
        indexes: {
            'by-hashKey': string;
            'by-modName': string;
            'by-modHashString': string;
            'by-type': string;
            'by-modName-modHashString': [string, string];
            'by-modName-type': [string, string];
            'by-modName-modHashString-type': [string, string, string];
        };
    };
}
export interface ModImageStoreDbSchema extends DBSchema {
    imageStore: {
        value: {
            modName: string;
            modHashString: string;
            type: string;
            imagePath: string;
            realPath: string;
            imageData: string;
            imageKey: string;
        };
        key: string;
        indexes: {
            'by-modName': string;
            'by-modHashString': string;
            'by-type': string;
            'by-imagePath': string;
            'by-modName-modHashString': [string, string];
            'by-modName-type': [string, string];
            'by-modName-modHashString-type': [string, string, string];
        };
    };
    imageMetadata: {
        value: {
            modName: string;
            modHashString: string;
            type: string;
            imagePaths: string[];
            metaKey: string;
        };
        key: string;
        indexes: {
            'by-modName': string;
            'by-modHashString': string;
            'by-type': string;
            'by-modName-modHashString': [string, string];
            'by-modName-type': [string, string];
            'by-modName-modHashString-type': [string, string, string];
        };
    };
}
export declare class CachedFileList {
    gModUtils: ModUtils;
    logger: LogWrapper;
    constructor(gModUtils: ModUtils, logger: LogWrapper);
    protected dbRef?: IDBPDatabase<CachedFileListDbSchema>;
    protected isInit: boolean;
    protected isClose: boolean;
    protected iniCacheCustomStore(): Promise<void>;
    BeautySelectorAddon_dbNameCacheFileList: string;
    getCachedFileList(modName: string, modHashString: string, type: string): Promise<ZipFile[] | undefined>;
    writeCachedFileList(modName: string, modHashString: string, type: string, fileList: ZipFile[]): Promise<boolean>;
    removeChangedModFileByHash(modName: string, modHashString: string): Promise<void>;
    removeNotExistMod(modNameSet: Set<string>): Promise<void>;
    close(): void;
}
export declare class ModImageStore {
    gModUtils: ModUtils;
    logger: LogWrapper;
    constructor(gModUtils: ModUtils, logger: LogWrapper);
    protected dbRef?: IDBPDatabase<ModImageStoreDbSchema>;
    protected isInit: boolean;
    protected isClose: boolean;
    protected iniImageStore(): Promise<void>;
    BeautySelectorAddon_dbNameImageStore: string;
    /**
     * Check if images for a mod are already stored
     */
    hasStoredImages(modName: string, modHashString: string, type: string): Promise<boolean>;
    /**
     * Initialize streaming storage for a mod type
     */
    initStreamingStorage(modName: string, modHashString: string, type: string): Promise<{
        imagePaths: string[];
        storeImage: (imagePath: string, realPath: string, imageData: string) => Promise<void>;
        finalize: () => Promise<void>;
    }>;
    /**
     * Get image data by path
     */
    getImage(modName: string, modHashString: string, imagePath: string): Promise<string | undefined>;
    /**
     * Get image paths for a mod type
     */
    getImagePaths(modName: string, modHashString: string, type: string): Promise<string[] | undefined>;
    /**
     * Remove all images for a specific mod hash (when mod changes)
     */
    removeChangedModImages(modName: string, modHashString: string): Promise<void>;
    /**
     * Remove images for mods that no longer exist
     */
    removeNotExistModImages(modNameSet: Set<string>): Promise<void>;
    close(): void;
}
