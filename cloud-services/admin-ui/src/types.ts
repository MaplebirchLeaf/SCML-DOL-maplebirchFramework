export type BackendMode = 'go' | 'cloudflare';

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
