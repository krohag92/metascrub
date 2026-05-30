# Sessionize speaker profile + talk pitch

For: https://sessionize.com — speaker bureau that powers calls-for-papers at hundreds of conferences (DevOps Days, NDC, Code Camps, JSConf, PyCon regionals, etc.).

Submitting MetaScrub as a speaker topic is worth doing because: (1) conference talks generate durable backlinks from session pages + slide-host sites, (2) recorded talks get cross-posted to YouTube and discovered for years, (3) the talk-pitch format is exactly the right size for the MetaScrub story.

---

## Speaker bio (Anton)

**Short (50 words)**

Anton Krokhmal is a software engineer building MetaScrub at metadatafinder.com — a metadata viewer and scrubber shipping across 15+ platforms from one TypeScript core. He's interested in distribution strategy for solo developers and what privacy-first tooling looks like when the goal is to be everywhere users already are.

**Medium (150 words)**

Anton Krokhmal is a software engineer and the maker behind metadatafinder.com. His current project, MetaScrub, is a metadata viewer and scrubber distributed across NPM, PyPI, four browser extension stores, VS Code, Obsidian, Raycast, n8n, Figma, Docker Hub, WordPress.org, Hugging Face, the Tauri desktop installers, and the iOS + Android app stores — all built on a single TypeScript core with a frozen 25-format API.

He's interested in distribution strategy for solo developers and indie-hackers: how do you get one piece of software in front of every audience that needs it, without burning out maintaining 15 codebases? The MetaScrub answer turns out to be "one shared core + thin platform wrappers + ruthless test-suite parity."

He blogs build-in-public progress at metadatafinder.com and posts notes on the side at the project's Substack.

**Long (300 words)**

Anton Krokhmal is a software engineer and the maker behind metadatafinder.com — a privacy-first metadata toolkit that helps people see and strip the hidden data inside their files (EXIF, GPS, IPTC, XMP, ID3, PDF Info dictionaries, DOCX revision histories, and 20+ other format-specific metadata schemas).

The toolkit, MetaScrub, ships across 15+ distribution channels from one TypeScript core: an NPM package and CLI, a Python port on PyPI, browser extensions for Chrome / Edge / Opera / Firefox, integrations for VS Code, Obsidian, Raycast, n8n, and Figma, Docker images (CLI + HTTP API), a Hugging Face Space with an AI-generated-image detector, a WordPress.org plugin, Tauri desktop installers for macOS / Windows / Linux, and iOS + Android apps via Capacitor. Every channel uses the same 25-format core; every channel is open source under MIT (WordPress is GPL-2.0+ as required by wordpress.org). The whole suite has zero analytics, zero telemetry, and zero phone-home calls.

He's interested in distribution strategy for solo developers: what does it look like to be everywhere users already are, when "everywhere" is fifteen separate stores with fifteen separate review processes and signing certificates? The MetaScrub answer is one shared core + thin platform wrappers + a test-suite that enforces parity across every implementation. He documents the approach and the trade-offs at metadatafinder.com and on the project's Substack.

Before MetaScrub he worked on developer tooling and observability systems. He cares about open-source sustainability, privacy by default, and tools that respect the people who use them.

Find him at https://metadatafinder.com or on GitHub at github.com/metascrub.

---

## Talk pitch: "Building 15 distribution channels from one core"

**Title**

Building 15 distribution channels from one core: a solo developer's distribution playbook

**Short pitch (300 chars, for CFP system summaries)**

How do you ship one piece of software to 15+ platforms as a solo developer without burning out? This talk walks through the architecture, the trade-offs, and the surprising amount of plumbing — using the MetaScrub metadata toolkit (metadatafinder.com) as the worked example. Open source under MIT.

**Long pitch / abstract (500-700 words)**

Most developer tools live on one platform. They're a CLI, or a VS Code extension, or a Docker image, or a SaaS web app. They reach the audience that already lives on that platform, and that's it.

But what if the audience is everywhere? Privacy tooling has this problem: the photographer needs a desktop app, the journalist needs a CLI, the lawyer needs a WordPress plugin, the developer needs an NPM package, the data scientist needs a Python library, the n8n user wants a node, the Figma designer wants a plugin. They're all the same use case (view + strip metadata from a file), but they live in fifteen different environments.

