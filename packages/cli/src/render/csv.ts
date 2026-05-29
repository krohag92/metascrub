import type { MetadataResult } from '@metascrub/core';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function renderResultCsv(result: MetadataResult): string {
  const rows: string[] = [];
  rows.push('group,key,value,sensitive');
  for (const [group, fields] of Object.entries(result.groups)) {
    for (const f of fields) {
      rows.push(
        [csvCell(group), csvCell(f.key), csvCell(f.value), csvCell(f.sensitive ?? false)].join(','),
      );
    }
  }
  return rows.join('\n');
}
