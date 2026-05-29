import { buildOoxmlParser } from './_ooxml.js';

export const docxParser = buildOoxmlParser({
  format: 'docx',
  extensions: ['.docx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  groupPrefix: 'DOCX',
});
