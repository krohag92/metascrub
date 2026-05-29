import { writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parse, scrub } from '@metascrub/core';
import type { ScrubOptions, ScrubPreset } from '@metascrub/core';
import { renderScrubResult } from '../render/human.js';
import { parseList } from '../util/argv.js';

const VALID_PRESETS: ScrubPreset[] = [
  'all',
  'gps-only',
  'personal-only',
  'keep-technical',
  'custom',
];

export interface ScrubCliOptions {
  out?: string;
  inPlace?: boolean;
  preset?: string;
  keep?: string;
  remove?: string;
  dryRun?: boolean;
  json?: boolean;
}

export function defaultOutPath(file: string): string {
  const dir = dirname(file);
  const base = basename(file);
  const ext = extname(base);
  const stem = base.slice(0, base.length - ext.length);
  return join(dir, `${stem}.clean${ext}`);
}

export async function runScrub(file: string, opts: ScrubCliOptions): Promise<number> {
  if (opts.preset !== undefined && !VALID_PRESETS.includes(opts.preset as ScrubPreset)) {
    process.stderr.write(
      `metascrub scrub: invalid preset "${opts.preset}". Valid: ${VALID_PRESETS.join(', ')}\n`,
    );
    return 2;
  }
  const preset = (opts.preset as ScrubPreset | undefined) ?? 'all';
  const scrubOptions: ScrubOptions = { preset };
  const keep = parseList(opts.keep);
  if (keep) scrubOptions.keep = keep;
  const removeList = parseList(opts.remove);
  if (removeList) scrubOptions.remove = removeList;

  try {
    const before = await parse({ kind: 'path', path: file });
    const cleanBytes = await scrub({ kind: 'path', path: file }, scrubOptions);
    const after = await parse({
      kind: 'bytes',
      data: cleanBytes,
      filename: basename(file),
    });

    const outPath = opts.inPlace ? resolve(file) : resolve(opts.out ?? defaultOutPath(file));

    if (!opts.dryRun) {
      await writeFile(outPath, cleanBytes);
    }

    if (opts.json) {
      const removed: string[] = [];
      const beforeSet = new Set<string>();
      for (const [g, fields] of Object.entries(before.groups)) {
        for (const f of fields) beforeSet.add(`${g}.${f.key}=${String(f.value)}`);
      }
      const afterSet = new Set<string>();
      for (const [g, fields] of Object.entries(after.groups)) {
        for (const f of fields) afterSet.add(`${g}.${f.key}=${String(f.value)}`);
      }
      for (const k of beforeSet) if (!afterSet.has(k)) removed.push(k);
      process.stdout.write(
        JSON.stringify(
          {
            file,
            out: opts.dryRun ? null : outPath,
            dryRun: !!opts.dryRun,
            preset,
            removed,
            sizeBefore: before.sizeBytes,
            sizeAfter: cleanBytes.length,
          },
          null,
          2,
        ) + '\n',
      );
    } else {
      process.stdout.write(renderScrubResult(file, outPath, before, after, !!opts.dryRun));
    }
    return 0;
  } catch (e) {
    const msg = (e as Error).message;
    process.stderr.write(`metascrub scrub: ${msg}\n`);
    return /unsupported|not yet supported|could not detect/i.test(msg) ? 3 : 1;
  }
}
