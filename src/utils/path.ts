// ./src/utils/path.ts

function trimSlashes(value: string): string {
  return String(value ?? '').replace(/^\/+|\/+$/g, '');
}

export function joinEncodedPath(...parts: string[]): string {
  return parts
    .map(part => encodeURIComponent(trimSlashes(part)))
    .filter(Boolean)
    .join('/');
}
