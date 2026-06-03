export type BackendMode = 'go' | 'webdav';

export interface AuthResponse {
  userId: number;
  username: string;
  token: string;
  expiresAt: number;
}

export interface RemoteSaveItem {
  slot: number;
  updatedAt: number;
}
