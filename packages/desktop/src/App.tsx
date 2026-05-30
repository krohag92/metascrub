/**
 * App.tsx — MetaScrub desktop app root.
 *
 * Three-pane layout:
 *   Left   — FileList (drag-drop zone + queue + recent files)
 *   Middle — MetadataView (expandable groups, warnings in red)
 *   Right  — ScrubPanel + BatchProgress
 */

import { useState, useCallback, useEffect } from 'react';
import { parse, scrub } from '@metascrub/core/browser';
import type { MetadataResult, ScrubPreset } from '@metascrub/core';

import { FileList, type QueuedFile } from './components/FileList.js';
import { MetadataView } from './components/MetadataView.js';
import { ScrubPanel } from './components/ScrubPanel.js';
import { BatchProgress, type BatchFileStatus } from './components/BatchProgress.js';

import { readFileBytes, writeFileBytes, pickFiles, openUrl } from './lib/tauri.js';
import { getRecentFiles, addRecentFile, clearRecentFiles, type RecentFile } from './lib/store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState =
  | { phase: 'empty' }
  | { phase: 'loading'; filename: string }
  | { phase: 'loaded'; result: MetadataResult; filename: string; path: string; bytes: Uint8Array }
  | {
      phase: 'scrubbing';
      result: MetadataResult;
      filename: string;
      path: string;
      bytes: Uint8Array;
    }
  | { phase: 'error'; message: string };

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ phase: 'empty' });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [batchFiles, setBatchFiles] = useState<BatchFileStatus[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Load recent files on mount
  useEffect(() => {
    void getRecentFiles().then(setRecentFiles);
  }, []);

  // Listen for Tauri drag-drop events (file paths dropped on the window chrome)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
          const paths = event.payload?.paths ?? [];
          if (paths.length > 0) {
            void handleAddPaths(paths);
          }
        });
      } catch {
        // Running outside Tauri (vitest, browser dev) — ignore
      }
    })();

    return () => {
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // File management helpers
  // ---------------------------------------------------------------------------

  const handleAddPaths = useCallback(async (paths: string[]) => {
    const newFiles: QueuedFile[] = [];
    for (const path of paths) {
      const name = path.split('/').pop() ?? path.split('\\').pop() ?? path;
      try {
        const bytes = await readFileBytes(path);
        newFiles.push({ path, name, sizeBytes: bytes.length });
      } catch {
        newFiles.push({ path, name, sizeBytes: 0 });
      }
    }
    setQueue((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      return [...prev, ...newFiles.filter((f) => !existing.has(f.path))];
    });
  }, []);

  const handleDropFiles = useCallback(
    (paths: string[]) => {
      void handleAddPaths(paths);
    },
    [handleAddPaths],
  );

  const handlePickFiles = useCallback(async () => {
    try {
      const paths = await pickFiles();
      if (paths.length > 0) {
        await handleAddPaths(paths);
      }
    } catch {
      // User cancelled picker or not in Tauri
    }
  }, [handleAddPaths]);

  // ---------------------------------------------------------------------------
  // File selection / loading
  // ---------------------------------------------------------------------------

  const loadFile = useCallback(async (path: string, name: string) => {
    setSelectedPath(path);
    setIsBatchMode(false);
    setViewState({ phase: 'loading', filename: name });
    try {
      const bytes = await readFileBytes(path);
      const result = await parse({ kind: 'bytes', data: bytes, filename: name });
      setViewState({ phase: 'loaded', result, filename: name, path, bytes });

      const recent: RecentFile = {
        path,
        name,
        format: result.format,
        sizeBytes: result.sizeBytes,
        openedAt: new Date().toISOString(),
      };
      await addRecentFile(recent);
      setRecentFiles(await getRecentFiles());
    } catch (err) {
      setViewState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse file',
      });
    }
  }, []);

  const handleSelectFile = useCallback(
    (file: QueuedFile) => {
      void loadFile(file.path, file.name);
    },
    [loadFile],
  );

  const handleSelectRecent = useCallback(
    (recent: RecentFile) => {
      void loadFile(recent.path, recent.name);
    },
    [loadFile],
  );

  // ---------------------------------------------------------------------------
  // Scrub (single file)
  // ---------------------------------------------------------------------------

  const handleScrub = useCallback(
    (preset: ScrubPreset) => {
      if (viewState.phase !== 'loaded') return;
      const { bytes, filename, path, result } = viewState;
      setViewState({ phase: 'scrubbing', result, filename, path, bytes });

      void (async () => {
        try {
          const cleaned = await scrub({ kind: 'bytes', data: bytes, filename }, { preset });
          const dotIndex = filename.lastIndexOf('.');
          const cleanedName =
            dotIndex === -1
              ? `${filename}-cleaned`
              : `${filename.slice(0, dotIndex)}-cleaned${filename.slice(dotIndex)}`;

          // Save next to the original file
          const dirPath = path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
          const outPath = `${dirPath}/${cleanedName}`;
          await writeFileBytes(outPath, new Uint8Array(cleaned));

          // Re-parse original to refresh UI
          setViewState({ phase: 'loaded', result, filename, path, bytes });
        } catch (err) {
          setViewState({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Scrub failed',
          });
        }
      })();
    },
    [viewState],
  );

  // ---------------------------------------------------------------------------
  // Batch scrub
  // ---------------------------------------------------------------------------

  const handleBatchScrub = useCallback(
    (preset: ScrubPreset) => {
      if (queue.length === 0) return;
      setIsBatchMode(true);

      const initial: BatchFileStatus[] = queue.map((f) => ({
        path: f.path,
        name: f.name,
        status: 'pending' as const,
        warningCount: 0,
      }));
      setBatchFiles(initial);

      void (async () => {
        for (let i = 0; i < queue.length; i++) {
          const file = queue[i];
          if (!file) continue;

          setBatchFiles((prev) =>
            prev.map((s) => (s.path === file.path ? { ...s, status: 'processing' as const } : s)),
          );

          try {
            const bytes = await readFileBytes(file.path);
            const result = await parse({ kind: 'bytes', data: bytes, filename: file.name });
            const cleaned = await scrub(
              { kind: 'bytes', data: bytes, filename: file.name },
              { preset },
            );

            const dotIndex = file.name.lastIndexOf('.');
            const cleanedName =
              dotIndex === -1
                ? `${file.name}-cleaned`
                : `${file.name.slice(0, dotIndex)}-cleaned${file.name.slice(dotIndex)}`;

            const dirPath = file.path.substring(
              0,
              Math.max(file.path.lastIndexOf('/'), file.path.lastIndexOf('\\')) + 1,
            );
            await writeFileBytes(`${dirPath}${cleanedName}`, new Uint8Array(cleaned));

            setBatchFiles((prev) =>
              prev.map((s) =>
                s.path === file.path
                  ? { ...s, status: 'done' as const, warningCount: result.warnings.length }
                  : s,
              ),
            );
          } catch (err) {
            setBatchFiles((prev) =>
              prev.map((s) =>
                s.path === file.path
                  ? {
                      ...s,
                      status: 'error' as const,
                      errorMessage: err instanceof Error ? err.message : 'Error',
                    }
                  : s,
              ),
            );
          }
        }
      })();
    },
    [queue],
  );

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setViewState({ phase: 'empty' });
    setSelectedPath(null);
    setIsBatchMode(false);
    setBatchFiles([]);
  }, []);

  const handleClearRecent = useCallback(() => {
    void clearRecentFiles().then(() => setRecentFiles([]));
  }, []);

  const handleOpenLink = useCallback((url: string) => {
    void openUrl(url);
  }, []);

  const batchDone = batchFiles.filter((f) => f.status === 'done' || f.status === 'error').length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 text-base">MetaScrub</span>
          <span className="text-xs text-gray-400">v0.1.0</span>
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 1 && !isBatchMode && (
            <button
              onClick={() => setIsBatchMode(true)}
              className="text-xs text-blue-500 hover:text-blue-600 underline"
            >
              Batch mode ({queue.length} files)
            </button>
          )}
          {(viewState.phase !== 'empty' || queue.length > 0) && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      {/* Three-pane body */}
      <div className="pane-container">
        {/* LEFT: file list */}
        <div className="pane-left">
          <FileList
            files={queue}
            selectedPath={selectedPath}
            recentFiles={recentFiles}
            onSelectFile={handleSelectFile}
            onDropFiles={handleDropFiles}
            onPickFiles={() => void handlePickFiles()}
            onSelectRecent={handleSelectRecent}
            onClearRecent={handleClearRecent}
          />
        </div>

        {/* MIDDLE: metadata detail */}
        <div className="pane-middle">
          {viewState.phase === 'empty' && !isBatchMode && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">Select a file to inspect its metadata</p>
            </div>
          )}

          {viewState.phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Parsing {viewState.filename}…</p>
            </div>
          )}

          {(viewState.phase === 'loaded' || viewState.phase === 'scrubbing') && (
            <MetadataView result={viewState.result} filename={viewState.filename} />
          )}

          {viewState.phase === 'error' && (
            <div className="p-6">
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-700">Error</p>
                <p className="text-sm text-red-600 mt-1">{viewState.message}</p>
              </div>
              <button
                onClick={handleReset}
                className="mt-3 w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          )}

          {isBatchMode && batchFiles.length > 0 && (
            <BatchProgress total={batchFiles.length} done={batchDone} files={batchFiles} />
          )}
        </div>

        {/* RIGHT: scrub options + batch progress */}
        <div className="pane-right bg-gray-50 border-l border-gray-200">
          {isBatchMode ? (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Batch scrub
              </p>
              <ScrubPanel onScrub={handleBatchScrub} disabled={batchDone > 0 && batchDone < batchFiles.length} />
            </div>
          ) : (
            <ScrubPanel
              onScrub={handleScrub}
              disabled={
                viewState.phase !== 'loaded' ||
                viewState.phase === ('scrubbing' as typeof viewState.phase)
              }
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-1.5 border-t border-gray-100 bg-white shrink-0 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <button
            onClick={() => handleOpenLink('https://metadatafinder.com')}
            className="text-blue-500 hover:underline cursor-pointer"
          >
            metadatafinder.com
          </button>
        </p>
      </footer>
    </div>
  );
}
