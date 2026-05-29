"""
JPEG parser — Pillow + piexif.

Mirrors packages/core/src/formats/jpeg.ts:
  - Segment-level walk (APP0/APP1/APP2/APP13/APP14/COM)
  - EXIF parsed via piexif; GPS decoded to decimal degrees
  - IPTC extracted from APP13 (minimal: by-line, copyright, headline)
  - XMP extracted from APP1 XMP segment (raw XML surfaced as one field)
  - Orientation preserved when scrubbing (built-in minimal EXIF segment)
  - JFIF (APP0) and ICC (APP2) always kept
"""

from __future__ import annotations

import struct
from typing import Any

from ..presets import ResolvedScrub, resolve_scrub
from ..types import MetadataField

# JPEG markers
_SOI = 0xD8
_EOI = 0xD9
_SOS = 0xDA
_APP0 = 0xE0
_APP1 = 0xE1
_APP2 = 0xE2
_APP12 = 0xEC
_APP13 = 0xED
_APP14 = 0xEE
_COM = 0xFE

_EXIF_HEADER = b"Exif\x00\x00"
_XMP_HEADER = b"http://ns.adobe.com/xap/1.0/\x00"

EXIF_SENSITIVE = {
    "Artist",
    "Copyright",
    "OwnerName",
    "SerialNumber",
    "BodySerialNumber",
    "LensSerialNumber",
    "Software",
    "HostComputer",
    "GPSLatitude",
    "GPSLongitude",
    "GPSAltitude",
}

GPS_SENSITIVE = {"Latitude", "Longitude", "Altitude", "GPSLatitude", "GPSLongitude", "GPSAltitude"}


# -------------------------------------------------------------------------
# Segment splitting (matches splitJpeg in jpeg.ts)
# -------------------------------------------------------------------------


def _split_jpeg(data: bytes):
    """
    Returns (segments, image_data).
    segments = list of (marker_byte, full_segment_bytes)
    image_data = everything from SOS (inclusive) through EOI
    """
    if data[:2] != b"\xff\xd8":
        raise ValueError("Not a JPEG (missing SOI marker)")

    segments = []
    i = 2  # skip SOI
    length = len(data)

    while i < length:
        if data[i] != 0xFF:
            raise ValueError(f"Expected marker at offset {i}, got 0x{data[i]:02x}")
        # Skip fill bytes
        while i < length and data[i] == 0xFF:
            i += 1
        marker = data[i]
        i -= 1  # step back to point at the 0xFF

        if marker == _SOS or marker == _EOI:
            return segments, data[i:]

        # RST markers (0xD0-0xD7) are standalone (no length)
        if 0xD0 <= marker <= 0xD7:
            segments.append((marker, data[i : i + 2]))
            i += 2
            continue

        len_off = i + 2
        if len_off + 2 > length:
            raise ValueError("Truncated JPEG segment")
        seg_len = struct.unpack_from(">H", data, len_off)[0]
        seg_end = len_off + seg_len
        if seg_end > length:
            raise ValueError("JPEG segment length exceeds file size")
        segments.append((marker, data[i:seg_end]))
        i = seg_end

    raise ValueError("JPEG ended without SOS or EOI marker")


def _get_payload(seg_bytes: bytes) -> bytes:
    """Return segment payload (skip 0xFF + marker + 2-byte length)."""
    return seg_bytes[4:]


def _payload_starts_with(seg_bytes: bytes, prefix: bytes) -> bool:
    payload = _get_payload(seg_bytes)
    return payload[: len(prefix)] == prefix


def _is_exif_seg(marker: int, seg_bytes: bytes) -> bool:
    return marker == _APP1 and _payload_starts_with(seg_bytes, _EXIF_HEADER)


def _is_xmp_seg(marker: int, seg_bytes: bytes) -> bool:
    return marker == _APP1 and _payload_starts_with(seg_bytes, _XMP_HEADER)


def _is_iptc_seg(marker: int) -> bool:
    return marker == _APP13


def _is_com_seg(marker: int) -> bool:
    return marker == _COM


