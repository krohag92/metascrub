import { scrub } from '@metascrub/core/browser';
import { fetchBytes } from './lib/fetch-bytes.js';
import { downloadBytes } from './lib/download.js';

function suggestedFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').pop() ?? 'cleaned-file';
    const dotIndex = base.lastIndexOf('.');
    if (dotIndex === -1) return `${base}-cleaned`;
    return `${base.slice(0, dotIndex)}-cleaned${base.slice(dotIndex)}`;
  } catch {
    return 'cleaned-file';
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'view-metadata',
    title: 'View metadata',
    contexts: ['image', 'video', 'audio', 'link'],
  });
  chrome.contextMenus.create({
    id: 'scrub-metadata',
    title: 'Download cleaned copy',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener((info, _tab) => {
  void (async () => {
    const url = info.srcUrl ?? info.linkUrl;
    if (!url) return;

    if (info.menuItemId === 'view-metadata') {
      await chrome.storage.session.set({ pendingUrl: url });
      // openPopup is available in MV3 Chrome 99+; gracefully skip if unavailable
      if (chrome.action.openPopup) {
        await chrome.action.openPopup();
      }
    } else if (info.menuItemId === 'scrub-metadata') {
      try {
        const bytes = await fetchBytes(url);
        const cleaned = await scrub(
          { kind: 'bytes', data: bytes, filename: suggestedFilename(url) },
          { preset: 'all' },
        );
        await downloadBytes(cleaned, suggestedFilename(url));
      } catch (err) {
        console.error('[MetaScrub] scrub failed:', err);
      }
    }
  })();
});
