import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { MetaScrub } from '../nodes/MetaScrub/MetaScrub.node';
import * as core from '@metascrub/core';

// ---------------------------------------------------------------------------
// Helpers: build a minimal fake IExecuteFunctions context
// ---------------------------------------------------------------------------

function makeSmallJpeg(): Uint8Array {
  // Minimal valid JPEG header (SOI + EOI), enough for mocking
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
}

function makeContext(
  operation: string,
  params: Record<string, unknown>,
  binaryBuffers: Record<string, Buffer>,
): IExecuteFunctions {
  const binaryData: Record<string, { fileName?: string; mimeType?: string }> = {};
  for (const key of Object.keys(binaryBuffers)) {
    binaryData[key] = { fileName: `${key}.jpg`, mimeType: 'image/jpeg' };
  }

  const ctx = {
    getInputData: () => [{ json: {} }] as INodeExecutionData[],
    getNodeParameter: (_name: string, _i: number) => {
      if (_name === 'operation') return operation;
      return params[_name] ?? '';
    },
    helpers: {
      assertBinaryData: (_i: number, prop: string) => binaryData[prop],
      getBinaryDataBuffer: async (_i: number, prop: string) => binaryBuffers[prop],
      prepareBinaryData: async (buffer: Buffer, filename?: string, mimeType?: string) => ({
        data: buffer.toString('base64'),
        mimeType,
        fileName: filename,
      }),
    },
  } as unknown as IExecuteFunctions;

  return ctx;
}

/** Unwrap the n8n NodeOutput (which TypeScript types loosely) to a flat item array. */
async function runAndGetItems(
  node: MetaScrub,
  ctx: IExecuteFunctions,
): Promise<INodeExecutionData[]> {
  const output = (await node.execute.call(ctx)) as INodeExecutionData[][];
  return output[0] ?? [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetaScrub node description', () => {
  it('has the correct display name and group', () => {
    const node = new MetaScrub();
    expect(node.description.displayName).toBe('MetaScrub');
    expect(node.description.group).toEqual(['transform']);
  });

  it('exports three operations: parse, scrub, compare', () => {
    const node = new MetaScrub();
    const operationProp = node.description.properties.find((p) => p.name === 'operation');
    expect(operationProp).toBeDefined();
    const values = (operationProp!.options as Array<{ value: string }>).map((o) => o.value);
    expect(values).toContain('parse');
    expect(values).toContain('scrub');
    expect(values).toContain('compare');
  });

  it('includes the scrub preset property with all four presets', () => {
    const node = new MetaScrub();
    const presetProp = node.description.properties.find((p) => p.name === 'preset');
    expect(presetProp).toBeDefined();
    const values = (presetProp!.options as Array<{ value: string }>).map((o) => o.value);
    expect(values).toEqual(['all', 'gps-only', 'personal-only', 'keep-technical']);
  });

  it('has documentationUrl pointing to metadatafinder.com', () => {
    const node = new MetaScrub();
    expect(node.description.documentationUrl).toBe('https://metadatafinder.com');
  });
});

describe('MetaScrub node execute — parse operation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls core.parse and returns metadata as JSON', async () => {
    const fakeResult = {
      format: 'jpeg',
      filename: 'test.jpg',
      sizeBytes: 8,
      groups: { EXIF: [{ key: 'Make', value: 'Canon' }] },
      highlights: {},
      warnings: [],
    };
    const parseSpy = vi.spyOn(core, 'parse').mockResolvedValue(fakeResult as never);

    const node = new MetaScrub();
    const jpeg = Buffer.from(makeSmallJpeg());
    const ctx = makeContext('parse', { binaryProperty: 'data', filename: '' }, { data: jpeg });

    const items = await runAndGetItems(node, ctx);
    const item = items[0]!;
    expect(parseSpy).toHaveBeenCalledOnce();
    expect(item.json).toMatchObject({ format: 'jpeg' });
    expect(item.json['groups']).toBeDefined();
  });

  it('passes filename override to core.parse when provided', async () => {
    const parseSpy = vi.spyOn(core, 'parse').mockResolvedValue({
      format: 'jpeg',
      filename: 'override.jpg',
      sizeBytes: 8,
      groups: {},
      highlights: {},
      warnings: [],
    } as never);

    const node = new MetaScrub();
    const jpeg = Buffer.from(makeSmallJpeg());
    const ctx = makeContext(
      'parse',
      { binaryProperty: 'data', filename: 'override.jpg' },
      { data: jpeg },
    );

    await runAndGetItems(node, ctx);

    const callArg = parseSpy.mock.calls[0]?.[0] as core.FileInput;
    expect(callArg.kind).toBe('bytes');
    if (callArg.kind === 'bytes') {
      expect(callArg.filename).toBe('override.jpg');
    }
  });
});

describe('MetaScrub node execute — scrub operation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls core.scrub and returns a binary output item', async () => {
    const cleanBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const scrubSpy = vi.spyOn(core, 'scrub').mockResolvedValue(cleanBytes);

    const node = new MetaScrub();
    const jpeg = Buffer.from(makeSmallJpeg());
    const ctx = makeContext(
      'scrub',
      {
        binaryProperty: 'data',
        filename: '',
        preset: 'all',
        outputBinaryProperty: 'data',
      },
      { data: jpeg },
    );

    const items = await runAndGetItems(node, ctx);
    const item = items[0]!;
    expect(scrubSpy).toHaveBeenCalledOnce();
    expect(scrubSpy).toHaveBeenCalledWith(expect.any(Object), { preset: 'all' });
    expect(item.binary).toBeDefined();
    expect(item.binary!['data']).toBeDefined();
    expect(item.json['scrubSizeBytes']).toBe(cleanBytes.length);
  });

  it('forwards the preset to core.scrub', async () => {
    const scrubSpy = vi.spyOn(core, 'scrub').mockResolvedValue(new Uint8Array([0xff, 0xd9]));

    const node = new MetaScrub();
    const jpeg = Buffer.from(makeSmallJpeg());
    const ctx = makeContext(
      'scrub',
      {
        binaryProperty: 'data',
        filename: '',
        preset: 'gps-only',
        outputBinaryProperty: 'scrubbed',
      },
      { data: jpeg },
    );

    await runAndGetItems(node, ctx);
    expect(scrubSpy).toHaveBeenCalledWith(expect.any(Object), { preset: 'gps-only' });
  });
});

describe('MetaScrub node execute — compare operation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls core.compare and returns a diff JSON item', async () => {
    const fakeDiff = {
      onlyInA: [{ key: 'GPS.Lat', value: '48.8' }],
      onlyInB: [],
      changed: [],
    };
    const compareSpy = vi.spyOn(core, 'compare').mockResolvedValue(fakeDiff as never);

    const node = new MetaScrub();
    const jpegA = Buffer.from(makeSmallJpeg());
    const jpegB = Buffer.from(makeSmallJpeg());
    const ctx = makeContext(
      'compare',
      { binaryPropertyA: 'fileA', binaryPropertyB: 'fileB' },
      { fileA: jpegA, fileB: jpegB },
    );

    const items = await runAndGetItems(node, ctx);
    const item = items[0]!;
    expect(compareSpy).toHaveBeenCalledOnce();
    expect(item.json['onlyInA']).toEqual(fakeDiff.onlyInA);
    expect(item.json['changed']).toEqual([]);
  });
});