# -------------------------------------------------------------------------
# Orientation reading / minimal EXIF building
# -------------------------------------------------------------------------


def _read_orientation(seg_bytes: bytes) -> int | None:
    """Read Orientation tag from an EXIF APP1 segment."""
    payload = _get_payload(seg_bytes)
    tiff = payload[6:]  # skip "Exif\0\0"
    if len(tiff) < 8:
        return None
    is_le = tiff[0:2] == b"II"
    is_be = tiff[0:2] == b"MM"
    if not is_le and not is_be:
        return None

    def r16(off: int) -> int:
        if is_le:
            return struct.unpack_from("<H", tiff, off)[0]
        return struct.unpack_from(">H", tiff, off)[0]

    def r32(off: int) -> int:
        if is_le:
            return struct.unpack_from("<I", tiff, off)[0]
        return struct.unpack_from(">I", tiff, off)[0]

    ifd0_off = r32(4)
    if ifd0_off + 2 > len(tiff):
        return None
    count = r16(ifd0_off)
    for i in range(count):
        entry_off = ifd0_off + 2 + i * 12
        if entry_off + 12 > len(tiff):
            break
        tag = r16(entry_off)
        if tag == 0x0112:  # Orientation
            val = r16(entry_off + 8)
            return val if 1 <= val <= 8 else None
    return None


def _build_minimal_exif_segment(orientation: int) -> bytes:
    """Build a minimal APP1 EXIF segment containing only Orientation tag (big-endian TIFF)."""
    # TIFF header (big-endian)
    tiff = bytearray(8 + 2 + 12 + 4)
    tiff[0] = 0x4D  # MM
    tiff[1] = 0x4D
    tiff[2] = 0x00
    tiff[3] = 0x2A  # TIFF magic
    struct.pack_into(">I", tiff, 4, 8)  # IFD0 offset = 8
    # IFD0: 1 entry
    struct.pack_into(">H", tiff, 8, 1)
    # Entry: tag=0x0112 type=SHORT(3) count=1 value=orientation
    struct.pack_into(">H", tiff, 10, 0x0112)
    struct.pack_into(">H", tiff, 12, 3)
    struct.pack_into(">I", tiff, 14, 1)
    struct.pack_into(">H", tiff, 18, orientation)
    struct.pack_into(">H", tiff, 20, 0)
    # Next IFD = 0
    struct.pack_into(">I", tiff, 22, 0)

    payload = _EXIF_HEADER + bytes(tiff)
    seg_len = len(payload) + 2  # length field includes itself
    seg = b"\xff" + bytes([_APP1]) + struct.pack(">H", seg_len) + payload
    return seg


# -------------------------------------------------------------------------
# GPS decoding
# -------------------------------------------------------------------------


def _dms_to_decimal(dms, ref: str) -> float | None:
    """Convert piexif DMS rational tuple to decimal degrees."""
    try:
        if not dms or len(dms) != 3:
            return None

        def rat(r):
            if isinstance(r, tuple) and len(r) == 2 and r[1] != 0:
                return r[0] / r[1]
            return float(r) if r else 0.0

        degrees = rat(dms[0])
        minutes = rat(dms[1])
        seconds = rat(dms[2])
        decimal = degrees + minutes / 60.0 + seconds / 3600.0
        if ref in ("S", "W"):
            decimal = -decimal
        return decimal
    except Exception:
        return None


def _decode_ascii(val) -> str | None:
    if isinstance(val, bytes):
        return val.decode("ascii", errors="replace").rstrip("\x00").strip()
    if isinstance(val, str):
        return val.strip()
    return None


# -------------------------------------------------------------------------
# IPTC minimal parse (APP13 / Photoshop IRB)
# -------------------------------------------------------------------------


