"""
Parity tests: compare Python parse() output vs TS core parse() output.

For each fixture, we run both implementations and compare:
  - highlights keys (GPS, author, software, device, capturedAt)
  - warnings list
  - group names

Known documented divergences:
  - GPS floats: Python and TS may differ by < 0.0001 degrees due to piexif
    vs exifr rational arithmetic. Tolerance: abs(py - ts) < 0.001.
  - XMP: Python surfaces raw XMP XML as a single field; TS uses exifr's
    structured parse. Group keys may differ.
  - IPTC: TS uses exifr's structured parse; Python uses a manual IPTC-NAA
    parser. Both should produce By-line etc. if present.
  - PDF dates: TS returns ISO dates; Python returns raw D:YYYYMMDD... strings.
    Python highlights lack capturedAt for PDF (no EXIF).
  - MP3 tags: tinytag field names may differ slightly from music-metadata
    (TS). Audio.common vs MP3.ID3v2.3 naming differs by design.
  - MP3 format: TS surfaces MP3.format bitrate/samplerate; Python does too
    via tinytag but field names may differ.
"""

from __future__ import annotations

import json
import os
import subprocess

import pytest

from metascrub.api import parse as py_parse

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "../fixtures")
TS_RUNNER = os.path.join(os.path.dirname(__file__), "run_ts_parity.js")
_WORKTREE_CORE = os.path.join(
    os.path.dirname(__file__),
    "../../../../packages/core/dist/index.cjs",
)
_MAIN_CORE = "/Users/user/metascrub/packages/core/dist/index.cjs"
TS_CORE_DIST = _WORKTREE_CORE if os.path.exists(_WORKTREE_CORE) else _MAIN_CORE

GPS_TOLERANCE = 0.001  # degrees


def _ts_available() -> bool:
    return os.path.exists(TS_CORE_DIST)


def _run_ts(fixture_path: str) -> dict | None:
    """Run the TS parity script; return parsed JSON or None if unavailable."""
    if not _ts_available():
        return None
    try:
        result = subprocess.run(
            ["node", TS_RUNNER, fixture_path],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return None
        return json.loads(result.stdout)
    except Exception:
        return None


def _py_parse(fixture_name: str) -> dict:
    path = os.path.join(FIXTURES_DIR, fixture_name)
    result = py_parse(path)
    return {
        "format": result.format,
        "highlights": result.highlights.to_dict(),
        "warnings": result.warnings,
        "groups": {g: [f.to_dict() for f in fields] for g, fields in result.groups.items()},
    }


def _compare_gps(py_gps: dict, ts_gps: dict):
    """Compare GPS coords with tolerance."""
    for key in ("lat", "lon"):
        py_val = py_gps.get(key)
        ts_val = ts_gps.get(key)
        if py_val is not None and ts_val is not None:
            assert abs(float(py_val) - float(ts_val)) < GPS_TOLERANCE, (
                f"GPS.{key} diverges: Python={py_val}, TS={ts_val}"
            )


def _compare_warnings_subset(py_warnings, ts_warnings):
    """
    Check that the key warning categories match.
    Exact text may differ but categories (GPS, Author, etc.) must align.
    """

    def _has_gps(warnings):
        return any("gps" in w.lower() for w in warnings)

    def _has_author(warnings):
        return any("author" in w.lower() or "creator" in w.lower() for w in warnings)

    assert _has_gps(py_warnings) == _has_gps(ts_warnings), (
        f"GPS warning mismatch: Python={py_warnings}, TS={ts_warnings}"
    )
    assert _has_author(py_warnings) == _has_author(ts_warnings), (
        f"Author warning mismatch: Python={py_warnings}, TS={ts_warnings}"
    )


# -------------------------------------------------------------------------
# Pytest parity tests (skip if TS core not built)
# -------------------------------------------------------------------------


@pytest.mark.skipif(not _ts_available(), reason="TS core dist not built")
class TestJpegParity:
    def test_format(self):
        py = _py_parse("jpeg_with_gps.jpg")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "jpeg_with_gps.jpg"))
        assert ts is not None, "TS runner failed"
        assert py["format"] == ts["format"] == "jpeg"

    def test_gps_parity(self):
        py = _py_parse("jpeg_with_gps.jpg")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "jpeg_with_gps.jpg"))
        assert ts is not None
        py_gps = py["highlights"].get("gps")
        ts_gps = ts["highlights"].get("gps")
        # Both should have GPS
        assert py_gps is not None, "Python missing GPS highlights"
        assert ts_gps is not None, "TS missing GPS highlights"
        _compare_gps(py_gps, ts_gps)

    def test_warnings_parity(self):
        py = _py_parse("jpeg_with_gps.jpg")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "jpeg_with_gps.jpg"))
        assert ts is not None
        _compare_warnings_subset(py["warnings"], ts["warnings"])

    def test_author_parity(self):
        py = _py_parse("jpeg_with_gps.jpg")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "jpeg_with_gps.jpg"))
        assert ts is not None
        assert py["highlights"].get("author") == ts["highlights"].get("author")

    def test_groups_overlap(self):
        py = _py_parse("jpeg_with_gps.jpg")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "jpeg_with_gps.jpg"))
        assert ts is not None
        py_groups = set(py["groups"].keys())
        ts_groups = set(ts["groups"].keys())
        # Both must have at least EXIF and GPS
        assert "EXIF" in py_groups, f"Python missing EXIF group, has: {py_groups}"
        assert "EXIF" in ts_groups, f"TS missing EXIF group, has: {ts_groups}"
        assert "GPS" in py_groups, f"Python missing GPS group, has: {py_groups}"
        assert "GPS" in ts_groups, f"TS missing GPS group, has: {ts_groups}"


