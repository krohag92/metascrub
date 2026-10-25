import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build } from '../scripts/build.mjs';
import { readZipEntry } from '../scripts/zip.mjs';

const root = resolve(import.meta.dirname, '..');
const jpeg = readFileSync(resolve(import.meta.dirname, 'fixtures/sample.jpg'));

/**
 * Branded Google Chrome ignores --load-extension. Chromium and Chrome for Testing
 * still honour it, which is what this check needs.
 */
function chromeCanLoadUnpacked(bin: string): boolean {
  const version = execFileSync(bin, ['--version'], { encoding: 'utf8' });
  return version.includes('Chrome for Testing') || version.includes('Chromium');
}

const chromeBin = [
  process.env.CHROME_BIN,
  '/tmp/chrome-linux64/chrome',
  '/opt/google/chrome-for-testing/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].find((path) => path && existsSync(path) && chromeCanLoadUnpacked(path));

interface Target {
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

function listen(server: Server): Promise<number> {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    return address.port;
  });
}

function evaluate(wsUrl: string, expression: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let next = 0;
    const pending = new Map<number, (message: { error?: unknown; result?: unknown }) => void>();
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('CDP timed out'));
    }, 15000);
    const fail = (error: unknown) => {
      clearTimeout(timer);
      ws.close();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    ws.addEventListener('error', () => fail(new Error('Chrome DevTools socket failed')));
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        error?: unknown;
        result?: unknown;
      };
      if (message.id == null) return;
      const done = pending.get(message.id);
      if (!done) return;
      pending.delete(message.id);
      done(message);
    });
    ws.addEventListener('open', () => {
      const send = (method: string, params: object) =>
        new Promise<unknown>((resolveSend, rejectSend) => {
          const id = ++next;
          pending.set(id, (message) => {
            if (message.error) rejectSend(new Error(JSON.stringify(message.error)));
            else resolveSend(message.result);
          });
          ws.send(JSON.stringify({ id, method, params }));
        });
      void (async () => {
        try {
          await send('Runtime.enable', {});
          const result = (await send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
          })) as {
            exceptionDetails?: unknown;
            result?: { value?: unknown };
          };
          clearTimeout(timer);
          ws.close();
          if (result.exceptionDetails) {
            reject(new Error(JSON.stringify(result.exceptionDetails)));
            return;
          }
          resolve(result.result?.value);
        } catch (error) {
          fail(error);
        }
      })();
    });
  });
}

async function waitForTarget(port: number, match: (target: Target) => boolean): Promise<Target> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const list = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
      response.json(),
    )) as Target[];
    const found = list.find(match);
    if (found?.webSocketDebuggerUrl) return found;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Chrome target did not appear');
}

async function listTargets(port: number): Promise<Target[]> {
  return (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
    response.json(),
  )) as Target[];
}

