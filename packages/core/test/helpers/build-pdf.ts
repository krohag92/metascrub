import { PDFDocument } from 'pdf-lib';

export interface PdfBuildOpts {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export async function makePdf(opts: PdfBuildOpts = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  if (opts.title !== undefined) doc.setTitle(opts.title);
  if (opts.author !== undefined) doc.setAuthor(opts.author);
  if (opts.subject !== undefined) doc.setSubject(opts.subject);
  if (opts.keywords !== undefined) doc.setKeywords(opts.keywords);
  if (opts.creator !== undefined) doc.setCreator(opts.creator);
  if (opts.producer !== undefined) doc.setProducer(opts.producer);
  if (opts.creationDate !== undefined) doc.setCreationDate(opts.creationDate);
  if (opts.modificationDate !== undefined) doc.setModificationDate(opts.modificationDate);
  const bytes = await doc.save({ useObjectStreams: false });
  return new Uint8Array(bytes);
}