This talk shows how I solved that for **MetaScrub** ([metadatafinder.com](https://metadatafinder.com)) — a metadata viewer and scrubber that ships across 15+ distribution channels from a single TypeScript core. It walks through:

1. **What "one shared core" actually means in practice.** A frozen TypeScript public API. 25 file formats. Synthetic test fixtures so no binary files end up in git. Strict types so wrappers can trust the core. Bundle sizes that fit each target's constraints.

2. **The wrapper pattern.** Browser extension, VS Code extension, Obsidian plugin, Raycast extension, n8n community node, Figma plugin, Tauri desktop, Capacitor mobile, Docker CLI + HTTP API, Hugging Face Space — each one is 100-500 lines of glue code on top of the shared core. We'll look at the actual code for two contrasting examples (a flat call-and-render integration vs. a stateful one with platform APIs).

3. **The cross-language port.** The TypeScript core is great in JS-land. But Python users expect `pip install`. So we built a native Python port — and ran a parity test suite that asserts both implementations produce identical results on the same fixtures. This is what's interesting and risky.

4. **Distribution mechanics that surprised me.** WordPress requires GPL-2.0+ (the rest of the suite is MIT). VS Code Marketplace names collide with NPM names in pnpm workspaces. Hugging Face Spaces resolve relative `file:` URLs differently from local pip. Apple's Privacy Nutrition Label and Google Play's Data Safety form ask the same questions in different shapes. Each store has its own asset format, its own listing copy template, its own review window.

5. **What I'd skip if I were starting over.** Honest retrospective. Some channels are clearly worth the work (PyPI, NPM, browser extensions, Docker). Some are surprisingly high-ROI (Hugging Face, Obsidian). Some have approval delays that are basically uncorrelated with effort (Mac App Store, Microsoft Store, WordPress.org). Mobile apps are last for a reason.

6. **Backlink mechanics.** Every channel has a README, every README links back to a single home domain. Each store listing has a homepage field. Each integration's docs cross-link the others. The result is a backlink graph that compounds — and it's the whole reason the strategy works for a solo developer with no marketing budget.

The talk is technical, with code on slides. It's appropriate for any audience that ships developer tools or builds open-source projects with broad distribution ambitions. Open source under MIT — every artifact discussed is on GitHub at github.com/metascrub.

**Talk length**

30 minutes (standard conference slot) with 10 minutes Q&A. Can be compressed to 20 minutes by dropping section 4 (the platform-specific surprises) for shorter slots.

**Format**

In-person preferred. Comfortable remote/recorded too.

**Audience level**

Intermediate. No prior knowledge of metadata formats required; familiarity with at least one of the channels discussed (NPM, browser extensions, etc.) helps but isn't required.

**Topics / tags**

Open Source · Distribution · Solo Developer · Privacy · TypeScript · Python · Browser Extensions · Capacitor · Tauri · Docker

---

## Submission notes for Anton

- Sessionize asks for a profile photo (headshot, 800×800 minimum). Use the same photo used on metadatafinder.com.
- Twitter / LinkedIn / GitHub handles go in the profile. Confirm each handle before pasting.
- Sessionize lets you submit the same talk to multiple events from one profile — submit once, then push to every relevant CFP.
- Conferences worth targeting (by topical fit):
  - **NDC** (Oslo / London / Sydney / Porto) — broad dev audience, takes solo speakers.
  - **JSConf** regional events — TypeScript core makes this an easy fit.
  - **PyCon** US + regional — the cross-language port story is the angle.
  - **DevOps Days** regional events — the Docker + CI angle.
  - **OSCON** — open source distribution is the entire talk.
  - **All Things Open** — privacy + open source.
  - **Strange Loop** (now defunct, but watch successors).
- `[verify: confirm Anton's preferred talk length and whether he'll do remote-only or in-person before submission]`

---

## Status

Draft — ready for Anton's review. Once approved, the speaker profile copy goes into Sessionize directly; the talk pitch goes into each event's CFP form.

Source artifacts referenced throughout: github.com/metascrub/metascrub. Project home: https://metadatafinder.com.
