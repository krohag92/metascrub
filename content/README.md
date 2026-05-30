# MetaScrub Content Index

Working queue for Anton. All files in this folder are drafts pending review unless marked otherwise.

**Base URL for published posts:** https://metadatafinder.com/blog/

---

## Blog Posts (4 of 8 from DISTRIBUTION.md)

| File                                | Title                                                             | Target Keyword                        | Word Count (approx) | Status                           |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------- | ------------------- | -------------------------------- |
| `blog/01-what-is-exif-data.md`      | What Is EXIF Data? A Plain-Language Guide to Hidden File Metadata | what is EXIF data                     | ~2,200              | Draft — ready for Anton's review |
| `blog/02-remove-gps-from-photos.md` | How to Remove GPS from Photos Before Posting Online               | remove GPS from photos before posting | ~1,900              | Draft — ready for Anton's review |
| `blog/03-strip-pdf-metadata.md`     | How to Strip Metadata from a PDF                                  | how to strip metadata from a PDF      | ~2,100              | Draft — ready for Anton's review |
| `blog/04-word-document-metadata.md` | Word Document Metadata Leaks: What's Stored and How to Clean It   | Word document metadata leaks          | ~2,300              | Draft — ready for Anton's review |

**Posts 5–8** (from DISTRIBUTION.md — scheduled for Phase 7):

- "Forensics use cases: catching metadata in leaked documents"
- "Open source metadata tools compared: ExifTool, MAT2, MetaScrub"
- "Bulk-cleaning client photos: a photographer's workflow"
- "How journalists protect sources by checking metadata"

---

## Cross-Posts (12 files — 3 per main post)

| File                         | Platform | Source Post | Status |
| ---------------------------- | -------- | ----------- | ------ |
| `cross-posts/01-devto.md`    | Dev.to   | Post 01     | Draft  |
| `cross-posts/01-hashnode.md` | Hashnode | Post 01     | Draft  |
| `cross-posts/01-medium.md`   | Medium   | Post 01     | Draft  |
| `cross-posts/02-devto.md`    | Dev.to   | Post 02     | Draft  |
| `cross-posts/02-hashnode.md` | Hashnode | Post 02     | Draft  |
| `cross-posts/02-medium.md`   | Medium   | Post 02     | Draft  |
| `cross-posts/03-devto.md`    | Dev.to   | Post 03     | Draft  |
| `cross-posts/03-hashnode.md` | Hashnode | Post 03     | Draft  |
| `cross-posts/03-medium.md`   | Medium   | Post 03     | Draft  |
| `cross-posts/04-devto.md`    | Dev.to   | Post 04     | Draft  |
| `cross-posts/04-hashnode.md` | Hashnode | Post 04     | Draft  |
| `cross-posts/04-medium.md`   | Medium   | Post 04     | Draft  |

All cross-posts have `canonical: https://metadatafinder.com/blog/<slug>` in their frontmatter.

---

## Substack

| File                 | Title                                                       | Status                           |
| -------------------- | ----------------------------------------------------------- | -------------------------------- |
| `substack/launch.md` | I Built the Same Tool for 15 Platforms at Once. Here's Why. | Draft — ready for Anton's review |

---

## Press Kit

| File                                | Contents                                      | Status                                               |
| ----------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `press-kit/README.md`               | Press kit overview, brand rules, asset list   | Draft                                                |
| `press-kit/boilerplate.md`          | Company descriptions at 50/150/300 words      | Draft — ready for Anton's review                     |
| `press-kit/founder-bio.md`          | Anton bio at 50/150/300 words                 | Draft — needs Anton's personal review                |
| `press-kit/one-liners.md`           | 12 tagline variants for different contexts    | Draft — ready for Anton's review                     |
| `press-kit/stats-and-facts.md`      | Supported formats, platforms, technical facts | Draft — Anton to verify platform statuses            |
| `press-kit/press-release-launch.md` | Launch press release (embargoed template)     | Draft — needs embargo date, Anton quote confirmation |

