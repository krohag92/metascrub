"""
Scrub preset definitions.

Mirrors packages/core/src/presets.ts — keep field names in sync.
"""

from __future__ import annotations

from dataclasses import dataclass, field

PRESET_DESCRIPTIONS = {
    "all": "Remove every metadata field that is safe to strip.",
    "gps-only": "Remove GPS coordinates only; keep everything else.",
    "personal-only": "Remove author/owner/software/serial/edit-history fields.",
    "keep-technical": "Keep camera/exposure/dimensions; drop everything else.",
    "custom": "Use the keep/remove lists provided in ScrubOptions.",
}

# Field patterns removed by the named presets (mirrors TS core)
PRESET_REMOVALS = {
    "gps-only": [
        "GPS.*",
        "EXIF.GPS*",
        "EXIF.GPSLatitude",
        "EXIF.GPSLongitude",
        "EXIF.GPSAltitude",
        "EXIF.GPSLatitudeRef",
        "EXIF.GPSLongitudeRef",
        "EXIF.GPSAltitudeRef",
        "EXIF.GPSTimeStamp",
        "EXIF.GPSDateStamp",
        "XMP.geo*",
    ],
    "personal-only": [
        "EXIF.Artist",
        "EXIF.Copyright",
        "EXIF.OwnerName",
        "EXIF.SerialNumber",
        "EXIF.BodySerialNumber",
        "EXIF.LensSerialNumber",
        "EXIF.Software",
        "EXIF.HostComputer",
        "IPTC.By-line",
        "IPTC.Credit",
        "XMP.creator",
        "XMP.rights",
        "PDF.Info.Author",
        "PDF.Info.Producer",
        "PDF.Info.Creator",
        "DOCX.core.creator",
        "DOCX.core.lastModifiedBy",
        "DOCX.app.Company",
        "DOCX.app.Manager",
    ],
}

KEEP_TECHNICAL: list[str] = [
    "EXIF.Make",
    "EXIF.Model",
    "EXIF.LensModel",
    "EXIF.ExposureTime",
    "EXIF.FNumber",
    "EXIF.ISO",
    "EXIF.ISOSpeedRatings",
    "EXIF.FocalLength",
    "EXIF.FocalLengthIn35mmFormat",
    "EXIF.ColorSpace",
    "EXIF.PixelXDimension",
    "EXIF.PixelYDimension",
    "EXIF.Orientation",
    "EXIF.ExifImageWidth",
    "EXIF.ExifImageHeight",
]


@dataclass
class ResolvedScrub:
    preset: str
    keep: list[str] = field(default_factory=list)
    remove: list[str] = field(default_factory=list)


def resolve_scrub(
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
) -> ResolvedScrub:
    """Resolve a preset into concrete keep/remove lists."""
    resolved_keep = list(keep or [])
    resolved_remove = list(remove or [])

    if preset in ("gps-only", "personal-only"):
        resolved_remove.extend(PRESET_REMOVALS[preset])
    elif preset == "keep-technical":
        resolved_keep.extend(KEEP_TECHNICAL)

    return ResolvedScrub(preset=preset, keep=resolved_keep, remove=resolved_remove)


def path_matches(path: str, patterns: list[str]) -> bool:
    """Return True if `path` matches any pattern (supports trailing-* glob)."""
    for pattern in patterns:
        if pattern == path:
            return True
        if pattern.endswith("*"):
            prefix = pattern[:-1]
            if path.startswith(prefix):
                return True
        if pattern.endswith(".*"):
            prefix = pattern[:-1]
            if path.startswith(prefix):
                return True
    return False
