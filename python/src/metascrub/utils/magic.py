"""
Magic-number based format detection.
Mirrors packages/core/src/utils/magic.ts.
"""

from __future__ import annotations

# (magic_bytes_prefix, format_string)
_SIGNATURES = [
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"%PDF", "pdf"),
    (b"PK\x03\x04", None),  # ZIP-based: DOCX/XLSX/PPTX/EPUB — disambiguate by filename/content
    (b"ID3", "mp3"),
    (b"\xff\xfb", "mp3"),
    (b"\xff\xfa", "mp3"),
    (b"\xff\xf3", "mp3"),
    (b"\xff\xf2", "mp3"),
    (b"fLaC", "flac"),
    (b"OggS", "ogg"),
    (b"RIFF", None),  # WAV or AVI — check bytes[8:12]
    (b"\x00\x00\x00\x18ftyp", "mp4"),
    (b"\x00\x00\x00\x20ftyp", "mp4"),
    # HEIC/AVIF also start with ftyp but at variable offset
]


def detect_from_bytes(data: bytes, filename: str | None = None) -> str | None:
    """Detect file format from magic bytes and optional filename hint."""
    # ZIP-based OOXML / EPUB
    if data[:4] == b"PK\x03\x04":
        return _detect_zip_format(data, filename)

    for sig, fmt in _SIGNATURES:
        if fmt is None:
            continue
        if data[: len(sig)] == sig:
            if fmt == "mp3" and data[:3] == b"ID3":
                return "mp3"
            if fmt == "mp3" and data[:2] in (b"\xff\xfb", b"\xff\xfa", b"\xff\xf3", b"\xff\xf2"):
                return "mp3"
            return fmt

    # RIFF
    if data[:4] == b"RIFF" and len(data) >= 12:
        subtype = data[8:12]
        if subtype == b"WAVE":
            return "wav"
        return None

    # ftyp box at variable offset for MP4/MOV/HEIC/AVIF/M4A
    for off in (4, 0):
        if len(data) > off + 12 and data[off + 4 : off + 8] == b"ftyp":
            brand = data[off + 8 : off + 12]
            if brand in (b"heic", b"heis", b"heix", b"mif1"):
                return "heic"
            if brand in (b"avif", b"avis"):
                return "avif"
            if brand in (b"M4A ", b"m4a "):
                return "m4a"
            if brand in (b"qt  ",):
                return "mov"
            return "mp4"

    # SVG
    if data[:5] in (b"<?xml", b"<svg "):
        return "svg"
    stripped = data[:512].lstrip()
    if stripped.startswith(b"<?xml") or stripped.startswith(b"<svg"):
        return "svg"

    # TIFF
    if data[:4] in (b"II*\x00", b"MM\x00*"):
        return "tiff"

    # Fallback to filename extension
    if filename:
        return detect_from_extension(filename)

    return None


def _detect_zip_format(data: bytes, filename: str | None) -> str | None:
    """Disambiguate ZIP-based formats by filename hint."""
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        ext_map = {
            "docx": "docx",
            "xlsx": "xlsx",
            "pptx": "pptx",
            "epub": "epub",
        }
        if ext in ext_map:
            return ext_map[ext]
    # Try to sniff content type from ZIP central directory names
    # Look for EPUB mimetype entry
    try:
        idx = data.find(b"mimetype")
        if idx != -1:
            # Crude: EPUB has 'mimetype' file at the root
            mime_start = data.find(b"application/epub", idx)
            if mime_start != -1 and mime_start - idx < 40:
                return "epub"
    except Exception:
        pass
    return "docx"  # default ZIP-based to docx


def detect_from_extension(filename: str) -> str | None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    ext_map = {
        "jpg": "jpeg",
        "jpeg": "jpeg",
        "png": "png",
        "pdf": "pdf",
        "docx": "docx",
        "xlsx": "xlsx",
        "pptx": "pptx",
        "epub": "epub",
        "mp3": "mp3",
        "flac": "flac",
        "ogg": "ogg",
        "wav": "wav",
        "m4a": "m4a",
        "mp4": "mp4",
        "mov": "mov",
        "mkv": "mkv",
        "webm": "webm",
        "heic": "heic",
        "heif": "heic",
        "webp": "webp",
        "avif": "avif",
        "tiff": "tiff",
        "tif": "tiff",
        "svg": "svg",
        "cr2": "raw-cr2",
        "nef": "raw-nef",
        "arw": "raw-arw",
        "dng": "raw-dng",
    }
    return ext_map.get(ext)
