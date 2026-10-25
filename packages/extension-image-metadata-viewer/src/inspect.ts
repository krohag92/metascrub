import { load as loadExif } from 'exifreader';
import { formatExif, type ExifRow } from './exif-format';

export interface ImageFacts {
  byteLength: number;
  mimeType: string;
  naturalWidth: number | null;
  naturalHeight: number | null;
  exif: ExifRow[];
}

export function inspectImageBytes(bytes: Uint8Array, mimeType: string): ImageFacts {
  let exif: ExifRow[] = [];
  try {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const tags = loadExif(buffer) as Record<string, { description?: unknown } | undefined>;
    exif = formatExif(tags);
  } catch {
    exif = [];
  }
  return {
    byteLength: bytes.byteLength,
    mimeType: mimeType || 'unknown',
    naturalWidth: null,
    naturalHeight: null,
    exif,
  };
}

export async function loadImageFromUrl(url: string): Promise<ImageFacts> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download the image (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const headerType = response.headers.get('content-type');
  const facts = inspectImageBytes(bytes, blob.type || headerType || 'unknown');
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      facts.naturalWidth = bitmap.width;
      facts.naturalHeight = bitmap.height;
      bitmap.close();
    } catch {
      facts.naturalWidth = null;
      facts.naturalHeight = null;
    }
  }
  return facts;
}
