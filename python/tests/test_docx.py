"""
DOCX format parser tests.
"""

from __future__ import annotations

from metascrub import parse, scrub
from metascrub.formats.docx import parser

from .conftest import fixture_bytes, fixture_path


class TestDocxParse:
    def test_matches_magic(self):
        data = fixture_bytes("docx_with_metadata.docx")
        assert parser["matches"](data)

    def test_does_not_match_pdf(self):
        data = fixture_bytes("pdf_with_metadata.pdf")
        assert not parser["matches"](data)

    def test_parse_with_metadata(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.format == "docx"

    def test_core_group_present(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert "DOCX.core" in result.groups

    def test_creator_field(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        core = {f.key: f.value for f in result.groups.get("DOCX.core", [])}
        assert "creator" in core
        assert core["creator"] == "Test Author"

    def test_last_modified_by(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        core = {f.key: f.value for f in result.groups.get("DOCX.core", [])}
        assert "lastModifiedBy" in core
        assert core["lastModifiedBy"] == "Another User"

    def test_author_highlight(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.highlights.author == "Test Author"

    def test_last_modified_by_highlight(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.highlights.last_modified_by == "Another User"

    def test_edited_by_another_user_warning(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert any("edited by another user" in w.lower() for w in result.warnings)

    def test_app_group_present(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert "DOCX.app" in result.groups

    def test_application_field(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        app = {f.key: f.value for f in result.groups.get("DOCX.app", [])}
        assert "Application" in app
        assert "Word" in app["Application"]

    def test_revision_field(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        app = {f.key: f.value for f in result.groups.get("DOCX.app", [])}
        assert "Revision" in app
        assert int(app["Revision"]) == 3

    def test_revision_highlight(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.highlights.revision_history is not None
        assert result.highlights.revision_history == 3

    def test_revision_warning(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert any("revision" in w.lower() for w in result.warnings)

    def test_software_highlight(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        assert result.highlights.software is not None
        assert "Word" in result.highlights.software

    def test_company_sensitive(self):
        result = parse(fixture_path("docx_with_metadata.docx"))
        app_fields = {f.key: f for f in result.groups.get("DOCX.app", [])}
        company_field = app_fields.get("Company")
        assert company_field is not None
        assert company_field.sensitive is True

    def test_no_metadata_docx(self):
        result = parse(fixture_path("docx_no_metadata.docx"))
        assert result.format == "docx"


class TestDocxScrub:
    def test_scrub_all_empties_core(self):
        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="all")
        result = parse(clean, filename="test.docx")
        core = {f.key: f.value for f in result.groups.get("DOCX.core", [])}
        # After scrub, creator should be empty
        creator = core.get("creator", "")
        assert not creator or creator.strip() == ""

    def test_scrub_preserves_zip_magic(self):
        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="all")
        assert clean[:4] == b"PK\x03\x04"

    def test_scrub_preserves_document_content(self):
        """Scrubbing should not damage the ZIP structure."""
        import io
        import zipfile

        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="all")
        zf = zipfile.ZipFile(io.BytesIO(clean))
        assert "word/document.xml" in zf.namelist()

    def test_scrub_all_removes_author_highlight(self):
        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="all")
        result = parse(clean, filename="test.docx")
        assert result.highlights.author is None or result.highlights.author.strip() == ""

    def test_scrub_personal_only(self):
        clean = scrub(fixture_path("docx_with_metadata.docx"), preset="personal-only")
        result = parse(clean, filename="test.docx")
        assert result.highlights.author is None or result.highlights.author.strip() == ""
