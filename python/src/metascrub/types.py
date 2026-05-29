"""
Public types for metascrub.

These mirror the TypeScript core types (packages/core/src/types.ts)
with Python-idiomatic snake_case names.

Mapping:
  sizeBytes         -> size_bytes
  capturedAt        -> captured_at
  lastModifiedBy    -> last_modified_by
  revisionHistory   -> revision_history
  onlyInA           -> only_in_a
  onlyInB           -> only_in_b
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Union

MetadataValue = Union[str, int, float, bool, None]

FileFormat = Literal[
    "jpeg",
    "png",
    "heic",
    "webp",
    "avif",
    "tiff",
    "raw-cr2",
    "raw-nef",
    "raw-arw",
    "raw-dng",
    "mp4",
    "mov",
    "mkv",
    "webm",
    "mp3",
    "flac",
    "m4a",
    "ogg",
    "wav",
    "pdf",
    "docx",
    "xlsx",
    "pptx",
    "epub",
    "svg",
]

ScrubPreset = Literal["all", "gps-only", "personal-only", "keep-technical", "custom"]


@dataclass
class MetadataField:
    """A single metadata key-value pair within a namespace group."""

    key: str
    value: MetadataValue
    label: str | None = None
    raw: Any = None
    sensitive: bool = False

    def to_dict(self) -> dict:
        d: dict = {"key": self.key, "value": self.value}
        if self.label is not None:
            d["label"] = self.label
        if self.raw is not None:
            d["raw"] = self.raw
        if self.sensitive:
            d["sensitive"] = True
        return d


@dataclass
class GPSCoords:
    """GPS coordinates extracted from metadata."""

    lat: float
    lon: float
    alt: float | None = None

    def to_dict(self) -> dict:
        d: dict = {"lat": self.lat, "lon": self.lon}
        if self.alt is not None:
            d["alt"] = self.alt
        return d

    def __iter__(self):
        """Allow unpacking: lat, lon = gps_coords"""
        yield self.lat
        yield self.lon


@dataclass
class DeviceInfo:
    """Camera / device info from EXIF."""

    make: str | None = None
    model: str | None = None
    serial: str | None = None

    def to_dict(self) -> dict:
        return {
            k: v
            for k, v in {"make": self.make, "model": self.model, "serial": self.serial}.items()
            if v is not None
        }


@dataclass
class MetadataHighlights:
    """High-level convenience fields extracted from the groups."""

    gps: GPSCoords | None = None
    captured_at: str | None = None  # ISO 8601
    device: DeviceInfo | None = None
    software: str | None = None
    author: str | None = None
    last_modified_by: str | None = None
    revision_history: int | None = None

    def to_dict(self) -> dict:
        d: dict = {}
        if self.gps is not None:
            d["gps"] = self.gps.to_dict()
        if self.captured_at is not None:
            d["capturedAt"] = self.captured_at
        if self.device is not None:
            d["device"] = self.device.to_dict()
        if self.software is not None:
            d["software"] = self.software
        if self.author is not None:
            d["author"] = self.author
        if self.last_modified_by is not None:
            d["lastModifiedBy"] = self.last_modified_by
        if self.revision_history is not None:
            d["revisionHistory"] = self.revision_history
        return d


@dataclass
class MetadataResult:
    """Full parse result for a single file."""

    format: str
    size_bytes: int
    groups: dict[str, list[MetadataField]]
    highlights: MetadataHighlights
    warnings: list[str]
    filename: str | None = None

    def to_dict(self) -> dict:
        return {
            "format": self.format,
            "filename": self.filename,
            "sizeBytes": self.size_bytes,
            "groups": {ns: [f.to_dict() for f in fields] for ns, fields in self.groups.items()},
            "highlights": self.highlights.to_dict(),
            "warnings": self.warnings,
        }


@dataclass
class ChangedField:
    """A field that exists in both files but with different values."""

    a: MetadataField
    b: MetadataField

    def to_dict(self) -> dict:
        return {"a": self.a.to_dict(), "b": self.b.to_dict()}


@dataclass
class MetadataDiff:
    """Diff result between two parse results."""

    only_in_a: list[MetadataField] = field(default_factory=list)
    only_in_b: list[MetadataField] = field(default_factory=list)
    changed: list[ChangedField] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "onlyInA": [f.to_dict() for f in self.only_in_a],
            "onlyInB": [f.to_dict() for f in self.only_in_b],
            "changed": [c.to_dict() for c in self.changed],
        }


class MetaScrubError(Exception):
    """Base error for metascrub operations."""

    def __init__(
        self,
        code: str,
        message: str,
        fmt: str | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.format = fmt
        self.cause = cause


# Valid error codes
ERROR_UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
ERROR_CORRUPT_FILE = "CORRUPT_FILE"
ERROR_PARSE_ERROR = "PARSE_ERROR"
ERROR_SCRUB_ERROR = "SCRUB_ERROR"
