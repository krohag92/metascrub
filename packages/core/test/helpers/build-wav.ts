// Synthetic WAV (RIFF/WAVE) fixture builder.
//
// Layout:
//   RIFF + size + WAVE
//     fmt  + 16  + PCM(1) + chan(1) + sr(44100) + br + ba + bps(16)
//     LIST + ... + INFO + INAM/IART/...
//     data + 0  (empty audio payload)

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function chunkId(s: string): Uint8Array {
  return asciiBytes(s.padEnd(4, ' '));
}

function u32le(v: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = v & 0xff;
  out[1] = (v >>> 8) & 0xff;
  out[2] = (v >>> 16) & 0xff;
  out[3] = (v >>> 24) & 0xff;
  return out;
}

function u16le(v: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = v & 0xff;
  out[1] = (v >>> 8) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
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

function buildFmtChunk(): Uint8Array {
  // PCM, 1 channel (mono), 44.1k, 88.2k bytes/sec, 2 block align, 16 bps
  const body = concat([
    u16le(1), // format = PCM
    u16le(1), // channels
    u32le(44100), // sample rate
    u32le(88200), // byte rate
    u16le(2), // block align
    u16le(16), // bits per sample
  ]);
  return concat([chunkId('fmt'), u32le(body.length), body]);
}

function buildInfoChunk(fields: Record<string, string>): Uint8Array | null {
  const entries: Uint8Array[] = [];
  for (const [id, value] of Object.entries(fields)) {
    if (!value) continue;
    // NUL-terminate, pad to even
    let valBytes = asciiBytes(value + '\0');
    if (valBytes.length & 1) {
      const padded = new Uint8Array(valBytes.length + 1);
      padded.set(valBytes, 0);
      valBytes = padded;
    }
    entries.push(chunkId(id));
    entries.push(u32le(valBytes.length));
    entries.push(valBytes);
  }
  if (entries.length === 0) return null;
  const listBody = concat([asciiBytes('INFO'), ...entries]);
  return concat([asciiBytes('LIST'), u32le(listBody.length), listBody]);
}

function buildDataChunk(): Uint8Array {
  // Empty audio. Some decoders allow a 0-length data chunk; that's fine for
  // our metadata-only tests.
  return concat([asciiBytes('data'), u32le(0)]);
}

export interface WavBuildOpts {
  /** RIFF INFO INAM (title). */
  title?: string;
  /** RIFF INFO IART (artist). */
  artist?: string;
  /** RIFF INFO ICRD (date). */
  date?: string;
  /** RIFF INFO ISFT (software). */
  software?: string;
  /** RIFF INFO ICMT (comment). */
  comment?: string;
  /** RIFF INFO ICOP (copyright). */
  copyright?: string;
}

export function makeWav(opts: WavBuildOpts = {}): Uint8Array {
  const fmt = buildFmtChunk();
  const info = buildInfoChunk({
    INAM: opts.title ?? '',
    IART: opts.artist ?? '',
    ICRD: opts.date ?? '',
    ISFT: opts.software ?? '',
    ICMT: opts.comment ?? '',
    ICOP: opts.copyright ?? '',
  });
  const data = buildDataChunk();

  const innerParts: Uint8Array[] = [asciiBytes('WAVE'), fmt];
  if (info) innerParts.push(info);
  innerParts.push(data);
  const inner = concat(innerParts);

  return concat([asciiBytes('RIFF'), u32le(inner.length), inner]);
}
