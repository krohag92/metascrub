# Image Metadata Viewer — privacy policy

**Product:** Image Metadata Viewer (browser extension)
**Version:** 1.1.0
**Effective:** 2026-10-25
**Contact:** privacy@metadatafinder.com

This document is the policy for the Image Metadata Viewer extension (Chrome Web Store item `cflaiadbiijlghmaigkmdajbkbjnjjeo`, and the Firefox, Edge, and Opera packages built from the same source). It is meant to be hosted with the listing. It is not the policy for the separate MetaScrub scrubber extension.

## Summary

The extension collects no data. It does not have an account, analytics, or a server of its own. Image bytes are read on your device, shown in an overlay, and then discarded.

## What the extension does

When you right-click an image and choose **Show Image Metadata**, the extension:

1. Reads the image's address, alt text, title, and on-screen size from the page.
2. Downloads that image's bytes in the extension background so it can read the file size, type, pixel dimensions, and EXIF tags.
3. Shows those values in an overlay on the page.

The download uses the same image URL the page already used. The bytes are not uploaded anywhere and are not written to disk by the extension.

## What is not collected

The extension does not collect, transmit, or store:

- image bytes or the metadata it reads
- page URLs, browsing history, or bookmarks
- IP address, device identifiers, or account details
- crash reports or usage analytics

There is no `storage` permission and no background sync. Closing the overlay drops the result.

## Permissions

| Permission                 | Why                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextMenus`             | Add **Show Image Metadata** to the image right-click menu.                                                                                                                                                                                                                                                                                                                                                              |
| `activeTab`                | Talk to the tab you just clicked.                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripting`                | Insert the overlay and its stylesheet only after you choose the menu item. The extension does not inject CSS into every page.                                                                                                                                                                                                                                                                                           |
| Host access (`<all_urls>`) | Download the image you clicked when it is hosted on another site. Page scripts cannot do that when the image server does not send CORS headers. On Chrome, Edge, and Opera this is granted at install (the same grant as version 1.0). On Firefox it is requested the first time you use the menu. If you deny it, the overlay still shows alt text and on-screen size, and explains that the file itself was not read. |

## Hosting this policy

`https://metadatafinder.com/extension/privacy` currently returns **404** (checked 2026-10-25). Do not send reviewers there until that URL serves this document (or a page that says the same thing).

`https://metadatafinder.com/privacy-policy-for-chrome-extension` returns 200, but it describes the MetaScrub scrubber extension, not this viewer. Use this file for Image Metadata Viewer listings instead of that page.

The extension homepage field points at `https://metadatafinder.com/jpg-metadata-viewer`, which is the online image metadata viewer.
