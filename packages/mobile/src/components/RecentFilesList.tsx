import type { RecentFile } from '../lib/recent-files.js';
import { navigate } from '../lib/route.js';
import { formatBytes } from './MetadataGroup.js';

export interface RecentFilesListProps {
  files: RecentFile[];
}

export function RecentFilesList({ files }: RecentFilesListProps) {
  if (files.length === 0) {
    return (
      <div className="recent-empty">
        <p className="recent-empty-title">No files yet</p>
        <p className="recent-empty-hint">
          Pick a file or share one from Photos, Files, or another app.
        </p>
      </div>
    );
  }

  return (
    <ul className="recent-list" aria-label="Recently processed files">
      {files.map((file) => (
        <li key={file.path} className="recent-item">
          <button
            className="recent-item-button"
            onClick={() => navigate({ name: 'file', path: file.path })}
            aria-label={`Open ${file.name}`}
          >
            <div className="recent-item-icon" aria-hidden="true">
              {formatIcon(file.format)}
            </div>
            <div className="recent-item-info">
              <span className="recent-item-name">{file.name}</span>
              <span className="recent-item-meta">
                {file.format.toUpperCase()} · {formatBytes(file.sizeBytes)}
                {file.scrubbed && <span className="recent-item-scrubbed"> · Scrubbed</span>}
              </span>
            </div>
            <span className="recent-item-date">{formatRelativeDate(file.processedAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatIcon(format: string): string {
  const imgFormats = ['jpeg', 'png', 'heic', 'webp', 'avif', 'tiff', 'svg'];
  const vidFormats = ['mp4', 'mov', 'mkv', 'webm'];
  const audioFormats = ['mp3', 'flac', 'm4a', 'ogg', 'wav'];
  if (imgFormats.some((f) => format.includes(f))) return '&#x1F5BC;'; // picture frame
  if (vidFormats.some((f) => format.includes(f))) return '&#x1F3AC;'; // clapper board
  if (audioFormats.some((f) => format.includes(f))) return '&#x1F3B5;'; // music note
  return '&#x1F4C4;'; // document
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
