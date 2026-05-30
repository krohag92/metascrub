"""
MetaScrub — Gradio Space entry-point.

Three tabs:
  1. View metadata
  2. Scrub (remove metadata + show diff)
  3. AI-generated check (heuristic, no ML)

Homepage: https://metadatafinder.com
"""

from __future__ import annotations

import os
import sys
import tempfile

# Ensure the local src/ helper package is importable whether we run from
# the huggingface/ directory or from the repo root.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import gradio as gr
import metascrub
from src.ai_detection import AIDetectionResult, detect as ai_detect

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FOOTER_HTML = (
    '<p style="text-align:center;margin-top:1rem;color:#666;font-size:0.85rem;">'
    'Powered by <a href="https://metadatafinder.com" target="_blank">'
    "metadatafinder.com</a> &mdash; "
    "files processed in memory and discarded; no logging."
    "</p>"
)

SUPPORTED_EXTS = ", ".join(
    sorted(
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".pdf",
            ".docx",
            ".mp3",
        }
    )
)


def _result_to_markdown(result: metascrub.MetadataResult) -> str:
    """Render a MetadataResult as Markdown with warning callouts."""
    lines: list[str] = []

    # Warnings block
    if result.warnings:
        lines.append(
            '<div style="background:#fff3cd;border-left:4px solid #ffc107;'
            'padding:0.75rem 1rem;margin-bottom:1rem;border-radius:4px;">'
        )
        lines.append("<strong>Warnings</strong><ul>")
        for w in result.warnings:
            lines.append(f"<li>{w}</li>")
        lines.append("</ul></div>")
        lines.append("")

    fmt = result.format or "unknown"
    fname = result.filename or ""
    size_kb = result.size_bytes / 1024
    lines.append(f"**Format:** `{fmt}` &nbsp; **File:** `{fname}` &nbsp; **Size:** {size_kb:.1f} KB")
    lines.append("")

    # Highlights
    h = result.highlights
    if any(
        [
            h.gps,
            h.captured_at,
            h.device,
            h.software,
            h.author,
            h.last_modified_by,
            h.revision_history,
        ]
    ):
        lines.append("### Key highlights")
        lines.append("")
        if h.gps:
            lines.append(
                f"- **GPS:** {h.gps.lat:.6f}, {h.gps.lon:.6f}"
                + (f" (alt {h.gps.alt:.1f} m)" if h.gps.alt is not None else "")
            )
        if h.captured_at:
            lines.append(f"- **Captured at:** {h.captured_at}")
        if h.device:
            device_str = " ".join(filter(None, [h.device.make, h.device.model]))
            if device_str:
                lines.append(f"- **Device:** {device_str}")
            if h.device.serial:
                lines.append(f"- **Serial:** {h.device.serial}")
        if h.software:
            lines.append(f"- **Software:** {h.software}")
        if h.author:
            lines.append(f"- **Author:** {h.author}")
        if h.last_modified_by:
            lines.append(f"- **Last modified by:** {h.last_modified_by}")
        if h.revision_history is not None:
            lines.append(f"- **Revision:** {h.revision_history}")
        lines.append("")

    # Metadata groups
    for group_name, fields in result.groups.items():
        if not fields:
            continue
        lines.append(f"### {group_name}")
        lines.append("")
        lines.append("| Field | Value | Sensitive |")
        lines.append("|-------|-------|-----------|")
        for f in fields:
            val = str(f.value) if f.value is not None else ""
            # Truncate very long values for display
            if len(val) > 120:
                val = val[:117] + "..."
            sensitive = "yes" if f.sensitive else ""
            label = f.label or f.key
            lines.append(f"| `{label}` | {val} | {sensitive} |")
        lines.append("")

    return "\n".join(lines)


