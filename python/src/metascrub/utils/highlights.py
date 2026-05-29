"""
Build MetadataHighlights and warnings from parsed groups.

Mirrors packages/core/src/utils/highlights.ts exactly — same field lookups,
same warning text, so Python + TS outputs are parity-comparable.
"""

from __future__ import annotations

import re

from ..types import (
    DeviceInfo,
    GPSCoords,
    MetadataField,
    MetadataHighlights,
    MetadataResult,
)

Groups = dict[str, list[MetadataField]]

EDITOR_SOFTWARE = [
    re.compile(r"adobe", re.I),
    re.compile(r"photoshop", re.I),
    re.compile(r"lightroom", re.I),
    re.compile(r"illustrator", re.I),
    re.compile(r"acrobat", re.I),
    re.compile(r"microsoft word", re.I),
    re.compile(r"libreoffice", re.I),
    re.compile(r"openoffice", re.I),
    re.compile(r"word", re.I),
    re.compile(r"pages", re.I),
    re.compile(r"quartzpdfcontext", re.I),
]


def _find_field(groups: Groups, group: str, key: str) -> MetadataField | None:
    fields = groups.get(group)
    if not fields:
        return None
    for f in fields:
        if f.key == key:
            return f
    return None


def _to_number(value) -> float | None:
    if isinstance(value, (int, float)) and not (
        isinstance(value, float) and (value != value)  # NaN check
    ):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _to_str(value) -> str | None:
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, (int, float)):
        return str(value)
    return None


