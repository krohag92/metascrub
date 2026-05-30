/**
 * MetaScrub Figma Plugin — UI thread code.
 *
 * Runs inside an iframe in Figma. Has DOM access but no Figma API.
 * Receives image bytes from the sandbox, calls @metascrub/core to parse/scrub,
 * and renders results.
 *
 * No network calls are made. All processing is local.
 */

import { parse, scrub } from '@metascrub/core';
import type {
  MetadataResult,
  SandboxToUIMessage,
  UIToSandboxMessage,
  ImagePayload,
} from './types.js';

// Re-export message types so the build can reference them
export type { SandboxToUIMessage, UIToSandboxMessage };

interface ImageState {
  payload: ImagePayload;
  result: MetadataResult | null;
  error: string | null;
  scrubbed: boolean;
}

const imageStates = new Map<string, ImageState>();

// ---- DOM helpers ----

function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const contentEl = getEl<HTMLDivElement>('content');
const statusEl = getEl<HTMLDivElement>('status');
const scrubAllBtn = getEl<HTMLButtonElement>('scrubAllBtn');
const exportToggle = getEl<HTMLInputElement>('exportToggle');

function setStatus(msg: string): void {
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
}

function clearStatus(): void {
  statusEl.style.display = 'none';
}

// ---- Rendering ----

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function renderCard(state: ImageState): HTMLElement {
  const { payload, result, error } = state;

  const card = document.createElement('div');
  card.className = 'image-card';
  card.dataset['nodeId'] = payload.nodeId;

  // Header
  const header = document.createElement('div');
  header.className = 'image-card-header';

  // Thumbnail
  const thumb = document.createElement('img');
  thumb.className = 'image-thumb';
  const blob = new Blob([payload.bytes.buffer as ArrayBuffer]);
  thumb.src = URL.createObjectURL(blob);
  thumb.alt = payload.nodeName;
  thumb.onerror = () => {
    const placeholder = document.createElement('div');
    placeholder.className = 'image-thumb-placeholder';
    thumb.replaceWith(placeholder);
  };
  header.appendChild(thumb);

  // Title area
  const titleDiv = document.createElement('div');
  titleDiv.className = 'image-card-title';
  const nameEl = document.createElement('strong');
  nameEl.textContent = payload.nodeName;
  const sizeEl = document.createElement('span');
  sizeEl.textContent = `${(payload.bytes.length / 1024).toFixed(1)} KB`;
  titleDiv.appendChild(nameEl);
  titleDiv.appendChild(sizeEl);
  header.appendChild(titleDiv);

  // Action buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'image-card-actions';

  const scrubBtn = document.createElement('button');
  scrubBtn.className = 'btn-primary';
  scrubBtn.textContent = 'Scrub';
  scrubBtn.dataset['nodeId'] = payload.nodeId;
  scrubBtn.addEventListener('click', () => void handleScrub(payload.nodeId));
  actionsDiv.appendChild(scrubBtn);

  header.appendChild(actionsDiv);
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'image-card-body';

  if (error) {
    const errEl = document.createElement('div');
    errEl.style.color = 'var(--color-danger)';
    errEl.style.fontSize = '11px';
    errEl.textContent = `Parse error: ${error}`;
    body.appendChild(errEl);
  } else if (!result) {
    const loadEl = document.createElement('div');
    loadEl.style.color = 'var(--color-text-muted)';
    loadEl.style.fontSize = '11px';
    loadEl.textContent = 'Parsing…';
    body.appendChild(loadEl);
  } else if (result.warnings.length === 0) {
    const okEl = document.createElement('div');
    okEl.className = 'no-meta';
    okEl.textContent = 'No sensitive metadata found.';
    body.appendChild(okEl);
  } else {
    // Warning badges
    for (const warning of result.warnings) {
      const badge = document.createElement('div');
      badge.className = 'warning-badge';
      badge.textContent = `! ${warning}`;
      body.appendChild(badge);
    }

    // Highlights table (Author, GPS, Software)
    const hl = result.highlights;
    const rows: Array<[string, string]> = [];
    if (hl.author) rows.push(['Author', hl.author]);
    if (hl.gps) {
      rows.push(['GPS', `${hl.gps.lat.toFixed(5)}, ${hl.gps.lon.toFixed(5)}`]);
    }
    if (hl.software) rows.push(['Software', hl.software]);
    if (hl.device?.make ?? hl.device?.model) {
      rows.push(['Device', [hl.device?.make, hl.device?.model].filter(Boolean).join(' ')]);
    }
    if (hl.capturedAt) rows.push(['Captured', hl.capturedAt]);

    if (rows.length > 0) {
      const table = document.createElement('table');
      table.className = 'meta-table';
      for (const [k, v] of rows) {
        const tr = document.createElement('tr');
        const sensitive = k === 'GPS' || k === 'Author';
        if (sensitive) tr.className = 'sensitive-row';
        tr.innerHTML = `<td>${k}</td><td>${formatValue(v)}</td>`;
        table.appendChild(tr);
      }
      body.appendChild(table);
    }

    // Full groups (collapsible-style, flat for simplicity)
    const groupsDiv = document.createElement('div');
    groupsDiv.className = 'meta-groups';
    for (const [groupName, fields] of Object.entries(result.groups)) {
      if (fields.length === 0) continue;
      const groupLabel = document.createElement('div');
      groupLabel.className = 'meta-group-label';
      groupLabel.textContent = groupName;
      groupsDiv.appendChild(groupLabel);

      const table = document.createElement('table');
      table.className = 'meta-table';
      for (const field of fields) {
        const tr = document.createElement('tr');
        if (field.sensitive) tr.className = 'sensitive-row';
        tr.innerHTML = `<td>${field.label ?? field.key}</td><td>${formatValue(field.value)}</td>`;
        table.appendChild(tr);
      }
      groupsDiv.appendChild(table);
    }
    body.appendChild(groupsDiv);
  }

  if (state.scrubbed) {
    const doneEl = document.createElement('div');
    doneEl.style.marginTop = '6px';
    doneEl.style.color = 'var(--color-success)';
    doneEl.style.fontSize = '11px';
    doneEl.textContent = 'Metadata scrubbed.';
    body.appendChild(doneEl);
    scrubBtn.disabled = true;
    scrubBtn.textContent = 'Done';
  }

  card.appendChild(body);
  return card;
}

