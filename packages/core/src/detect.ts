import type { FileFormat, FileInput } from './types.js';
import { detectByExtension, detectByMagic } from './utils/magic.js';
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
      return 'docx';
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
