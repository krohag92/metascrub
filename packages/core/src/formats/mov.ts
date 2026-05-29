// MOV (QuickTime) metadata parser + scrubber.
//
// Structurally identical to MP4 (both are ISOBMFF). The difference is the
// `ftyp` brand: MOV files use `qt  ` (with two trailing spaces), and the older
// QuickTime files lack an `ftyp` entirely — they start directly with `moov`
// or `mdat`.
//
// We reuse the MP4 implementation verbatim; only the format identifier and
// the `matches` predicate differ.

import type { FormatParser, ScrubOptions } from '../types.js';
import { readBoxes, readFtypBrand } from './_isobmff.js';
import { mp4Internals } from './mp4.js';

function matchesMov(bytes: Uint8Array): boolean {
  const brand = readFtypBrand(bytes);
  if (brand === 'qt  ' || brand === 'qt\x20\x20') return true;
  // Older QuickTime: no ftyp; first top-level box is moov, mdat, or wide.
  if (brand !== null) return false;
  try {
    const top = readBoxes(
      bytes.subarray(0, Math.min(bytes.length, 64)),
      0,
      Math.min(bytes.length, 64),
    );
    if (top.length === 0) return false;
    const first = top[0]!.type;
    return (
      first === 'moov' ||
      first === 'mdat' ||
      first === 'wide' ||
      first === 'free' ||
      first === 'skip'
    );
  } catch {
    return false;
  }
}

export const movParser: FormatParser = {
  format: 'mov',
  extensions: ['.mov', '.qt'],
  mimeTypes: ['video/quicktime'],
  matches: matchesMov,
  parse: mp4Internals.parse,
  scrub: async (bytes: Uint8Array, options: ScrubOptions) => mp4Internals.scrub(bytes, options),
};
