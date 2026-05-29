// Browser-friendly entrypoint. Identical surface to ./index.ts but `readInput`
// will throw a clear error if a 'path' input is passed in a browser build.
// We re-export the same modules — the FS dynamic import is gated by isNode.
export * from './index.js';