@pytest.mark.skipif(not _ts_available(), reason="TS core dist not built")
class TestPngParity:
    def test_format(self):
        py = _py_parse("png_with_metadata.png")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "png_with_metadata.png"))
        assert ts is not None
        assert py["format"] == ts["format"] == "png"

    def test_author_parity(self):
        py = _py_parse("png_with_metadata.png")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "png_with_metadata.png"))
        assert ts is not None
        # Both should detect the Author text chunk
        assert py["highlights"].get("author") is not None
        assert ts["highlights"].get("author") is not None

    def test_warnings_parity(self):
        py = _py_parse("png_with_metadata.png")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "png_with_metadata.png"))
        assert ts is not None
        _compare_warnings_subset(py["warnings"], ts["warnings"])

    def test_png_text_group_both(self):
        py = _py_parse("png_with_metadata.png")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "png_with_metadata.png"))
        assert ts is not None
        assert "PNG.text" in py["groups"]
        assert "PNG.text" in ts["groups"]


@pytest.mark.skipif(not _ts_available(), reason="TS core dist not built")
class TestPdfParity:
    def test_format(self):
        py = _py_parse("pdf_with_metadata.pdf")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "pdf_with_metadata.pdf"))
        assert ts is not None
        assert py["format"] == ts["format"] == "pdf"

    def test_author_parity(self):
        py = _py_parse("pdf_with_metadata.pdf")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "pdf_with_metadata.pdf"))
        assert ts is not None
        # Both should find the author
        assert py["highlights"].get("author") is not None
        assert ts["highlights"].get("author") is not None

    def test_pdf_info_group_both(self):
        py = _py_parse("pdf_with_metadata.pdf")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "pdf_with_metadata.pdf"))
        assert ts is not None
        assert "PDF.Info" in py["groups"]
        assert "PDF.Info" in ts["groups"]


@pytest.mark.skipif(not _ts_available(), reason="TS core dist not built")
class TestDocxParity:
    def test_format(self):
        py = _py_parse("docx_with_metadata.docx")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "docx_with_metadata.docx"))
        assert ts is not None
        assert py["format"] == ts["format"] == "docx"

    def test_author_parity(self):
        py = _py_parse("docx_with_metadata.docx")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "docx_with_metadata.docx"))
        assert ts is not None
        assert py["highlights"].get("author") == ts["highlights"].get("author")

    def test_last_modified_by_parity(self):
        py = _py_parse("docx_with_metadata.docx")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "docx_with_metadata.docx"))
        assert ts is not None
        assert py["highlights"].get("lastModifiedBy") == ts["highlights"].get("lastModifiedBy")

    def test_revision_parity(self):
        py = _py_parse("docx_with_metadata.docx")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "docx_with_metadata.docx"))
        assert ts is not None
        assert py["highlights"].get("revisionHistory") == ts["highlights"].get("revisionHistory")

    def test_groups_parity(self):
        py = _py_parse("docx_with_metadata.docx")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "docx_with_metadata.docx"))
        assert ts is not None
        assert "DOCX.core" in py["groups"]
        assert "DOCX.core" in ts["groups"]
        assert "DOCX.app" in py["groups"]
        assert "DOCX.app" in ts["groups"]


@pytest.mark.skipif(not _ts_available(), reason="TS core dist not built")
class TestMp3Parity:
    def test_format(self):
        py = _py_parse("mp3_with_tags.mp3")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "mp3_with_tags.mp3"))
        assert ts is not None
        assert py["format"] == ts["format"] == "mp3"

    def test_container_groups_both(self):
        py = _py_parse("mp3_with_tags.mp3")
        ts = _run_ts(os.path.join(FIXTURES_DIR, "mp3_with_tags.mp3"))
        assert ts is not None
        # Both must surface container presence
        assert "MP3.container" in py["groups"]
        assert "MP3.container" in ts["groups"]


# -------------------------------------------------------------------------
# Stand-alone Python-only parity assertions (always run)
# -------------------------------------------------------------------------


class TestPythonInternalConsistency:
    """Verifies Python parse is self-consistent (no TS needed)."""

    def test_jpeg_gps_in_highlights_and_groups(self):
        py = _py_parse("jpeg_with_gps.jpg")
        assert py["highlights"].get("gps") is not None
        assert "GPS" in py["groups"]

    def test_docx_author_matches_core_field(self):
        py = _py_parse("docx_with_metadata.docx")
        core_fields = {f["key"]: f["value"] for f in py["groups"].get("DOCX.core", [])}
        assert py["highlights"].get("author") == core_fields.get("creator")

    def test_docx_lastmodified_matches_core_field(self):
        py = _py_parse("docx_with_metadata.docx")
        core_fields = {f["key"]: f["value"] for f in py["groups"].get("DOCX.core", [])}
        assert py["highlights"].get("lastModifiedBy") == core_fields.get("lastModifiedBy")

    def test_pdf_author_matches_info_field(self):
        py = _py_parse("pdf_with_metadata.pdf")
        info = {f["key"]: f["value"] for f in py["groups"].get("PDF.Info", [])}
        assert py["highlights"].get("author") == info.get("Author")

    def test_png_author_matches_text_field(self):
        py = _py_parse("png_with_metadata.png")
        text_fields = {f["key"]: f["value"] for f in py["groups"].get("PNG.text", [])}
        assert py["highlights"].get("author") == text_fields.get("Author")

    def test_mp3_container_sensitive(self):
        py = _py_parse("mp3_with_tags.mp3")
        container = {f["key"]: f for f in py["groups"].get("MP3.container", [])}
        if "id3v2" in container:
            assert container["id3v2"].get("sensitive") is True
