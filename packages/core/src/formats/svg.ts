import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { resolveScrub } from '../presets.js';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

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

const DC_FIELDS = [
  'title',
  'creator',
  'contributor',
  'description',
  'rights',
  'date',
  'publisher',
  'subject',
  'source',
];

const SENSITIVE = new Set(['creator', 'contributor', 'rights']);

function extractMetadata(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const m = /<metadata\b[^>]*>([\s\S]*?)<\/metadata>/i.exec(xml);
  const inside = m && m[1] !== undefined ? m[1] : xml;
  for (const f of DC_FIELDS) {
    const re = new RegExp(
      `<(?:\\w+:)?${escapeRegex(f)}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escapeRegex(f)}>`,
      'i',
    );
    const match = re.exec(inside);
    if (match && match[1] !== undefined)
      out[f] = decodeEntities(match[1].replace(/<[^>]+>/g, '').trim());
  }
  // Inkscape custom metadata
  const sodipodi = /sodipodi:docname="([^"]*)"/.exec(xml);
  if (sodipodi && sodipodi[1]) out['docname'] = sodipodi[1];
  const inkscape = /inkscape:version="([^"]*)"/.exec(xml);
  if (inkscape && inkscape[1]) out['editor'] = inkscape[1];
  return out;
}

async function parseSvg(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const xml = dec.decode(bytes);
  const meta = extractMetadata(xml);
  const arr: MetadataField[] = Object.entries(meta).map(([k, v]) => ({
    key: k,
    value: v,
    sensitive: SENSITIVE.has(k),
  }));
  // Also surface any embedded XML comments as potentially-sensitive notes.
  const comments: string[] = [];
  const re = /<!--([\s\S]*?)-->/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1]) comments.push(m[1].trim());
  }
  const groups: Record<string, MetadataField[]> = {};
  if (arr.length) groups['SVG.metadata'] = arr;
  if (comments.length) {
    groups['SVG.comments'] = comments.map((c, i) => ({
      key: `comment_${i + 1}`,
      value: c,
    }));
  }
  return { groups };
}

async function scrubSvg(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  let xml = dec.decode(bytes);
  const wipe =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical';

  if (wipe) {
    // Remove entire <metadata> block
    xml = xml.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>\s*/gi, '');
    // Remove inkscape/sodipodi attributes
    xml = xml.replace(/\s+inkscape:[a-zA-Z-]+="[^"]*"/g, '');
    xml = xml.replace(/\s+sodipodi:[a-zA-Z-]+="[^"]*"/g, '');
    if (resolved.preset === 'all' || resolved.preset === 'personal-only') {
      // Strip comments
      xml = xml.replace(/<!--[\s\S]*?-->/g, '');
      // Strip <title> and <desc> (top-level — may leak author intent)
      if (resolved.preset === 'all') {
        xml = xml.replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '');
        xml = xml.replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, '');
      }
    }
  } else if (resolved.preset === 'custom') {
    const wipeMeta = resolved.remove.some(
      (p) => p === 'SVG.metadata.*' || p.startsWith('SVG.metadata.'),
    );
    if (wipeMeta) {
      xml = xml.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>\s*/gi, '');
    }
  }

  return enc.encode(xml);
}

export const svgParser: FormatParser = {
  format: 'svg',
  extensions: ['.svg'],
  mimeTypes: ['image/svg+xml'],
  matches: (b) => {
    // SVG is text — use first few bytes
    let i = 0;
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) i = 3;
    if (b[i] === 0x3c && b[i + 1] === 0x73 && b[i + 2] === 0x76 && b[i + 3] === 0x67) {
      return true;
    }
    // tolerant: look for "<svg" in the first 1KB
    const head = dec.decode(b.subarray(i, Math.min(b.length, 1024)));
    return /<svg[\s>]/i.test(head);
  },
  parse: parseSvg,
  scrub: scrubSvg,
};
