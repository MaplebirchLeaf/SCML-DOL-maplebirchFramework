export declare const BoundaryOperatorList: readonly [">=", "<=", ">", "<", "=", "^", undefined];
export type BoundaryOperator = typeof BoundaryOperatorList[number];
export type VersionBoundary = {
    version: InfiniteSemVer;
    operator: BoundaryOperator;
};
export type VersionRange = VersionBoundarySet[];
export type VersionBoundarySet = {
    lower?: VersionBoundary;
    upper?: VersionBoundary;
};
export type InfiniteSemVer = {
    version: number[];
    preRelease?: string | undefined;
    buildMetadata?: string | undefined;
};
export declare function parseInfiniteSemVer(versionStr: string): VersionBoundary;
export declare function compareString(a: string, b: string): number;
export declare function compareInfiniteVersions(a: InfiniteSemVer, b: InfiniteSemVer, ignorePostfix?: boolean): number;
export declare function parseVersionRange(rangeStr: string): VersionRange;
export declare function isWithinRange(version: InfiniteSemVer, range: VersionRange, ignorePostfix?: boolean): boolean;
export declare const parseRange: typeof parseVersionRange;
export declare const parseVersion: typeof parseInfiniteSemVer;
export declare const satisfies: typeof isWithinRange;
export declare class SemVerToolsType {
    parseRange: typeof parseVersionRange;
    parseVersion: typeof parseInfiniteSemVer;
    satisfies: typeof isWithinRange;
}
