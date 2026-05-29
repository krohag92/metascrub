"""
PNG parser — chunk-level walk.

Mirrors packages/core/src/formats/png.ts:
  - Reads tEXt / zTXt / iTXt / tIME / eXIf chunks
  - CRC recomputed on scrub
  - Metadata chunks removed according to preset
"""

from __future__ import annotations

import struct
import zlib

from ..presets import ResolvedScrub, resolve_scrub
from ..types import MetadataField

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

METADATA_CHUNK_TYPES = {"tEXt", "zTXt", "iTXt", "tIME", "eXIf", "xmp "}
TEXT_TYPES = {"tEXt", "zTXt", "iTXt"}

TEXT_SENSITIVE = {
    "Author",
    "Artist",
    "Copyright",
    "Creator",
    "Source",
    "Software",
    "XML:com.adobe.xmp",
}


# -------------------------------------------------------------------------
# Chunk I/O
# -------------------------------------------------------------------------


def _read_chunks(data: bytes) -> list[tuple[str, bytes]]:
    """Return list of (chunk_type, chunk_data) tuples."""
    if data[:8] != PNG_SIGNATURE:
        raise ValueError("Not a PNG file (missing 8-byte signature)")
    chunks = []
    i = 8
    n = len(data)
    while i < n:
        if i + 8 > n:
            raise ValueError("Truncated PNG chunk header")
        length = struct.unpack_from(">I", data, i)[0]
        chunk_type = data[i + 4 : i + 8].decode("latin-1")
        data_start = i + 8
        data_end = data_start + length
        if data_end + 4 > n:
            raise ValueError("Truncated PNG chunk data")
        chunk_data = data[data_start:data_end]
        # crc = data[data_end:data_end+4]  # not used during parse
        chunks.append((chunk_type, chunk_data))
        i = data_end + 4
        if chunk_type == "IEND":
            break
    return chunks


def _write_chunks(chunks: list[tuple[str, bytes]]) -> bytes:
    """Serialize chunks back to PNG bytes (signature + chunks with recomputed CRCs)."""
    parts = [PNG_SIGNATURE]
    for chunk_type, chunk_data in chunks:
        type_bytes = chunk_type.encode("latin-1")
        crc_input = type_bytes + chunk_data
        crc = zlib.crc32(crc_input) & 0xFFFFFFFF
        parts.append(struct.pack(">I", len(chunk_data)))
        parts.append(type_bytes)
        parts.append(chunk_data)
        parts.append(struct.pack(">I", crc))
    return b"".join(parts)


# -------------------------------------------------------------------------
# Text chunk parsing
# -------------------------------------------------------------------------


def _parse_text_chunk(chunk_type: str, chunk_data: bytes) -> tuple[str, str] | None:
    """Return (keyword, value) or None."""
    if chunk_type not in TEXT_TYPES:
        return None
    # Find null terminator
    null_pos = chunk_data.find(b"\x00")
    if null_pos < 0:
        return None
    keyword = chunk_data[:null_pos].decode("latin-1", errors="replace")

    if chunk_type == "tEXt":
        value = chunk_data[null_pos + 1 :].decode("latin-1", errors="replace")
    elif chunk_type == "iTXt":
        # keyword\0 compressionFlag(1) compressionMethod(1) langTag\0 translatedKeyword\0 text
        j = null_pos + 1
        if j + 2 > len(chunk_data):
            return keyword, ""
        compression_flag = chunk_data[j]
        j += 2  # skip flag + method
        # skip lang tag
        while j < len(chunk_data) and chunk_data[j] != 0:
            j += 1
        j += 1
        # skip translated keyword
        while j < len(chunk_data) and chunk_data[j] != 0:
            j += 1
        j += 1
        tail = chunk_data[j:]
        if compression_flag == 1:
            try:
                value = zlib.decompress(tail).decode("utf-8", errors="replace")
            except Exception:
                value = "<deflate compressed>"
        else:
            value = tail.decode("utf-8", errors="replace")
    elif chunk_type == "zTXt":
        value = "<deflate compressed>"
    else:
        value = ""

    return keyword, value


# -------------------------------------------------------------------------
# EXIF chunk parse (eXIf)
# -------------------------------------------------------------------------


