"""
MP3 parser — tinytag (MIT) for reading + native ID3 byte surgery for scrubbing.

Mirrors packages/core/src/formats/mp3.ts:
  - ID3v2 header at file start: "ID3" + major(1) + rev(1) + flags(1) + syncsafe-size(4)
  - ID3v1 in last 128 bytes (starts with "TAG")
  - parse: uses tinytag to read common fields; also surfaces container info
  - scrub: byte-surgery — strip ID3v2 prefix and ID3v1 suffix from audio payload
    (lossless for the MPEG frames)

NOTE: mutagen is GPL-incompatible. We use tinytag (MIT, read-only) for
metadata reading. Scrubbing is native byte-level.
"""

from __future__ import annotations

from ..presets import ResolvedScrub, resolve_scrub
from ..types import MetadataField

_ID3V2_MAGIC = b"ID3"
_ID3V1_MAGIC = b"TAG"
_MPEG_SYNCS = (b"\xff\xfb", b"\xff\xfa", b"\xff\xf3", b"\xff\xf2", b"\xff\xf1", b"\xff\xe3")


# -------------------------------------------------------------------------
# Low-level ID3 helpers (mirrors mp3.ts)
# -------------------------------------------------------------------------


def _read_syncsafe(data: bytes, offset: int) -> int:
    """Decode a 4-byte syncsafe integer (each byte has MSB=0)."""
    return (
        ((data[offset] & 0x7F) << 21)
        | ((data[offset + 1] & 0x7F) << 14)
        | ((data[offset + 2] & 0x7F) << 7)
        | (data[offset + 3] & 0x7F)
    )


def _id3v2_prefix_length(data: bytes) -> int:
    """Return byte length of ID3v2 block (header + frames + optional footer)."""
    if len(data) < 10 or data[:3] != _ID3V2_MAGIC:
        return 0
    flags = data[5]
    size = _read_syncsafe(data, 6)
    footer = 10 if (flags & 0x10) else 0
    return 10 + size + footer


def _find_id3v1(data: bytes) -> int:
    """Return offset of ID3v1 block, or -1 if absent."""
    if len(data) < 128:
        return -1
    off = len(data) - 128
    if data[off : off + 3] == _ID3V1_MAGIC:
        return off
    return -1


# -------------------------------------------------------------------------
# Parse
# -------------------------------------------------------------------------


def _parse_mp3_bytes(data: bytes) -> dict[str, list[MetadataField]]:
    groups: dict[str, list[MetadataField]] = {}

    # tinytag for common tag fields
    try:
        import io as _io

        from tinytag import TinyTag

        tag = TinyTag.get(_io.BytesIO(data), ignore_errors=True)
        common_fields: list[MetadataField] = []

        _TINYTAG_MAP = {
            "title": "title",
            "artist": "artist",
            "album": "album",
            "albumartist": "albumartist",
            "composer": "composer",
            "genre": "genre",
            "year": "year",
            "track": "track",
            "disc": "disc",
            "comment": "comment",
            "duration": "duration",
            "samplerate": "samplerate",
            "bitrate": "bitrate",
            "channels": "channels",
        }

        _SENSITIVE_TAGS = {"artist", "albumartist", "composer", "comment"}

        for attr, key in _TINYTAG_MAP.items():
            val = getattr(tag, attr, None)
            if val is not None:
                common_fields.append(
                    MetadataField(
                        key=key,
                        value=str(val) if not isinstance(val, (int, float)) else val,
                        sensitive=key in _SENSITIVE_TAGS,
                    )
                )

        if common_fields:
            groups["Audio.common"] = common_fields

        # Format / stream info
        fmt_fields: list[MetadataField] = []
        for attr in ("duration", "samplerate", "bitrate", "channels", "filesize"):
            val = getattr(tag, attr, None)
            if val is not None:
                fmt_fields.append(MetadataField(key=attr, value=val))
        if fmt_fields:
            groups["MP3.format"] = fmt_fields

    except ImportError:
        pass
    except Exception:
        pass

    # Always surface container presence (mirrors TS)
    v2_len = _id3v2_prefix_length(data)
    v1_off = _find_id3v1(data)
    container_fields: list[MetadataField] = []
    if v2_len > 0:
        container_fields.append(MetadataField(key="id3v2", value=f"{v2_len} bytes", sensitive=True))
    if v1_off >= 0:
        container_fields.append(MetadataField(key="id3v1", value="128 bytes", sensitive=True))
    if container_fields:
        groups["MP3.container"] = container_fields

    return groups


# -------------------------------------------------------------------------
# Scrub
# -------------------------------------------------------------------------


def _scrub_mp3_bytes(data: bytes, resolved: ResolvedScrub) -> bytes:
    drop_all = resolved.preset in ("all", "personal-only", "keep-technical")
    drop_custom = resolved.preset == "custom" and any(
        p in ("MP3.*", "Audio.*", "Audio.common", "Audio.common.*") or p.startswith("MP3.")
        for p in resolved.remove
    )

    if not drop_all and not drop_custom:
        return data

    start = _id3v2_prefix_length(data)
    v1_off = _find_id3v1(data)
    end = v1_off if v1_off >= 0 else len(data)

    if start == 0 and end == len(data):
        return data
    return data[start:end]


# -------------------------------------------------------------------------
# Parser interface
# -------------------------------------------------------------------------


def _matches(data: bytes) -> bool:
    if data[:3] == _ID3V2_MAGIC:
        return True
    for sync in _MPEG_SYNCS:
        if data[: len(sync)] == sync:
            return True
    return False


def _parse(data: bytes, filename: str | None = None) -> dict[str, list[MetadataField]]:
    return _parse_mp3_bytes(data)


def _scrub(
    data: bytes,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> bytes:
    resolved = resolve_scrub(preset=preset, keep=keep, remove=remove)
    return _scrub_mp3_bytes(data, resolved)


parser = {
    "format": "mp3",
    "extensions": [".mp3"],
    "mime_types": ["audio/mpeg", "audio/mp3"],
    "matches": _matches,
    "parse": _parse,
    "scrub": _scrub,
}
