"""
MP3 format parser tests.
"""

from __future__ import annotations

from metascrub import parse, scrub
from metascrub.formats.mp3 import _find_id3v1, _id3v2_prefix_length, parser

from .conftest import fixture_bytes, fixture_path


class TestMp3LowLevel:
    def test_syncsafe_decode(self):
        from metascrub.formats.mp3 import _read_syncsafe

        # 0x00 0x00 0x02 0x01 = 257 in syncsafe (2*128 + 1)
        data = bytes([0x00, 0x00, 0x02, 0x01])
        assert _read_syncsafe(data, 0) == 257

    def test_id3v2_prefix_length(self):
        data = fixture_bytes("mp3_with_tags.mp3")
        v2_len = _id3v2_prefix_length(data)
        assert v2_len > 10  # must be larger than the 10-byte header

    def test_id3v1_detection(self):
        data = fixture_bytes("mp3_with_tags.mp3")
        v1_off = _find_id3v1(data)
        assert v1_off >= 0
        assert data[v1_off : v1_off + 3] == b"TAG"

    def test_no_id3v2_in_clean(self):
        data = fixture_bytes("mp3_no_tags.mp3")
        v2_len = _id3v2_prefix_length(data)
        assert v2_len == 0

    def test_no_id3v1_in_clean(self):
        data = fixture_bytes("mp3_no_tags.mp3")
        v1_off = _find_id3v1(data)
        assert v1_off == -1


class TestMp3Parse:
    def test_matches_magic_id3v2(self):
        data = fixture_bytes("mp3_with_tags.mp3")
        assert parser["matches"](data)

    def test_matches_magic_mpeg_sync(self):
        data = fixture_bytes("mp3_no_tags.mp3")
        assert parser["matches"](data)

    def test_does_not_match_pdf(self):
        data = fixture_bytes("pdf_with_metadata.pdf")
        assert not parser["matches"](data)

    def test_parse_with_tags(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        assert result.format == "mp3"

    def test_container_group_present(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        assert "MP3.container" in result.groups

    def test_id3v2_container_field(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        container = {f.key: f.value for f in result.groups.get("MP3.container", [])}
        assert "id3v2" in container
        assert "bytes" in str(container["id3v2"])

    def test_id3v1_container_field(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        container = {f.key: f.value for f in result.groups.get("MP3.container", [])}
        assert "id3v1" in container

    def test_common_fields_present(self):
        result = parse(fixture_path("mp3_with_tags.mp3"))
        # tinytag should parse common fields
        if "Audio.common" in result.groups:
            common = {f.key: f.value for f in result.groups["Audio.common"]}
            # At least some fields should be present
            assert len(common) > 0

    def test_parse_no_tags(self):
        result = parse(fixture_path("mp3_no_tags.mp3"))
        assert result.format == "mp3"
        # No container fields expected
        container = result.groups.get("MP3.container", [])
        assert len(container) == 0 or all(f.key not in ("id3v2", "id3v1") for f in container)


class TestMp3Scrub:
    def test_scrub_all_removes_id3(self):
        clean = scrub(fixture_path("mp3_with_tags.mp3"), preset="all")
        # After scrub, no ID3v2 prefix
        v2_len = _id3v2_prefix_length(clean)
        assert v2_len == 0

    def test_scrub_all_removes_id3v1(self):
        clean = scrub(fixture_path("mp3_with_tags.mp3"), preset="all")
        v1_off = _find_id3v1(clean)
        assert v1_off < 0

    def test_scrub_preserves_mpeg_frames(self):
        """Scrubbed file should start with MPEG sync bytes."""
        clean = scrub(fixture_path("mp3_with_tags.mp3"), preset="all")
        # Should start with MPEG frame sync or be empty-ish
        assert len(clean) > 0
        # First bytes should be MPEG sync (0xFF 0xFB etc)
        assert clean[0] == 0xFF

    def test_scrub_no_tags_no_change(self):
        data = fixture_bytes("mp3_no_tags.mp3")
        clean = scrub(data, preset="all", filename="test.mp3")
        # No tags to remove, should be same bytes
        assert clean == data

    def test_scrub_personal_only(self):
        clean = scrub(fixture_path("mp3_with_tags.mp3"), preset="personal-only")
        v2_len = _id3v2_prefix_length(clean)
        assert v2_len == 0
