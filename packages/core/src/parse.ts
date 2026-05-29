import type { FileInput, MetadataResult } from './types.js';
import { MetaScrubError } from './types.js';
import { readInput } from './utils/bytes.js';
import { finalizeResult } from './utils/highlights.js';
import { detectFormat } from './detect.js';
import { getParser } from './formats/index.js';

export async function parse(input: FileInput): Promise<MetadataResult> {
  const { data, filename } = await readInput(input);
  const format = await detectFormat(
    filename
      ? { kind: 'bytes', data, filename }
      : { kind: 'bytes', data },
  );
  if (!format) {
    throw new MetaScrubError(
      'UNSUPPORTED_FORMAT',
      `Could not detect a supported format${filename ? ` for "${filename}"` : ''}.`,
    );
  }
  const parser = getParser(format);
  if (!parser) {
    throw new MetaScrubError(
      'UNSUPPORTED_FORMAT',
      `Format "${format}" is not yet supported.`,
      { format },
    );
  }
  let parsed;
  try {
    parsed = await parser.parse(data);
  } catch (e) {
    throw new MetaScrubError(
      'PARSE_ERROR',
      `Failed to parse ${format} file: ${(e as Error).message}`,
      { format, cause: e },
    );
  }
  return finalizeResult({
    format,
    ...(filename ? { filename } : {}),
    sizeBytes: data.length,
    groups: parsed.groups,
  });
}
