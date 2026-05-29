#!/usr/bin/env node
/**
 * Generate JSON from the TS core parse() for parity comparison.
 * Usage: node tests/parity/run_ts_parity.js <fixture_file> [output.json]
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: run_ts_parity.js <fixture_file> [output.json]');
    process.exit(1);
  }

  const fixturePath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : null;

  // Load the TS core CJS bundle — try worktree-local first, then main tree
  const worktreeCorePath = path.resolve(__dirname, '../../../../packages/core/dist/index.cjs');
  const mainCorePath = '/Users/user/metascrub/packages/core/dist/index.cjs';
  const corePath = require('fs').existsSync(worktreeCorePath) ? worktreeCorePath : mainCorePath;
  if (!fs.existsSync(corePath)) {
    console.error(`TS core not built: ${corePath}`);
    console.error('Run: pnpm --filter @metascrub/core build');
    process.exit(1);
  }

  const core = require(corePath);
  const bytes = fs.readFileSync(fixturePath);
  const filename = path.basename(fixturePath);

  let result;
  try {
    result = await core.parse({ kind: 'bytes', data: new Uint8Array(bytes), filename });
  } catch (e) {
    console.error(`Parse error: ${e.message}`);
    process.exit(1);
  }

  // Normalize to match Python output shape
  const out = {
    format: result.format,
    highlights: {
      ...(result.highlights.gps ? { gps: result.highlights.gps } : {}),
      ...(result.highlights.capturedAt ? { capturedAt: result.highlights.capturedAt } : {}),
      ...(result.highlights.device ? { device: result.highlights.device } : {}),
      ...(result.highlights.software ? { software: result.highlights.software } : {}),
      ...(result.highlights.author ? { author: result.highlights.author } : {}),
      ...(result.highlights.lastModifiedBy ? { lastModifiedBy: result.highlights.lastModifiedBy } : {}),
      ...(result.highlights.revisionHistory !== undefined ? { revisionHistory: result.highlights.revisionHistory } : {}),
    },
    warnings: result.warnings,
    groups: {},
  };

  for (const [group, fields] of Object.entries(result.groups)) {
    out.groups[group] = fields.map(f => ({
      key: f.key,
      value: f.value,
      ...(f.sensitive ? { sensitive: true } : {}),
    }));
  }

  const json = JSON.stringify(out, null, 2);
  if (outputPath) {
    fs.writeFileSync(outputPath, json);
    console.error(`Written to ${outputPath}`);
  } else {
    console.log(json);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
