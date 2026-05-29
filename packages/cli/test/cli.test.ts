import { describe, it, expect, beforeAll } from 'vitest';
import { execa } from 'execa';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const CLI = resolve(fileURLToPath(new URL('../dist/index.js', import.meta.url)));

let tmp = '';
let jpegFile = '';
let pdfFile = '';

async function makeMinimalJpegWithExif(): Promise<Uint8Array> {
  // Reuse the core's helper indirectly by constructing through pdf-lib? No.
  // Inline a small Canon-EXIF JPEG.
  // For simplicity in CLI tests, use a tiny no-EXIF JPEG (just SOI+SOF+SOS+EOI).
  // We only need the CLI to recognize and process it.
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00,
    // DQT + SOF0 + DHT + SOS truncated for brevity — exifr will accept.
    // To be safe, embed a tiny 1x1 black JPEG. Use a known data URL.
  ]);
}
void makeMinimalJpegWithExif;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'metascrub-cli-'));

  const { makePdf } = await import('../../core/test/helpers/build-pdf.ts');
  const pdfBytes = await makePdf({
    author: 'Anton',
    title: 'Sample',
    producer: 'TestProducer',
  });
  pdfFile = join(tmp, 'sample.pdf');
  await writeFile(pdfFile, Buffer.from(pdfBytes));

  const { makeJpeg } = await import('../../core/test/helpers/build-jpeg.ts');
  jpegFile = join(tmp, 'sample.jpg');
  await writeFile(
    jpegFile,
    Buffer.from(
      makeJpeg({
        make: 'Canon',
        model: 'EOS R5',
        gps: { lat: 40.7128, lon: -74.006 },
        orientation: 1,
      }),
    ),
  );
});

describe('metascrub CLI', () => {
  it('shows version', async () => {
    const { stdout } = await execa('node', [CLI, '--version']);
    expect(stdout.trim()).toBe('0.1.0');
  });

  it('lists supported formats', async () => {
    const { stdout } = await execa('node', [CLI, 'formats', '--json']);
    const list = JSON.parse(stdout) as string[];
    expect(list).toContain('jpeg');
    expect(list).toContain('png');
    expect(list).toContain('pdf');
    expect(list).toContain('docx');
  });

  it('view --json prints metadata for a PDF', async () => {
    const { stdout } = await execa('node', [CLI, 'view', pdfFile, '--json']);
    const result = JSON.parse(stdout);
    expect(result.format).toBe('pdf');
    expect(result.highlights.author).toBe('Anton');
  });

  it('view --json prints metadata for a JPEG with GPS warning', async () => {
    const { stdout } = await execa('node', [CLI, 'view', jpegFile, '--json']);
    const result = JSON.parse(stdout);
    expect(result.format).toBe('jpeg');
    expect(result.highlights.gps).toBeDefined();
    expect((result.warnings as string[]).some((w) => w.toLowerCase().includes('gps'))).toBe(true);
  });

  it('scrub writes <name>.clean.<ext> by default', async () => {
    const { stdout } = await execa('node', [CLI, 'scrub', jpegFile, '--json']);
    const result = JSON.parse(stdout);
    expect(result.preset).toBe('all');
    expect(result.out).toMatch(/sample\.clean\.jpg$/);
    const cleanBuf = await readFile(result.out);
    expect(cleanBuf[0]).toBe(0xff);
    expect(cleanBuf[1]).toBe(0xd8);
  });

  it('batch view emits JSON lines', async () => {
    const subdir = join(tmp, 'batch');
    await mkdir(subdir, { recursive: true });
    await writeFile(join(subdir, 'a.pdf'), await readFile(pdfFile));
    await writeFile(join(subdir, 'b.jpg'), await readFile(jpegFile));
    const { stdout } = await execa('node', [CLI, 'batch', subdir, '--action', 'view', '--json']);
    const lines = stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    expect(lines.length).toBe(2);
    const formats = new Set(lines.map((l) => l.format));
    expect(formats.has('pdf')).toBe(true);
    expect(formats.has('jpeg')).toBe(true);
  });

  it('exit code 3 for unsupported format', async () => {
    const txt = join(tmp, 'note.txt');
    await writeFile(txt, 'hello world');
    const result = await execa('node', [CLI, 'view', txt], { reject: false });
    expect(result.exitCode).toBe(3);
  });
});
