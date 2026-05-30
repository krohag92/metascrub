# Show HN Prepared Answers — MetaScrub

These are prepared responses to questions that commonly appear in Show HN threads for developer tools in this space. Read through them before the launch so you can respond quickly in the first few hours — early thread momentum matters.

Do not copy-paste these verbatim. HN readers notice templated responses. Use these as starting points and adapt to the specific wording of the actual question.

---

## Q1: "Why not just use ExifTool?"

ExifTool is the gold standard for parse depth — ~290 formats, manufacturer MakerNotes, metadata writing. I use it myself for specialized work.

MetaScrub's goal is different: make metadata inspection available in every environment where people handle files, without requiring Perl knowledge or CLI comfort. The browser extension and web tool cover the journalist-who-doesn't-use-a-terminal use case. The VS Code extension covers the developer who wants to check a file without leaving the editor.

For someone already comfortable with ExifTool, there is no reason to switch for the core functionality. MetaScrub is aiming at the much larger group who currently check metadata zero times because the tooling is too far from their workflow.

---

## Q2: "How is this different from MAT2?"

MAT2 is focused specifically on stripping, is Linux-native, and is deliberately conservative (refuses to partially sanitize a file). It's excellent for Linux pipelines, especially SecureDrop environments. I have a full comparison post at metadatafinder.com/blog/oss-metadata-tools-compared.

The practical differences:

- MAT2 does not run natively on macOS or Windows
- MetaScrub has a compare command (diff two files' metadata) — useful for forensic work
- MetaScrub shows you the full metadata before you strip it, in a structured view
- MetaScrub has cross-platform wrappers (browser extension, desktop app, VS Code)

Neither tool replaces ExifTool for specialized work. MAT2 and MetaScrub target different workflows.

---

## Q3: "Why so many distribution channels? This seems like a lot of overhead."

The distribution breadth is the product's main hypothesis: metadata leaks primarily because people don't think to check, and they don't think to check because checking requires installing a tool they've never heard of and learning its syntax.

If the tool is already installed in every IDE (VS Code extension), already available in the browser (extension + web tool), already in the workflow automation tool (n8n node), and available as a Python package in whatever data pipeline the analyst is already running — the threshold to "just check" drops close to zero.

The engineering overhead is real. The bet is that it pays off in adoption.

---

## Q4: "What about [format X]? ZIP / PSD / WebP / GIF / etc."

25 formats covers the most common cases. The prioritization was: formats that people regularly share publicly (photos, documents, audio, video), formats with personally sensitive metadata (GPS in images, author chains in DOCX/PDF), and formats with established metadata standards to implement against.

The unsupported list includes: PSD (Adobe proprietary, some third-party metadata spec), GIF (very limited metadata), ZIP (could recurse, but it is usually a container, not a format with first-class metadata), and many specialized/scientific formats.

ExifTool is the right answer for anything outside the 25. If there is a specific format with a strong case for inclusion, open an issue on the GitHub repo — I am tracking these.

---

## Q5: "Is this actually open source? What license?"

MIT license. The full source is at github.com/metascrub/metascrub. WordPress plugin is GPL-2.0+ as required by the WordPress.org plugin directory.

MIT means you can use it in commercial projects, fork it, embed it, or build on it without shipping source. The only condition is keeping the copyright notice.

---

## Q6: "Can I self-host this?"

Yes. The Docker image (`metascrub/metascrub:api`) runs a REST API server for batch metadata parsing and scrubbing. POST a file to `/parse` and get metadata JSON back. POST to `/scrub` with a preset parameter and get a cleaned file back.

```bash
docker pull metascrub/metascrub:api
docker run -p 3000:3000 metascrub/metascrub:api
```

The Docker image is multi-arch (amd64, arm64). Compose file in the repo.

---

## Q7: "What about the privacy of the web tool? Are files actually processed locally?"

The web tool at metadatafinder.com processes files using the browser's File API and a WebAssembly build of the core library. Nothing is posted to a server. The network request log while using the tool shows only the initial page load assets — no file upload requests.

The browser extension works the same way: it has no permissions to access the internet (intentionally), so it cannot exfiltrate files even if it wanted to. The permissions in the manifest are limited to what is needed for local file access and tab context menu injection.

---

## Q8: "The Python package wraps Node.js? That seems awkward."

It is. The Python package is a subprocess wrapper around the Node.js CLI binary. This means Node.js is a runtime dependency, which is not ideal for pure Python environments.

The reason: maintaining two independent implementations of 25 format parsers with identical output semantics is a significant ongoing engineering burden. The wrapper approach ensures the Python and Node outputs are always identical by construction.

A pure Python implementation is on the roadmap for formats where the Python ecosystem already has good libraries (Pillow for EXIF, PyMuPDF for PDF). For now, the wrapper is the practical choice.

---

_Note for Anton: Respond to early comments within the first 30–60 minutes if possible. The HN algorithm rewards threads with early engagement from the author. A one-sentence reply is better than no reply. For aggressive or skeptical comments, engage factually — HN values intellectual honesty over defensiveness._