def _diff_to_markdown(diff: metascrub.MetadataDiff) -> str:
    """Render a MetadataDiff as Markdown."""
    lines: list[str] = []
    if not diff.only_in_a and not diff.changed:
        lines.append("*No metadata differences found — the file may already be clean.*")
        return "\n".join(lines)

    removed_count = len(diff.only_in_a)
    changed_count = len(diff.changed)
    lines.append(
        f"**Removed:** {removed_count} field(s) &nbsp; **Changed:** {changed_count} field(s)"
    )
    lines.append("")

    if diff.only_in_a:
        lines.append("#### Fields removed")
        lines.append("")
        lines.append("| Namespace | Field | Original value |")
        lines.append("|-----------|-------|----------------|")
        for f in diff.only_in_a:
            val = str(f.value)[:80] if f.value is not None else ""
            # key is like "group.fieldkey" — split on first dot
            parts = f.key.split(".", 1)
            ns, fkey = (parts[0], parts[1]) if len(parts) == 2 else ("", f.key)
            lines.append(f"| `{ns}` | `{fkey}` | {val} |")
        lines.append("")

    if diff.changed:
        lines.append("#### Fields changed")
        lines.append("")
        lines.append("| Namespace | Field | Before | After |")
        lines.append("|-----------|-------|--------|-------|")
        for c in diff.changed:
            fa, fb = c.a, c.b
            parts = fa.key.split(".", 1)
            ns, fkey = (parts[0], parts[1]) if len(parts) == 2 else ("", fa.key)
            va = str(fa.value)[:40] if fa.value is not None else ""
            vb = str(fb.value)[:40] if fb.value is not None else ""
            lines.append(f"| `{ns}` | `{fkey}` | {va} | {vb} |")
        lines.append("")

    return "\n".join(lines)


def _ai_result_to_markdown(result: AIDetectionResult) -> str:
    lines: list[str] = []

    verdict_display = {
        "ai_generated": "AI-generated (high confidence)",
        "unknown": "Unknown / inconclusive",
        "likely_human": "Likely human-created",
    }
    verdict_color = {
        "ai_generated": "#c0392b",
        "unknown": "#e67e22",
        "likely_human": "#27ae60",
    }

    color = verdict_color.get(result.verdict, "#555")
    label = verdict_display.get(result.verdict, result.verdict)
    pct = int(result.confidence * 100)

    lines.append(
        f'<div style="background:#f8f9fa;border-left:4px solid {color};'
        f'padding:0.75rem 1rem;margin-bottom:1rem;border-radius:4px;">'
        f"<strong>Verdict:</strong> "
        f'<span style="color:{color};font-weight:bold;">{label}</span>'
        f" &mdash; confidence {pct}%"
        f"</div>"
    )

    if result.markers:
        lines.append("")
        lines.append("**Evidence / markers:**")
        lines.append("")
        for m in result.markers:
            lines.append(f"- {m}")

    lines.append("")
    lines.append(
        "*This check is heuristic only (metadata inspection, no ML model). "
        "A negative result does not prove the file is human-created — "
        "AI tools often strip or omit their metadata.*"
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tab 1 — View metadata
# ---------------------------------------------------------------------------


def view_metadata(file_obj):
    if file_obj is None:
        return "Upload a file to view its metadata."
    try:
        result = metascrub.parse(file_obj.name, filename=os.path.basename(file_obj.name))
        return _result_to_markdown(result)
    except metascrub.MetaScrubError as exc:
        return f"**Error:** {exc}"
    except Exception as exc:  # noqa: BLE001
        return f"**Unexpected error:** {exc}"


# ---------------------------------------------------------------------------
# Tab 2 — Scrub
# ---------------------------------------------------------------------------


def scrub_file(file_obj, preset: str):
    if file_obj is None:
        return None, "Upload a file to scrub."
    try:
        original_path = file_obj.name
        fname = os.path.basename(original_path)

        original_bytes = open(original_path, "rb").read()
        cleaned_bytes = metascrub.scrub(original_bytes, preset=preset, filename=fname)

        # Build a diff
        diff = metascrub.compare(
            original_bytes,
            cleaned_bytes,
            filename_a=fname,
            filename_b=fname,
        )
        diff_md = _diff_to_markdown(diff)

        # Write cleaned file to a temp location for download
        suffix = os.path.splitext(fname)[1] or ".bin"
        stem = os.path.splitext(fname)[0]
        tmp = tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix, prefix=f"{stem}_scrubbed_"
        )
        tmp.write(cleaned_bytes)
        tmp.close()

        return tmp.name, diff_md
    except metascrub.MetaScrubError as exc:
        return None, f"**Error:** {exc}"
    except Exception as exc:  # noqa: BLE001
        return None, f"**Unexpected error:** {exc}"


