import { useState, useEffect, useCallback } from 'react';
import { parse, scrub } from '@metascrub/core/browser';
import type { MetadataResult, ScrubPreset } from '@metascrub/core';
import { FileDrop } from './components/FileDrop.js';
import { MetadataView } from './components/MetadataView.js';
import { ScrubPanel } from './components/ScrubPanel.js';

type AppState =
  | { phase: 'empty' }
  | { phase: 'loading'; filename: string }
  | { phase: 'loaded'; result: MetadataResult; filename: string; bytes: Uint8Array }
  | { phase: 'scrubbing'; result: MetadataResult; filename: string; bytes: Uint8Array }
  | { phase: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'empty' });

  // On mount, check if the background stashed a pending URL from context menu
  useEffect(() => {
    void (async () => {
      try {
        const session = await chrome.storage.session.get('pendingUrl');
        const pendingUrl = session['pendingUrl'] as string | undefined;
        if (pendingUrl) {
          await chrome.storage.session.remove('pendingUrl');
          void loadUrl(pendingUrl);
        }
      } catch {
        // storage.session may not be available in all contexts; ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBytes = useCallback(async (bytes: Uint8Array, filename: string) => {
    setState({ phase: 'loading', filename });
    try {
      const result = await parse({ kind: 'bytes', data: bytes, filename });
      setState({ phase: 'loaded', result, filename, bytes });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse file',
      });
    }
  }, []);

  const loadUrl = useCallback(
    async (url: string) => {
      const filename = url.split('/').pop() ?? 'file';
      setState({ phase: 'loading', filename });
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        await loadBytes(bytes, filename);
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch URL',
        });
      }
    },
    [loadBytes],
  );

  const handleFile = useCallback(
    (file: File) => {
      void (async () => {
        const buffer = await file.arrayBuffer();
        await loadBytes(new Uint8Array(buffer), file.name);
      })();
    },
    [loadBytes],
  );

  const handleScrub = useCallback(
    (preset: ScrubPreset) => {
      if (state.phase !== 'loaded') return;
      const { bytes, filename, result } = state;
      setState({ phase: 'scrubbing', result, filename, bytes });

      void (async () => {
        try {
          const cleaned = await scrub({ kind: 'bytes', data: bytes, filename }, { preset });
          const dotIndex = filename.lastIndexOf('.');
          const cleanedName =
            dotIndex === -1
              ? `${filename}-cleaned`
              : `${filename.slice(0, dotIndex)}-cleaned${filename.slice(dotIndex)}`;

          const blob = new Blob([new Uint8Array(cleaned)]);
          const blobUrl = URL.createObjectURL(blob);
          chrome.downloads.download({ url: blobUrl, filename: cleanedName, saveAs: false }, () => {
            URL.revokeObjectURL(blobUrl);
          });
          setState({ phase: 'loaded', result, filename, bytes });
        } catch (err) {
          setState({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Scrub failed',
          });
        }
      })();
    },
    [state],
  );

  const handleReset = useCallback(() => {
    setState({ phase: 'empty' });
  }, []);

  return (
    <div
      className="flex flex-col min-h-full bg-white text-gray-900"
      style={{ width: 380, minHeight: 480 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <img src="/icons/48.png" alt="" className="w-6 h-6" />
          <span className="font-semibold text-gray-800">MetaScrub</span>
        </div>
        {(state.phase === 'loaded' || state.phase === 'scrubbing' || state.phase === 'error') && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            New file
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {state.phase === 'empty' && <FileDrop onFile={handleFile} />}

        {state.phase === 'loading' && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Parsing {state.filename}…</p>
          </div>
        )}

        {(state.phase === 'loaded' || state.phase === 'scrubbing') && (
          <div>
            <MetadataView result={state.result} filename={state.filename} />
            <ScrubPanel onScrub={handleScrub} disabled={state.phase === 'scrubbing'} />
          </div>
        )}

        {state.phase === 'error' && (
          <div className="p-4">
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-medium text-red-700">Error</p>
              <p className="text-sm text-red-600 mt-1">{state.message}</p>
            </div>
            <button
              onClick={handleReset}
              className="mt-3 w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <a
            href="https://metadatafinder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            metadatafinder.com
          </a>
        </p>
      </footer>
    </div>
  );
}
