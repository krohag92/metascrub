import { App, PluginSettingTab, Setting } from 'obsidian';
import type MetaScrubPlugin from '../main';
import type { ScrubPreset } from '@metascrub/core';
export type { MetaScrubSettings } from './settings';
export { DEFAULT_SETTINGS } from './settings';

const PRESET_OPTIONS: Record<ScrubPreset, string> = {
  all: 'All — remove every strippable metadata field',
  'gps-only': 'GPS only — remove GPS coordinates only',
  'personal-only': 'Personal only — remove author/owner/software fields',
  'keep-technical': 'Keep technical — strip everything except camera/exposure data',
  custom: 'Custom — use keep/remove lists (advanced)',
};

export class MetaScrubSettingTab extends PluginSettingTab {
  plugin: MetaScrubPlugin;

  constructor(app: App, plugin: MetaScrubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'MetaScrub Settings' });

    new Setting(containerEl)
      .setName('Scrub preset')
      .setDesc('Which metadata fields to remove when scrubbing an attachment.')
      .addDropdown((drop) => {
        for (const [value, label] of Object.entries(PRESET_OPTIONS)) {
          drop.addOption(value, label);
        }
        drop.setValue(this.plugin.settings.scrubPreset);
        drop.onChange(async (value) => {
          this.plugin.settings.scrubPreset = value as ScrubPreset;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Include subfolders')
      .setDesc('Scan all subfolders when running "Scan attachments". Disable to scan only the root folder.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.includeSubfolders);
        toggle.onChange(async (value) => {
          this.plugin.settings.includeSubfolders = value;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl('hr');

    const footer = containerEl.createEl('p');
    footer.createEl('span', { text: 'MetaScrub is powered by ' });
    footer.createEl('a', {
      text: 'metadatafinder.com',
      href: 'https://metadatafinder.com',
    });
    footer.createEl('span', { text: '. Use the web version to process files without installing anything.' });
  }
}
