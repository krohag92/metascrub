/**
 * FileList — left pane.
 * - Drag-and-drop zone for files and folders.
 * - List of queued / recent files.
 * - Emits onSelectFile when the user clicks a file.
 */

import { useCallback, useState } from 'react';
import { formatBytes } from '../lib/formatHelpers.js';
import type { RecentFile } from '../lib/store.js';

export interface QueuedFile {
  path: string;
  name: string;
  sizeBytes: number;
}

interface FileListProps {
  files: QueuedFile[];
  selectedPath: string | null;
  recentFiles: RecentFile[];
  onSelectFile: (file: QueuedFile) => void;
  onDropFiles: (paths: string[]) => void;
  onPickFiles: () => void;
  onSelectRecent: (recent: RecentFile) => void;
  onClearRecent?: () => void;
}

export function FileList({
  files,
  selectedPath,
  recentFiles,
  onSelectFile,
  onDropFiles,
  onPickFiles,
  onSelectRecent,
  onClearRecent,
}: FileListProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      // Tauri provides file paths via the DataTransfer items
      const paths: string[] = [];
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) {
            // In Tauri the webview passes the real OS path via the file object
            // (window.webkitRelativePath or the Tauri drag-drop event)
            const p = (f as File & { path?: string }).path ?? f.name;
            paths.push(p);
          }
        }
      }
      if (paths.length > 0) {
        onDropFiles(paths);
      }
    },
    [onDropFiles],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Drop zone */}
      <div
        role="region"
        aria-label="file drop zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'mx-2 mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 px-2 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50',
        ].join(' ')}
        onClick={onPickFiles}
      >
        <svg
          className="w-7 h-7 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-xs text-gray-500 leading-tight">
          {isDragging ? 'Drop here' : 'Drop files or click'}
        </p>
      </div>

      {/* Queue */}
      {files.length > 0 && (
        <div className="mt-2 flex-1 overflow-y-auto">
          <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Queue ({files.length})
          </p>
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file)}
              className={[
                'w-full text-left px-3 py-2 text-xs truncate transition-colors flex flex-col',
                selectedPath === file.path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              title={file.path}
            >
              <span className="font-medium truncate">{file.name}</span>
              <span className="text-gray-400">{formatBytes(file.sizeBytes)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && recentFiles.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400 text-center px-4">
            No files yet.
            <br />
            Drop a file above.
          </p>
        </div>
      )}

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div className="mt-2 border-t border-gray-100 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent</p>
            {onClearRecent && (
              <button
                onClick={onClearRecent}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                aria-label="Clear recent files"
              >
                Clear
              </button>
            )}
          </div>
          {recentFiles.map((r) => (
            <button
              key={r.path}
              onClick={() => onSelectRecent(r)}
              className="w-full text-left px-3 py-1.5 text-xs truncate transition-colors text-gray-500 hover:bg-gray-100 flex flex-col"
              title={r.path}
            >
              <span className="font-medium truncate text-gray-700">{r.name}</span>
              <span className="text-gray-400">
                {r.format.toUpperCase()} · {formatBytes(r.sizeBytes)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