---

## Legal

| File                                | URL (when live)                              | Status                                                       |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `legal/extension-privacy-policy.md` | https://metadatafinder.com/extension/privacy | Draft — needs effective date; ready for Anton's legal review |

---

## Items needing Anton's attention before publishing

1. **`[verify: ...]` placeholders** — four instances across the blog posts where specific incident details need confirmation. See the list below.
2. **Founder bio** (`press-kit/founder-bio.md`) — written from public information; Anton should confirm all details are accurate and tone matches how he wants to present himself.
3. **Press release quote** (`press-kit/press-release-launch.md`) — placeholder quote exists; Anton must confirm or replace before distributing to press.
4. **Press release embargo date** — fill in before distributing.
5. **Platform status column** in `stats-and-facts.md` — update with actual submission/live status at publish time.
6. **Privacy policy effective date** — fill in `[DATE]` placeholder before publishing to metadatafinder.com/extension/privacy.
7. **iOS Shortcuts action name** — `[verify: confirm exact name and iOS version for "Remove EXIF data" Shortcuts action]` in post 02 and cross-posts.

---

## Verify placeholders (all instances)

| File                                | Placeholder                             | Nature of uncertainty                                                                                               |
| ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `blog/01-what-is-exif-data.md`      | McAfee / Vice EXIF incident             | Confirm outlet, year, exact sequence of events                                                                      |
| `blog/01-what-is-exif-data.md`      | Blair Iraq dossier metadata             | Confirm that metadata/revision history specifically enabled the al-Marashi sourcing analysis                        |
| `blog/02-remove-gps-from-photos.md` | McAfee / Vice EXIF incident             | Same as above                                                                                                       |
| `blog/02-remove-gps-from-photos.md` | iOS Shortcuts "Remove EXIF data" action | Confirm action name and iOS version availability                                                                    |
| `blog/03-strip-pdf-metadata.md`     | (none — no `[verify]` placeholders)     | —                                                                                                                   |
| `blog/04-word-document-metadata.md` | Blair Iraq dossier metadata             | Same as post 01; confirm specific year (2002 dossier), al-Marashi detail, and what the metadata specifically showed |
| `cross-posts/01-devto.md`           | McAfee incident                         | Same                                                                                                                |
| `cross-posts/01-hashnode.md`        | McAfee incident                         | Same                                                                                                                |
| `cross-posts/01-medium.md`          | McAfee and Blair dossier                | Same for both                                                                                                       |
| `cross-posts/02-devto.md`           | iOS Shortcuts action                    | Same as post 02                                                                                                     |
| `cross-posts/02-hashnode.md`        | (none)                                  | —                                                                                                                   |
| `cross-posts/04-devto.md`           | Blair dossier                           | Same                                                                                                                |
| `cross-posts/04-hashnode.md`        | Blair dossier                           | Same                                                                                                                |

**Recommended research:** The McAfee / Vice EXIF incident is widely reported; a quick search for "Vice McAfee EXIF GPS 2012" should confirm details. The Blair dossier / al-Marashi connection is also widely reported by the BBC, Guardian, and academic sources — searching "Iraq dossier plagiarism al-Marashi metadata" should confirm. Both are well-documented public incidents; the hedges exist because the exact details (specific dates, exact outlet names, what specifically the metadata showed vs. what was established through direct textual comparison) should be verified before citation.

---

## Publishing checklist (per blog post)

Before Anton publishes each post on metadatafinder.com:

- [ ] All `[verify: ...]` placeholders resolved or removed
- [ ] Slug in frontmatter matches the URL Anton will use
- [ ] At least 3 links to https://metadatafinder.com confirmed present
- [ ] Cross-post canonical URLs updated to match live post URL
- [ ] Cross-posts submitted with canonical set (prevents duplicate content penalty)
- [ ] Tags/categories assigned in the CMS

---

_Generated by docs-writer agent, Phase 5 Stream B. Last updated: 2026-05-30._
