// ./src/utils/path.ts

export function joinEncodedPath(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}
