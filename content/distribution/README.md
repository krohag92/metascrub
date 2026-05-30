# Distribution Listings — Outreach Queue

Anton's submission queue for Phase 7 Stream B. Every file in this folder is a draft ready to paste into the relevant platform's web form, unless the status column says otherwise.

Files marked [verify: ...] contain placeholders that need Anton's confirmation before submitting.

---

## Founder / Company Profiles

| File                       | Platform      | URL                             | Status                        | Notes                                                              |
| -------------------------- | ------------- | ------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `indie-hackers-profile.md` | Indie Hackers | indihackers.com                 | Draft — ready to submit       | Create account, paste founder bio + product page separately        |
| `crunchbase-entry.md`      | Crunchbase    | crunchbase.com/add-organization | Draft — 1 verify placeholder  | [verify: business model / paid tier] before submitting             |
| `saashub-listing.md`       | SaaSHub       | saashub.com/submit              | Draft — 1 verify placeholder  | [verify: paid tier plans] before submitting                        |
| `f6s-profile.md`           | F6S           | f6s.com                         | Draft — ready to submit       | Keep it short; F6S is a directory not a pitch deck                 |
| `alternativeto-entry.md`   | AlternativeTo | alternativeto.net               | Draft — 2 verify placeholders | [verify: iOS and Android app live status] before tagging platforms |

---

## Awesome-List Submissions

Each file contains: the target repo URL, the exact markdown line to add, a PR title, and a PR body. Anton opens a PR to each GitHub repo with the provided copy.

| File                                         | Target List                                      | Submission Line              | Status                  | Notes                                                                                   |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `awesome-lists/awesome-cli-apps.md`          | github.com/agarrharr/awesome-cli-apps            | `- [metascrub]...`           | Draft — ready to submit | Submit anytime after NPM publish                                                        |
| `awesome-lists/awesome-nodejs.md`            | github.com/sindresorhus/awesome-nodejs           | `- [@metascrub/core]...`     | Draft — 1 verify        | [verify: star count at submission time] — sindresorhus lists require existing user base |
| `awesome-lists/awesome-python.md`            | github.com/vinta/awesome-python                  | `- [metascrub]...`           | Draft — 1 verify        | [verify: PyPI download count] — submit after real PyPI traction                         |
| `awesome-lists/awesome-privacy.md`           | github.com/pluja/awesome-privacy                 | `- [MetaScrub]...`           | Draft — ready to submit | Submit anytime; local-processing angle is the hook                                      |
| `awesome-lists/awesome-osint.md`             | github.com/jivoi/awesome-osint                   | `* [MetaScrub]...`           | Draft — ready to submit | Uses asterisks — match format exactly                                                   |
| `awesome-lists/awesome-selfhosted.md`        | github.com/awesome-selfhosted/awesome-selfhosted | `- [MetaScrub]...`           | Draft — ready to submit | Submit after Docker API image is published                                              |
| `awesome-lists/awesome-chrome-extensions.md` | github.com/whatwewant/awesome-chrome-extensions  | `- [MetaScrub]...`           | Draft — 1 verify        | [verify: most active repo at submission time]; submit after Chrome Store approval       |
| `awesome-lists/awesome-vscode.md`            | github.com/viatsko/awesome-vscode                | `- [MetaScrub]...`           | Draft — 1 verify        | [verify: publisher.extensionName slug]; submit after Marketplace approval               |
| `awesome-lists/awesome-obsidian.md`          | github.com/kmaasrud/awesome-obsidian             | table row                    | Draft — 1 verify        | [verify: Anton's GitHub username]; submit after Obsidian plugin approval                |
| `awesome-lists/awesome-raycast.md`           | github.com/raycast/awesome-raycast               | `- [MetaScrub]...`           | Draft — 1 verify        | [verify: Raycast Store URL]; submit after Store approval                                |
| `awesome-lists/awesome-figma.md`             | github.com/react-figma/awesome-figma             | `* [MetaScrub]...`           | Draft — 1 verify        | [verify: Figma Community URL]; submit after plugin published                            |
| `awesome-lists/awesome-n8n.md`               | n8n Community (no canonical awesome-list)        | `- [n8n-nodes-metascrub]...` | Draft — 1 verify        | [verify: active awesome-n8n list exists?]; forum post is the primary channel            |

---

## Submission order recommendation

Most awesome-list PRs require the package/extension to already be live on its respective platform. Suggested order:

1. **Submit immediately (no store approval needed):**
   - Indie Hackers profile + product page
   - F6S profile
   - awesome-cli-apps PR (NPM is live)
   - awesome-privacy PR
   - awesome-osint PR

2. **Submit after Crunchbase / SaaSHub verify placeholders resolved:**
   - Crunchbase entry
   - SaaSHub listing
   - AlternativeTo entry

3. **Submit after Docker publish:**
   - awesome-selfhosted PR

4. **Submit after store approvals:**
   - awesome-chrome-extensions (after Chrome Web Store)
   - awesome-vscode (after VS Code Marketplace)
   - awesome-obsidian (after Obsidian Community Plugins)
   - awesome-raycast (after Raycast Store)
   - awesome-figma (after Figma Community)

5. **Submit after traction (GitHub stars / PyPI downloads):**
   - awesome-nodejs
   - awesome-python
   - n8n community forum post + awesome-n8n (if list exists)

---

## Verify placeholders in this folder

| File                           | Placeholder                | What to confirm                                                             |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------- |
| `crunchbase-entry.md`          | Business model / SaaS tag  | Is there a paid tier planned for metadatafinder.com?                        |
| `saashub-listing.md`           | Paid tier                  | Same as above                                                               |
| `alternativeto-entry.md`       | iOS / Android live         | Are mobile apps approved and live before tagging those platforms?           |
| `awesome-nodejs.md`            | GitHub star count          | Confirm count is above sindresorhus's informal threshold at submission time |
| `awesome-python.md`            | PyPI download count        | Confirm real downloads before submitting to vinta/awesome-python            |
| `awesome-chrome-extensions.md` | Extension ID               | Fill in after Chrome Web Store approval                                     |
| `awesome-vscode.md`            | publisher.extensionName    | Fill in after VS Code Marketplace publish                                   |
| `awesome-obsidian.md`          | Anton's GitHub username    | Confirm the correct username (`antokr` is a placeholder)                    |
| `awesome-raycast.md`           | Raycast Store URL          | Fill in after Store approval                                                |
| `awesome-figma.md`             | Figma Community plugin URL | Fill in after Figma Community publish                                       |
| `awesome-n8n.md`               | Active awesome-n8n list    | Check GitHub at submission time; forum post is the fallback                 |

---

_Generated by docs-writer agent, Phase 7 Stream B. Last updated: 2026-05-30._