def _parse_iptc(payload: bytes) -> dict[str, str]:
    """Very minimal IPTC dataset parser."""
    fields: dict[str, str] = {}
    # Find Photoshop 8BIM header
    i = 0
    # Skip Photoshop header
    if payload[:14] == b"Photoshop 3.0\x00":
        i = 14
    while i < len(payload) - 5:
        if payload[i : i + 2] == b"8BIM":
            resource_id = struct.unpack_from(">H", payload, i + 2)[0]
            # Resource name (Pascal string, padded to even)
            name_len = payload[i + 4]
            name_pad = name_len + 1 + (1 if (name_len + 1) % 2 != 0 else 0)
            data_len_off = i + 4 + name_pad
            if data_len_off + 4 > len(payload):
                break
            data_len = struct.unpack_from(">I", payload, data_len_off)[0]
            data_start = data_len_off + 4
            data_end = data_start + data_len
            if data_end > len(payload):
                break
            resource_data = payload[data_start:data_end]
            if resource_id == 0x0404:  # IPTC-NAA
                fields.update(_parse_iptc_naa(resource_data))
            i = data_end + (data_len % 2)  # padding
        else:
            i += 1
    return fields


def _parse_iptc_naa(data: bytes) -> dict[str, str]:
    """Parse raw IPTC-NAA dataset records."""
    # Record 2 tag names
    _IPTC_TAGS = {
        5: "Object-Name",
        10: "Urgency",
        15: "Category",
        20: "Supplemental-Categories",
        22: "Fixture-Identifier",
        25: "Keywords",
        30: "Release-Date",
        35: "Release-Time",
        37: "Expiration-Date",
        38: "Expiration-Time",
        40: "Special-Instructions",
        45: "Reference-Service",
        47: "Reference-Date",
        50: "Reference-Number",
        55: "Date-Created",
        60: "Time-Created",
        62: "Digital-Creation-Date",
        63: "Digital-Creation-Time",
        65: "Originating-Program",
        70: "Program-Version",
        75: "Object-Cycle",
        80: "By-line",
        85: "By-line-Title",
        90: "City",
        92: "Sub-location",
        95: "Province-State",
        100: "Country-Code",
        101: "Country-Name",
        103: "Original-Transmission-Reference",
        105: "Headline",
        110: "Credit",
        115: "Source",
        116: "Copyright-Notice",
        118: "Contact",
        120: "Caption-Abstract",
        122: "Writer-Editor",
        130: "Image-Type",
        131: "Image-Orientation",
        135: "Language-Identifier",
    }
    out: dict[str, str] = {}
    i = 0
    while i < len(data) - 4:
        if data[i] != 0x1C:
            i += 1
            continue
        record = data[i + 1]
        dataset = data[i + 2]
        size = struct.unpack_from(">H", data, i + 3)[0]
        i += 5
        if i + size > len(data):
            break
        value = data[i : i + size]
        if record == 2:
            key = _IPTC_TAGS.get(dataset, f"tag_{dataset}")
            out[key] = value.decode("latin-1", errors="replace")
        i += size
    return out


# -------------------------------------------------------------------------
# Main parse
# -------------------------------------------------------------------------


