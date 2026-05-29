import { supportedFormats } from '@metascrub/core';
import kleur from 'kleur';

export function runFormats(opts: { json?: boolean }): number {
  const list = supportedFormats();
  if (opts.json) {
    process.stdout.write(JSON.stringify(list, null, 2) + '\n');
  } else {
    process.stdout.write(`${kleur.dim('metadatafinder.com')} — metascrub formats\n`);
    for (const f of list) process.stdout.write(`  ${f}\n`);
    process.stdout.write('\n');
  }
  return 0;
}
