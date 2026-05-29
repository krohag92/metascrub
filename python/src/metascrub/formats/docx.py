"""
DOCX parser — zipfile + xml.etree.

Mirrors packages/core/src/formats/_ooxml.ts:
  - Reads docProps/core.xml (creator, lastModifiedBy, title, subject, etc.)
  - Reads docProps/app.xml (Application, Company, Manager, Revision, etc.)
  - Scrub: regenerate both files with empty fields (Word needs them present)
  - custom.xml removed on preset='all'
"""

from __future__ import annotations

import io
import re
import zipfile

from ..presets import ResolvedScrub, resolve_scrub
from ..types import MetadataField

CORE_FIELDS = [
    "creator",
    "lastModifiedBy",
    "title",
    "subject",
    "description",
    "keywords",
    "category",
    "contentStatus",
    "language",
    "created",
    "modified",
    "revision",
    "version",
]

APP_FIELDS = [
    "Application",
    "AppVersion",
    "Company",
    "Manager",
    "Template",
    "TotalTime",
    "Pages",
    "Words",
    "Characters",
    "CharactersWithSpaces",
    "Lines",
    "Paragraphs",
    "Revision",
]

CORE_SENSITIVE = {"creator", "lastModifiedBy", "title", "subject", "keywords"}
APP_SENSITIVE = {"Company", "Manager"}

EMPTY_CORE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <dc:creator></dc:creator>\n  <cp:lastModifiedBy></cp:lastModifiedBy>\n  <dc:title></dc:title>\n  <dc:subject></dc:subject>\n  <dc:description></dc:description>\n  <cp:keywords></cp:keywords>\n</cp:coreProperties>'

EMPTY_APP_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n  <Application></Application>\n  <Company></Company>\n  <Manager></Manager>\n</Properties>'


def _escape_regex(s: str) -> str:
    return re.escape(s)


def _decode_xml_entities(s: str) -> str:
    return (
        s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&amp;", "&")
    )


def _extract_tags(xml: str, fields: list[str]) -> dict[str, str]:
    """Extract tag values from XML string (mirrors extractTags in _ooxml.ts)."""
    out: dict[str, str] = {}
    for f in fields:
        pattern = rf"<(?:\w+:)?{_escape_regex(f)}[^>]*>([\s\S]*?)</(?:\w+:)?{_escape_regex(f)}>"
        m = re.search(pattern, xml, re.IGNORECASE)
        if m:
            out[f] = _decode_xml_entities(m.group(1).strip())
    return out


def _parse_ooxml_bytes(
    data: bytes,
    group_prefix: str = "DOCX",
) -> dict[str, list[MetadataField]]:
    core_group = f"{group_prefix}.core"
    app_group = f"{group_prefix}.app"
    groups: dict[str, list[MetadataField]] = {}

    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except Exception as e:
        raise ValueError(f"Cannot open ZIP/DOCX: {e}") from e

    try:
        core_xml = zf.read("docProps/core.xml").decode("utf-8", errors="replace")
    except KeyError:
        core_xml = None

    try:
        app_xml = zf.read("docProps/app.xml").decode("utf-8", errors="replace")
    except KeyError:
        app_xml = None

    if core_xml:
        fields = _extract_tags(core_xml, CORE_FIELDS)
        arr = [
            MetadataField(key=k, value=v, sensitive=k in CORE_SENSITIVE) for k, v in fields.items()
        ]
        if arr:
            groups[core_group] = arr

    if app_xml:
        fields = _extract_tags(app_xml, APP_FIELDS)
        arr = []
        for k, v in fields.items():
            mf = MetadataField(key=k, value=v)
            if k in APP_SENSITIVE:
                mf.sensitive = True
            arr.append(mf)
        if arr:
            groups[app_group] = arr

    return groups


def _scrub_ooxml_bytes(
    data: bytes,
    resolved: ResolvedScrub,
    group_prefix: str = "DOCX",
) -> bytes:
    wipe = resolved.preset in ("all", "personal-only", "keep-technical")

    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except Exception as e:
        raise ValueError(f"Cannot open ZIP/DOCX: {e}") from e

    # Read all members
    members: dict[str, bytes] = {}
    for name in zf.namelist():
        members[name] = zf.read(name)

    if wipe:
        if "docProps/core.xml" in members:
            members["docProps/core.xml"] = EMPTY_CORE_XML.encode("utf-8")
        if "docProps/app.xml" in members:
            members["docProps/app.xml"] = EMPTY_APP_XML.encode("utf-8")
        if resolved.preset == "all" and "docProps/custom.xml" in members:
            del members["docProps/custom.xml"]

    elif resolved.preset == "custom":
        wipe_core = any(
            p == f"{group_prefix}.core.*" or p.startswith(f"{group_prefix}.core.")
            for p in resolved.remove
        )
        wipe_app = any(
            p == f"{group_prefix}.app.*" or p.startswith(f"{group_prefix}.app.")
            for p in resolved.remove
        )
        if wipe_core and "docProps/core.xml" in members:
            members["docProps/core.xml"] = EMPTY_CORE_XML.encode("utf-8")
        if wipe_app and "docProps/app.xml" in members:
            members["docProps/app.xml"] = EMPTY_APP_XML.encode("utf-8")

    # Repack ZIP
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as out_zf:
        for name, content in members.items():
            out_zf.writestr(name, content)

    return buf.getvalue()


# -------------------------------------------------------------------------
# Parser interface
# -------------------------------------------------------------------------


def _matches(data: bytes) -> bool:
    return data[:4] == b"PK\x03\x04"


def _parse(data: bytes, filename: str | None = None) -> dict[str, list[MetadataField]]:
    return _parse_ooxml_bytes(data, group_prefix="DOCX")


def _scrub(
    data: bytes,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> bytes:
    resolved = resolve_scrub(preset=preset, keep=keep, remove=remove)
    return _scrub_ooxml_bytes(data, resolved, group_prefix="DOCX")


parser = {
    "format": "docx",
    "extensions": [".docx"],
    "mime_types": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    "matches": _matches,
    "parse": _parse,
    "scrub": _scrub,
}
