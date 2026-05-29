import type { FileFormat, FileInput } from './types.js';
import { detectByExtension, detectByMagic, detectZipSubtype } from './utils/magic.js';
import { startsWith } from './utils/bytes.js';
import { listFormats } from './formats/index.js';

/**
 * Detect the file format from input bytes (and optional filename).
 *
 * For path inputs, reads only the first 4 KiB to keep detection cheap.
 */
export async function detectFormat(input: FileInput): Promise<FileFormat | null> {
  const { head, filename } = await readHead(input);

  // Magic-number first (more reliable than extension).
  const byMagic = detectByMagic(head);
  if (byMagic) {
    // ZIP-based formats need disambiguation by extension or content sniffing.
    if (byMagic === 'docx') {
      const byExt = detectByExtension(filename);
      if (byExt && (byExt === 'docx' || byExt === 'xlsx' || byExt === 'pptx' || byExt === 'epub')) {
        return byExt;
      }
      const byZip = detectZipSubtype(head);
      if (byZip) return byZip;
      return 'docx';
    }
    // EBML container — disambiguate Matroska vs WebM by DocType.
    if (byMagic === 'mkv') {
      const doctype = readEbmlDocType(head);
      if (doctype === 'webm') return 'webm';
      if (doctype === 'matroska') return 'mkv';
      const byExt = detectByExtension(filename);
      if (byExt === 'webm') return 'webm';
      return 'mkv';
    }
    // Generic TIFF magic also matches RAW formats (NEF/ARW/DNG). Prefer the
    // extension if it points to a specific RAW dialect.
    if (byMagic === 'tiff') {
      const byExt = detectByExtension(filename);
      if (
        byExt === 'raw-nef' ||
        byExt === 'raw-arw' ||
        byExt === 'raw-dng' ||
        byExt === 'raw-cr2'
      ) {
        return byExt;
      }
    }
    // ISOBMFF brand `mp4` may actually be an M4A audio container — prefer
    // the extension when it points to audio.
    if (byMagic === 'mp4') {
      const byExt = detectByExtension(filename);
      if (byExt === 'm4a') return 'm4a';
    }
    return byMagic;
  }

  // Fallback to extension.
  const byExt = detectByExtension(filename);
  if (byExt) return byExt;

  // SVG (text-based) — look for "<svg" or "<?xml ... svg" in first chunk.
  if (looksLikeSvg(head)) return 'svg';

  return null;
}

export function supportedFormats(): FileFormat[] {
  return listFormats();
}

async function readHead(input: FileInput): Promise<{ head: Uint8Array; filename?: string }> {
  if (input.kind === 'bytes') {
    const slice = input.data.subarray(0, Math.min(input.data.length, 4096));
    const result: { head: Uint8Array; filename?: string } = { head: slice };
    if (input.filename !== undefined) result.filename = input.filename;
    return result;
  }
  // path
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const fh = await fs.open(input.path, 'r');
  try {
    const buf = Buffer.alloc(4096);
    const { bytesRead } = await fh.read(buf, 0, 4096, 0);
    return {
      head: new Uint8Array(buf.buffer, buf.byteOffset, bytesRead),
      filename: path.basename(input.path),
    };
  } finally {
    await fh.close();
  }
}

/**
 * Best-effort EBML DocType extraction. Scans the first 4 KiB for the DocType
 * element ID (0x4282) followed by a VINT size and the ASCII payload.
 */
function readEbmlDocType(head: Uint8Array): string | null {
  for (let i = 0; i + 4 < head.length; i += 1) {
    if (head[i] === 0x42 && head[i + 1] === 0x82) {
      const sizeByte = head[i + 2] ?? 0;
      if (sizeByte === 0) continue;
      let sizeLen = 0;
      for (let bit = 7; bit >= 0; bit -= 1) {
        if ((sizeByte & (1 << bit)) !== 0) {
          sizeLen = 8 - bit;
          break;
        }
      }
      if (sizeLen < 1 || sizeLen > 4) continue;
      let payloadLen = sizeByte & ((1 << (8 - sizeLen)) - 1);
      for (let j = 1; j < sizeLen; j += 1) payloadLen = payloadLen * 256 + (head[i + 2 + j] ?? 0);
      const payloadStart = i + 2 + sizeLen;
      if (payloadStart + payloadLen > head.length) continue;
      let len = payloadLen;
      while (len > 0 && head[payloadStart + len - 1] === 0) len -= 1;
      return new TextDecoder('utf-8', { fatal: false }).decode(
        head.subarray(payloadStart, payloadStart + len),
      );
    }
  }
  return null;
}

function looksLikeSvg(head: Uint8Array): boolean {
  if (head.length < 5) return false;
  // strip UTF-8 BOM
  let start = 0;
  if (head.length >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) start = 3;
  if (startsWith(head.subarray(start), [0x3c, 0x73, 0x76, 0x67])) return true;
  // tolerate leading whitespace + optional XML prolog before <svg
  const text = new TextDecoder('utf-8', { fatal: false }).decode(
    head.subarray(start, Math.min(head.length, 1024)),
  );
  return /<svg[\s>]/i.test(text);
}
