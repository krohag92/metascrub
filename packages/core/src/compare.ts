import type { FileInput, MetadataDiff, MetadataField } from './types.js';
import { parse } from './parse.js';

export async function compare(a: FileInput, b: FileInput): Promise<MetadataDiff> {
  const [resA, resB] = await Promise.all([parse(a), parse(b)]);

  const flatten = (groups: Record<string, MetadataField[]>): Map<string, MetadataField> => {
    const map = new Map<string, MetadataField>();
    for (const [group, fields] of Object.entries(groups)) {
      for (const f of fields) map.set(`${group}.${f.key}`, f);
    }
    return map;
  };

  const A = flatten(resA.groups);
  const B = flatten(resB.groups);

  const onlyInA: MetadataField[] = [];
  const onlyInB: MetadataField[] = [];
  const changed: { a: MetadataField; b: MetadataField }[] = [];

  for (const [key, fa] of A) {
    const fb = B.get(key);
    if (!fb) {
      onlyInA.push(fa);
    } else if (!fieldEquals(fa, fb)) {
      changed.push({ a: fa, b: fb });
    }
  }
  for (const [key, fb] of B) {
    if (!A.has(key)) onlyInB.push(fb);
  }

  return { onlyInA, onlyInB, changed };
}

function fieldEquals(a: MetadataField, b: MetadataField): boolean {
  return a.value === b.value;
}
