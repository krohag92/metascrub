import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { cpus } from 'node:os';
import kleur from 'kleur';
import cliProgress from 'cli-progress';
import { parse, scrub, detectFormat, supportedFormats } from '@metascrub/core';
import type { ScrubOptions, ScrubPreset } from '@metascrub/core';
import { defaultOutPath } from './scrub.js';
import { parseList } from '../util/argv.js';

const VALID_PRESETS: ScrubPreset[] = [
  'all',
  'gps-only',
  'personal-only',
  'keep-technical',
  'custom',
];

export interface BatchCliOptions {
  action?: 'view' | 'scrub';
  recursive?: boolean;
  preset?: string;
  keep?: string;
  remove?: string;
  pattern?: string;
  inPlace?: boolean;
  outDir?: string;
  report?: string;
  concurrency?: string;
  json?: boolean;
}

const SUPPORTED_EXTENSIONS = new Set<string>(['.jpg', '.jpeg', '.png', '.pdf', '.docx']);

async function walk(dir: string, recursive: boolean): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) out.push(...(await walk(full, true)));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function matchesPattern(file: string, pattern?: string): boolean {
  if (!pattern) {
    const ext = extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  }
  // Convert simple glob (*.jpg, **/*.pdf) to regex.
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DBLSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DBLSTAR__/g, '.*')
    .replace(/\?/g, '.');
  const re = new RegExp(`(^|/)${escaped}$`);
  return re.test(file);
}

export async function runBatch(dir: string, opts: BatchCliOptions): Promise<number> {
  const action = opts.action ?? 'view';
  if (action !== 'view' && action !== 'scrub') {
    process.stderr.write(`metascrub batch: invalid --action "${action}"\n`);
    return 2;
  }
  if (action === 'scrub' && opts.preset !== undefined) {
    if (!VALID_PRESETS.includes(opts.preset as ScrubPreset)) {
      process.stderr.write(`metascrub batch: invalid preset "${opts.preset}"\n`);
      return 2;
    }
  }
  const preset = (opts.preset as ScrubPreset | undefined) ?? 'all';
  const scrubOptions: ScrubOptions = { preset };
  const keep = parseList(opts.keep);
  if (keep) scrubOptions.keep = keep;
  const removeList = parseList(opts.remove);
  if (removeList) scrubOptions.remove = removeList;

  const concurrency = Math.max(
    1,
    opts.concurrency ? parseInt(opts.concurrency, 10) : cpus().length,
  );

  const absDir = resolve(dir);
  const st = await stat(absDir).catch(() => null);
  if (!st || !st.isDirectory()) {
    process.stderr.write(`metascrub batch: not a directory: ${dir}\n`);
    return 2;
  }

  const allFiles = await walk(absDir, opts.recursive ?? false);
  void supportedFormats; // referenced for potential future filter expansion
  void detectFormat;
  const targets = allFiles.filter((f) => matchesPattern(f, opts.pattern));

  if (!targets.length) {
    process.stderr.write(`metascrub batch: no matching files in ${dir}\n`);
    return 0;
  }

  const useProgress = !opts.json && process.stderr.isTTY && targets.length > 1;
  const bar = useProgress
    ? new cliProgress.SingleBar(
        {
          format: `  ${kleur.cyan('{bar}')} {value}/{total} | {file}`,
          hideCursor: true,
          stream: process.stderr,
        },
        cliProgress.Presets.shades_classic,
      )
    : null;
  bar?.start(targets.length, 0, { file: '' });

  let failures = 0;
  const reportRows: Array<Record<string, unknown>> = [];

  async function processOne(file: string): Promise<void> {
    bar?.update({ file: relative(absDir, file) });
    try {
      const before = await parse({ kind: 'path', path: file });
      if (action === 'view') {
        if (opts.json) {
          process.stdout.write(JSON.stringify(before) + '\n');
        }
        reportRows.push({
          file: relative(absDir, file),
          format: before.format,
          warnings: before.warnings.length,
          sizeBytes: before.sizeBytes,
        });
      } else {
        const cleanBytes = await scrub({ kind: 'path', path: file }, scrubOptions);
        const outPath = opts.inPlace
          ? file
          : opts.outDir
            ? join(
                resolve(opts.outDir),
                relative(absDir, defaultOutPath(file)).replace(/\.clean(\.[^.]+)$/, '$1'),
              )
            : defaultOutPath(file);
        if (!opts.inPlace && opts.outDir) {
          await mkdir(dirname(outPath), { recursive: true });
        }
        await writeFile(outPath, cleanBytes);
        if (opts.json) {
          process.stdout.write(
            JSON.stringify({
              file: relative(absDir, file),
              out: outPath,
              sizeBefore: before.sizeBytes,
              sizeAfter: cleanBytes.length,
            }) + '\n',
          );
        }
        reportRows.push({
          file: relative(absDir, file),
          format: before.format,
          sizeBefore: before.sizeBytes,
          sizeAfter: cleanBytes.length,
        });
      }
    } catch (e) {
      failures += 1;
      if (opts.json) {
        process.stdout.write(
          JSON.stringify({
            file: relative(absDir, file),
            error: (e as Error).message,
          }) + '\n',
        );
      } else {
        process.stderr.write(
          `\n${kleur.red('✗')} ${relative(absDir, file)}: ${(e as Error).message}\n`,
        );
      }
    } finally {
      bar?.increment();
    }
  }

  // Concurrency limited via a sliding worker pool.
  const queue = [...targets];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i += 1) {
    workers.push(
      (async (): Promise<void> => {
        while (queue.length) {
          const next = queue.shift();
          if (next === undefined) break;
          await processOne(next);
        }
      })(),
    );
  }
  await Promise.all(workers);
  bar?.stop();

  if (opts.report) {
    const reportPath = resolve(opts.report);
    if (reportPath.endsWith('.json')) {
      await writeFile(reportPath, JSON.stringify(reportRows, null, 2));
    } else {
      const headers = Object.keys(reportRows[0] ?? { file: '' });
      const lines = [
        headers.join(','),
        ...reportRows.map((row) =>
          headers
            .map((h) => {
              const v = row[h];
              const s = v === undefined || v === null ? '' : String(v);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(','),
        ),
      ];
      await writeFile(reportPath, lines.join('\n'));
    }
    if (!opts.json) {
      process.stdout.write(`\n  ${kleur.green('✓')} report → ${reportPath}\n`);
    }
  }

  if (!opts.json) {
    process.stdout.write(
      `\n  ${kleur.bold('Done')}: ${targets.length} files, ${failures} failed\n\n`,
    );
  }
  return failures > 0 ? 1 : 0;
}
