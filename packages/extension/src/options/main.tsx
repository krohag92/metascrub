import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { ScrubPreset } from '@metascrub/core';
import '../styles.css';

type Settings = {
  defaultPreset: ScrubPreset;
  alwaysShowWarnings: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  defaultPreset: 'all',
  alwaysShowWarnings: true,
};

const PRESETS: { value: ScrubPreset; label: string; description: string }[] = [
  {
    value: 'all',
    label: 'Remove all metadata',
    description: 'Strip every metadata field that can be safely removed',
  },
  {
    value: 'gps-only',
    label: 'GPS only',
    description: 'Remove GPS coordinates; keep everything else',
  },
  {
    value: 'personal-only',
    label: 'Personal info only',
    description: 'Remove author, owner, serial numbers, and software info',
  },
  {
    value: 'keep-technical',
    label: 'Keep technical data',
    description: 'Keep camera/exposure data; remove personal info',
  },
];

function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void chrome.storage.sync.get(DEFAULT_SETTINGS).then((stored) => {
      setSettings(stored as Settings);
    });
  }, []);

  const save = () => {
    void chrome.storage.sync.set(settings).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">MetaScrub Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure default behaviour for the MetaScrub extension.
        </p>
      </div>

      {/* Default preset */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Default scrub preset</h2>
        <div className="space-y-2">
          {PRESETS.map((p) => (
            <label
              key={p.value}
              className={[
                'flex items-start gap-3 rounded-md border p-3 cursor-pointer',
                settings.defaultPreset === p.value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              <input
                type="radio"
                name="preset"
                value={p.value}
                checked={settings.defaultPreset === p.value}
                onChange={() => setSettings((s) => ({ ...s, defaultPreset: p.value }))}
                className="mt-0.5 accent-blue-500"
                aria-label={p.label}
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Always show warnings */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Warnings</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.alwaysShowWarnings}
            onChange={(e) => setSettings((s) => ({ ...s, alwaysShowWarnings: e.target.checked }))}
            className="w-4 h-4 accent-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">Always show warnings</p>
            <p className="text-xs text-gray-400">
              Highlight sensitive fields (GPS, author, serial numbers) in red
            </p>
          </div>
        </label>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 active:bg-blue-700"
        >
          Save settings
        </button>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          MetaScrub — See and strip metadata from any file.{' '}
          <a
            href="https://metadatafinder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            metadatafinder.com
          </a>
          {' · '}
          <a
            href="https://metadatafinder.com/extension/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Privacy policy
          </a>
        </p>
      </footer>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
