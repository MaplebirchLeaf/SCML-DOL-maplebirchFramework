import { JSZipObjectLikeReadOnlyInterface, JSZipLikeReadOnlyInterface } from '../../ml/JSZipLikeReadOnlyInterface';
import type { LogWrapper } from "../../ml/ModLoadController";
export interface ZipFile {
    pathInZip: string;
    pathInSpecialFolder?: string;
    file?: JSZipObjectLikeReadOnlyInterface;
    isFile: boolean;
    isFolder: boolean;
    isInSpecialFolderPath: boolean;
    isImage?: boolean;
}
export declare function isZipFileObj(A: any): A is ZipFile;
export interface TraverseOptions {
    /**
     * 是否获取JSZipObject文件引用
     * @default false
     */
    getFileRef?: boolean;
    /**
     * 是否跳过文件夹
     * @default false
     */
    skipFolder?: boolean;
    /**
     * 图片处理回调函数 - 在发现图片时立即调用，避免内存积累
     */
    onImageFound?: (imageInfo: {
        pathInZip: string;
        pathInSpecialFolder?: string;
        file: JSZipObjectLikeReadOnlyInterface;
    }) => Promise<void>;
    /**
     * 进度回调函数
     * @param progress
     * @param total
     */
    progressCallback?: (progress: number, total: number) => Promise<void> | void;
}
/**
 * Helper function to check if a file is an image based on extension
 */
export declare function isImageFile(path: string): boolean;
/**
 * 使用迭代方式异步遍历 JSZip 中指定路径的文件夹
 * @param zip JSZip 实例
 * @param specialFolderPath 指定的文件夹路径
 * @param logger
 * @param options 遍历选项
 * @returns 文件列表，可包含文件内容
 */
export declare function traverseZipFolder(zip: JSZipLikeReadOnlyInterface, specialFolderPath: string, logger: LogWrapper, options?: TraverseOptions): Promise<ZipFile[]>;
