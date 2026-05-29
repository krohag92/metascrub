// WebM metadata parser + scrubber.
//
// WebM is a Matroska subset (same EBML container) — we reuse the MKV parser
// and scrubber verbatim. The only difference is the EBML `DocType` value:
// `webm` vs `matroska`. We differentiate via the `matches` predicate.

import type { FormatParser } from '../types.js';
import { parseEbmlBytes, scrubEbmlBytes, ebmlInternals } from './mkv.js';

function matchesWebm(bytes: Uint8Array): boolean {
  if (!ebmlInternals.matchesEbml(bytes)) return false;
  try {
    const header = ebmlInternals.findHeader(bytes);
    if (!header) return false;
    return ebmlInternals.readDocType(bytes, header) === 'webm';
  } catch {
    return false;
  }
}

export const webmParser: FormatParser = {
  format: 'webm',
  extensions: ['.webm'],
  mimeTypes: ['video/webm', 'audio/webm'],
  matches: matchesWebm,
  parse: parseEbmlBytes,
  scrub: scrubEbmlBytes,
};
