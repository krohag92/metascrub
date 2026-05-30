/**
 * RecentFiles — compact list of recently opened files with format badges.
 * Embedded inside the left FileList pane; can also be rendered standalone.
 */

import type { RecentFile } from '../lib/store.js';
import { formatBytes } from '../lib/formatHelpers.js';

interface RecentFilesProps {
  files: RecentFile[];
  onSelect: (file: RecentFile) => void;
  onClear: () => void;
}

export function RecentFiles({ files, onSelect, onClear }: RecentFilesProps) {
  if (files.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent</p>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
          aria-label="Clear recent files"
        >
          Clear
        </button>
      </div>

      {files.map((f) => (
        <button
          key={f.path}
          onClick={() => onSelect(f)}
          className="w-full text-left px-3 py-1.5 flex flex-col gap-0.5 hover:bg-gray-100 transition-colors"
          title={f.path}
        >
          <span className="text-xs font-medium text-gray-700 truncate">{f.name}</span>
          <span className="text-xs text-gray-400">
            <span className="font-mono bg-gray-100 rounded px-1 text-gray-500 text-[10px] mr-1">
              {f.format.toUpperCase()}
            </span>
            {formatBytes(f.sizeBytes)}
          </span>
        </button>
      ))}
    </div>
  );
}
