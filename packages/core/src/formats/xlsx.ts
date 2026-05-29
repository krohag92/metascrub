import { buildOoxmlParser } from './_ooxml.js';

export const xlsxParser = buildOoxmlParser({
  format: 'xlsx',
  extensions: ['.xlsx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  groupPrefix: 'XLSX',
});
