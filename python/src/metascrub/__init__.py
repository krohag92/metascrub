"""
metascrub — See and strip metadata from any file.

Web version: https://metadatafinder.com
"""

from .api import (
    batch_view,
    compare,
    detect_format,
    parse,
    scrub,
    supported_formats,
)
from .types import (
    ChangedField,
    DeviceInfo,
    GPSCoords,
    MetadataDiff,
    MetadataField,
    MetadataHighlights,
    MetadataResult,
    MetaScrubError,
)

__version__ = "0.1.0"
__all__ = [
    # API functions
    "parse",
    "scrub",
    "compare",
    "detect_format",
    "supported_formats",
    "batch_view",
    # Types
    "MetadataResult",
    "MetadataField",
    "MetadataHighlights",
    "MetadataDiff",
    "ChangedField",
    "GPSCoords",
    "DeviceInfo",
    "MetaScrubError",
    # Version
    "__version__",
]
