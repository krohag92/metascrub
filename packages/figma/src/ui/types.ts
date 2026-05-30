/**
 * Shared message-protocol types for the Figma plugin.
 * This file is imported by both the sandbox (code.ts) and the UI (main.ts).
 * Keep it free of environment-specific imports.
 */

export type { MetadataResult } from '@metascrub/core';

export interface ImagePayload {
  nodeId: string;
  nodeName: string;
  bytes: Uint8Array;
  hash: string;
}

export type SandboxToUIMessage =
  | { type: 'images'; images: ImagePayload[] }
  | { type: 'error'; message: string };

export type UIToSandboxMessage =
  | { type: 'replace'; nodeId: string; bytes: Uint8Array }
  | { type: 'export'; nodeId: string; bytes: Uint8Array }
  | { type: 'close' };
