"""
PNG format parser tests.
"""

from __future__ import annotations

from metascrub import parse, scrub
from metascrub.formats.png import parser

from .conftest import fixture_bytes, fixture_path


class TestPngParse:
    def test_matches_magic(self):
        data = fixture_bytes("png_with_metadata.png")
        assert parser["matches"](data)

    def test_does_not_match_jpeg(self):
        data = fixture_bytes("jpeg_with_gps.jpg")
        assert not parser["matches"](data)

    def test_parse_with_metadata(self):
        result = parse(fixture_path("png_with_metadata.png"))
        assert result.format == "png"

    def test_text_group_present(self):
        result = parse(fixture_path("png_with_metadata.png"))
        assert "PNG.text" in result.groups

    def test_author_field(self):
        result = parse(fixture_path("png_with_metadata.png"))
        text_fields = {f.key: f.value for f in result.groups.get("PNG.text", [])}
        assert "Author" in text_fields
        assert text_fields["Author"] == "PNG Artist"

    def test_software_field(self):
        result = parse(fixture_path("png_with_metadata.png"))
        text_fields = {f.key: f.value for f in result.groups.get("PNG.text", [])}
        assert "Software" in text_fields
        assert "GIMP" in text_fields["Software"]

    def test_software_highlight(self):
        result = parse(fixture_path("png_with_metadata.png"))
        assert result.highlights.software is not None
        assert "GIMP" in result.highlights.software

    def test_author_highlight(self):
        result = parse(fixture_path("png_with_metadata.png"))
        assert result.highlights.author == "PNG Artist"

    def test_time_chunk(self):
        result = parse(fixture_path("png_with_metadata.png"))
        # tIME chunk should appear as PNG.tIME group
        assert "PNG.tIME" in result.groups
        time_val = result.groups["PNG.tIME"][0].value
        assert "2024" in str(time_val)

    def test_no_metadata_png(self):
        result = parse(fixture_path("png_no_metadata.png"))
        assert result.format == "png"
        assert result.highlights.gps is None


class TestPngScrub:
    def test_scrub_all_removes_text(self):
        clean = scrub(fixture_path("png_with_metadata.png"), preset="all")
        result = parse(clean, filename="test.png")
        assert "PNG.text" not in result.groups
        assert "PNG.tIME" not in result.groups

    def test_scrub_preserves_png_signature(self):
        clean = scrub(fixture_path("png_with_metadata.png"), preset="all")
        assert clean[:8] == b"\x89PNG\r\n\x1a\n"

    def test_scrub_valid_png(self):
        """Scrubbed PNG should be loadable by Pillow."""
        clean = scrub(fixture_path("png_with_metadata.png"), preset="all")
        import io

        from PIL import Image

        img = Image.open(io.BytesIO(clean))
        assert img.format == "PNG"

    def test_scrub_personal_only(self):
        clean = scrub(fixture_path("png_with_metadata.png"), preset="personal-only")
        result = parse(clean, filename="test.png")
        assert result.highlights.author is None

    def test_scrub_no_metadata_png_unchanged(self):
        data = fixture_bytes("png_no_metadata.png")
        clean = scrub(data, preset="all", filename="test.png")
        assert clean[:8] == b"\x89PNG\r\n\x1a\n"
