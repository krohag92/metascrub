"""
Format parser registry.

Each parser is a module in this package exporting a `parser` object
with the interface:
    format: str
    extensions: list[str]
    mime_types: list[str]
    matches(data: bytes) -> bool
    parse(data: bytes, filename=None) -> dict[str, list[MetadataField]]
    scrub(data: bytes, preset='all', keep=None, remove=None) -> bytes
"""

from __future__ import annotations

SUPPORTED: list[str] = [
    "jpeg",
    "png",
    "pdf",
    "docx",
    "mp3",
]


def _registry():
    from .docx import parser as docx
    from .jpeg import parser as jpeg
    from .mp3 import parser as mp3
    from .pdf import parser as pdf
    from .png import parser as png

    return [jpeg, png, pdf, docx, mp3]


def get_parser(fmt: str):
    for p in _registry():
        if p["format"] == fmt:
            return p
    return None


def detect_parser(data: bytes, filename: str | None = None):
    """Find a parser whose magic matches the given bytes."""
    for p in _registry():
        if p["matches"](data):
            return p
    # Fallback to extension
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        for p in _registry():
            if f".{ext}" in p["extensions"]:
                return p
    return None
