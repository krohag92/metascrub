import { parse } from '@metascrub/core';
import type { MetadataResult } from '@metascrub/core';

/** Extensions we know @metascrub/core can parse. */
export const SUPPORTED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'heic',
  'webp',
  'tiff',
  'avif',
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'epub',
  'svg',
  'mp3',
  'mp4',
  'mov',
]);

export interface VaultFile {
  path: string;
  extension: string;
}

export interface VaultReader {
  readBinary(file: VaultFile): Promise<ArrayBuffer>;
}

export interface ScanResult {
  path: string;
  result: MetadataResult;
}

export interface ScanProgress {
  total: number;
  done: number;
  current: string;
}

export type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Walks a list of vault files, parses each supported attachment with
 * @metascrub/core, and returns only those that have at least one warning.
 *
 * Pure logic — no Obsidian runtime dependency. Testable in Node/vitest.
 */
export async function scanVault(
  files: VaultFile[],
  reader: VaultReader,
  onProgress?: ProgressCallback,
): Promise<ScanResult[]> {
  const attachments = files.filter((f) =>
    SUPPORTED_EXTENSIONS.has(f.extension.toLowerCase()),
  );

  const results: ScanResult[] = [];
  const total = attachments.length;

  for (let i = 0; i < attachments.length; i++) {
    const file = attachments[i];
    if (!file) continue;

    onProgress?.({ total, done: i, current: file.path });

    try {
      const buffer = await reader.readBinary(file);
      const bytes = new Uint8Array(buffer);
      const result = await parse({ kind: 'bytes', data: bytes, filename: file.path });
      if (result.warnings.length > 0) {
        results.push({ path: file.path, result });
      }
    } catch {
      // Unsupported or corrupt file — skip silently.
    }
  }

  onProgress?.({ total, done: total, current: '' });
  return results;
}