def build_highlights(groups: Groups) -> tuple[MetadataHighlights, list[str]]:
    """
    Build highlights and warnings from metadata groups.
    Mirrors buildHighlights() in packages/core/src/utils/highlights.ts.
    """
    highlights = MetadataHighlights()
    warnings: list[str] = []

    # GPS
    lat = (
        _to_number(
            _find_field(groups, "GPS", "latitude") and _find_field(groups, "GPS", "latitude").value
        )
        or _to_number(
            _find_field(groups, "GPS", "Latitude") and _find_field(groups, "GPS", "Latitude").value
        )
        or _to_number(
            _find_field(groups, "EXIF", "GPSLatitude")
            and _find_field(groups, "EXIF", "GPSLatitude").value
        )
    )
    lon = (
        _to_number(
            _find_field(groups, "GPS", "longitude")
            and _find_field(groups, "GPS", "longitude").value
        )
        or _to_number(
            _find_field(groups, "GPS", "Longitude")
            and _find_field(groups, "GPS", "Longitude").value
        )
        or _to_number(
            _find_field(groups, "EXIF", "GPSLongitude")
            and _find_field(groups, "EXIF", "GPSLongitude").value
        )
    )
    alt_field = (
        _find_field(groups, "GPS", "altitude")
        or _find_field(groups, "GPS", "Altitude")
        or _find_field(groups, "EXIF", "GPSAltitude")
    )
    alt = _to_number(alt_field.value if alt_field else None)

    if lat is not None and lon is not None:
        highlights.gps = GPSCoords(lat=lat, lon=lon, alt=alt if alt is not None else None)
        warnings.append(f"GPS coordinates found ({lat:.4f}, {lon:.4f})")

    # Captured timestamp
    captured = (
        _to_str(
            _find_field(groups, "EXIF", "DateTimeOriginal")
            and _find_field(groups, "EXIF", "DateTimeOriginal").value
        )
        or _to_str(
            _find_field(groups, "EXIF", "CreateDate")
            and _find_field(groups, "EXIF", "CreateDate").value
        )
        or _to_str(
            _find_field(groups, "EXIF", "DateTime")
            and _find_field(groups, "EXIF", "DateTime").value
        )
    )
    if captured:
        highlights.captured_at = captured

    # Device
    make_f = _find_field(groups, "EXIF", "Make")
    model_f = _find_field(groups, "EXIF", "Model")
    serial_f = _find_field(groups, "EXIF", "SerialNumber") or _find_field(
        groups, "EXIF", "BodySerialNumber"
    )
    make = _to_str(make_f.value if make_f else None)
    model = _to_str(model_f.value if model_f else None)
    serial = _to_str(serial_f.value if serial_f else None)
    if make or model or serial:
        highlights.device = DeviceInfo(make=make, model=model, serial=serial)
        if serial:
            warnings.append(f"Camera serial number found ({serial})")

    # Software
    software = (
        _to_str(
            _find_field(groups, "EXIF", "Software")
            and _find_field(groups, "EXIF", "Software").value
        )
        or _to_str(
            _find_field(groups, "PDF.Info", "Producer")
            and _find_field(groups, "PDF.Info", "Producer").value
        )
        or _to_str(
            _find_field(groups, "PDF.Info", "Creator")
            and _find_field(groups, "PDF.Info", "Creator").value
        )
        or _to_str(
            _find_field(groups, "DOCX.app", "Application")
            and _find_field(groups, "DOCX.app", "Application").value
        )
        or _to_str(
            _find_field(groups, "XLSX.app", "Application")
            and _find_field(groups, "XLSX.app", "Application").value
        )
        or _to_str(
            _find_field(groups, "PPTX.app", "Application")
            and _find_field(groups, "PPTX.app", "Application").value
        )
        or _to_str(
            _find_field(groups, "SVG.metadata", "editor")
            and _find_field(groups, "SVG.metadata", "editor").value
        )
        or _to_str(
            _find_field(groups, "PNG.text", "Software")
            and _find_field(groups, "PNG.text", "Software").value
        )
    )
    if software:
        highlights.software = software
        if any(pat.search(software) for pat in EDITOR_SOFTWARE):
            warnings.append(f"Edited in {software}")

    # Author / creator
    author = (
        _to_str(
            _find_field(groups, "EXIF", "Artist") and _find_field(groups, "EXIF", "Artist").value
        )
        or _to_str(
            _find_field(groups, "XMP", "creator") and _find_field(groups, "XMP", "creator").value
        )
        or _to_str(
            _find_field(groups, "PDF.Info", "Author")
            and _find_field(groups, "PDF.Info", "Author").value
        )
        or _to_str(
            _find_field(groups, "DOCX.core", "creator")
            and _find_field(groups, "DOCX.core", "creator").value
        )
        or _to_str(
            _find_field(groups, "XLSX.core", "creator")
            and _find_field(groups, "XLSX.core", "creator").value
        )
        or _to_str(
            _find_field(groups, "PPTX.core", "creator")
            and _find_field(groups, "PPTX.core", "creator").value
        )
        or _to_str(
            _find_field(groups, "EPUB.meta", "creator")
            and _find_field(groups, "EPUB.meta", "creator").value
        )
        or _to_str(
            _find_field(groups, "SVG.metadata", "creator")
            and _find_field(groups, "SVG.metadata", "creator").value
        )
        or _to_str(
            _find_field(groups, "IPTC", "By-line") and _find_field(groups, "IPTC", "By-line").value
        )
        or _to_str(
            _find_field(groups, "PNG.text", "Author")
            and _find_field(groups, "PNG.text", "Author").value
        )
        or _to_str(
            _find_field(groups, "PNG.text", "Artist")
            and _find_field(groups, "PNG.text", "Artist").value
        )
    )
    if author:
        highlights.author = author
        warnings.append(f"Author/creator found ({author})")

    # Last modified by
    last_modified_by = (
        _to_str(
            _find_field(groups, "DOCX.core", "lastModifiedBy")
            and _find_field(groups, "DOCX.core", "lastModifiedBy").value
        )
        or _to_str(
            _find_field(groups, "XLSX.core", "lastModifiedBy")
            and _find_field(groups, "XLSX.core", "lastModifiedBy").value
        )
        or _to_str(
            _find_field(groups, "PPTX.core", "lastModifiedBy")
            and _find_field(groups, "PPTX.core", "lastModifiedBy").value
        )
    )
    if last_modified_by:
        highlights.last_modified_by = last_modified_by
        if highlights.author and last_modified_by.lower() != highlights.author.lower():
            warnings.append(f"File was edited by another user ({last_modified_by})")

    # Revision history
    rev_f = _find_field(groups, "DOCX.app", "Revision")
    revisions = _to_number(rev_f.value if rev_f else None)
    if revisions is not None and revisions > 0:
        highlights.revision_history = int(revisions)
        if revisions > 1:
            warnings.append(f"Revision count {int(revisions)} (file edited multiple times)")

    return highlights, warnings


def finalize_result(
    fmt: str,
    size_bytes: int,
    groups: Groups,
    filename: str | None = None,
) -> MetadataResult:
    """Build a complete MetadataResult from parsed groups."""
    highlights, warnings = build_highlights(groups)
    return MetadataResult(
        format=fmt,
        size_bytes=size_bytes,
        groups=groups,
        highlights=highlights,
        warnings=warnings,
        filename=filename,
    )
