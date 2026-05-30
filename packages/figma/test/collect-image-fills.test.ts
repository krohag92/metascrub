/**
 * Tests for the collectImageFills helper function.
 * The function is pure logic — it only reads from node properties.
 * We mock the BaseNode / ChildrenMixin / GeometryMixin shape.
 */

import { describe, it, expect } from 'vitest';
import { collectImageFills } from '../src/lib.js';
import type { ImagePayload, SandboxToUIMessage, UIToSandboxMessage } from '../src/ui/types.js';

// ---- Minimal Figma node mocks ----

function makeImageFill(hash: string): object {
  return { type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' };
}

function makeSolidFill(): object {
  return { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 };
}

interface MockNode {
  id: string;
  name: string;
  fills?: object[];
  children?: MockNode[];
}

// Cast to BaseNode for the function signature
function asBase(node: MockNode): BaseNode {
  return node as unknown as BaseNode;
}

// ---- Tests ----

describe('collectImageFills', () => {
  it('returns empty map when node has no fills', () => {
    const node: MockNode = { id: '1', name: 'Frame', children: [] };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(node), results);
    expect(results.size).toBe(0);
  });

  it('returns empty map when node has only solid fills', () => {
    const node: MockNode = { id: '1', name: 'Frame', fills: [makeSolidFill()] };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(node), results);
    expect(results.size).toBe(0);
  });

  it('collects a single image fill from a node', () => {
    const node: MockNode = {
      id: 'rect1',
      name: 'My Image',
      fills: [makeImageFill('abc123')],
    };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(node), results);
    expect(results.size).toBe(1);
    expect(results.get('abc123')).toEqual({
      nodeId: 'rect1',
      nodeName: 'My Image',
      hash: 'abc123',
    });
  });

  it('deduplicates identical image hashes across nodes', () => {
    const parent: MockNode = {
      id: 'frame1',
      name: 'Frame',
      fills: [],
      children: [
        { id: 'rect1', name: 'Rect 1', fills: [makeImageFill('same-hash')] },
        { id: 'rect2', name: 'Rect 2', fills: [makeImageFill('same-hash')] },
      ],
    };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(parent), results);
    // Same hash should be collected only once (first occurrence wins)
    expect(results.size).toBe(1);
    expect(results.get('same-hash')?.nodeId).toBe('rect1');
  });

  it('collects multiple distinct images from a flat list of children', () => {
    const parent: MockNode = {
      id: 'page',
      name: 'Page',
      fills: [],
      children: [
        { id: 'r1', name: 'A', fills: [makeImageFill('hash-a')] },
        { id: 'r2', name: 'B', fills: [makeImageFill('hash-b')] },
        { id: 'r3', name: 'C', fills: [makeSolidFill()] },
      ],
    };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(parent), results);
    expect(results.size).toBe(2);
    expect(results.has('hash-a')).toBe(true);
    expect(results.has('hash-b')).toBe(true);
  });

  it('traverses deeply nested children', () => {
    const deep: MockNode = {
      id: 'page',
      name: 'Page',
      fills: [],
      children: [
        {
          id: 'group1',
          name: 'Group',
          fills: [],
          children: [
            {
              id: 'nested',
              name: 'Nested Image',
              fills: [makeImageFill('deep-hash')],
            },
          ],
        },
      ],
    };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(deep), results);
    expect(results.size).toBe(1);
    expect(results.get('deep-hash')?.nodeId).toBe('nested');
  });

  it('ignores fills with null imageHash', () => {
    const node: MockNode = {
      id: 'r1',
      name: 'Rect',
      fills: [{ type: 'IMAGE', imageHash: null, scaleMode: 'FILL' }],
    };
    const results = new Map<string, { nodeId: string; nodeName: string; hash: string }>();
    collectImageFills(asBase(node), results);
    expect(results.size).toBe(0);
  });
});

// ---- Message protocol shape tests ----

describe('Message protocol shapes', () => {
  it('SandboxToUIMessage: images variant has correct shape', () => {
    const payload: ImagePayload = {
      nodeId: 'node-1',
      nodeName: 'My Node',
      bytes: new Uint8Array([0xff, 0xd8]),
      hash: 'abc',
    };
    const msg: SandboxToUIMessage = { type: 'images', images: [payload] };
    expect(msg.type).toBe('images');
    if (msg.type === 'images') {
      expect(msg.images).toHaveLength(1);
      expect(msg.images[0]?.nodeId).toBe('node-1');
    }
  });

  it('SandboxToUIMessage: error variant has correct shape', () => {
    const msg: SandboxToUIMessage = { type: 'error', message: 'something went wrong' };
    expect(msg.type).toBe('error');
    if (msg.type === 'error') {
      expect(msg.message).toBe('something went wrong');
    }
  });

  it('UIToSandboxMessage: replace variant has correct shape', () => {
    const msg: UIToSandboxMessage = {
      type: 'replace',
      nodeId: 'n1',
      bytes: new Uint8Array([1, 2, 3]),
    };
    expect(msg.type).toBe('replace');
    if (msg.type === 'replace') {
      expect(msg.nodeId).toBe('n1');
      expect(msg.bytes).toBeInstanceOf(Uint8Array);
    }
  });

  it('UIToSandboxMessage: export variant has correct shape', () => {
    const msg: UIToSandboxMessage = {
      type: 'export',
      nodeId: 'n2',
      bytes: new Uint8Array([0xde, 0xad]),
    };
    expect(msg.type).toBe('export');
    if (msg.type === 'export') {
      expect(msg.nodeId).toBe('n2');
    }
  });

  it('UIToSandboxMessage: close variant has correct shape', () => {
    const msg: UIToSandboxMessage = { type: 'close' };
    expect(msg.type).toBe('close');
  });
});
