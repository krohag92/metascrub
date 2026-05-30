/**
 * Pure logic shared between the sandbox entry point and tests.
 * This file has NO top-level side effects and does NOT reference the `figma` global.
 */

import type { ImagePayload } from './ui/types.js';

export type { ImagePayload };

/** Recursively walk all nodes in a subtree and collect unique image hashes. */
export function collectImageFills(
  node: BaseNode,
  results: Map<string, { nodeId: string; nodeName: string; hash: string }>,
): void {
  // Only nodes with fills can have image fills
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.type === 'IMAGE' && fill.imageHash !== null && fill.imageHash !== undefined) {
          // Use hash as key so we don't duplicate identical images
          if (!results.has(fill.imageHash)) {
            results.set(fill.imageHash, {
              nodeId: node.id,
              nodeName: node.name,
              hash: fill.imageHash,
            });
          }
        }
      }
    }
  }

  // Recurse into children
  if ('children' in node) {
    const parent = node as ChildrenMixin;
    for (const child of parent.children) {
      collectImageFills(child, results);
    }
  }
}
