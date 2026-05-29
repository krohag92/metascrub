import { parse } from '@metascrub/core';
import { renderResult } from '../render/human.js';
import { renderResultJson } from '../render/json.js';
import { renderResultCsv } from '../render/csv.js';

export interface ViewOptions {
  json?: boolean;
  csv?: boolean;
  only?: string;
  warnings?: boolean;
  quiet?: boolean;
}

export async function runView(file: string, opts: ViewOptions): Promise<number> {
  try {
    const result = await parse({ kind: 'path', path: file });
    if (opts.json) {
      process.stdout.write(renderResultJson(result) + '\n');
    } else if (opts.csv) {
      process.stdout.write(renderResultCsv(result) + '\n');
    } else if (!opts.quiet) {
      process.stdout.write(
        renderResult(result, {
          ...(opts.only ? { onlyNamespace: opts.only } : {}),
          warningsOnly: opts.warnings ?? false,
        }),
      );
    }
    return 0;
  } catch (e) {
    const msg = (e as Error).message;
    process.stderr.write(`metascrub view: ${msg}\n`);
    return looksLikeUnsupported(msg) ? 3 : 1;
  }
}

function looksLikeUnsupported(msg: string): boolean {
  return /unsupported|not yet supported|could not detect/i.test(msg);
}
