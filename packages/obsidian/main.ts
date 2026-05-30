import {
  App,
  Modal,
  Notice,
  Plugin,
  TFile,
} from 'obsidian';
import { parse, scrub } from '@metascrub/core';
import type { MetadataField, MetadataResult } from '@metascrub/core';
import { scanVault } from './src/scanner';
import { MetaScrubSettingTab, DEFAULT_SETTINGS } from './src/SettingsTab';
import type { MetaScrubSettings } from './src/SettingsTab';

// ─── Metadata Detail Modal ────────────────────────────────────────────────────

class MetadataModal extends Modal {
  private readonly filePath: string;
  private readonly result: MetadataResult;
  private readonly onScrub: (path: string) => Promise<void>;

  constructor(
    app: App,
    filePath: string,
    result: MetadataResult,
    onScrub: (path: string) => Promise<void>,
  ) {
    super(app);
    this.filePath = filePath;
    this.result = result;
    this.onScrub = onScrub;
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('metascrub-modal');

    contentEl.createEl('h2', { text: `Metadata: ${this.filePath.split('/').pop()}` });

    if (this.result.warnings.length > 0) {
      const warningsEl = contentEl.createEl('div', { cls: 'metascrub-warnings' });
      warningsEl.createEl('strong', { text: 'Warnings:' });
      const ul = warningsEl.createEl('ul');
      for (const w of this.result.warnings) {
        ul.createEl('li', { text: w });
      }
    }

    contentEl.createEl('p', {
      text: `Format: ${this.result.format} · Size: ${(this.result.sizeBytes / 1024).toFixed(1)} KB`,
      cls: 'metascrub-meta-info',
    });

    for (const [groupName, rawFields] of Object.entries(this.result.groups)) {
      const fields = rawFields as MetadataField[];
      if (fields.length === 0) continue;
      contentEl.createEl('h3', { text: groupName });
      const table = contentEl.createEl('table', { cls: 'metascrub-table' });
      const thead = table.createEl('thead');
      const hr = thead.createEl('tr');
      hr.createEl('th', { text: 'Key' });
      hr.createEl('th', { text: 'Value' });
      const tbody = table.createEl('tbody');
      for (const field of fields) {
        const tr = tbody.createEl('tr');
        if (field.sensitive) tr.addClass('metascrub-sensitive');
        tr.createEl('td', { text: field.label ?? field.key });
        tr.createEl('td', { text: String(field.value ?? '') });
      }
    }

    const footer = contentEl.createEl('div', { cls: 'metascrub-footer' });
    const scrubBtn = footer.createEl('button', {
      text: 'Scrub metadata',
      cls: 'mod-warning',
    });
    scrubBtn.addEventListener('click', async () => {
      scrubBtn.disabled = true;
      scrubBtn.textContent = 'Scrubbing…';
      await this.onScrub(this.filePath);
      this.close();
    });

    const closeBtn = footer.createEl('button', { text: 'Close' });
    closeBtn.addEventListener('click', () => this.close());
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

// ─── Scan Results Modal ───────────────────────────────────────────────────────

interface ScanEntry {
  path: string;
  result: MetadataResult;
}

class ScanResultsModal extends Modal {
  private readonly entries: ScanEntry[];
  private readonly onView: (entry: ScanEntry) => void;
  private readonly onScrub: (path: string) => Promise<void>;

  constructor(
    app: App,
    entries: ScanEntry[],
    onView: (entry: ScanEntry) => void,
    onScrub: (path: string) => Promise<void>,
  ) {
    super(app);
    this.entries = entries;
    this.onView = onView;
    this.onScrub = onScrub;
  }

  override onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('metascrub-modal');

    contentEl.createEl('h2', { text: 'MetaScrub: Scan Results' });

    if (this.entries.length === 0) {
      contentEl.createEl('p', {
        text: 'No warnings found. All scanned attachments appear clean.',
      });
    } else {
      contentEl.createEl('p', {
        text: `Found ${this.entries.length} file${this.entries.length === 1 ? '' : 's'} with metadata warnings.`,
      });

      for (const entry of this.entries) {
        const row = contentEl.createEl('div', { cls: 'metascrub-result-row' });
        const info = row.createEl('div', { cls: 'metascrub-result-info' });
        info.createEl('strong', {
          text: entry.path.split('/').pop() ?? entry.path,
        });
        info.createEl('span', {
          text: ` · ${entry.result.warnings.length} warning${entry.result.warnings.length === 1 ? '' : 's'}`,
          cls: 'metascrub-warning-count',
        });
        info.createEl('small', { text: entry.path, cls: 'metascrub-path' });

        const actions = row.createEl('div', { cls: 'metascrub-result-actions' });

        const viewBtn = actions.createEl('button', { text: 'View' });
        viewBtn.addEventListener('click', () => this.onView(entry));

        const scrubBtn = actions.createEl('button', {
          text: 'Scrub',
          cls: 'mod-warning',
        });
        scrubBtn.addEventListener('click', async () => {
          scrubBtn.disabled = true;
          scrubBtn.textContent = 'Scrubbing…';
          await this.onScrub(entry.path);
          row.addClass('metascrub-scrubbed');
          scrubBtn.textContent = 'Done';
        });
      }
    }

    contentEl.createEl('p', { cls: 'metascrub-powered-by' }).innerHTML =
      'Powered by <a href="https://metadatafinder.com" target="_blank" rel="noopener">metadatafinder.com</a>';
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export default class MetaScrubPlugin extends Plugin {
  override settings: MetaScrubSettings = { ...DEFAULT_SETTINGS };
  private statusBarItem: HTMLElement | null = null;
  private warningCount = 0;

  override async onload(): Promise<void> {
    await this.loadSettings();

    // Settings tab
    this.addSettingTab(new MetaScrubSettingTab(this.app, this));

    // Ribbon icon
    this.addRibbonIcon('shield-check', 'MetaScrub: Scan attachments', () => {
      void this.runScan();
    });

    // Status bar pill
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Command: scan vault
    this.addCommand({
      id: 'scan-attachments',
      name: 'Scan attachments',
      callback: () => {
        void this.runScan();
      },
    });

    // File-menu handler (right-click in file explorer)
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFile)) return;

        const ext = file.extension.toLowerCase();
        const supported = [
          'jpg', 'jpeg', 'png', 'heic', 'webp', 'tiff', 'avif',
          'pdf', 'docx', 'xlsx', 'pptx', 'epub', 'svg',
          'mp3', 'mp4', 'mov',
        ];
        if (!supported.includes(ext)) return;

        menu.addItem((item) => {
          item
            .setTitle('View metadata (MetaScrub)')
            .setIcon('info')
            .onClick(() => void this.viewFile(file));
        });

        menu.addItem((item) => {
          item
            .setTitle('Scrub metadata (MetaScrub)')
            .setIcon('shield-check')
            .onClick(() => void this.scrubFile(file));
        });
      }),
    );
  }

  override onunload(): void {
    // Obsidian handles cleanup of registered events and commands.
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    const stored = await this.loadData() as Partial<MetaScrubSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ─── Status bar ────────────────────────────────────────────────────────────

  updateStatusBar(count?: number): void {
    if (count !== undefined) this.warningCount = count;
    if (!this.statusBarItem) return;

    if (this.warningCount === 0) {
      this.statusBarItem.setText('MetaScrub: clean');
      this.statusBarItem.removeAttribute('style');
    } else {
      this.statusBarItem.setText(`MetaScrub: ${this.warningCount} warning${this.warningCount === 1 ? '' : 's'}`);
      this.statusBarItem.style.color = 'var(--text-error)';
    }
  }

  // ─── Scan ───────────────────────────────────────────────────────────────────

  private async runScan(): Promise<void> {
    const notice = new Notice('MetaScrub: scanning vault…', 0);

    try {
      const allFiles = this.app.vault.getFiles();
      const results = await scanVault(
        allFiles.map((f) => ({ path: f.path, extension: f.extension })),
        {
          readBinary: (vf) => {
            const tfile = this.app.vault.getAbstractFileByPath(vf.path);
            if (!(tfile instanceof TFile)) {
              return Promise.reject(new Error(`File not found: ${vf.path}`));
            }
            return this.app.vault.readBinary(tfile);
          },
        },
        (progress) => {
          notice.setMessage(
            `MetaScrub: scanning ${progress.done}/${progress.total}…`,
          );
        },
      );

      notice.hide();
      this.updateStatusBar(results.length);

      new ScanResultsModal(
        this.app,
        results,
        (entry) => {
          new MetadataModal(
            this.app,
            entry.path,
            entry.result,
            (path) => this.scrubPath(path),
          ).open();
        },
        (path) => this.scrubPath(path),
      ).open();
    } catch (err) {
      notice.hide();
      new Notice(`MetaScrub error: ${(err as Error).message}`);
    }
  }

  // ─── View single file ───────────────────────────────────────────────────────

  private async viewFile(file: TFile): Promise<void> {
    try {
      const buffer = await this.app.vault.readBinary(file);
      const bytes = new Uint8Array(buffer);
      const result = await parse({ kind: 'bytes', data: bytes, filename: file.path });
      new MetadataModal(
        this.app,
        file.path,
        result,
        (path) => this.scrubPath(path),
      ).open();
    } catch (err) {
      new Notice(`MetaScrub: could not parse "${file.name}" — ${(err as Error).message}`);
    }
  }

  // ─── Scrub helpers ──────────────────────────────────────────────────────────

  private async scrubFile(file: TFile): Promise<void> {
    await this.scrubPath(file.path);
  }

  private async scrubPath(path: string): Promise<void> {
    const tfile = this.app.vault.getAbstractFileByPath(path);
    if (!(tfile instanceof TFile)) {
      new Notice(`MetaScrub: file not found — ${path}`);
      return;
    }

    try {
      const buffer = await this.app.vault.readBinary(tfile);
      const bytes = new Uint8Array(buffer);
      const cleaned = await scrub(
        { kind: 'bytes', data: bytes, filename: path },
        { preset: this.settings.scrubPreset },
      );
      await this.app.vault.modifyBinary(tfile, cleaned.buffer as ArrayBuffer);
      new Notice(`MetaScrub: scrubbed "${tfile.name}"`);
    } catch (err) {
      new Notice(`MetaScrub: scrub failed for "${tfile.name}" — ${(err as Error).message}`);
    }
  }
}
