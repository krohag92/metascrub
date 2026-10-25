import type { ImageFacts } from './inspect';
import { bindDrag, renderOverlay, type OverlayModel } from './overlay';
import type { UtmSource } from './utm';

interface ShowMetadataMessage {
  action: 'showMetadata';
  imageUrl: string;
  facts: ImageFacts | null;
  errorMessage: string | null;
  utmSource: UtmSource;
}

const LOADED = '__imageMetadataViewerLoaded';

function boot(): void {
  const flagHost = globalThis as typeof globalThis & { [LOADED]?: boolean };
  if (flagHost[LOADED]) return;
  flagHost[LOADED] = true;

  let current: HTMLElement | null = null;
  bindDrag(document, () => current);

  chrome.runtime.onMessage.addListener((request: ShowMetadataMessage) => {
    if (request?.action !== 'showMetadata') return;
    show(request);
  });

  function show(request: ShowMetadataMessage): void {
    current?.remove();
    const image = findImage(request.imageUrl);
    const model: OverlayModel = {
      imageUrl: request.imageUrl,
      alt: image?.getAttribute('alt') ?? null,
      title: image?.getAttribute('title') ?? null,
      displayedWidth: image ? image.clientWidth : null,
      displayedHeight: image ? image.clientHeight : null,
      facts: request.facts,
      errorMessage: request.errorMessage,
      utmSource: request.utmSource,
    };
    current = renderOverlay(document, model, () => {
      current = null;
    });
    document.documentElement.append(current);
  }
}

function findImage(url: string): HTMLImageElement | null {
  for (const image of document.images) {
    if (image.currentSrc === url || image.src === url) return image;
  }
  return null;
}

boot();
