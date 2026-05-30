import { useEffect, useState } from 'react';
import { RecentFilesList } from '../components/RecentFilesList.js';
import { getRecentFiles } from '../lib/recent-files.js';
import { pickFile } from '../lib/pick-file.js';
import { navigate } from '../lib/route.js';
import type { RecentFile } from '../lib/recent-files.js';

export function HomeScreen() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getRecentFiles().then((files) => {
      setRecentFiles(files);
      setLoading(false);
    });
  }, []);

  const handlePickFile = async () => {
    const file = await pickFile();
    if (!file) return;
    // Navigate to file screen; path may be empty for web/blob files,
    // we'll store the file data in sessionStorage keyed by name.
    if (file.path) {
      navigate({ name: 'file', path: file.path });
    } else {
      // Web fallback: stash bytes in sessionStorage (small files only)
      try {
        const b64 = btoa(String.fromCharCode(...Array.from(file.data)));
        sessionStorage.setItem('metascrub.pendingFile.data', b64);
        sessionStorage.setItem('metascrub.pendingFile.name', file.name);
        sessionStorage.setItem('metascrub.pendingFile.mime', file.mimeType);
      } catch {
        // large file — navigate anyway, FileScreen handles missing data gracefully
      }
      navigate({ name: 'file', path: `__web__:${file.name}` });
    }
  };

  return (
    <main className="screen home-screen">
      <header className="screen-header">
        <h1 className="screen-title">MetaScrub</h1>
        <p className="screen-subtitle">See and strip metadata from any file</p>
      </header>

      <section className="home-actions">
        <button className="btn-primary btn-large" onClick={() => void handlePickFile()}>
          Pick a file
        </button>
        <p className="share-tip">
          Or share to MetaScrub from Photos, Files, or any other app.
        </p>
      </section>

      <section className="recent-section">
        <h2 className="section-title">Recent files</h2>
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <RecentFilesList files={recentFiles} />
        )}
      </section>

      <footer className="home-footer">
        <a
          href="https://metadatafinder.com"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Powered by metadatafinder.com
        </a>
      </footer>
    </main>
  );
}
