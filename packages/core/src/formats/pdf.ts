import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';

const SENSITIVE_INFO_KEYS = new Set([
  'Author',
  'Creator',
  'Producer',
  'Title',
  'Subject',
  'Keywords',
]);

async function loadPdfLib(): Promise<typeof import('pdf-lib')> {
  return await import('pdf-lib');
}

async function parsePdf(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });
  const groups: Record<string, MetadataField[]> = {};
  const info: MetadataField[] = [];

  const tryGet = (name: string, fn: () => string | undefined): void => {
    try {
      const v = fn();
      if (v && String(v).trim() !== '') {
        info.push({
          key: name,
          value: String(v),
          sensitive: SENSITIVE_INFO_KEYS.has(name),
        });
      }
    } catch {
      // ignore
    }
  };

  tryGet('Title', () => doc.getTitle());
  tryGet('Author', () => doc.getAuthor());
  tryGet('Subject', () => doc.getSubject());
  tryGet('Keywords', () =>
    doc.getKeywords() !== undefined ? String(doc.getKeywords()) : undefined,
  );
  tryGet('Creator', () => doc.getCreator());
  tryGet('Producer', () => doc.getProducer());

  try {
    const created = doc.getCreationDate();
    if (created) info.push({ key: 'CreationDate', value: created.toISOString() });
  } catch {
    // ignore
  }
  try {
    const modified = doc.getModificationDate();
    if (modified) info.push({ key: 'ModDate', value: modified.toISOString() });
  } catch {
    // ignore
  }

  if (info.length) groups['PDF.Info'] = info;

  // Page count as a non-sensitive metric.
  try {
    groups['PDF'] = [{ key: 'PageCount', value: doc.getPageCount() }];
  } catch {
    // ignore
  }

  return { groups };
}

async function scrubPdf(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const { PDFDocument, PDFName } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  if (
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical'
  ) {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setCreator('');
    doc.setProducer('');
    if (resolved.preset !== 'keep-technical') {
      // Wipe dates too.
      doc.setCreationDate(new Date(0));
      doc.setModificationDate(new Date(0));
    }
    // Strip XMP metadata stream.
    try {
      const catalog = doc.catalog;
      catalog.delete(PDFName.of('Metadata'));
    } catch {
      // ignore
    }
  } else if (resolved.preset === 'gps-only') {
    // PDFs rarely carry geo metadata in Info — no-op.
  } else if (resolved.preset === 'custom') {
    const should = (k: string): boolean =>
      resolved.remove.includes(`PDF.Info.${k}`) ||
      resolved.remove.includes('PDF.Info.*') ||
      resolved.remove.includes('PDF.*');
    if (should('Title')) doc.setTitle('');
    if (should('Author')) doc.setAuthor('');
    if (should('Subject')) doc.setSubject('');
    if (should('Keywords')) doc.setKeywords([]);
    if (should('Creator')) doc.setCreator('');
    if (should('Producer')) doc.setProducer('');
  }

  const saved = await doc.save({ useObjectStreams: false });
  return new Uint8Array(saved);
}

export const pdfParser: FormatParser = {
  format: 'pdf',
  extensions: ['.pdf'],
  mimeTypes: ['application/pdf'],
  matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  parse: parsePdf,
  scrub: scrubPdf,
};
