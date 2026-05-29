import { useState } from 'react';
import type { ScrubPreset } from '@metascrub/core';

interface ScrubPanelProps {
  onScrub: (preset: ScrubPreset) => void;
  disabled?: boolean;
}

const PRESETS: { value: ScrubPreset; label: string; description: string }[] = [
  {
    value: 'all',
    label: 'Remove all',
    description: 'Strip every metadata field that can be safely removed',
  },
  {
    value: 'gps-only',
    label: 'GPS only',
    description: 'Remove GPS coordinates; keep everything else',
  },
  {
    value: 'personal-only',
    label: 'Personal info',
    description: 'Remove author, owner, serial numbers, and software info',
  },
  {
    value: 'keep-technical',
    label: 'Keep technical',
    description: 'Keep camera/exposure data; remove personal info',
  },
];

export function ScrubPanel({ onScrub, disabled = false }: ScrubPanelProps) {
  const [selected, setSelected] = useState<ScrubPreset>('all');

  return (
    <div className="border-t border-gray-200 mt-2 p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Scrub preset
      </p>

      <div className="space-y-2 mb-4">
        {PRESETS.map((preset) => (
          <label
            key={preset.value}
            className={[
              'flex items-start gap-3 rounded-md border p-2.5 cursor-pointer transition-colors',
              selected === preset.value
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white',
            ].join(' ')}
          >
            <input
              type="radio"
              name="scrub-preset"
              value={preset.value}
              checked={selected === preset.value}
              onChange={() => setSelected(preset.value)}
              className="mt-0.5 accent-blue-500"
              disabled={disabled}
              aria-label={preset.label}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800">{preset.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{preset.description}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={() => onScrub(selected)}
        disabled={disabled}
        className={[
          'w-full py-2.5 rounded-md text-sm font-medium transition-colors',
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
        ].join(' ')}
      >
        {disabled ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Scrubbing…
          </span>
        ) : (
          'Scrub & Download'
        )}
      </button>
    </div>
  );
}
