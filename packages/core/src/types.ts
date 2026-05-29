export type FileInput =
  | { kind: 'bytes'; data: Uint8Array; filename?: string }
  | { kind: 'path'; path: string };

export type FileFormat =
  | 'jpeg'
  | 'png'
  | 'heic'
  | 'webp'
  | 'avif'
  | 'tiff'
  | 'raw-cr2'
  | 'raw-nef'
  | 'raw-arw'
  | 'raw-dng'
  | 'mp4'
  | 'mov'
  | 'mkv'
  | 'webm'
  | 'mp3'
  | 'flac'
  | 'm4a'
  | 'ogg'
  | 'wav'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'epub'
  | 'svg';

export type MetadataValue = string | number | boolean | null;

export type MetadataField = {
  key: string;
  label?: string;
  value: MetadataValue;
  raw?: unknown;
  sensitive?: boolean;
};

export type MetadataHighlights = {
  gps?: { lat: number; lon: number; alt?: number };
  capturedAt?: string;
  device?: { make?: string; model?: string; serial?: string };
  software?: string;
  author?: string;
  lastModifiedBy?: string;
  revisionHistory?: number;
};

export type MetadataResult = {
  format: FileFormat;
  filename?: string;
  sizeBytes: number;
  groups: Record<string, MetadataField[]>;
  highlights: MetadataHighlights;
  warnings: string[];
};

export type ScrubPreset =
  | 'all'
  | 'gps-only'
  | 'personal-only'
  | 'keep-technical'
  | 'custom';

export type ScrubOptions = {
  preset?: ScrubPreset;
  keep?: string[];
  remove?: string[];
};

export type MetadataDiff = {
  onlyInA: MetadataField[];
  onlyInB: MetadataField[];
  changed: { a: MetadataField; b: MetadataField }[];
};

export type FormatParser = {
  format: FileFormat;
  extensions: string[];
  mimeTypes: string[];
  /** Magic-number test on the first ~64 bytes of the file. */
  matches: (bytes: Uint8Array) => boolean;
  parse: (bytes: Uint8Array) => Promise<{
    groups: Record<string, MetadataField[]>;
  }>;
  scrub: (bytes: Uint8Array, options: ScrubOptions) => Promise<Uint8Array>;
};

export type MetaScrubErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPT_FILE'
  | 'PARSE_ERROR'
  | 'SCRUB_ERROR';

export class MetaScrubError extends Error {
  code: MetaScrubErrorCode;
  format?: FileFormat;
  override cause?: unknown;

  constructor(
    code: MetaScrubErrorCode,
    message: string,
    opts: { format?: FileFormat; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'MetaScrubError';
    this.code = code;
    if (opts.format) this.format = opts.format;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }
}
