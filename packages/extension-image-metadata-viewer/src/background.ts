import { loadImageFromUrl, type ImageFacts } from './inspect';
import { HOST_PERMISSION_MESSAGE, resolveHostAccess } from './permissions';
import { detectUtmSource, type UtmSource } from './utm';

export const MENU_ID = 'showImageMetadata';

const HOST_ORIGINS = ['<all_urls>'];

interface ShowMetadataMessage {
  action: 'showMetadata';
  imageUrl: string;
  facts: ImageFacts | null;
  errorMessage: string | null;
  utmSource: UtmSource;
}

function installMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Show Image Metadata',
      contexts: ['image'],
    });
  });
}

installMenu();
chrome.runtime.onInstalled.addListener(() => {
  installMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl || tab?.id == null) return;
  const tabId = tab.id;
  const imageUrl = info.srcUrl;
  // Ask immediately so Firefox still treats this as the context-menu gesture.
  const access = resolveHostAccess(
    () => chrome.permissions.contains({ origins: HOST_ORIGINS }),
    () => chrome.permissions.request({ origins: HOST_ORIGINS }),
  );
  void access
    .then((allowed) => openOverlay(tabId, imageUrl, allowed))
    .catch((error: unknown) => {
      console.error('Image Metadata Viewer failed to open', error);
    });
});

async function openOverlay(tabId: number, imageUrl: string, allowed: boolean): Promise<void> {
  const utmSource = detectUtmSource(navigator.userAgent);
  let facts: ImageFacts | null = null;
  let errorMessage: string | null = null;
  if (!allowed) {
    errorMessage = HOST_PERMISSION_MESSAGE;
  } else {
    try {
      facts = await loadImageFromUrl(imageUrl);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not read this image.';
    }
  }
  await chrome.scripting.insertCSS({ target: { tabId }, files: ['style.css'] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  const message: ShowMetadataMessage = {
    action: 'showMetadata',
    imageUrl,
    facts,
    errorMessage,
    utmSource,
  };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('Image Metadata Viewer could not reach the page', error);
  }
}

const api = { loadImage: loadImageFromUrl, detectUtmSource };
(globalThis as typeof globalThis & { imageMetadataViewer?: typeof api }).imageMetadataViewer = api;
