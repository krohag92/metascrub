# Image Metadata Viewer

Right-click any image and read its EXIF, dimensions, and file size. The bytes stay on your device.

**Online viewer:** [https://metadatafinder.com/jpg-metadata-viewer](https://metadatafinder.com/jpg-metadata-viewer)

This is the source of the extension already listed on the Chrome Web Store as **Image Metadata Viewer** (`cflaiadbiijlghmaigkmdajbkbjnjjeo`, version 1.0). Version 1.1.0 is an update to that listing, not a new item. It is a separate product from the unpublished MetaScrub scrubber in `packages/extension`.

## What changed from the store package

- Image bytes are downloaded in the extension background, which has host permission, so cross-origin images are no longer blocked by CORS. The old build fetched from the page and showed "Error" whenever the image server omitted `Access-Control-Allow-Origin`.
- EXIF values, alt text, titles, and URLs are written with `textContent`. `javascript:` URLs are not turned into links.
- Drag listeners are registered once per page, not once per overlay.
- The stylesheet is inserted when you open the overlay, not on every page at `document_start`.
- The "Powered by MetadataFinder.com" link has no stray line break. `utm_source` is `chrome_extension`, `firefox_extension`, `edge_extension`, or `opera_extension`.

EXIF parsing uses the unmodified npm package `exifreader@4.31.0` (MPL-2.0). See `NOTICE.md`.

## Build

```bash
pnpm install
pnpm --filter image-metadata-viewer build
```

Outputs:

| File                                      | Where it goes                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| `dist/image-metadata-viewer-chromium.zip` | Chrome, Edge, and Opera (Manifest V3 service worker)           |
| `dist/image-metadata-viewer-firefox.zip`  | Firefox Add-ons, id `image-metadata-viewer@metadatafinder.com` |

Icons come from the repo brand kit (`pnpm brand:icons`).

## Tests

```bash
pnpm --filter image-metadata-viewer test
```

`test/load-image.test.ts` downloads the fixture JPEG from a local server that sends no `Access-Control-Allow-Origin`. `test/cross-origin.browser.test.ts` loads the unpacked Chromium build in headless Chrome for Testing (branded Google Chrome ignores `--load-extension`), opens a page whose image is on another port, and checks three things: the page `fetch` throws, the service worker still reads the camera tag, and the overlay shows that text without turning alt text into HTML. The powered-by link uses `utm_source=chrome_extension` and contains no whitespace. Point `CHROME_BIN` at Chrome for Testing or Chromium if it is not on the default path. That browser test skips when only branded Google Chrome is installed.

## Before store submission

Do not upload this from an automated session. A person with the store accounts still needs to:

1. Set the privacy policy URL to https://metadatafinder.com/extension/privacy (`PRIVACY.md`). Contact is admin@metadatafinder.com. Do not use `/privacy-policy-for-chrome-extension` — that page describes the MetaScrub scrubber.
2. Upload `dist/image-metadata-viewer-chromium.zip` as version **1.1.0** of the existing Chrome item `cflaiadbiijlghmaigkmdajbkbjnjjeo` (not as a new extension). Edge and Opera can use that same zip.
3. Submit `dist/image-metadata-viewer-firefox.zip` to AMO. `data_collection_permissions.required` is `none`. Point reviewers at `exifreader@4.31.0` on npm for the MPL library source.
4. Add store screenshots (the overlay on a normal webpage, including a cross-origin image). Listing copy should say that processing is local and link to the JPG metadata viewer above.

Part of the Metadata Finder toolkit — https://metadatafinder.com