def _parse_jpeg_bytes(data: bytes) -> dict[str, list[MetadataField]]:
    import piexif

    groups: dict[str, list[MetadataField]] = {}
    segments, _ = _split_jpeg(data)

    for marker, seg_bytes in segments:
        if _is_exif_seg(marker, seg_bytes):
            payload = _get_payload(seg_bytes)
            try:
                exif_data = piexif.load(payload)
            except Exception:
                continue

            exif_fields: list[MetadataField] = []
            gps_fields: list[MetadataField] = []

            # IFD0 (Image)
            ifd0 = exif_data.get("0th", {})
            for tag_id, val in ifd0.items():
                name = piexif.TAGS["0th"].get(tag_id, {}).get("name", f"tag_{tag_id}")
                if name.startswith("GPS"):
                    continue
                value = _normalize_exif_value(name, val)
                exif_fields.append(
                    MetadataField(
                        key=name,
                        value=value,
                        sensitive=name in EXIF_SENSITIVE,
                    )
                )

            # Exif IFD
            exif_ifd = exif_data.get("Exif", {})
            for tag_id, val in exif_ifd.items():
                name = piexif.TAGS["Exif"].get(tag_id, {}).get("name", f"tag_{tag_id}")
                if name.startswith("GPS"):
                    continue
                value = _normalize_exif_value(name, val)
                exif_fields.append(
                    MetadataField(
                        key=name,
                        value=value,
                        sensitive=name in EXIF_SENSITIVE,
                    )
                )

            if exif_fields:
                groups["EXIF"] = exif_fields

            # GPS IFD
            gps_ifd = exif_data.get("GPS", {})
            if gps_ifd:
                lat_raw = gps_ifd.get(piexif.GPSIFD.GPSLatitude)
                lat_ref = gps_ifd.get(piexif.GPSIFD.GPSLatitudeRef)
                lon_raw = gps_ifd.get(piexif.GPSIFD.GPSLongitude)
                lon_ref = gps_ifd.get(piexif.GPSIFD.GPSLongitudeRef)
                alt_raw = gps_ifd.get(piexif.GPSIFD.GPSAltitude)
                alt_ref = gps_ifd.get(piexif.GPSIFD.GPSAltitudeRef)

                lat_ref_str = _decode_ascii(lat_ref) or "N"
                lon_ref_str = _decode_ascii(lon_ref) or "E"

                lat = _dms_to_decimal(lat_raw, lat_ref_str)
                lon = _dms_to_decimal(lon_raw, lon_ref_str)
                alt = None
                if alt_raw and isinstance(alt_raw, tuple) and alt_raw[1] != 0:
                    alt = alt_raw[0] / alt_raw[1]
                    if alt_ref and alt_ref == 1:
                        alt = -alt

                if lat is not None:
                    gps_fields.append(MetadataField(key="latitude", value=lat, sensitive=True))
                if lon is not None:
                    gps_fields.append(MetadataField(key="longitude", value=lon, sensitive=True))
                if alt is not None:
                    gps_fields.append(MetadataField(key="altitude", value=alt, sensitive=True))

                # Also surface raw GPS tags for completeness
                for tag_id, val in gps_ifd.items():
                    name = piexif.TAGS["GPS"].get(tag_id, {}).get("name", f"gps_tag_{tag_id}")
                    if name in (
                        "GPSLatitude",
                        "GPSLongitude",
                        "GPSAltitude",
                        "GPSLatitudeRef",
                        "GPSLongitudeRef",
                        "GPSAltitudeRef",
                    ):
                        continue
                    value = _normalize_exif_value(name, val)
                    gps_fields.append(MetadataField(key=name, value=value, sensitive=True))

                if gps_fields:
                    groups["GPS"] = gps_fields

        elif _is_xmp_seg(marker, seg_bytes):
            payload = _get_payload(seg_bytes)
            xmp_data = payload[len(_XMP_HEADER) :]
            try:
                xmp_str = xmp_data.decode("utf-8", errors="replace")
            except Exception:
                xmp_str = repr(xmp_data[:200])
            # Surface as a single XML field so the group exists
            groups["XMP"] = [
                MetadataField(
                    key="raw",
                    value=xmp_str[:4096],
                    sensitive=False,
                )
            ]

        elif _is_iptc_seg(marker):
            payload = _get_payload(seg_bytes)
            iptc = _parse_iptc(payload)
            if iptc:
                iptc_sensitive = {"By-line", "Credit", "Copyright-Notice"}
                groups["IPTC"] = [
                    MetadataField(
                        key=k,
                        value=v,
                        sensitive=k in iptc_sensitive,
                    )
                    for k, v in iptc.items()
                ]

        elif _is_com_seg(marker):
            payload = _get_payload(seg_bytes)
            comment = payload.decode("latin-1", errors="replace")
            groups.setdefault("JPEG", []).append(MetadataField(key="Comment", value=comment))

    return groups


def _normalize_exif_value(name: str, val: Any) -> str | None:
    """Convert piexif value to a displayable string."""
    if val is None:
        return None
    if isinstance(val, bytes):
        # Try ASCII decode
        try:
            return val.decode("ascii", errors="strict").rstrip("\x00").strip()
        except Exception:
            pass
        try:
            return val.decode("utf-8", errors="strict").rstrip("\x00").strip()
        except Exception:
            return f"<{len(val)} bytes>"
    if isinstance(val, tuple):
        # Rational
        if len(val) == 2:
            num, den = val
            if den == 0:
                return str(num)
            result = num / den
            # Display as fraction if it's a common exposure-time format
            if den != 1 and name in ("ExposureTime",):
                return f"{num}/{den}"
            return str(round(result, 6) if isinstance(result, float) else result)
        # List of rationals (e.g. GPS DMS)
        return str(val)
    if isinstance(val, list):
        return ", ".join(str(x) for x in val)
    return str(val)


