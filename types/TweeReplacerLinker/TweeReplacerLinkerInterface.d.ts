import type { SC2DataInfo } from "../ml/SC2DataInfoCache";
export type TweeReplacerLinkerClientCallbackType = (sc: SC2DataInfo) => Promise<any>;
/**
 * 1. Client call registerClient() to register itself.
 * 2. Linker call enableLinkerMode() to enable client linker mode.
 * 3. Client call addUserMod() to register user mod callback when a user mod add to client.
 */
export interface TweeReplacerLinkerInterface {
    registerClient(client: TweeReplacerLinkerClientInterface): Promise<boolean>;
    addUserMod(clientName: string, userModName: string, callback: TweeReplacerLinkerClientCallbackType): Promise<boolean>;
}
export interface TweeReplacerLinkerClientInterface {
    enableLinkerMode(): Promise<boolean>;
}
