import type { Context } from 'hono';
import { scrub, detectFormat, MetaScrubError } from '@metascrub/core';
import type { ScrubOptions, ScrubPreset } from '@metascrub/core';
import { readMultipartFile } from '../utils/multipart.js';

const VALID_PRESETS: ScrubPreset[] = [
  'all',
  'gps-only',
  'personal-only',
  'keep-technical',
  'custom',
];

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  'raw-cr2': 'image/x-canon-cr2',
  'raw-nef': 'image/x-nikon-nef',
  'raw-arw': 'image/x-sony-arw',
  'raw-dng': 'image/x-adobe-dng',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/m4a',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  epub: 'application/epub+zip',
  svg: 'image/svg+xml',
};

export async function scrubRoute(c: Context, maxBytes: number): Promise<Response> {
  const result = await readMultipartFile(c, 'file', maxBytes);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status) as unknown as Response;
  }

  // Parse scrub options from form fields.
  const form = await c.req.formData().catch(() => null);
  const options: ScrubOptions = {};

  if (form) {
    const preset = form.get('preset');
    if (preset && typeof preset === 'string') {
      if (VALID_PRESETS.includes(preset as ScrubPreset)) {
        options.preset = preset as ScrubPreset;
      }
    }
    const keep = form.get('keep');
    if (keep && typeof keep === 'string') {
      options.keep = keep
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const remove = form.get('remove');
    if (remove && typeof remove === 'string') {
      options.remove = remove
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Default preset.
  if (!options.preset) options.preset = 'all';

  try {
    // Detect format to set correct response Content-Type.
    const format = await detectFormat({
      kind: 'bytes',
      data: result.data,
      filename: result.filename,
    });
    if (!format) {
      return c.json(
        { error: 'Unsupported or unrecognised file format' },
        415,
      ) as unknown as Response;
    }

    const cleaned = await scrub(
      { kind: 'bytes', data: result.data, filename: result.filename },
      options,
    );

    const mime = FORMAT_MIME[format] ?? 'application/octet-stream';
    return new Response(cleaned.buffer as ArrayBuffer, {
      status: 200,
      headers: { 'Content-Type': mime },
    });
  } catch (err) {
    if (err instanceof MetaScrubError && err.code === 'UNSUPPORTED_FORMAT') {
      return c.json({ error: err.message }, 415) as unknown as Response;
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500) as unknown as Response;
  }
}