# -------------------------------------------------------------------------
# Scrub
# -------------------------------------------------------------------------


def _scrub_jpeg_bytes(data: bytes, resolved: ResolvedScrub) -> bytes:
    segments, image_data = _split_jpeg(data)

    # Find existing orientation
    orientation: int | None = None
    for marker, seg_bytes in segments:
        if _is_exif_seg(marker, seg_bytes):
            orientation = _read_orientation(seg_bytes)
            break

    drop_exif = _should_drop_exif(resolved)
    drop_xmp = _should_drop_xmp(resolved)
    drop_iptc = _should_drop_iptc(resolved)
    drop_com = resolved.preset == "all"

    out = bytearray(b"\xff\xd8")  # SOI

    for marker, seg_bytes in segments:
        if _is_exif_seg(marker, seg_bytes):
            if not drop_exif:
                out.extend(seg_bytes)
            elif orientation is not None and _keep_orientation(resolved):
                out.extend(_build_minimal_exif_segment(orientation))
            continue

        if _is_xmp_seg(marker, seg_bytes):
            if not drop_xmp:
                out.extend(seg_bytes)
            continue

        if _is_iptc_seg(marker):
            if not drop_iptc:
                out.extend(seg_bytes)
            continue

        if _is_com_seg(marker):
            if not drop_com:
                out.extend(seg_bytes)
            continue

        if marker in (_APP12, _APP14):
            if resolved.preset in ("all", "personal-only"):
                continue
            out.extend(seg_bytes)
            continue

        # Keep everything else (APP0=JFIF, APP2=ICC, DQT, DHT, SOFx, ...)
        out.extend(seg_bytes)

    out.extend(image_data)
    return bytes(out)


def _should_drop_exif(r: ResolvedScrub) -> bool:
    if r.preset in ("all", "personal-only", "keep-technical"):
        return True
    if r.preset == "gps-only":
        return False
    if r.preset == "custom":
        return any(p in ("EXIF.*", "EXIF") for p in r.remove) and not any(
            p.startswith("EXIF") for p in r.keep
        )
    return False


def _should_drop_xmp(r: ResolvedScrub) -> bool:
    if r.preset in ("all", "personal-only", "keep-technical"):
        return True
    if r.preset == "gps-only":
        return False
    if r.preset == "custom":
        return any(p in ("XMP.*", "XMP") for p in r.remove) and not any(
            p.startswith("XMP") for p in r.keep
        )
    return False


def _should_drop_iptc(r: ResolvedScrub) -> bool:
    if r.preset in ("all", "personal-only", "keep-technical"):
        return True
    if r.preset == "custom":
        return any(p in ("IPTC.*", "IPTC") or p.startswith("IPTC.") for p in r.remove)
    return False


def _keep_orientation(r: ResolvedScrub) -> bool:
    if "EXIF.Orientation" in r.remove:
        return False
    return True


# -------------------------------------------------------------------------
# Parser interface
# -------------------------------------------------------------------------


def _matches(data: bytes) -> bool:
    return data[:3] == b"\xff\xd8\xff"


def _parse(data: bytes, filename: str | None = None) -> dict[str, list[MetadataField]]:
    return _parse_jpeg_bytes(data)


def _scrub(
    data: bytes,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> bytes:
    resolved = resolve_scrub(preset=preset, keep=keep, remove=remove)
    return _scrub_jpeg_bytes(data, resolved)


parser = {
    "format": "jpeg",
    "extensions": [".jpg", ".jpeg"],
    "mime_types": ["image/jpeg"],
    "matches": _matches,
    "parse": _parse,
    "scrub": _scrub,
}
