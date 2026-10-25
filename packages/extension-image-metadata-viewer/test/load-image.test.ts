import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { loadImageFromUrl } from '../src/inspect';

const jpeg = readFileSync(resolve(import.meta.dirname, 'fixtures/sample.jpg'));

function listen(server: Server): Promise<number> {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    return address.port;
  });
}

describe('loadImageFromUrl', () => {
  it('reads a JPEG from a server that sends no CORS header', async () => {
    let sawOrigin: string | undefined;
    const server = createServer((request, response) => {
      sawOrigin = request.headers.origin;
      const allow = response.getHeader('access-control-allow-origin');
      expect(allow).toBeUndefined();
      response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
      response.end(jpeg);
    });
    const port = await listen(server);
    try {
      const facts = await loadImageFromUrl(`http://127.0.0.1:${port}/photo.jpg`);
      expect(facts.byteLength).toBe(jpeg.byteLength);
      expect(facts.exif.find((row) => row.label === 'Camera')?.value).toBe('Canon EOS R5');
      expect(sawOrigin).toBeUndefined();
    } finally {
      server.close();
    }
  });
});
