import { useEffect, useState } from 'react';
import { parse, detectFormat } from '@metascrub/core';
import type { MetadataResult } from '@metascrub/core';
import { MetadataGroup, formatBytes } from '../components/MetadataGroup.js';
import { Warning } from '../components/Warning.js';
import { navigate } from '../lib/route.js';
import { readFileByPath } from '../lib/pick-file.js';
import { addRecentFile } from '../lib/recent-files.js';

interface FileScreenProps {
  filePath: string;
  fromShare?: boolean;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: MetadataResult; filename: string };

export function FileScreen({ filePath, fromShare }: FileScreenProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    void loadFile(filePath);
  }, [filePath]);

  const loadFile = async (path: string) => {
    setState({ status: 'loading' });

    try {
      let bytes: Uint8Array;
      let filename: string;

      if (path.startsWith('__web__:')) {
        // Web fallback — bytes stashed in sessionStorage
        filename = path.slice('__web__:'.length);
        const b64 = sessionStorage.getItem('metascrub.pendingFile.data');
        if (!b64) throw new Error('File data not found in session');
        bytes = base64ToUint8Array(b64);
      } else {
        const file = await readFileByPath(path);
        if (!file) throw new Error('Could not read file');
        bytes = file.data;
        filename = file.name;
      }

      const result = await parse({ kind: 'bytes', data: bytes, filename });

      // Track in recents
      void addRecentFile({
        name: filename,
        path,
        format: result.format,
        sizeBytes: result.sizeBytes,
        processedAt: new Date().toISOString(),
        scrubbed: false,
      });

      setState({ status: 'ready', result, filename });
    } catch (err) {
      setState({ status: 'error', message: String(err) });
    }
  };

  if (state.status === 'loading') {
    return (
      <main className="screen file-screen loading-screen">
        <div className="spinner" aria-label="Loading file..." />
        <p>Analyzing file...</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="screen file-screen error-screen">
        <p className="error-message">{state.message}</p>
        <button className="btn-secondary" onClick={() => navigate({ name: 'home' })}>
          Go back
        </button>
      </main>
    );
  }

  const { result, filename } = state;
  const namespaces = Object.entries(result.groups);
  const totalFields = namespaces.reduce((sum, [, fields]) => sum + fields.length, 0);

  const isImage = ['jpeg', 'png', 'heic', 'webp', 'avif', 'tiff'].includes(result.format);

  return (
    <main className="screen file-screen">
      <header className="file-header">
        <button className="back-button" onClick={() => navigate({ name: 'home' })} aria-label="Back">
          &#8249; Back
        </button>
        {fromShare && (
          <span className="share-badge">Shared file</span>
        )}
      </header>

      {/* File summary */}
      <div className="file-summary">
        {isImage && filePath && !filePath.startsWith('__web__:') && (
          <div className="file-thumbnail" aria-label="File thumbnail">
            <img
              src={filePath.startsWith('file://') ? filePath : `capacitor://localhost/_capacitor_file_${filePath}`}
              alt={filename}
              className="thumbnail-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="file-info">
          <p className="file-name">{filename}</p>
          <p className="file-meta">
            {result.format.toUpperCase()} · {formatBytes(result.sizeBytes)} · {totalFields} fields
          </p>
          {result.highlights.capturedAt && (
            <p className="file-captured">
              Captured: {new Date(result.highlights.capturedAt).toLocaleString()}
            </p>
          )}
          {result.highlights.device && (
            <p className="file-device">
              Device: {[result.highlights.device.make, result.highlights.device.model].filter(Boolean).join(' ')}
            </p>
          )}
          {result.highlights.gps && (
            <p className="file-gps warning-text">
              GPS: {result.highlights.gps.lat.toFixed(6)}, {result.highlights.gps.lon.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      {/* Warnings */}
      <Warning warnings={result.warnings} />

      {/* Scrub button */}
      <div className="file-actions">
        <button
          className="btn-primary"
          onClick={() => navigate({ name: 'scrub', path: filePath })}
        >
          Scrub Metadata
        </button>
      </div>

      {/* Metadata groups */}
      <section className="metadata-section">
        <h2 className="section-title">Metadata ({totalFields} fields)</h2>
        {namespaces.length === 0 ? (
          <p className="no-metadata">No metadata found.</p>
        ) : (
          namespaces.map(([namespace, fields], idx) => (
            <MetadataGroup
              key={namespace}
              namespace={namespace}
              fields={fields}
              defaultOpen={idx === 0}
            />
          ))
        )}
      </section>
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

// Prevent unused import warning — detectFormat is re-exported for consumers
export { detectFormat };
