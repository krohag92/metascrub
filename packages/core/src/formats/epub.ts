import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { resolveScrub } from '../presets.js';

type JSZipCtor = typeof import('jszip');

async function loadJsZip(): Promise<JSZipCtor> {
  const mod = (await import('jszip')) as unknown as {
    default?: JSZipCtor;
  } & JSZipCtor;
  return mod.default ?? mod;
}

const DC_FIELDS = [
  'title',
  'creator',
  'contributor',
  'publisher',
  'subject',
  'description',
  'date',
  'rights',
  'identifier',
  'language',
  'source',
  'relation',
  'coverage',
  'type',
  'format',
];

const SENSITIVE = new Set(['creator', 'contributor', 'publisher', 'rights']);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

function extractDcTags(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of DC_FIELDS) {
    const re = new RegExp(`<dc:${escapeRegex(f)}[^>]*>([\\s\\S]*?)<\\/dc:${escapeRegex(f)}>`, 'i');
    const m = re.exec(xml);
    if (m && m[1] !== undefined) out[f] = decodeEntities(m[1].trim());
  }
  return out;
}

async function findOpfPath(zip: import('jszip')): Promise<string | null> {
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) return null;
  const m = /<rootfile[^>]*full-path="([^"]+)"/.exec(containerXml);
  return m && m[1] ? m[1] : null;
}

function stripDcTags(xml: string): string {
  let out = xml;
  for (const f of DC_FIELDS) {
    const re = new RegExp(`<dc:${escapeRegex(f)}[^>]*>[\\s\\S]*?<\\/dc:${escapeRegex(f)}>`, 'gi');
    out = out.replace(re, `<dc:${f}></dc:${f}>`);
  }
  // Also strip <meta> elements inside <metadata> that carry custom calibre/sigil data
  out = out.replace(/<meta[^>]*property="dcterms:[^"]+"[^>]*>[\s\S]*?<\/meta>/gi, '');
  out = out.replace(/<meta[^>]*name="calibre:[^"]+"[^>]*\/>/gi, '');
  return out;
}

async function parseEpub(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(bytes);
  const opfPath = await findOpfPath(zip);
  if (!opfPath) return { groups: {} };
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) return { groups: {} };
  const tags = extractDcTags(opfXml);
  const arr: MetadataField[] = Object.entries(tags).map(([k, v]) => ({
    key: k,
    value: v,
    sensitive: SENSITIVE.has(k),
  }));
  return arr.length ? { groups: { 'EPUB.meta': arr } } : { groups: {} };
}

async function scrubEpub(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(bytes);
  const opfPath = await findOpfPath(zip);

  const wipe =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical';

  if (opfPath && wipe) {
    const opfXml = (await zip.file(opfPath)?.async('string')) ?? '';
    zip.file(opfPath, stripDcTags(opfXml));
  } else if (opfPath && resolved.preset === 'custom') {
    const hasRemoval = resolved.remove.some(
      (p) => p === 'EPUB.meta.*' || p.startsWith('EPUB.meta.'),
    );
    if (hasRemoval) {
      const opfXml = (await zip.file(opfPath)?.async('string')) ?? '';
      zip.file(opfPath, stripDcTags(opfXml));
    }
  }

  return await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export const epubParser: FormatParser = {
  format: 'epub',
  extensions: ['.epub'],
  mimeTypes: ['application/epub+zip'],
  matches: (b) => b[0] === 0x50 && b[1] === 0x4b,
  parse: parseEpub,
  scrub: scrubEpub,
};
