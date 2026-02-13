import { SC2DataInfo } from "./SC2DataInfoCache";
export interface SimulateMergeResultItem {
    ok: Set<string>;
    conflict: Set<string>;
}
export interface SimulateMergeResult {
    styleFileItems: SimulateMergeResultItem;
    scriptFileItems: SimulateMergeResultItem;
    passageDataItems: SimulateMergeResultItem;
    dataSource: string;
}
export declare function simulateMergeStep(a: Set<string>, b: Set<string>): SimulateMergeResultItem;
export declare function simulateMergeSC2DataInfoCache(...ic: SC2DataInfo[]): SimulateMergeResult[];
