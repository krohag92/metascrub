import JSZip from 'jszip';

const MIN_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const MIN_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const MIN_DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Hello.</w:t></w:r></w:p></w:body>
</w:document>`;

export interface DocxBuildOpts {
  creator?: string;
  lastModifiedBy?: string;
  title?: string;
  subject?: string;
  description?: string;
  keywords?: string;
  application?: string;
  company?: string;
  manager?: string;
  revision?: number;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCoreXml(opts: DocxBuildOpts): string {
  const tag = (name: string, value?: string): string =>
    value !== undefined ? `<${name}>${xmlEscape(value)}</${name}>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  ${tag('dc:creator', opts.creator)}
  ${tag('cp:lastModifiedBy', opts.lastModifiedBy)}
  ${tag('dc:title', opts.title)}
  ${tag('dc:subject', opts.subject)}
  ${tag('dc:description', opts.description)}
  ${tag('cp:keywords', opts.keywords)}
</cp:coreProperties>`;
}

function buildAppXml(opts: DocxBuildOpts): string {
  const tag = (name: string, value?: string | number): string =>
    value !== undefined ? `<${name}>${xmlEscape(String(value))}</${name}>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  ${tag('Application', opts.application)}
  ${tag('Company', opts.company)}
  ${tag('Manager', opts.manager)}
  ${tag('Revision', opts.revision)}
</Properties>`;
}

export async function makeDocx(opts: DocxBuildOpts = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', MIN_CONTENT_TYPES);
  zip.folder('_rels')?.file('.rels', MIN_RELS);
  zip.folder('word')?.file('document.xml', MIN_DOCUMENT);
  const docProps = zip.folder('docProps');
  docProps?.file('core.xml', buildCoreXml(opts));
  docProps?.file('app.xml', buildAppXml(opts));
  return await zip.generateAsync({ type: 'uint8array' });
}
