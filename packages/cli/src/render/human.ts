import kleur from 'kleur';
import type { MetadataResult, MetadataDiff, MetadataField } from '@metascrub/core';

const BRAND_LINE = `${kleur.dim('metadatafinder.com')} — metascrub`;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatValue(v: MetadataField['value']): string {
  if (v === null) return kleur.dim('null');
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

export function renderHeader(action: string, target: string): string {
  return `${BRAND_LINE} ${kleur.bold(action)} ${kleur.cyan(target)}\n`;
}

export function renderResult(
  result: MetadataResult,
  opts: { onlyNamespace?: string; warningsOnly?: boolean } = {},
): string {
  const lines: string[] = [];
  lines.push(renderHeader('view', result.filename ?? `<${result.format}>`));
  lines.push(
    `  ${kleur.bold('Format')}    ${result.format.toUpperCase()} (${formatSize(result.sizeBytes)})`,
  );
  if (result.highlights.capturedAt)
    lines.push(`  ${kleur.bold('Captured')}  ${result.highlights.capturedAt}`);
  if (result.highlights.device) {
    const d = result.highlights.device;
    const parts: string[] = [];
    if (d.make) parts.push(d.make);
    if (d.model) parts.push(d.model);
    if (parts.length) lines.push(`  ${kleur.bold('Device')}    ${parts.join(' ')}`);
  }
  if (result.highlights.software)
    lines.push(`  ${kleur.bold('Software')}  ${result.highlights.software}`);
  if (result.highlights.author)
    lines.push(`  ${kleur.bold('Author')}    ${result.highlights.author}`);
  if (result.highlights.lastModifiedBy)
    lines.push(`  ${kleur.bold('Last edit')} ${result.highlights.lastModifiedBy}`);

  if (result.warnings.length) {
    lines.push('');
    for (const w of result.warnings) {
      lines.push(`  ${kleur.yellow('⚠')} ${w}`);
    }
  }

  if (opts.warningsOnly) {
    lines.push('');
    return lines.join('\n');
  }

  const ns = opts.onlyNamespace;
  for (const [group, fields] of Object.entries(result.groups)) {
    if (ns !== undefined && group !== ns) continue;
    lines.push('');
    lines.push(`  ${kleur.bold().underline(group)}`);
    const widest = Math.min(32, Math.max(8, ...fields.map((f) => f.key.length)));
    for (const f of fields) {
      const label = (f.label ?? f.key).padEnd(widest);
      const value = formatValue(f.value);
      if (f.sensitive) {
        lines.push(`    ${kleur.red(label)}  ${kleur.red(value)}`);
      } else {
        lines.push(`    ${label}  ${kleur.dim(value)}`);
      }
    }
  }
  lines.push('');
  if (!opts.warningsOnly && result.warnings.length) {
    lines.push(
      kleur.dim(
        `Run \`metascrub scrub ${result.filename ?? 'FILE'}\` to remove sensitive metadata.`,
      ),
    );
    lines.push('');
  }
  return lines.join('\n');
}

export function renderScrubResult(
  filename: string,
  outPath: string,
  before: MetadataResult,
  after: MetadataResult,
  dryRun: boolean,
): string {
  const lines: string[] = [];
  lines.push(renderHeader(dryRun ? 'scrub --dry-run' : 'scrub', filename));
  const beforeKeys = new Set<string>();
  for (const [group, fields] of Object.entries(before.groups)) {
    for (const f of fields) beforeKeys.add(`${group}.${f.key}=${String(f.value)}`);
  }
  const afterKeys = new Set<string>();
  for (const [group, fields] of Object.entries(after.groups)) {
    for (const f of fields) afterKeys.add(`${group}.${f.key}=${String(f.value)}`);
  }
  const removed: string[] = [];
  for (const k of beforeKeys) if (!afterKeys.has(k)) removed.push(k);
  if (removed.length) {
    lines.push(`  ${kleur.bold('Removed')} (${removed.length})`);
    for (const r of removed.slice(0, 20)) {
      lines.push(`    ${kleur.red('−')} ${r}`);
    }
    if (removed.length > 20) lines.push(`    ${kleur.dim(`… and ${removed.length - 20} more`)}`);
  } else {
    lines.push(`  ${kleur.dim('No fields were stripped.')}`);
  }
  if (!dryRun) {
    lines.push('');
    lines.push(`  ${kleur.green('✓')} wrote ${kleur.cyan(outPath)}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderDiff(diff: MetadataDiff, a: string, b: string): string {
  const lines: string[] = [];
  lines.push(renderHeader('compare', `${a} vs ${b}`));
  if (diff.onlyInA.length) {
    lines.push(`  ${kleur.bold('Only in A')} (${diff.onlyInA.length})`);
    for (const f of diff.onlyInA)
      lines.push(`    ${kleur.red('−')} ${f.key} = ${formatValue(f.value)}`);
  }
  if (diff.onlyInB.length) {
    lines.push(`  ${kleur.bold('Only in B')} (${diff.onlyInB.length})`);
    for (const f of diff.onlyInB)
      lines.push(`    ${kleur.green('+')} ${f.key} = ${formatValue(f.value)}`);
  }
  if (diff.changed.length) {
    lines.push(`  ${kleur.bold('Changed')} (${diff.changed.length})`);
    for (const c of diff.changed)
      lines.push(
        `    ${kleur.yellow('~')} ${c.a.key}: ${formatValue(c.a.value)} → ${formatValue(c.b.value)}`,
      );
  }
  if (!diff.onlyInA.length && !diff.onlyInB.length && !diff.changed.length) {
    lines.push(`  ${kleur.dim('Files are identical (metadata-wise).')}`);
  }
  lines.push('');
  return lines.join('\n');
}
