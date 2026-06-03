export interface Env {
  SAVE_BUCKET: R2Bucket;
  WEBDAV_USER?: string;
  WEBDAV_PASSWORD?: string;
}

export type WebDavMethod = 'OPTIONS' | 'GET' | 'PUT' | 'DELETE' | 'MKCOL';
