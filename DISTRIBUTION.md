# Distribution Checklist

Per-store submission checklist with copy templates. Every listing MUST link back to **metadatafinder.com**.

## Brand assets (prepare once, reuse everywhere)

- Logo SVG, navy + green
- Icon PNG: 16, 32, 48, 64, 128, 256, 512, 1024
- Screenshots: 1280×800 (Chrome store), 1280×720 (Edge), 1024×500 (WordPress banner), 1280×800 (App Store), 1024×500 (Play Store feature graphic), 1024×500 (Figma plugin cover), 1920×1080 (general)
- Promo video (30-60s) — record once with screen recorder; use across stores that accept video (Chrome, Mac App Store, Play Store, WordPress)
- Tagline: "See and strip metadata from any file"
- Sub-tagline: "Privacy-first metadata viewer and scrubber"

## Shared listing copy

### Short description (≤ 132 chars)

> View and strip EXIF, GPS, and document metadata from any file. Privacy-first. Powered by metadatafinder.com.

### Long description (Markdown master version)

```markdown
**MetaScrub** is a privacy-first metadata viewer and scrubber. View hidden EXIF, GPS, IPTC, XMP, and document properties — then strip them with one click before sharing.

**Why it matters**
Photos from your phone contain GPS coordinates. Word documents store the names of everyone who edited them. PDFs reveal the software that created them. MetaScrub shows you exactly what's hidden — and removes it.

**Features**
- View all metadata fields (EXIF, IPTC, XMP, GPS, ID3, PDF info, DOCX properties)
- Strip metadata with four presets: All / GPS only / Personal only / Keep technical
- Compare metadata between two files (forensics view)
- Batch processing for folders and multiple files
- Works offline — your files never leave your device

**Supported formats**
Images: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG)
Videos: MP4, MOV, MKV, WebM
Audio: MP3, FLAC, M4A, OGG, WAV
Documents: PDF, DOCX, XLSX, PPTX, EPUB

**Part of the metadatafinder.com toolkit** — visit https://metadatafinder.com for the web version, full documentation, and the open-source CLI.

Open source under MIT license: https://github.com/metascrub/metascrub
```

## Per-channel checklists

### Chrome Web Store

- Developer account ($5 one-time)
- ZIP from `packages/extension/dist.zip`
- Privacy policy URL: `https://metadatafinder.com/extension/privacy`
- Permissions justification (see EXTENSION.md)
- Single-purpose description: "View and strip file metadata."
- Category: Productivity
- Submit → wait 1-3 days

### Microsoft Edge Add-ons

- Use the same ZIP as Chrome
- Free Partner Center account
- Same listing copy
- Submit → wait ~1 week

### Opera Add-ons

- Same ZIP
- Free addons.opera.com account
- Submit → wait 1-3 days

### Firefox AMO

- ZIP from `dist-firefox.zip` (different manifest)
- Free addons.mozilla.org account
- Source code submission required (zip the `src/` folder separately) — this is mandatory for FF
- Submit → 1-7 days for human review

### Safari Extensions

- Defer to v0.2 — requires Xcode wrapping

### NPM

- `npm publish` from `packages/cli` and `packages/core`
- Use scoped name `@metascrub/core` for the library, plain `metascrub` for the CLI bin
- Add detailed README, badges, keywords

### PyPI

- `python -m build && twine upload dist/*`
- Detailed README in Markdown (PyPI renders it)
- Classifiers: `Topic :: Multimedia :: Graphics`, `Topic :: System :: Archiving`, etc.

### Docker Hub

- `metascrub/metascrub:latest` and `metascrub/metascrub:api`
- Overview Markdown links back to **metadatafinder.com**
- Multi-arch (amd64, arm64)

### GitHub

- Public repo `metascrub/metascrub`
- Detailed README with screenshots
- GitHub Topics: `metadata`, `exif`, `privacy`, `cli`, `chrome-extension`, `vscode-extension`, `pypi`, `npm`
- Pin the repo on Anton's GitHub profile

### VS Code Marketplace

