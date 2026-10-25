import { formatBytes } from './exif-format';
import type { ImageFacts } from './inspect';
import { isHttpUrl, poweredByUrl, type UtmSource } from './utm';

export interface OverlayModel {
  imageUrl: string;
  alt: string | null;
  title: string | null;
  displayedWidth: number | null;
  displayedHeight: number | null;
  facts: ImageFacts | null;
  errorMessage: string | null;
  utmSource: UtmSource;
}

const DRAG_FLAG = 'imvDragBound';

export function renderOverlay(
  doc: Document,
  model: OverlayModel,
  onClose?: () => void,
): HTMLElement {
  const root = doc.createElement('div');
  root.id = 'image-metadata-viewer-overlay';
  root.className = 'image-metadata-viewer-overlay';
  root.style.position = 'fixed';
  root.style.zIndex = '2147483647';
  root.style.background = '#ffffff';
  root.style.color = '#0f172a';

  const header = doc.createElement('div');
  header.className = 'header';
  const heading = doc.createElement('h3');
  heading.textContent = 'Image Metadata';
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'close-button';
  close.setAttribute('aria-label', 'Close metadata');
  close.textContent = '×';
  header.append(heading, close);

  const content = doc.createElement('div');
  content.className = 'content';
  const table = doc.createElement('table');
  table.append(
    row(doc, 'Source URL', linkOrText(doc, model.imageUrl)),
    row(doc, 'Alt Text', text(doc, model.alt || 'N/A')),
    row(doc, 'Title Text', text(doc, model.title || 'N/A')),
    row(
      doc,
      'Displayed Dimensions',
      text(doc, dimensions(model.displayedWidth, model.displayedHeight)),
    ),
    row(
      doc,
      'Natural Dimensions',
      text(doc, dimensions(model.facts?.naturalWidth ?? null, model.facts?.naturalHeight ?? null)),
    ),
    row(
      doc,
      'File Size',
      text(doc, model.facts ? formatBytes(model.facts.byteLength) : unavailable(model)),
    ),
    row(doc, 'MIME Type', text(doc, model.facts?.mimeType || unavailable(model))),
  );

  const exif = doc.createElement('div');
  exif.className = 'exif-data';
  const exifHeading = doc.createElement('h4');
  exifHeading.textContent = 'EXIF Data';
  exif.append(exifHeading);
  if (model.errorMessage && !model.facts) {
    const note = doc.createElement('p');
    note.textContent = model.errorMessage;
    exif.append(note);
  } else if (!model.facts || model.facts.exif.length === 0) {
    const note = doc.createElement('p');
    note.textContent = model.errorMessage ?? 'No EXIF data found.';
    exif.append(note);
  } else {
    const exifTable = doc.createElement('table');
    for (const item of model.facts.exif) {
      exifTable.append(row(doc, item.label, text(doc, item.value)));
    }
    exif.append(exifTable);
  }

  const powered = doc.createElement('div');
  powered.className = 'powered-by';
  powered.append('Powered by ');
  const poweredLink = doc.createElement('a');
  const href = poweredByUrl(model.utmSource);
  poweredLink.href = href;
  poweredLink.target = '_blank';
  poweredLink.rel = 'noopener noreferrer';
  poweredLink.textContent = 'MetadataFinder.com';
  powered.append(poweredLink);

  content.append(table, exif, powered);
  root.append(header, content);

  close.addEventListener('click', () => {
    root.remove();
    onClose?.();
  });

  return root;
}

export function bindDrag(doc: Document, getRoot: () => HTMLElement | null): void {
  const flagHost = doc.documentElement;
  if (flagHost.dataset[DRAG_FLAG] === '1') return;
  flagHost.dataset[DRAG_FLAG] = '1';

  let drag: { dx: number; dy: number } | null = null;

  doc.addEventListener('mousedown', (event) => {
    const root = getRoot();
    if (!root) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!root.contains(target) || !target.closest('.header') || target.closest('button')) return;
    const rect = root.getBoundingClientRect();
    drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    root.style.right = 'auto';
    root.style.cursor = 'grabbing';
  });

  doc.addEventListener('mousemove', (event) => {
    const root = getRoot();
    if (!drag || !root) return;
    root.style.left = `${event.clientX - drag.dx}px`;
    root.style.top = `${event.clientY - drag.dy}px`;
  });

  doc.addEventListener('mouseup', () => {
    const root = getRoot();
    drag = null;
    if (root) root.style.cursor = 'grab';
  });
}

function unavailable(model: OverlayModel): string {
  return model.errorMessage ?? 'Not available';
}

function dimensions(width: number | null, height: number | null): string {
  if (width == null || height == null) return 'Not available';
  return `${width}px × ${height}px`;
}

function row(doc: Document, label: string, value: Node): HTMLTableRowElement {
  const tr = doc.createElement('tr');
  const th = doc.createElement('td');
  const strong = doc.createElement('strong');
  strong.textContent = `${label}:`;
  th.append(strong);
  const td = doc.createElement('td');
  td.append(value);
  tr.append(th, td);
  return tr;
}

function text(doc: Document, value: string): Text {
  return doc.createTextNode(value);
}

function linkOrText(doc: Document, value: string): Node {
  const href = isHttpUrl(value);
  if (!href) return doc.createTextNode(value || 'N/A');
  const link = doc.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = href.length > 64 ? `${href.slice(0, 61)}…` : href;
  link.title = href;
  return link;
}
