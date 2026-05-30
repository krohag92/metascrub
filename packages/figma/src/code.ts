/**
 * MetaScrub Figma Plugin — Sandbox (main thread) code.
 *
 * Runs in the Figma plugin sandbox. Has access to the Figma API but NOT to DOM
 * or browser APIs. All metadata parsing happens in the UI thread.
 *
 * Message protocol:
 *   Sandbox → UI:  { type: 'images', images: ImagePayload[] }
 *   Sandbox → UI:  { type: 'error', message: string }
 *   UI → Sandbox:  { type: 'replace', nodeId: string, bytes: Uint8Array }
 *   UI → Sandbox:  { type: 'export', nodeId: string, bytes: Uint8Array }
 *   UI → Sandbox:  { type: 'close' }
 */

import { collectImageFills } from './lib.js';
import type { ImagePayload, SandboxToUIMessage, UIToSandboxMessage } from './ui/types.js';

export type { ImagePayload, SandboxToUIMessage, UIToSandboxMessage };

/** Fetch bytes for all unique image hashes found on the current page. */
async function gatherPageImages(): Promise<ImagePayload[]> {
  const page = figma.currentPage;
  const imageMap = new Map<string, { nodeId: string; nodeName: string; hash: string }>();

  collectImageFills(page, imageMap);

  const payloads: ImagePayload[] = [];

  for (const [hash, info] of imageMap) {
    const image = figma.getImageByHash(hash);
    if (image) {
      try {
        const bytes = await image.getBytesAsync();
        payloads.push({
          nodeId: info.nodeId,
          nodeName: info.nodeName,
          bytes: new Uint8Array(bytes),
          hash,
        });
      } catch {
        // Skip images that fail to load bytes — surface as warning later if needed
      }
    }
  }

  return payloads;
}

/** Replace a node's image fill with new (scrubbed) bytes. */
async function replaceNodeImage(nodeId: string, bytes: Uint8Array): Promise<void> {
  const node = figma.getNodeById(nodeId);
  if (!node || !('fills' in node)) return;

  const newImage = figma.createImage(bytes);
  const fills = (node as GeometryMixin).fills;
  if (!Array.isArray(fills)) return;

  const updatedFills = fills.map((fill) => {
    if (fill.type === 'IMAGE') {
      return { ...fill, imageHash: newImage.hash };
    }
    return fill;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).fills = updatedFills;
}

// ---- Main entry point ----

figma.showUI(__html__, { width: 480, height: 600, title: 'MetaScrub' });

// Gather images and send to UI
gatherPageImages()
  .then((images) => {
    const msg: SandboxToUIMessage = { type: 'images', images };
    figma.ui.postMessage(msg);
  })
  .catch((err: unknown) => {
    const msg: SandboxToUIMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    figma.ui.postMessage(msg);
  });

// Handle messages from UI
figma.ui.onmessage = async (raw: unknown) => {
  const msg = raw as UIToSandboxMessage;

  if (msg.type === 'replace') {
    await replaceNodeImage(msg.nodeId, msg.bytes);
    figma.notify('Image metadata scrubbed successfully.');
  } else if (msg.type === 'export') {
    // The UI handles the download via blob URL; nothing for sandbox to do here
    // except notify.
    figma.notify('Image exported without metadata.');
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};
