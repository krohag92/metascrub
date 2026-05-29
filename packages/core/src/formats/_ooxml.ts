import type { FileFormat, FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { resolveScrub } from '../presets.js';

type JSZipCtor = typeof import('jszip');

async function loadJsZip(): Promise<JSZipCtor> {
  const mod = (await import('jszip')) as unknown as {
    default?: JSZipCtor;
  } & JSZipCtor;
  return mod.default ?? mod;
}

const CORE_FIELDS = [
  'creator',
  'lastModifiedBy',
  'title',
  'subject',
  'description',
  'keywords',
  'category',
  'contentStatus',
  'language',
  'created',
  'modified',
  'revision',
  'version',
];

const APP_FIELDS = [
  'Application',
  'AppVersion',
  'Company',
  'Manager',
  'Template',
  'TotalTime',
  'Pages',
  'Words',
  'Characters',
  'CharactersWithSpaces',
  'Lines',
  'Paragraphs',
  'Revision',
];

const CORE_SENSITIVE = new Set(['creator', 'lastModifiedBy', 'title', 'subject', 'keywords']);
const APP_SENSITIVE = new Set(['Company', 'Manager']);

const EMPTY_CORE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator></dc:creator>
  <cp:lastModifiedBy></cp:lastModifiedBy>
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:description></dc:description>
  <cp:keywords></cp:keywords>
</cp:coreProperties>`;

const EMPTY_APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application></Application>
  <Company></Company>
  <Manager></Manager>
</Properties>`;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

function extractTags(xml: string, fields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const re = new RegExp(
      `<(?:\\w+:)?${escapeRegex(f)}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escapeRegex(f)}>`,
      'i',
    );
    const m = re.exec(xml);
    if (m && m[1] !== undefined) out[f] = decodeXmlEntities(m[1].trim());
  }
  return out;
}

export interface OoxmlOpts {
  format: FileFormat;
  extensions: string[];
  mimeTypes: string[];
  /** Group label prefix; defaults to "DOCX". */
  groupPrefix: string;
}

export function buildOoxmlParser(opts: OoxmlOpts): FormatParser {
  const coreGroup = `${opts.groupPrefix}.core`;
  const appGroup = `${opts.groupPrefix}.app`;

  async function parseFile(
    bytes: Uint8Array,
  ): Promise<{ groups: Record<string, MetadataField[]> }> {
    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(bytes);
    const groups: Record<string, MetadataField[]> = {};

    const coreXml = (await zip.file('docProps/core.xml')?.async('string')) ?? null;
    const appXml = (await zip.file('docProps/app.xml')?.async('string')) ?? null;

    if (coreXml) {
      const fields = extractTags(coreXml, CORE_FIELDS);
      const arr: MetadataField[] = Object.entries(fields).map(([k, v]) => ({
        key: k,
        value: v,
        sensitive: CORE_SENSITIVE.has(k),
      }));
      if (arr.length) groups[coreGroup] = arr;
    }
    if (appXml) {
      const fields = extractTags(appXml, APP_FIELDS);
      const arr: MetadataField[] = Object.entries(fields).map(([k, v]) => {
        const field: MetadataField = { key: k, value: v };
        if (APP_SENSITIVE.has(k)) field.sensitive = true;
        return field;
      });
      if (arr.length) groups[appGroup] = arr;
    }

    return { groups };
  }

  async function scrubFile(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
    const resolved = resolveScrub(options);
    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(bytes);

    const wipe =
      resolved.preset === 'all' ||
      resolved.preset === 'personal-only' ||
      resolved.preset === 'keep-technical';

    if (wipe) {
      if (zip.file('docProps/core.xml')) zip.file('docProps/core.xml', EMPTY_CORE_XML);
      if (zip.file('docProps/app.xml')) zip.file('docProps/app.xml', EMPTY_APP_XML);
      if (resolved.preset === 'all' && zip.file('docProps/custom.xml')) {
        zip.remove('docProps/custom.xml');
      }
    } else if (resolved.preset === 'custom') {
      const wipeCore = resolved.remove.some(
        (p) => p === `${opts.groupPrefix}.core.*` || p.startsWith(`${opts.groupPrefix}.core.`),
      );
      const wipeApp = resolved.remove.some(
        (p) => p === `${opts.groupPrefix}.app.*` || p.startsWith(`${opts.groupPrefix}.app.`),
      );
      if (wipeCore && zip.file('docProps/core.xml')) zip.file('docProps/core.xml', EMPTY_CORE_XML);
      if (wipeApp && zip.file('docProps/app.xml')) zip.file('docProps/app.xml', EMPTY_APP_XML);
    }

    return await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  return {
    format: opts.format,
    extensions: opts.extensions,
    mimeTypes: opts.mimeTypes,
    matches: (b) => b[0] === 0x50 && b[1] === 0x4b,
    parse: parseFile,
    scrub: scrubFile,
  };
}
