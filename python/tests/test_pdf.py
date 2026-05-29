"""
PDF format parser tests.
"""

from __future__ import annotations

from metascrub import parse, scrub
from metascrub.formats.pdf import parser

from .conftest import fixture_bytes, fixture_path


class TestPdfParse:
    def test_matches_magic(self):
        data = fixture_bytes("pdf_with_metadata.pdf")
        assert parser["matches"](data)

    def test_does_not_match_jpeg(self):
        data = fixture_bytes("jpeg_with_gps.jpg")
        assert not parser["matches"](data)

    def test_parse_with_metadata(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert result.format == "pdf"

    def test_info_group_present(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert "PDF.Info" in result.groups

    def test_author_field(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        info = {f.key: f.value for f in result.groups.get("PDF.Info", [])}
        assert "Author" in info
        assert "Test Author" in str(info["Author"])

    def test_author_highlight(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert result.highlights.author is not None
        assert "Test Author" in result.highlights.author

    def test_author_warning(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert any("Author" in w or "creator" in w.lower() for w in result.warnings)

    def test_producer_field(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        info = {f.key: f.value for f in result.groups.get("PDF.Info", [])}
        assert "Producer" in info

    def test_page_count(self):
        result = parse(fixture_path("pdf_with_metadata.pdf"))
        assert "PDF" in result.groups
        pdf_fields = {f.key: f.value for f in result.groups["PDF"]}
        assert "PageCount" in pdf_fields

    def test_no_metadata_pdf(self):
        result = parse(fixture_path("pdf_no_metadata.pdf"))
        assert result.format == "pdf"
        # No Info dict means no PDF.Info group (or empty)
        info = result.groups.get("PDF.Info", [])
        assert len(info) == 0


class TestPdfScrub:
    def test_scrub_all_removes_author(self):
        clean = scrub(fixture_path("pdf_with_metadata.pdf"), preset="all")
        result = parse(clean, filename="test.pdf")
        # Author should be empty or absent
        info = {f.key: f.value for f in result.groups.get("PDF.Info", [])}
        author = info.get("Author", "")
        assert not author or author.strip() == ""

    def test_scrub_preserves_pdf_header(self):
        clean = scrub(fixture_path("pdf_with_metadata.pdf"), preset="all")
        assert clean[:4] == b"%PDF"

    def test_scrub_personal_only(self):
        clean = scrub(fixture_path("pdf_with_metadata.pdf"), preset="personal-only")
        result = parse(clean, filename="test.pdf")
        assert result.highlights.author is None or result.highlights.author.strip() == ""

    def test_scrub_gps_only_no_op(self):
        """PDF scrub with gps-only preset should not remove metadata."""
        original = fixture_bytes("pdf_with_metadata.pdf")
        clean = scrub(original, preset="gps-only", filename="test.pdf")
        # Scrub gps-only on PDF is a no-op; output must still be a valid PDF
        assert clean[:4] == b"%PDF"
        # The file should be parseable
        result = parse(clean, filename="test.pdf")
        assert result.format == "pdf"
