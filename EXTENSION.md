# Browser Extension

Single codebase for Chrome, Firefox, Edge, Opera, and (with a thin wrapper) Safari. Built with Manifest V3, Vite, and `@metascrub/core` for parsing.

## Goals

- Right-click any image on a page → "View metadata" / "Download cleaned copy".
- Drag-and-drop popup for files from disk.
- All processing client-side (privacy-first). No network calls except optional "Open in metadatafinder.com" link.
- Same UI for Chrome / Firefox / Edge / Opera.

## Features

1. **Context menu on images** — right-click an `<img>` or media URL → fetch bytes → show metadata in a popup.
2. **Popup file picker** — open extension popup, drop file, see metadata.
3. **Scrub from popup** — pick preset, click Scrub, download result.
4. **Batch mode** — drag multiple files at once.
5. **Settings** — default scrub preset, "always show warnings" toggle, link to metadatafinder.com.

## Folder layout

```
packages/extension/
├── package.json
├── vite.config.ts
├── manifest.json             # MV3 base
├── manifest.firefox.json     # MV3 Firefox-specific overrides
├── src/
│   ├── background.ts         # service worker — context menus, message bus
│   ├── content.ts            # optional content script for in-page badges
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── FileDrop.tsx
│   │       ├── MetadataView.tsx
│   │       ├── ScrubPanel.tsx
│   │       └── WarningBadge.tsx
│   ├── options/
│   │   ├── index.html
│   │   └── main.tsx
│   ├── lib/
│   │   ├── fetch-bytes.ts    # download image from URL with CORS handling
│   │   └── download.ts       # trigger file download from Uint8Array
│   └── styles.css
├── public/
│   └── icons/
│       ├── 16.png 32.png 48.png 128.png
└── README.md
```

## manifest.json (MV3)

```json
{
  "manifest_version": 3,
  "name": "MetaScrub — Metadata Viewer & Scrubber",
  "version": "0.1.0",
  "description": "View and strip EXIF, GPS, and document metadata from any file. Powered by metadatafinder.com.",
  "homepage_url": "https://metadatafinder.com",
  "icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" },
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "MetaScrub",
    "default_icon": "icons/32.png"
  },
  "background": { "service_worker": "src/background.ts", "type": "module" },
  "permissions": ["contextMenus", "downloads", "storage"],
  "host_permissions": ["<all_urls>"],
  "options_page": "src/options/index.html"
}
```

Firefox needs `"browser_specific_settings": { "gecko": { "id": "metascrub@metadatafinder.com" } }` and prefers MV2 if Vivaldi/older Firefox is a target.

## Context menu logic (`background.ts`)

```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'view-metadata',
    title: 'View metadata',
    contexts: ['image', 'video', 'audio', 'link']
  });
  chrome.contextMenus.create({
    id: 'scrub-metadata',
    title: 'Download cleaned copy',
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.srcUrl ?? info.linkUrl;
  if (!url) return;
  if (info.menuItemId === 'view-metadata') {
    // open popup pre-loaded with this URL via storage
    await chrome.storage.session.set({ pendingUrl: url });
    chrome.action.openPopup?.();
  } else if (info.menuItemId === 'scrub-metadata') {
    const bytes = await fetchBytes(url);
    const cleaned = await scrub({ kind: 'bytes', data: bytes }, { preset: 'all' });
    await downloadBytes(cleaned, suggestedFilename(url));
  }
});
```

## Popup UX

Three states:
1. **Empty** — drop zone, "Or right-click any image on the page".
2. **Loaded** — show file info, list metadata grouped by namespace, warnings at top in red.
3. **Scrub** — choose preset, click "Scrub & download".

Footer: "Powered by [metadatafinder.com](https://metadatafinder.com)" (the link must be there for SEO).

Visual style: clean, minimal, system font stack, no heavy framework. React + Tailwind utilities only (no shadcn/UI to keep bundle small).

## Build

Vite + `@crxjs/vite-plugin` for the bundling.

```bash
pnpm build              # outputs dist/
pnpm build:firefox      # outputs dist-firefox/
pnpm zip                # produces dist.zip for store upload
pnpm zip:firefox        # produces dist-firefox.zip
```

Bundle target size: under 500KB unpacked.

## Distribution (5 stores from 1 codebase)

| Store | Output | Notes |
|---|---|---|
| Chrome Web Store | `dist.zip` | $5 one-time dev fee, review usually 1-3 days |
| Microsoft Edge Add-ons | `dist.zip` (same) | Free, ~1 week review |
| Opera Add-ons | `dist.zip` (same) | Free, faster review |
| Firefox AMO | `dist-firefox.zip` | Needs Firefox-specific manifest tweaks |
| Safari Extensions | Wrapped via Xcode | Most effort — postpone to v0.2 |

## Store listing copy (re-use across stores)

**Short description (132 chars):**
> View and strip EXIF, GPS, and document metadata from any file. Privacy-first. Powered by metadatafinder.com.

**Long description:** include the link to metadatafinder.com, list features, list supported formats, screenshot captions. See DISTRIBUTION.md for full listing copy.

## Privacy policy

Required for Chrome Web Store. Host a simple page at:
`https://metadatafinder.com/extension/privacy`

Content (rough):
> MetaScrub processes files entirely in your browser. No file data, metadata, or URLs are sent to any server. Settings are stored locally using `chrome.storage`. The extension does not collect analytics. — metadatafinder.com

## Permissions justification (Chrome Web Store form)

- `contextMenus` — add "View metadata" right-click option.
- `downloads` — save cleaned files to disk.
- `storage` — remember user's default scrub preset.
- `<all_urls>` — needed to fetch image bytes from the current page when the user right-clicks an image.

Be explicit and honest, otherwise Chrome rejects it.

## Testing

- Unit tests for popup components with Vitest + Testing Library.
- E2E with Playwright using `--load-extension` flag.
- Manual test matrix: Chrome stable, Firefox stable, Edge stable, on Windows + macOS.

## README

Must include:
- Install links to all 5 stores
- Screenshot of context menu and popup
- "Web version: https://metadatafinder.com" prominently
- "CLI: `npm install -g metascrub`" cross-link
- Permission rationale
- License (MIT)
