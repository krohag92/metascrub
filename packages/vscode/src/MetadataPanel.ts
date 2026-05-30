import * as vscode from 'vscode';
import type { MetadataResult } from '@metascrub/core';

export class MetadataPanel {
  static readonly viewType = 'metascrub.metadataView';

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  static create(extensionUri: vscode.Uri, result: MetadataResult, filename: string): MetadataPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const panel = vscode.window.createWebviewPanel(
      MetadataPanel.viewType,
      `MetaScrub: ${filename}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      },
    );

    return new MetadataPanel(panel, result, filename);
  }

  private constructor(panel: vscode.WebviewPanel, result: MetadataResult, filename: string) {
    this._panel = panel;
    this._panel.webview.html = MetadataPanel.buildHtml(this._panel.webview, result, filename);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  dispose(): void {
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }

  static buildHtml(webview: vscode.Webview, result: MetadataResult, filename: string): string {
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-metascrub';`;

    const warningsHtml =
      result.warnings.length > 0
        ? `<div class="warnings">
        <h2>Warnings</h2>
        <ul>
          ${result.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('\n          ')}
        </ul>
      </div>`
        : '';

    const groupsHtml = Object.entries(result.groups)
      .filter(([, fields]) => fields.length > 0)
      .map(
        ([groupName, fields]) => `
      <details open>
        <summary>${escapeHtml(groupName)}</summary>
        <table>
          <thead>
            <tr><th>Field</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${fields
              .map(
                (f) => `<tr class="${f.sensitive ? 'sensitive' : ''}">
              <td>${escapeHtml(f.label ?? f.key)}</td>
              <td>${escapeHtml(String(f.value ?? ''))}</td>
            </tr>`,
              )
              .join('\n            ')}
          </tbody>
        </table>
      </details>`,
      )
      .join('\n');

    const highlightsHtml = buildHighlightsHtml(result);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MetaScrub: ${escapeHtml(filename)}</title>
  <style>
    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px 24px;
      margin: 0;
    }
    h1 { font-size: 1.3em; margin-bottom: 4px; }
    .meta-info { color: var(--vscode-descriptionForeground); margin-bottom: 16px; font-size: 0.9em; }
    .warnings {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f14c4c);
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .warnings h2 { color: var(--vscode-errorForeground, #f14c4c); margin: 0 0 8px; font-size: 1em; }
    .warnings ul { margin: 0; padding-left: 18px; }
    .warnings li { margin-bottom: 4px; }
    .highlights {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .highlight-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 12px;
      padding: 3px 10px;
      font-size: 0.85em;
    }
    details { margin-bottom: 12px; border: 1px solid var(--vscode-panel-border, #333); border-radius: 4px; }
    summary {
      cursor: pointer;
      padding: 8px 12px;
      font-weight: 600;
      background: var(--vscode-sideBarSectionHeader-background);
      border-radius: 4px;
      user-select: none;
    }
    summary:hover { background: var(--vscode-list-hoverBackground); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border, #333); font-size: 0.9em; }
    th { color: var(--vscode-descriptionForeground); font-weight: 600; }
    tr.sensitive td { color: var(--vscode-errorForeground, #f14c4c); }
    tr:last-child td { border-bottom: none; }
    footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border, #333);
      color: var(--vscode-descriptionForeground);
      font-size: 0.85em;
    }
    footer a { color: var(--vscode-textLink-foreground, #4fc1ff); }
  </style>
</head>
<body>
  <h1>MetaScrub: ${escapeHtml(filename)}</h1>
  <p class="meta-info">
    Format: <strong>${escapeHtml(result.format)}</strong>
    &nbsp;|&nbsp;
    Size: <strong>${formatBytes(result.sizeBytes)}</strong>
  </p>

  ${warningsHtml}
  ${highlightsHtml}
  ${groupsHtml || '<p>No metadata found in this file.</p>'}

  <footer>
    Powered by <a href="https://metadatafinder.com" target="_blank">metadatafinder.com</a>
  </footer>
</body>
</html>`;
  }
}

function buildHighlightsHtml(result: MetadataResult): string {
  const h = result.highlights;
  const badges: string[] = [];

  if (h.gps) {
    badges.push(
      `GPS: ${h.gps.lat.toFixed(5)}, ${h.gps.lon.toFixed(5)}${h.gps.alt !== undefined ? ` (alt ${h.gps.alt}m)` : ''}`,
    );
  }
  if (h.device?.make ?? h.device?.model) {
    badges.push(`Device: ${[h.device?.make, h.device?.model].filter(Boolean).join(' ')}`);
  }
  if (h.author) {
    badges.push(`Author: ${h.author}`);
  }
  if (h.software) {
    badges.push(`Software: ${h.software}`);
  }
  if (h.capturedAt) {
    badges.push(`Captured: ${h.capturedAt}`);
  }
  if (h.lastModifiedBy) {
    badges.push(`Last modified by: ${h.lastModifiedBy}`);
  }
  if (h.revisionHistory !== undefined && h.revisionHistory > 0) {
    badges.push(`Revisions: ${h.revisionHistory}`);
  }

  if (badges.length === 0) return '';

  return `<div class="highlights">
    ${badges.map((b) => `<span class="highlight-badge">${escapeHtml(b)}</span>`).join('\n    ')}
  </div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