async function waitForExtensionWorker(port: number): Promise<Target> {
  let last: Target[] = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    last = await listTargets(port);
    const workers = last.filter(
      (target) =>
        target.type === 'service_worker' &&
        target.url.includes('/background.js') &&
        target.webSocketDebuggerUrl,
    );
    for (const worker of workers) {
      const ready = await evaluate(
        worker.webSocketDebuggerUrl as string,
        'typeof imageMetadataViewer === "object" && typeof imageMetadataViewer.loadImage === "function"',
      );
      if (ready === true) return worker;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Extension service worker did not appear: ${JSON.stringify(last)}`);
}

describe('extension package', () => {
  it('builds a Chromium zip and a Firefox zip', async () => {
    const output = await build();
    const chromium = JSON.parse(
      readFileSync(join(output.chromiumDir, 'manifest.json'), 'utf8'),
    ) as {
      background: { service_worker?: string };
      content_scripts?: unknown;
    };
    const firefox = JSON.parse(readFileSync(join(output.firefoxDir, 'manifest.json'), 'utf8')) as {
      background: { scripts?: string[] };
      browser_specific_settings: { gecko: { id: string } };
    };
    expect(chromium.background.service_worker).toBe('background.js');
    expect(chromium.content_scripts).toBeUndefined();
    expect(firefox.background.scripts).toEqual(['background.js']);
    expect(firefox.browser_specific_settings.gecko.id).toBe(
      'image-metadata-viewer@metadatafinder.com',
    );
    const zippedManifest = JSON.parse(
      readZipEntry(readFileSync(output.firefoxZip), 'manifest.json').toString('utf8'),
    ) as {
      browser_specific_settings: {
        gecko: { data_collection_permissions: { required: string[] } };
      };
    };
    expect(
      zippedManifest.browser_specific_settings.gecko.data_collection_permissions.required,
    ).toEqual(['none']);
    expect(
      readZipEntry(readFileSync(output.chromiumZip), 'background.js').toString('utf8'),
    ).toContain('ExifReader 4.31.0');
    expect(readFileSync(join(output.chromiumDir, 'background.js'), 'utf8')).not.toContain(
      'importScripts',
    );
  });
});

describe.skipIf(!chromeBin)('cross-origin image', () => {
  it('reads EXIF from the service worker when the page fetch is blocked', async () => {
    await build();
    const extensionDir = join(root, 'dist/chromium');
    const imageServer = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
      response.end(jpeg);
    });
    const imagePort = await listen(imageServer);
    const imageUrl = `http://127.0.0.1:${imagePort}/photo.jpg`;
    const pageServer = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><title>fixture</title>
        <img id="photo" alt="&lt;img src=x onerror=alert(1)&gt;" src="${imageUrl}">`);
    });
    const pagePort = await listen(pageServer);
    const pageUrl = `http://127.0.0.1:${pagePort}/fixture`;
    const profile = await mkdtemp(join(tmpdir(), 'imv-chrome-'));
    const chrome = spawn(
      chromeBin as string,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-features=DisableLoadExtensionCommandLineSwitch',
        `--user-data-dir=${profile}`,
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`,
        '--remote-debugging-port=0',
        pageUrl,
      ],
      { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let devtools = '';
    const log = (chunk: Buffer) => {
      devtools += chunk.toString();
    };
    chrome.stdout?.on('data', log);
    chrome.stderr?.on('data', log);
    try {
      const port = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Chrome did not open DevTools\n${devtools}`)),
          15000,
        );
        const check = () => {
          const match = devtools.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
          if (match?.[1]) {
            clearTimeout(timer);
            resolve(Number(match[1]));
          }
        };
        chrome.stderr?.on('data', check);
        chrome.stdout?.on('data', check);
        chrome.on('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Chrome exited ${code}\n${devtools}`));
        });
      });

      const page = await waitForTarget(
        port,
        (target) => target.type === 'page' && target.url.includes('/fixture'),
      );
      const worker = await waitForExtensionWorker(port);

      const pageFetch = (await evaluate(
        page.webSocketDebuggerUrl as string,
        `fetch(${JSON.stringify(imageUrl)}).then(() => 'ok').catch((error) => error.name + ':' + error.message)`,
      )) as string;
      expect(pageFetch.startsWith('TypeError')).toBe(true);

      const loaded = (await evaluate(
        worker.webSocketDebuggerUrl as string,
        `imageMetadataViewer.loadImage(${JSON.stringify(imageUrl)}).then((facts) => ({
          bytes: facts.byteLength,
          width: facts.naturalWidth,
          camera: (facts.exif.find((row) => row.label === 'Camera') || {}).value
        }))`,
      )) as { bytes: number; width: number; camera: string };
      expect(loaded.bytes).toBe(jpeg.byteLength);
      expect(loaded.width).toBeGreaterThan(0);
      expect(loaded.camera).toBe('Canon EOS R5');

      await evaluate(
        worker.webSocketDebuggerUrl as string,
        `(async () => {
          const tabs = await chrome.tabs.query({});
          const tab = tabs.find((item) => item.url && item.url.includes('/fixture'));
          if (!tab || tab.id == null) throw new Error('fixture tab missing');
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['style.css'] });
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showMetadata',
            imageUrl: ${JSON.stringify(imageUrl)},
            facts: await imageMetadataViewer.loadImage(${JSON.stringify(imageUrl)}),
            errorMessage: null,
            utmSource: 'chrome_extension'
          });
          return true;
        })()`,
      );

      const overlay = (await evaluate(
        page.webSocketDebuggerUrl as string,
        `(() => {
          const root = document.getElementById('image-metadata-viewer-overlay');
          return {
            text: root ? root.textContent : '',
            injectedImg: root ? root.querySelector('img') !== null : true,
            href: root ? (root.querySelector('.powered-by a') || {}).href || '' : ''
          };
        })()`,
      )) as { text: string; injectedImg: boolean; href: string };
      expect(overlay.text).toContain('Canon EOS R5');
      expect(overlay.text).toContain('<img src=x onerror=alert(1)>');
      expect(overlay.injectedImg).toBe(false);
      expect(overlay.href).toContain('utm_source=chrome_extension');
      expect(overlay.href).not.toMatch(/\s/);
    } finally {
      await stop(chrome);
      imageServer.close();
      pageServer.close();
      await rm(profile, { recursive: true, force: true });
    }
  });
});

async function stop(chrome: ChildProcess): Promise<void> {
  if (!chrome.pid) return;
  try {
    process.kill(-chrome.pid, 'SIGKILL');
  } catch {
    chrome.kill('SIGKILL');
  }
  await once(chrome, 'exit').catch(() => undefined);
}
