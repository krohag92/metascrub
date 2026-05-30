import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveResult {
  savedPath: string;
  canShare: boolean;
}

/**
 * Write scrubbed bytes to the Documents directory and optionally trigger
 * the system share sheet so the user can save/send the cleaned file.
 */
export async function saveScrubbedFile(
  bytes: Uint8Array,
  originalName: string
): Promise<SaveResult> {
  const base64 = uint8ArrayToBase64(bytes);
  const name = scrubFileName(originalName);

  await Filesystem.writeFile({
    path: name,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  const stat = await Filesystem.getUri({
    path: name,
    directory: Directory.Documents,
  });

  return {
    savedPath: stat.uri,
    canShare: true,
  };
}

/** Present the system share sheet for the saved file URI */
export async function shareFile(uri: string, name: string): Promise<void> {
  await Share.share({
    title: `${name} (cleaned by MetaScrub)`,
    text: 'Metadata removed by MetaScrub — metadatafinder.com',
    url: uri,
    dialogTitle: 'Share cleaned file',
  });
}

function scrubFileName(original: string): string {
  const dotIndex = original.lastIndexOf('.');
  if (dotIndex === -1) return `${original}-scrubbed`;
  return `${original.slice(0, dotIndex)}-scrubbed${original.slice(dotIndex)}`;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}
