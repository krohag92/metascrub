import { Command } from 'commander';
import { runView } from './commands/view.js';
import { runScrub } from './commands/scrub.js';
import { runCompare } from './commands/compare.js';
import { runBatch } from './commands/batch.js';
import { runFormats } from './commands/formats.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const program = new Command();
  program
    .name('metascrub')
    .description(
      'View and strip metadata from images, videos, audio, and documents. https://metadatafinder.com',
    )
    .version(VERSION);

  program
    .command('view <file>')
    .description('Print metadata of a file')
    .option('--json', 'Output as JSON')
    .option('--csv', 'Output as CSV')
    .option('--only <ns>', 'Show only one namespace (e.g. EXIF, XMP, PDF.Info)')
    .option('--warnings', 'Show only warnings (sensitive fields)')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async (file: string, opts) => {
      process.exit(await runView(file, opts));
    });

  program
    .command('scrub <file>')
    .description('Scrub metadata, write cleaned file')
    .option('-o, --out <path>', 'Output path')
    .option('--in-place', 'Overwrite the input file (BE CAREFUL)')
    .option('--preset <name>', 'all | gps-only | personal-only | keep-technical | custom', 'all')
    .option('--keep <list>', 'Comma-separated fields to keep (custom preset)')
    .option('--remove <list>', 'Comma-separated fields to remove')
    .option('--dry-run', "Show what would be removed, don't write")
    .option('--json', 'Output result as JSON')
    .action(async (file: string, opts) => {
      process.exit(await runScrub(file, opts));
    });

  program
    .command('compare <a> <b>')
    .description('Show metadata diff between two files')
    .option('--json', 'Output as JSON')
    .option('--only-changed', 'Hide identical fields', true)
    .option('--all', 'Show identical fields too')
    .action(async (a: string, b: string, opts) => {
      process.exit(await runCompare(a, b, opts));
    });

  program
    .command('batch <dir>')
    .description('Process a directory of files')
    .option('--action <view|scrub>', 'Action to perform', 'view')
    .option('-r, --recursive', 'Recurse into subfolders')
    .option('--preset <name>', 'Scrub preset (only with --action=scrub)', 'all')
    .option('--keep <list>', 'Comma-separated fields to keep')
    .option('--remove <list>', 'Comma-separated fields to remove')
    .option('--pattern <glob>', 'File glob (default: all supported formats)')
    .option('--in-place', 'Overwrite originals (with --action=scrub)')
    .option('--out-dir <path>', 'Mirror folder structure into out-dir')
    .option('--report <path>', 'Write CSV/JSON report')
    .option('--concurrency <n>', 'Parallelism (default: CPU count)')
    .option('--json', 'Streaming JSON output for piping')
    .action(async (dir: string, opts) => {
      process.exit(await runBatch(dir, opts));
    });

  program
    .command('formats')
    .description('List supported formats')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      process.exit(runFormats(opts));
    });

  program.parseAsync(process.argv).catch((err: Error) => {
    process.stderr.write(`metascrub: ${err.message}\n`);
    process.exit(1);
  });
}

main().catch((err: Error) => {
  process.stderr.write(`metascrub: ${err.message}\n`);
  process.exit(1);
});
