import { useEffect, useState } from 'react';
import { parse, scrub } from '@metascrub/core';
import type { ScrubPreset } from '@metascrub/core';
import { PresetPicker } from '../components/PresetPicker.js';
import { navigate } from '../lib/route.js';
import { readFileByPath } from '../lib/pick-file.js';
import { saveScrubbedFile, shareFile } from '../lib/save-file.js';
import { addRecentFile } from '../lib/recent-files.js';
import { getSettings, incrementScrubCount } from '../lib/settings.js';

interface ScrubScreenProps {
  filePath: string;
}

type ScrubState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; filename: string; bytes: Uint8Array; fieldCount: number }
  | { status: 'scrubbing' }
  | { status: 'done'; savedPath: string; filename: string; canShare: boolean }
  | { status: 'error'; message: string };

export function ScrubScreen({ filePath }: ScrubScreenProps) {
  const [state, setState] = useState<ScrubState>({ status: 'loading' });
  const [preset, setPreset] = useState<ScrubPreset>('all');

  useEffect(() => {
    void loadDefaults();
    void loadFile(filePath);
  }, [filePath]);

  const loadDefaults = async () => {
    const settings = await getSettings();
    setPreset(settings.defaultPreset);
  };

  const loadFile = async (path: string) => {
    if (!path) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    try {
      let bytes: Uint8Array;
      let filename: string;

      if (path.startsWith('__web__:')) {
        filename = path.slice('__web__:'.length);
        const b64 = sessionStorage.getItem('metascrub.pendingFile.data');
        if (!b64) throw new Error('File data not found');
        bytes = base64ToUint8Array(b64);
      } else {
        const file = await readFileByPath(path);
        if (!file) throw new Error('Could not read file');
        bytes = file.data;
        filename = file.name;
      }

      const result = await parse({ kind: 'bytes', data: bytes, filename });
      const fieldCount = Object.values(result.groups).reduce((s, f) => s + f.length, 0);
      setState({ status: 'ready', filename, bytes, fieldCount });
    } catch (err) {
      setState({ status: 'error', message: String(err) });
    }
  };

  const handleScrub = async () => {
    if (state.status !== 'ready') return;
    setState({ status: 'scrubbing' });
    try {
      const scrubbedBytes = await scrub(
        { kind: 'bytes', data: state.bytes, filename: state.filename },
        { preset }
      );

      const saveResult = await saveScrubbedFile(scrubbedBytes, state.filename);

      // Track in recents
      void addRecentFile({
        name: state.filename,
        path: filePath,
        format: state.filename.split('.').pop() ?? 'unknown',
        sizeBytes: scrubbedBytes.byteLength,
        processedAt: new Date().toISOString(),
        scrubbed: true,
      });

      void incrementScrubCount();

      setState({
        status: 'done',
        savedPath: saveResult.savedPath,
        filename: state.filename,
        canShare: saveResult.canShare,
      });
    } catch (err) {
      setState({ status: 'error', message: String(err) });
    }
  };

  if (state.status === 'idle') {
    return (
      <main className="screen scrub-screen">
        <header className="screen-header">
          <h1 className="screen-title">Scrub</h1>
          <p className="screen-subtitle">Pick a file first from the Home tab.</p>
        </header>
      </main>
    );
  }

  if (state.status === 'loading') {
    return (
      <main className="screen scrub-screen loading-screen">
        <div className="spinner" aria-label="Loading..." />
        <p>Loading file...</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="screen scrub-screen error-screen">
        <p className="error-message">{state.message}</p>
        <button className="btn-secondary" onClick={() => navigate({ name: 'home' })}>
          Go back
        </button>
      </main>
    );
  }

  if (state.status === 'done') {
    return (
      <main className="screen scrub-screen done-screen">
        <div className="done-icon" aria-hidden="true">&#10003;</div>
        <h2 className="done-title">File scrubbed!</h2>
        <p className="done-subtitle">Saved to Files as {state.filename}</p>
        <div className="done-actions">
          {state.canShare && (
            <button
              className="btn-primary"
              onClick={() => void shareFile(state.savedPath, state.filename)}
            >
              Share cleaned copy
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate({ name: 'home' })}>
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const isReady = state.status === 'ready';
  const isScrubbing = state.status === 'scrubbing';

  return (
    <main className="screen scrub-screen">
      <header className="screen-header">
        <button className="back-button" onClick={() => navigate({ name: 'file', path: filePath })} aria-label="Back">
          &#8249; Back
        </button>
        <h1 className="screen-title">Scrub</h1>
      </header>

      {isReady && (
        <div className="scrub-file-info">
          <p className="scrub-filename">{state.filename}</p>
          <p className="scrub-field-count">{state.fieldCount} metadata fields will be affected</p>
        </div>
      )}

      <section className="scrub-preset-section">
        <h2 className="section-title">Choose preset</h2>
        <PresetPicker selected={preset} onChange={setPreset} />
      </section>

      <div className="scrub-actions">
        <button
          className="btn-primary btn-large"
          onClick={() => void handleScrub()}
          disabled={isScrubbing || !isReady}
        >
          {isScrubbing ? (
            <>
              <span className="spinner-inline" aria-hidden="true" /> Scrubbing...
            </>
          ) : (
            'Scrub Metadata'
          )}
        </button>
      </div>
    </main>
  );
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