def _parse_exif_chunk(chunk_data: bytes) -> list[MetadataField]:
    """Parse eXIf chunk using piexif."""
    try:
        import piexif

        exif_data = piexif.load(chunk_data)
        fields: list[MetadataField] = []
        for ifd_name in ("0th", "Exif"):
            ifd = exif_data.get(ifd_name, {})
            for tag_id, val in ifd.items():
                name = piexif.TAGS[ifd_name].get(tag_id, {}).get("name", f"tag_{tag_id}")
                if isinstance(val, bytes):
                    try:
                        disp = val.decode("ascii", errors="strict").rstrip("\x00").strip()
                    except Exception:
                        disp = f"<{len(val)} bytes>"
                elif isinstance(val, tuple) and len(val) == 2:
                    num, den = val
                    disp = str(num / den) if den != 0 else str(num)
                else:
                    disp = str(val)
                fields.append(MetadataField(key=name, value=disp))
        return fields
    except Exception:
        return []


# -------------------------------------------------------------------------
# Main parse
# -------------------------------------------------------------------------


def _parse_png_bytes(data: bytes) -> dict[str, list[MetadataField]]:
    chunks = _read_chunks(data)
    groups: dict[str, list[MetadataField]] = {}
    text_fields: list[MetadataField] = []
    time_fields: list[MetadataField] = []
    exif_fields: list[MetadataField] = []

    for chunk_type, chunk_data in chunks:
        if chunk_type in TEXT_TYPES:
            kv = _parse_text_chunk(chunk_type, chunk_data)
            if kv:
                keyword, value = kv
                text_fields.append(
                    MetadataField(
                        key=keyword,
                        value=value,
                        sensitive=keyword in TEXT_SENSITIVE,
                    )
                )
        elif chunk_type == "tIME":
            if len(chunk_data) == 7:
                year = struct.unpack_from(">H", chunk_data, 0)[0]
                month, day, hour, minute, second = (
                    chunk_data[2],
                    chunk_data[3],
                    chunk_data[4],
                    chunk_data[5],
                    chunk_data[6],
                )
                ts = f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}Z"
                time_fields.append(MetadataField(key="LastModified", value=ts))
        elif chunk_type == "eXIf":
            exif_fields.extend(_parse_exif_chunk(chunk_data))

    if text_fields:
        groups["PNG.text"] = text_fields
    if time_fields:
        groups["PNG.tIME"] = time_fields
    if exif_fields:
        groups["EXIF"] = exif_fields

    return groups


# -------------------------------------------------------------------------
# Scrub
# -------------------------------------------------------------------------


def _scrub_png_bytes(data: bytes, resolved: ResolvedScrub) -> bytes:
    chunks = _read_chunks(data)

    drop_all = resolved.preset in ("all", "personal-only")
    drop_keep_tech = resolved.preset == "keep-technical"
    drop_gps_only = resolved.preset == "gps-only"

    out: list[tuple[str, bytes]] = []
    for chunk_type, chunk_data in chunks:
        if chunk_type not in METADATA_CHUNK_TYPES:
            out.append((chunk_type, chunk_data))
            continue
        if drop_all:
            continue
        if drop_keep_tech:
            continue
        if drop_gps_only:
            if chunk_type == "eXIf":
                continue
            out.append((chunk_type, chunk_data))
            continue
        if resolved.preset == "custom":
            kv = _parse_text_chunk(chunk_type, chunk_data) if chunk_type in TEXT_TYPES else None
            keyword = kv[0] if kv else None
            drop = any(p in ("PNG.*", "PNG") for p in resolved.remove) or (
                keyword is not None and any(p == f"PNG.text.{keyword}" for p in resolved.remove)
            )
            if drop:
                continue
            out.append((chunk_type, chunk_data))
            continue
        out.append((chunk_type, chunk_data))

    return _write_chunks(out)


# -------------------------------------------------------------------------
# Parser interface
# -------------------------------------------------------------------------


def _matches(data: bytes) -> bool:
    return data[:8] == PNG_SIGNATURE


def _parse(data: bytes, filename: str | None = None) -> dict[str, list[MetadataField]]:
    return _parse_png_bytes(data)


def _scrub(
    data: bytes,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> bytes:
    resolved = resolve_scrub(preset=preset, keep=keep, remove=remove)
    return _scrub_png_bytes(data, resolved)


parser = {
    "format": "png",
    "extensions": [".png"],
    "mime_types": ["image/png"],
    "matches": _matches,
    "parse": _parse,
    "scrub": _scrub,
}
