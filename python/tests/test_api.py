"""
Tests for the top-level API: parse, scrub, compare, detect_format, supported_formats.
"""

from __future__ import annotations

import pytest

from metascrub import (
    MetaScrubError,
    compare,
    detect_format,
    parse,
    scrub,
    supported_formats,
)

from .conftest import fixture_bytes, fixture_path


class TestDetectFormat:
    def test_jpeg(self):
        assert detect_format(fixture_path("jpeg_with_gps.jpg")) == "jpeg"

    def test_jpeg_from_bytes(self):
        data = fixture_bytes("jpeg_with_gps.jpg")
        assert detect_format(data, filename="test.jpg") == "jpeg"

    def test_png(self):
        assert detect_format(fixture_path("png_with_metadata.png")) == "png"

    def test_pdf(self):
        assert detect_format(fixture_path("pdf_with_metadata.pdf")) == "pdf"

    def test_docx(self):
        assert detect_format(fixture_path("docx_with_metadata.docx")) == "docx"

    def test_mp3(self):
        assert detect_format(fixture_path("mp3_with_tags.mp3")) == "mp3"

    def test_unknown_returns_none(self):
        result = detect_format(b"\x00\x01\x02\x03", filename="unknown.xyz")
        assert result is None


class TestSupportedFormats:
    def test_returns_list(self):
        fmts = supported_formats()
        assert isinstance(fmts, list)
        assert len(fmts) >= 5

    def test_includes_required(self):
        fmts = supported_formats()
        for required in ("jpeg", "png", "pdf", "docx", "mp3"):
            assert required in fmts


class TestParse:
    def test_parse_jpeg_returns_result(self):
        result = parse(fixture_path("jpeg_with_gps.jpg"))
        assert result.format == "jpeg"
        assert result.size_bytes > 0
        assert isinstance(result.groups, dict)
        assert isinstance(result.warnings, list)

    def test_parse_jpeg_from_bytes(self):
        data = fixture_bytes("jpeg_with_gps.jpg")
        result = parse(data, filename="jpeg_with_gps.jpg")
        assert result.format == "jpeg"
        assert result.filename == "jpeg_with_gps.jpg"

    def test_parse_unsupported_raises(self):
        with pytest.raises(MetaScrubError) as exc_info:
            parse(b"\x00\x01\x02\x03", filename="unknown.xyz")
        assert exc_info.value.code == "UNSUPPORTED_FORMAT"

    def test_parse_png(self):
        result = parse(fixture_path("png_with_metadata.png"))
        assert result.format == "png"

    def test_parse_pdf(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert result.format == "pdf"

    def test_parse_docx(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.format == "docx"

    def test_parse_mp3(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        assert result.format == "mp3"

    def test_to_dict_serializable(self):
        import json

        result = parse(fixture_path("jpeg_with_gps.jpg"))
        d = result.to_dict()
        # Should be JSON-serializable
        json_str = json.dumps(d, default=str)
        assert '"format"' in json_str


class TestScrub:
    def test_scrub_jpeg_all_returns_bytes(self):
        clean = scrub(fixture_path("jpeg_with_gps.jpg"), preset="all")
        assert isinstance(clean, bytes)
        assert clean[:2] == b"\xff\xd8"  # still a valid JPEG SOI

    def test_scrub_jpeg_gps_only(self):
        clean = scrub(fixture_path("jpeg_with_gps.jpg"), preset="gps-only")
        assert isinstance(clean, bytes)
        assert len(clean) > 0

    def test_scrub_reduces_size(self):
        original = fixture_bytes("jpeg_with_gps.jpg")
        clean = scrub(fixture_path("jpeg_with_gps.jpg"), preset="all")
        # Scrubbed should be smaller (or equal if nothing to remove)
        assert len(clean) <= len(original)

    def test_scrub_png(self):
        clean = scrub(fixture_path("png_with_metadata.png"), preset="all")
        assert clean[:8] == b"\x89PNG\r\n\x1a\n"

    def test_scrub_pdf(self):
        clean = scrub(fixture_path("pdf_with_metadata.pdf"), preset="all")
        assert clean[:4] == b"%PDF"

    def test_scrub_docx(self):
        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="all")
        assert clean[:4] == b"PK\x03\x04"  # ZIP magic

    def test_scrub_mp3(self):
        clean = scrub(fixture_path("mp3_with_tags.mp3"), preset="all")
        assert isinstance(clean, bytes)

    def test_scrub_unsupported_raises(self):
        with pytest.raises(MetaScrubError) as exc_info:
            scrub(b"\x00\x01\x02", preset="all", filename="file.xyz")
        assert exc_info.value.code == "UNSUPPORTED_FORMAT"


class TestCompare:
    def test_compare_same_file(self):
        diff = compare(fixture_path("jpeg_with_gps.jpg"), fixture_path("jpeg_with_gps.jpg"))
        assert diff.only_in_a == []
        assert diff.only_in_b == []
        assert diff.changed == []

    def test_compare_original_vs_scrubbed(self):
        data = fixture_bytes("jpeg_with_gps.jpg")
        clean = scrub(data, preset="all", filename="test.jpg")
        diff = compare(data, clean, filename_a="original.jpg", filename_b="clean.jpg")
        # Original should have more fields than scrubbed
        assert len(diff.only_in_a) > 0

    def test_compare_to_dict(self):
        import json

        data = fixture_bytes("jpeg_with_gps.jpg")
        clean = scrub(data, preset="all", filename="test.jpg")
        diff = compare(data, clean, filename_a="a.jpg", filename_b="b.jpg")
        d = diff.to_dict()
        json_str = json.dumps(d, default=str)
        assert "onlyInA" in json_str