function renderAll(): void {
  // Remove existing cards
  const existing = contentEl.querySelectorAll('.image-card');
  existing.forEach((el) => el.remove());

  if (imageStates.size === 0) {
    setStatus('No images with fills found on this page.');
    scrubAllBtn.disabled = true;
    return;
  }

  clearStatus();
  const allScrubbed = Array.from(imageStates.values()).every((s) => s.scrubbed);
  scrubAllBtn.disabled = allScrubbed;

  for (const state of imageStates.values()) {
    contentEl.appendChild(renderCard(state));
  }
}

// ---- Scrub logic ----

async function handleScrub(nodeId: string): Promise<void> {
  const state = imageStates.get(nodeId);
  if (!state) return;

  try {
    const scrubbed = await scrub(
      { kind: 'bytes', data: state.payload.bytes, filename: state.payload.nodeName },
      { preset: 'all' },
    );

    const exportOnly = exportToggle.checked;
    const msg: UIToSandboxMessage = exportOnly
      ? { type: 'export', nodeId, bytes: scrubbed }
      : { type: 'replace', nodeId, bytes: scrubbed };

    parent.postMessage({ pluginMessage: msg }, '*');

    if (exportOnly) {
      // Trigger download in the UI iframe
      const blob = new Blob([scrubbed.buffer as ArrayBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.payload.nodeName.replace(/\s+/g, '_')}_scrubbed`;
      a.click();
      URL.revokeObjectURL(url);
    }

    state.scrubbed = true;
    renderAll();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errEl = document.createElement('div');
    errEl.style.color = 'var(--color-danger)';
    errEl.style.fontSize = '11px';
    errEl.textContent = `Scrub failed: ${errMsg}`;
    const card = contentEl.querySelector(`[data-node-id="${nodeId}"]`);
    card?.querySelector('.image-card-body')?.appendChild(errEl);
  }
}

async function handleScrubAll(): Promise<void> {
  scrubAllBtn.disabled = true;
  for (const nodeId of imageStates.keys()) {
    const state = imageStates.get(nodeId);
    if (state && !state.scrubbed) {
      await handleScrub(nodeId);
    }
  }
}

scrubAllBtn.addEventListener('click', () => void handleScrubAll());

// ---- Message handling ----

async function processImages(images: ImagePayload[]): Promise<void> {
  if (images.length === 0) {
    setStatus('No images found on this page.');
    scrubAllBtn.disabled = true;
    return;
  }

  // Initialise states
  for (const payload of images) {
    imageStates.set(payload.nodeId, {
      payload,
      result: null,
      error: null,
      scrubbed: false,
    });
  }

  // Render skeleton cards first
  renderAll();

  // Parse each image asynchronously
  const parsePromises = images.map(async (payload) => {
    const state = imageStates.get(payload.nodeId);
    if (!state) return;
    try {
      const result = await parse({
        kind: 'bytes',
        data: payload.bytes,
        filename: payload.nodeName,
      });
      state.result = result;
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
    }
  });

  await Promise.all(parsePromises);
  renderAll();

  const withWarnings = Array.from(imageStates.values()).filter(
    (s) => s.result && s.result.warnings.length > 0,
  ).length;

  if (withWarnings > 0) {
    scrubAllBtn.disabled = false;
    scrubAllBtn.textContent = `Scrub all (${withWarnings} with metadata)`;
  } else {
    scrubAllBtn.disabled = true;
  }
}

window.onmessage = (event: MessageEvent) => {
  const msg = (event.data?.pluginMessage ?? event.data) as SandboxToUIMessage;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'images') {
    void processImages(msg.images);
  } else if (msg.type === 'error') {
    setStatus(`Error: ${msg.message}`);
  }
};