# ---------------------------------------------------------------------------
# Tab 3 — AI detection
# ---------------------------------------------------------------------------


def check_ai(file_obj):
    if file_obj is None:
        return "Upload a file to analyse."
    try:
        fname = os.path.basename(file_obj.name)
        raw = open(file_obj.name, "rb").read()
        result = ai_detect(raw, filename=fname)
        return _ai_result_to_markdown(result)
    except Exception as exc:  # noqa: BLE001
        return f"**Unexpected error:** {exc}"


# ---------------------------------------------------------------------------
# Build the Gradio Blocks interface
# ---------------------------------------------------------------------------

with gr.Blocks(title="MetaScrub — Metadata Viewer & Scrubber") as demo:
    gr.Markdown(
        "# MetaScrub\n"
        "**See and strip metadata from any file.** "
        f"Supported formats: {SUPPORTED_EXTS}  \n"
        "Full web app: [metadatafinder.com](https://metadatafinder.com)"
    )

    with gr.Tabs():
        # ---- Tab 1: View ----
        with gr.Tab("View metadata"):
            with gr.Row():
                view_file = gr.File(label="Upload file", file_count="single")
            view_btn = gr.Button("View metadata", variant="primary")
            view_out = gr.Markdown(label="Metadata")
            view_btn.click(fn=view_metadata, inputs=[view_file], outputs=[view_out])
            gr.HTML(FOOTER_HTML)

        # ---- Tab 2: Scrub ----
        with gr.Tab("Scrub"):
            with gr.Row():
                scrub_file_input = gr.File(label="Upload file", file_count="single")
                scrub_preset = gr.Radio(
                    choices=["all", "gps-only", "personal-only", "keep-technical"],
                    value="all",
                    label="Scrub preset",
                    info=(
                        "all: remove everything  |  "
                        "gps-only: remove GPS only  |  "
                        "personal-only: remove personal fields  |  "
                        "keep-technical: remove personal but keep technical EXIF"
                    ),
                )
            scrub_btn = gr.Button("Scrub and download", variant="primary")
            with gr.Row():
                scrub_download = gr.File(label="Cleaned file (download)")
                scrub_diff = gr.Markdown(label="What was removed")
            scrub_btn.click(
                fn=scrub_file,
                inputs=[scrub_file_input, scrub_preset],
                outputs=[scrub_download, scrub_diff],
            )
            gr.HTML(FOOTER_HTML)

        # ---- Tab 3: AI detection ----
        with gr.Tab("AI-generated check"):
            gr.Markdown(
                "Heuristic metadata scan for AI-generation markers "
                "(Midjourney, Stable Diffusion, DALL-E, Adobe Firefly, etc.).  \n"
                "**No ML model is used.** If no markers are found the file may still be AI-generated "
                "— many tools strip metadata before export."
            )
            with gr.Row():
                ai_file = gr.File(label="Upload file", file_count="single")
            ai_btn = gr.Button("Check for AI markers", variant="primary")
            ai_out = gr.Markdown(label="Result")
            ai_btn.click(fn=check_ai, inputs=[ai_file], outputs=[ai_out])
            gr.HTML(FOOTER_HTML)


if __name__ == "__main__":
    demo.launch()
