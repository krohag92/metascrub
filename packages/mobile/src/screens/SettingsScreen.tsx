import { useEffect, useState } from 'react';
import type { ScrubPreset } from '@metascrub/core';
import { PresetPicker } from '../components/PresetPicker.js';
import { getSettings, saveSettings } from '../lib/settings.js';
import { clearRecentFiles } from '../lib/recent-files.js';

const APP_VERSION = '1.0.0';

export function SettingsScreen() {
  const [preset, setPreset] = useState<ScrubPreset>('all');
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => setPreset(s.defaultPreset));
  }, []);

  const handlePresetChange = async (value: ScrubPreset) => {
    setPreset(value);
    await saveSettings({ defaultPreset: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClearHistory = async () => {
    await clearRecentFiles();
    setCleared(true);
    setTimeout(() => setCleared(false), 1500);
  };

  return (
    <main className="screen settings-screen">
      <header className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-title">Default scrub preset</h2>
        <PresetPicker selected={preset} onChange={(v) => void handlePresetChange(v)} />
        {saved && <p className="save-indicator">Saved!</p>}
      </section>

      <section className="settings-section">
        <h2 className="section-title">Privacy</h2>
        <p className="settings-text">
          MetaScrub processes all files locally on your device.
          No data is ever uploaded or shared. See our{' '}
          <a
            href="https://metadatafinder.com/extension/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="settings-link"
          >
            privacy policy
          </a>.
        </p>
        <button className="btn-secondary settings-btn" onClick={() => void handleClearHistory()}>
          {cleared ? 'History cleared!' : 'Clear file history'}
        </button>
      </section>

      <section className="settings-section">
        <h2 className="section-title">About</h2>
        <p className="settings-text">MetaScrub v{APP_VERSION}</p>
        <p className="settings-text">
          Part of{' '}
          <a
            href="https://metadatafinder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="settings-link"
          >
            metadatafinder.com
          </a>{' '}
          — the metadata toolkit.
        </p>
        <a
          href="https://metadatafinder.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary settings-btn"
        >
          Open metadatafinder.com
        </a>
      </section>
    </main>
  );
}
