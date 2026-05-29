import type { FileInput } from '../types.js';
import { MetaScrubError } from '../types.js';
import { isNode } from '../env.js';

export async function readInput(
  input: FileInput,
): Promise<{ data: Uint8Array; filename?: string }> {
  if (input.kind === 'bytes') {
    const result: { data: Uint8Array; filename?: string } = { data: input.data };
    if (input.filename !== undefined) result.filename = input.filename;
    return result;
  }
  if (input.kind === 'path') {
    if (!isNode) {
      throw new MetaScrubError('PARSE_ERROR', 'Reading file paths is only supported in Node.js.');
    }
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const buf = await fs.readFile(input.path);
    return {
      data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      filename: path.basename(input.path),
    };
  }
  throw new MetaScrubError('PARSE_ERROR', 'Unknown FileInput kind.');
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export function byteEquals(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

export function readUInt32BE(bytes: Uint8Array, offset: number): number {
  const b0 = bytes[offset] ?? 0;
  const b1 = bytes[offset + 1] ?? 0;
  const b2 = bytes[offset + 2] ?? 0;
  const b3 = bytes[offset + 3] ?? 0;
  return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
}

export function readUInt16BE(bytes: Uint8Array, offset: number): number {
  const b0 = bytes[offset] ?? 0;
  const b1 = bytes[offset + 1] ?? 0;
  return (b0 << 8) | b1;
}

export function writeUInt32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

export function writeUInt16BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder('utf-8', { fatal: false });
export const latin1Decoder = new TextDecoder('latin1');
