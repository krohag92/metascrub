import { compare } from '@metascrub/core';
import { renderDiff } from '../render/human.js';
import { renderDiffJson } from '../render/json.js';

export interface CompareCliOptions {
  json?: boolean;
  onlyChanged?: boolean;
  all?: boolean;
}

export async function runCompare(a: string, b: string, opts: CompareCliOptions): Promise<number> {
  void opts.onlyChanged;
  void opts.all;
  try {
    const diff = await compare({ kind: 'path', path: a }, { kind: 'path', path: b });
    if (opts.json) {
      process.stdout.write(renderDiffJson(diff) + '\n');
    } else {
      process.stdout.write(renderDiff(diff, a, b));
    }
    return 0;
  } catch (e) {
    const msg = (e as Error).message;
    process.stderr.write(`metascrub compare: ${msg}\n`);
    return /unsupported|not yet supported|could not detect/i.test(msg) ? 3 : 1;
  }
}
