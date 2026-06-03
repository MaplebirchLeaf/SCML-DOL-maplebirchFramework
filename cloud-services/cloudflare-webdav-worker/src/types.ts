export interface Env {
  SAVE_BUCKET: R2Bucket;
  SAVE_DB: D1Database;
  MAX_USERS?: string;
}

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthResponse {
  userId: number;
  username: string;
  token: string;
  expiresAt: number;
}

export interface RemoteSaveItem {
  slot: number;
  updatedAt: number;
  payload?: unknown;
}

export interface RemoteSaveCode {
  updatedAt: number;
  payload?: unknown;
}
