/**
 * PresetPicker — radio list for selecting a scrub preset.
 * Adapted from packages/extension/src/popup/components/ScrubPanel.tsx
 * with mobile-size touch targets.
 */
import type { ScrubPreset } from '@metascrub/core';

export interface PresetOption {
  value: ScrubPreset;
  label: string;
  description: string;
  removes: string[];
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    value: 'all',
    label: 'Remove all',
    description: 'Strip every metadata field that can be safely removed.',
    removes: ['EXIF', 'IPTC', 'XMP', 'GPS', 'Author', 'Software', 'ID3 tags', 'PDF info'],
  },
  {
    value: 'gps-only',
    label: 'GPS only',
    description: 'Remove GPS coordinates; keep all other metadata.',
    removes: ['GPS coordinates', 'GPS altitude', 'GPS timestamp'],
  },
  {
    value: 'personal-only',
    label: 'Personal info',
    description: 'Remove author, owner, serial numbers, and software info.',
    removes: ['Author', 'Owner', 'Serial number', 'Software', 'Last modified by'],
  },
  {
    value: 'keep-technical',
    label: 'Keep technical',
    description: 'Keep camera and exposure data; remove personal info and GPS.',
    removes: ['GPS', 'Author', 'Software', 'Serial number', 'IPTC', 'XMP personal fields'],
  },
];

export interface PresetPickerProps {
  selected: ScrubPreset;
  onChange: (preset: ScrubPreset) => void;
}

export function PresetPicker({ selected, onChange }: PresetPickerProps) {
  return (
    <div className="preset-picker" role="radiogroup" aria-label="Scrub preset">
      {PRESET_OPTIONS.map((preset) => (
        <label
          key={preset.value}
          className={`preset-option ${selected === preset.value ? 'preset-option-selected' : ''}`}
        >
          <input
            type="radio"
            name="scrub-preset"
            value={preset.value}
            checked={selected === preset.value}
            onChange={() => onChange(preset.value)}
            aria-label={preset.label}
            className="preset-radio"
          />
          <div className="preset-text">
            <span className="preset-label">{preset.label}</span>
            <span className="preset-description">{preset.description}</span>
            {selected === preset.value && (
              <div className="preset-removes">
                <span className="preset-removes-label">Removes: </span>
                {preset.removes.join(', ')}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
