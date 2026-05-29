# Integrations

Smaller wrappers that reuse `@metascrub/core` (or the Python package, or the API). Each one is a separate dist channel.

## 1. VS Code Extension

**Purpose**: right-click file in Explorer → "View metadata"; or click an image in the editor.

```
packages/vscode/
├── package.json              # contributes commands, menus, viewType
├── src/extension.ts          # activation, command handlers
├── src/MetadataPanel.ts      # WebView panel
└── README.md
```

`package.json` highlights:

```json
{
  "name": "metascrub",
  "displayName": "MetaScrub — Metadata Viewer",
  "description": "View metadata of images, PDFs, DOCX, and more — without leaving VS Code.",
  "publisher": "metadatafinder",
  "homepage": "https://metadatafinder.com",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onCommand:metascrub.view"],
  "contributes": {
    "commands": [{ "command": "metascrub.view", "title": "MetaScrub: View metadata" }],
    "menus": {
      "explorer/context": [{ "command": "metascrub.view", "when": "resourceExtname =~ /\\.(jpg|jpeg|png|heic|webp|tiff|pdf|docx|xlsx|pptx|mp3|mp4|mov)$/i" }]
    }
  }
}
```

Imports `@metascrub/core` and renders metadata in a WebView. Bundle with esbuild. Submit to VS Code Marketplace (DR 95).

---

## 2. Obsidian Plugin

**Purpose**: scan vault for attachments with sensitive metadata; warn the user.

```
packages/obsidian/
├── manifest.json
├── main.ts                   # extends Plugin, adds commands & ribbon
├── src/scanner.ts            # walks vault, runs parse() on attachments
└── README.md
```

Features:
- Command "MetaScrub: Scan attachments" — lists files with warnings.
- Right-click attachment → "View metadata" / "Scrub".
- Status bar pill showing count of unscrubbed sensitive attachments.

Submit to Obsidian Community Plugins (DR 88). PR to `obsidianmd/obsidian-releases`.

---

## 3. Raycast Extension

**Purpose**: macOS power users get instant metadata view + scrub.

```
packages/raycast/
├── package.json              # Raycast extension manifest
├── src/
│   ├── view-metadata.tsx     # accepts file from Raycast file picker
│   └── scrub.tsx
└── README.md
```

Two commands: "View metadata" and "Scrub". Use Raycast's built-in components (List, Detail).

Submit to Raycast Store (DR 84). Their store is well-curated; they require quality screenshots.

---

## 4. n8n Community Node

**Purpose**: n8n users can drop a "MetaScrub" node into a workflow.

```
packages/n8n-node/
├── package.json              # name: n8n-nodes-metascrub
├── nodes/
│   └── MetaScrub/
│       ├── MetaScrub.node.ts
│       └── metascrub.svg
└── README.md
```

Operations:
- Parse → returns metadata as JSON
- Scrub → returns binary

Publish to NPM with `n8n-nodes-metascrub`, list at n8n.io community nodes (DR 79). Anton can also use it himself in his n8n workflows.

---

## 5. Make.com / Zapier integrations

Skip in v0.1 — they require maintaining "connected app" listings with their proprietary tooling. Revisit after CLI + API are stable.

When ready:
- Zapier: build via Zapier Platform CLI, two actions (Parse, Scrub). Requires app review.
- Make.com: build via Make's app builder.

---

## 6. WordPress Plugin

**Purpose**: when a user uploads media to WordPress, scrub sensitive metadata automatically. Optional bulk-clean tool for existing media library.

```
wordpress/
├── metascrub.php             # main plugin file
├── readme.txt                # WP plugin directory metadata
├── includes/
│   ├── class-metascrub.php
│   ├── class-uploader-hook.php
│   ├── class-bulk-cleaner.php
│   └── class-settings.php
├── assets/
│   └── icon.png
└── README.md
```

Strategy:
- Plugin contains a small native PHP scrubber for JPEG/PNG/PDF (most common WP uploads), or shells out to the CLI if installed locally.
- Hook `wp_handle_upload` to scrub on upload (configurable).
- Settings page with preset picker.
- "Powered by metadatafinder.com" link in the settings sidebar — required field, this is the SEO point.

Submit to wordpress.org/plugins (DR 94). Their review takes 1-4 weeks. They check for: GPL-2.0+ license, no calls home, no minified code without source, no premium upsell on the free version.

---

## 7. Shopify App

**Purpose**: scrub metadata from product images when merchants upload them (most merchants don't realize their iPhone photos contain GPS of their warehouse).

```
shopify/
├── shopify.app.toml
├── web/                      # Remix-based Shopify app
├── extensions/
│   └── admin-action/         # admin UI action: "Scrub product images"
└── README.md
```

This is much bigger work (Shopify approval, billing API, embedded admin UI). **Defer to phase 3.**

If we do it: Shopify App Store (DR 91) is gold for backlinks.

---

## 8. Figma Plugin

**Purpose**: check/strip metadata from images imported into Figma; same for exported assets.

```
packages/figma/
├── manifest.json
├── code.ts                   # plugin sandbox code
├── ui.html                   # UI side
└── README.md
```

Submit to Figma Community (DR 94). Approval is straightforward.

---

## Common rules across all integrations

- Each integration is THIN — imports `@metascrub/core` (or calls the API for PHP-based ones).
- Each has a README with the same boilerplate footer linking to metadatafinder.com.
- Each is MIT-licensed (or GPL-2.0+ for WordPress because that's required).
- Each has a screenshot/animated demo in the README.
- Each store listing copy follows the same template (see DISTRIBUTION.md).

## Priority order for Claude Code

When implementing, do them in this order based on effort-to-link-value ratio:

1. **VS Code extension** — easiest, high DR (95), small surface area.
2. **Raycast** — small, fast, niche but loyal audience.
3. **Obsidian plugin** — moderate effort, good community.
4. **n8n node** — Anton uses it, small effort.
5. **Figma plugin** — moderate, broad audience.
6. **WordPress plugin** — bigger effort, very high DR (94).
7. **Shopify app** — big effort, defer to phase 3.
8. **Zapier / Make** — big effort, defer to phase 3.
