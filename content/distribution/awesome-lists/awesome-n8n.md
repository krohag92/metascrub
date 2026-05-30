# Awesome n8n — MetaScrub Submission

## Target list

**Repository:** https://github.com/n8n-io/n8n-community-nodes-list

**Note:** n8n does not have a single canonical "awesome-n8n" GitHub list maintained by the community in the way other tools do. The primary discovery paths are: (1) the n8n Community Nodes directory at community.n8n.io and the in-app node browser, and (2) a few community-maintained GitHub lists. The most relevant target is the n8n community forum/discourse listing and the npm package with the `n8n-community-node` keyword. [verify: check whether a well-maintained awesome-n8n GitHub list exists at submission time — search GitHub for "awesome n8n" sorted by stars]

**Fallback target if no active awesome-list exists:**

- n8n Community forum post: https://community.n8n.io/c/community-nodes/
- NPM keyword: the package should be tagged with `n8n-community-node` so it appears in the in-app node browser

**Target section (if a list exists):** "File Processing" or "Utilities"

---

## Submission line

Standard format (assuming the list follows the common convention):

```markdown
- [n8n-nodes-metascrub](https://www.npmjs.com/package/n8n-nodes-metascrub) - n8n community node for viewing and stripping file metadata — EXIF, GPS, ID3, DOCX properties, PDF info. Supports 25 formats.
```

---

## PR title (if a GitHub list exists)

```
Add n8n-nodes-metascrub — file metadata viewer and scrubber node
```

## PR body (if a GitHub list exists)

```markdown
Hi! Adding the MetaScrub n8n community node.

**What it does:** Adds "MetaScrub" as an n8n node for metadata operations in workflows:

- **View Metadata** — input a file binary, output metadata fields as JSON (useful for routing, filtering, or logging based on GPS presence, author name, etc.)
- **Scrub Metadata** — input a file binary, output a clean file binary with metadata removed
- **Compare** — input two file binaries, output a diff of their metadata fields

**Example workflow use cases:**

- Webhook receives an uploaded photo → extract GPS → log coordinates → strip GPS → save clean file
- Email attachment received → extract PDF author name → add to CRM → forward clean copy
- Batch folder watch → strip all personal metadata on ingest

**NPM:** https://www.npmjs.com/package/n8n-nodes-metascrub
**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
```

## n8n Community Forum post (alternative to awesome-list)

If no active awesome-list exists, post in the n8n Community Nodes section at community.n8n.io instead:

**Title:** MetaScrub — node for viewing and stripping file metadata (EXIF, GPS, DOCX, PDF)

**Body:**

I built a MetaScrub community node for n8n. It reads and strips metadata from files in your workflows: GPS from photos, author names from documents, ID3 tags from audio files.

Install: `npm install n8n-nodes-metascrub` (then restart n8n, or use Settings > Community Nodes > Install).

Three operations: **View** (extract metadata as JSON), **Scrub** (strip metadata, return clean file), **Compare** (diff two files).

Formats: JPEG, PNG, PDF, DOCX, MP3, MP4, and more (25 total).

Source and docs: https://github.com/metascrub/metascrub
Web tool: https://metadatafinder.com

---

_Note: n8n's discovery is primarily through the in-app node browser (npm keyword `n8n-community-node`) and the community forum, not a GitHub awesome-list. Prioritize the forum post and npm tagging. Add the GitHub awesome-list PR if an active list exists at submission time._
