import type { FileInput, ScrubOptions } from './types.js';
import { MetaScrubError } from './types.js';
import { readInput } from './utils/bytes.js';
import { detectFormat } from './detect.js';
import { getParser } from './formats/index.js';

export async function scrub(input: FileInput, options: ScrubOptions = {}): Promise<Uint8Array> {
  const { data, filename } = await readInput(input);
  const format = await detectFormat(
    filename ? { kind: 'bytes', data, filename } : { kind: 'bytes', data },
  );
  if (!format) {
    throw new MetaScrubError(
      'UNSUPPORTED_FORMAT',
      `Could not detect a supported format${filename ? ` for "${filename}"` : ''}.`,
    );
  }
  const parser = getParser(format);
  if (!parser) {
    throw new MetaScrubError('UNSUPPORTED_FORMAT', `Format "${format}" is not yet supported.`, {
      format,
    });
  }
  try {
    return await parser.scrub(data, options);
  } catch (e) {
    throw new MetaScrubError(
      'SCRUB_ERROR',
      `Failed to scrub ${format} file: ${(e as Error).message}`,
      { format, cause: e },
    );
  }
}
