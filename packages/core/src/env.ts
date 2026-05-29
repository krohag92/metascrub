export const isNode: boolean =
  typeof process !== 'undefined' &&
  process.versions != null &&
  typeof process.versions.node === 'string';
