import { Filesystem, Directory } from '@capacitor/filesystem';

export interface PickedFile {
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  data: Uint8Array;
}

/**
 * Present the system file picker and return the chosen file as bytes.
 * On iOS/Android this surfaces the native document picker.
 * In the browser (dev mode) falls back to an <input type="file"> dialog.
 */
export async function pickFile(): Promise<PickedFile | null> {
  // In Capacitor, use Filesystem.pickFiles when available (Capacitor 5+)
  // Gracefully fall back to browser File input if running in web/dev mode.
  if (typeof (window as unknown as Record<string, unknown>)['Capacitor'] !== 'undefined') {
    return pickFileNative();
  }
  return pickFileWeb();
}

async function pickFileNative(): Promise<PickedFile | null> {
  try {
    // Filesystem.pickFiles is available via @capacitor/filesystem >= 5.1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filesystemAny = Filesystem as any;
    if (typeof filesystemAny.pickFiles !== 'function') {
      // Older Capacitor: fall back to web picker
      return pickFileWeb();
    }
    const result = await filesystemAny.pickFiles({
      multiple: false,
      readData: true,
    });

    const file = result?.files?.[0];
    if (!file) return null;

    const bytes = base64ToUint8Array(file.data as string);
    return {
      name: file.name as string,
      path: file.path as string ?? '',
      mimeType: file.mimeType as string ?? 'application/octet-stream',
      sizeBytes: bytes.byteLength,
      data: bytes,
    };
  } catch {
    return null;
  }
}

async function pickFileWeb(): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = [
      'image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/avif',
      'image/tiff', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
      'audio/mpeg', 'audio/flac', 'audio/mp4', 'audio/ogg', 'audio/wav',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/epub+zip',
    ].join(',');

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const arrayBuffer = await file.arrayBuffer();
      resolve({
        name: file.name,
        path: '',
        mimeType: file.type,
        sizeBytes: file.size,
        data: new Uint8Array(arrayBuffer),
      });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Read a file from the Capacitor filesystem by path */
export async function readFileByPath(path: string): Promise<PickedFile | null> {
  try {
    // readFile with no encoding returns raw base64; prefer that for binary data
    const resultNoEnc = await Filesystem.readFile({ path });
    const bytes = base64ToUint8Array(resultNoEnc.data as string);
    const name = path.split('/').pop() ?? path;

    return {
      name,
      path,
      mimeType: guessMimeType(name),
      sizeBytes: bytes.byteLength,
      data: bytes,
    };
  } catch {
    // If path-based read fails, try app group container path directly
    try {
      const resultNoEnc = await Filesystem.readFile({ path, directory: Directory.Data });
      const bytes = base64ToUint8Array(resultNoEnc.data as string);
      const name = path.split('/').pop() ?? path;
      return {
        name,
        path,
        mimeType: guessMimeType(name),
        sizeBytes: bytes.byteLength,
        data: bytes,
      };
    } catch {
      return null;
    }
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  heic: 'image/heic', webp: 'image/webp', avif: 'image/avif',
  tiff: 'image/tiff', tif: 'image/tiff', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska',
  webm: 'video/webm', mp3: 'audio/mpeg', flac: 'audio/flac',
  m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  epub: 'application/epub+zip',
};

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'application/octet-stream';
}
