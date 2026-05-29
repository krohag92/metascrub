import { buildOoxmlParser } from './_ooxml.js';

export const pptxParser = buildOoxmlParser({
  format: 'pptx',
  extensions: ['.pptx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  groupPrefix: 'PPTX',
});
