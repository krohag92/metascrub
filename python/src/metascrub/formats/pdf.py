"""
PDF parser — pypdf.

Mirrors packages/core/src/formats/pdf.ts:
  - Reads Info dict fields: Title, Author, Subject, Keywords, Creator, Producer,
    CreationDate, ModDate
  - Also exposes PageCount
  - Scrub: wipe Info dict fields + XMP metadata stream
"""

from __future__ import annotations

from ..presets import ResolvedScrub, resolve_scrub
from ..types import MetadataField

SENSITIVE_INFO_KEYS = {"Author", "Creator", "Producer", "Title", "Subject", "Keywords"}


def _parse_pdf_bytes(data: bytes) -> dict[str, list[MetadataField]]:
    import io

    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    groups: dict[str, list[MetadataField]] = {}
    info_fields: list[MetadataField] = []

    meta = reader.metadata
    if meta:

        def _add(key: str, raw_key: str) -> None:
            try:
                val = meta.get(raw_key)
                if val and str(val).strip():
                    info_fields.append(
                        MetadataField(
                            key=key,
                            value=str(val).strip(),
                            sensitive=key in SENSITIVE_INFO_KEYS,
                        )
                    )
            except Exception:
                pass

        _add("Title", "/Title")
        _add("Author", "/Author")
        _add("Subject", "/Subject")
        _add("Keywords", "/Keywords")
        _add("Creator", "/Creator")
        _add("Producer", "/Producer")
        _add("CreationDate", "/CreationDate")
        _add("ModDate", "/ModDate")

    if info_fields:
        groups["PDF.Info"] = info_fields

    # Page count
    try:
        page_count = len(reader.pages)
        groups["PDF"] = [MetadataField(key="PageCount", value=page_count)]
    except Exception:
        pass

    return groups


def _scrub_pdf_bytes(data: bytes, resolved: ResolvedScrub) -> bytes:
    import io

    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(io.BytesIO(data))
    writer = PdfWriter()
    writer.append(reader)

    if resolved.preset in ("all", "personal-only", "keep-technical"):
        # Wipe Info dict
        writer.add_metadata(
            {
                "/Title": "",
                "/Author": "",
                "/Subject": "",
                "/Keywords": "",
                "/Creator": "",
                "/Producer": "",
            }
        )
        if resolved.preset != "keep-technical":
            # Also clear dates
            writer.add_metadata(
                {
                    "/CreationDate": "",
                    "/ModDate": "",
                }
            )
        # Remove XMP metadata stream from catalog
        try:
            if hasattr(writer, "_root_object"):
                root = writer._root_object
                if "/Metadata" in root:
                    del root["/Metadata"]
        except Exception:
            pass

    elif resolved.preset == "gps-only":
        pass  # PDFs rarely carry geo info

    elif resolved.preset == "custom":
        updates = {}

        def _should(k: str) -> bool:
            return (
                f"PDF.Info.{k}" in resolved.remove
                or "PDF.Info.*" in resolved.remove
                or "PDF.*" in resolved.remove
            )

        if _should("Title"):
            updates["/Title"] = ""
        if _should("Author"):
            updates["/Author"] = ""
        if _should("Subject"):
            updates["/Subject"] = ""
        if _should("Keywords"):
            updates["/Keywords"] = ""
        if _should("Creator"):
            updates["/Creator"] = ""
        if _should("Producer"):
            updates["/Producer"] = ""
        if updates:
            writer.add_metadata(updates)

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# -------------------------------------------------------------------------
# Parser interface
# -------------------------------------------------------------------------


def _matches(data: bytes) -> bool:
    return data[:4] == b"%PDF"


def _parse(data: bytes, filename: str | None = None) -> dict[str, list[MetadataField]]:
    return _parse_pdf_bytes(data)


def _scrub(
    data: bytes,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> bytes:
    resolved = resolve_scrub(preset=preset, keep=keep, remove=remove)
    return _scrub_pdf_bytes(data, resolved)


parser = {
    "format": "pdf",
    "extensions": [".pdf"],
    "mime_types": ["application/pdf"],
    "matches": _matches,
    "parse": _parse,
    "scrub": _scrub,
}
