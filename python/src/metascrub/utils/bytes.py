"""
Byte-level helpers used by format parsers.
Mirrors packages/core/src/utils/bytes.ts.
"""

from __future__ import annotations

import struct


def starts_with(data: bytes, prefix: bytes | list) -> bool:
    """Return True if data starts with the given prefix bytes."""
    if isinstance(prefix, list):
        prefix = bytes(prefix)
    return data[: len(prefix)] == prefix


def read_uint16_be(data: bytes, offset: int) -> int:
    return struct.unpack_from(">H", data, offset)[0]


def read_uint16_le(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def read_uint32_be(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def read_uint32_le(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def write_uint16_be(value: int) -> bytes:
    return struct.pack(">H", value)


def write_uint32_be(value: int) -> bytes:
    return struct.pack(">I", value)


def to_bytes(file_or_bytes: str | bytes | os.PathLike) -> bytes:  # noqa: F821
    """Normalise a file path or raw bytes to bytes."""
    if isinstance(file_or_bytes, bytes):
        return file_or_bytes
    # path-like
    import os

    with open(os.fspath(file_or_bytes), "rb") as fh:
        return fh.read()
