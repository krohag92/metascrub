import JSZip from 'jszip';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OoxmlBuildOpts {
  creator?: string;
  lastModifiedBy?: string;
  title?: string;
  subject?: string;
  keywords?: string;
  application?: string;
  company?: string;
  manager?: string;
}

function buildCoreXml(opts: OoxmlBuildOpts): string {
  const tag = (name: string, value?: string): string =>
    value !== undefined ? `<${name}>${xmlEscape(value)}</${name}>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  ${tag('dc:creator', opts.creator)}
  ${tag('cp:lastModifiedBy', opts.lastModifiedBy)}
  ${tag('dc:title', opts.title)}
  ${tag('dc:subject', opts.subject)}
  ${tag('cp:keywords', opts.keywords)}
</cp:coreProperties>`;
}

function buildAppXml(opts: OoxmlBuildOpts): string {
  const tag = (name: string, value?: string): string =>
    value !== undefined ? `<${name}>${xmlEscape(value)}</${name}>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  ${tag('Application', opts.application)}
  ${tag('Company', opts.company)}
  ${tag('Manager', opts.manager)}
</Properties>`;
}

export async function makeXlsx(opts: OoxmlBuildOpts = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
  );
  zip.folder('xl')?.file(
    'workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>`,
  );
  const docProps = zip.folder('docProps');
  docProps?.file('core.xml', buildCoreXml(opts));
  docProps?.file('app.xml', buildAppXml(opts));
  return await zip.generateAsync({ type: 'uint8array' });
}

export async function makePptx(opts: OoxmlBuildOpts = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
  );
  zip.folder('ppt')?.file(
    'presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<presentation xmlns="http://schemas.openxmlformats.org/presentationml/2006/main"/>`,
  );
  const docProps = zip.folder('docProps');
  docProps?.file('core.xml', buildCoreXml(opts));
  docProps?.file('app.xml', buildAppXml(opts));
  return await zip.generateAsync({ type: 'uint8array' });
}

export interface EpubBuildOpts {
  title?: string;
  creator?: string;
  publisher?: string;
  rights?: string;
  language?: string;
}

export async function makeEpub(opts: EpubBuildOpts = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  // EPUB requires mimetype stored uncompressed as first entry
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );
  const tag = (name: string, value?: string): string =>
    value !== undefined ? `<dc:${name}>${value}</dc:${name}>` : '';
  zip.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${tag('title', opts.title)}
    ${tag('creator', opts.creator)}
    ${tag('publisher', opts.publisher)}
    ${tag('rights', opts.rights)}
    ${tag('language', opts.language)}
  </metadata>
  <manifest/>
  <spine/>
</package>`,
  );
  return await zip.generateAsync({ type: 'uint8array' });
}