- VSIX from `packages/vscode`
- Publisher account on `marketplace.visualstudio.com/manage`
- README must be in the VSIX (it's shown on the listing)

### Obsidian Community Plugins

- PR to `obsidianmd/obsidian-releases` — add MetaScrub entry to community-plugins.json
- Plugin repo must have releases with `manifest.json`, `main.js`, `styles.css`

### Raycast Store

- PR to `raycast/extensions` monorepo
- Includes screenshots and metadata.json

### WordPress.org Plugins

- SVN repository they assign after approval
- `readme.txt` in WP-specific format (sections: Description, Installation, Screenshots, FAQ, Changelog)
- Required: GPL-2.0+ license, no premium upsell, no external calls without consent
- Submit → 1-4 weeks review

### Figma Community

- Submit through Figma Community publishing flow
- Cover image 1024×500
- Detailed description (Markdown supported)

### Product Hunt

- Schedule launches in waves: extension launch, then CLI launch, then mobile launch — each is a separate post
- Maker profile linking to **metadatafinder.com**
- Hunter outreach 1 week before each launch

### AlternativeTo

- Create entry for MetaScrub
- Tag alternatives (e.g. ExifTool, Adobe Bridge, ImageOptim, PDFsam)

### Hacker News (Show HN)

- One-shot: "Show HN: MetaScrub — open-source metadata viewer/scrubber"
- Best window: Tuesday-Thursday, 8am Pacific
- Link to GitHub, not metadatafinder.com (HN prefers source repos)

### Awesome Lists (PRs)

Target list of repos to PR:
- `awesome-cli-apps`
- `awesome-nodejs`
- `awesome-python`
- `awesome-privacy`
- `awesome-osint`
- `awesome-selfhosted` (for the Docker API image)
- `awesome-chrome-extensions`
- `awesome-vscode`
- `awesome-obsidian`
- `awesome-raycast`
- `awesome-figma`
- `awesome-n8n`

One PR per list. Follow each list's contribution guidelines exactly — they're picky.

### Hugging Face Space

- Build a Gradio demo using the Python package
- Bonus angle: "detect AI-generated images via metadata signatures" — this gets HF feed attention
- Space name: `metascrub/metadata-viewer`
- README links to **metadatafinder.com** and the GitHub repo

### Indie Hackers

- Founder profile for Anton linking to **metadatafinder.com**
- Product page for MetaScrub
- Build-in-public update threads

### Crunchbase

- Profile for "metadatafinder.com" with MetaScrub as the product
- Reasonable category: "Privacy Software" or "Developer Tools"

### Awwwards / Land-book / One Page Love

- Submit metadatafinder.com (not MetaScrub directly — these are site galleries)
- The MetaScrub launch can be the angle that gets the site featured

## SEO content to publish on metadatafinder.com

Each post is a backlink target and a search-traffic driver:

1. "What is EXIF data and why should you care" — broad keyword
2. "How to remove GPS from photos before posting online" — high-intent
3. "How to strip metadata from a PDF" — high-intent
4. "Word document metadata leaks — what's stored and how to clean it"
5. "Forensics use cases: catching metadata in leaked documents"
6. "Open source metadata tools compared: ExifTool, MAT2, MetaScrub"
7. "Bulk-cleaning client photos: a photographer's workflow"
8. "How journalists protect sources by checking metadata"

Each post links to the relevant MetaScrub distribution (the EXIF post links to the Chrome extension; the PDF post links to the CLI; etc.) — internal linking strengthens the topical authority of metadatafinder.com.

## Launch sequence (by phase)

The order in which Anton submits artifacts (Claude prepares them, Anton hits the submit button):

1. **After Phase 1**: NPM publish core + CLI. GitHub repo public. 3-4 awesome-list PRs.
2. **After Phase 2**: bump NPM minor version (more formats supported). Update awesome-list entries.
3. **After Phase 3**: Submit to Chrome / Edge / Opera / Firefox stores. Publish to PyPI. AlternativeTo entry. Product Hunt launch.
4. **After Phase 4**: Submit to VS Code Marketplace, Obsidian community plugins, Raycast Store, n8n community directory, Figma Community. Docker Hub push. Hugging Face Space publish.
5. **After Phase 5**: Desktop installers downloadable from metadatafinder.com. Flathub PR. Publish first 4 blog posts on metadatafinder.com + Dev.to/Hashnode/Medium cross-posts.
6. **After Phase 6**: WordPress.org plugin submission. HF Space polish live.
7. **After Phase 7**: Show HN post. 4 more blog posts published. Indie Hackers + Crunchbase profiles live.
8. **After Phase 8**: App Store + Play Store submissions for mobile (slowest review, so worth running in parallel with everything else by this point).
