"""
Public API for metascrub.

Mirrors the TypeScript core public API (packages/core/src/index.ts):
  parse()           -> MetadataResult
  scrub()           -> bytes
  compare()         -> MetadataDiff
  detect_format()   -> str | None
  supported_formats() -> list[str]
"""

from __future__ import annotations

import os

from .formats import SUPPORTED, detect_parser, get_parser
from .types import (
    ERROR_PARSE_ERROR,
    ERROR_SCRUB_ERROR,
    ERROR_UNSUPPORTED_FORMAT,
    ChangedField,
    MetadataDiff,
    MetadataResult,
    MetaScrubError,
)
from .utils.bytes import to_bytes
from .utils.highlights import finalize_result


def detect_format(
    file_or_bytes: str | bytes | os.PathLike,
    filename: str | None = None,
) -> str | None:
    """
    Detect the file format from magic bytes and optional filename hint.

    Returns a format string like 'jpeg', 'png', 'pdf', etc., or None if unknown.
    """
    data = to_bytes(file_or_bytes)
    hint = filename
    if not hint and isinstance(file_or_bytes, (str, os.PathLike)):
        hint = os.path.basename(str(file_or_bytes))

    p = detect_parser(data, hint)
    if p:
        return p["format"]

    # Fallback: magic utility
    from .utils.magic import detect_from_bytes

    return detect_from_bytes(data, hint)


def supported_formats() -> list[str]:
    """Return list of supported format strings."""
    return list(SUPPORTED)


def parse(
    file_or_bytes: str | bytes | os.PathLike,
    filename: str | None = None,
) -> MetadataResult:
    """
    Parse metadata from a file or raw bytes.

    Args:
        file_or_bytes: Path to a file, or raw bytes.
        filename: Optional filename hint (used for format detection and result metadata).

    Returns:
        MetadataResult with groups, highlights, and warnings.

    Raises:
        MetaScrubError with code UNSUPPORTED_FORMAT or PARSE_ERROR.
    """
    data = to_bytes(file_or_bytes)
    size_bytes = len(data)

    fname = filename
    if not fname and isinstance(file_or_bytes, (str, os.PathLike)):
        fname = os.path.basename(str(file_or_bytes))

    p = detect_parser(data, fname)
    if not p:
        raise MetaScrubError(
            ERROR_UNSUPPORTED_FORMAT,
            f"Unsupported format: {fname or '<unknown>'}",
        )

    try:
        groups = p["parse"](data, fname)
    except MetaScrubError:
        raise
    except Exception as e:
        raise MetaScrubError(
            ERROR_PARSE_ERROR,
            f"Failed to parse {p['format']}: {e}",
            fmt=p["format"],
            cause=e,
        ) from e

    return finalize_result(p["format"], size_bytes, groups, filename=fname)


def scrub(
    file_or_bytes: str | bytes | os.PathLike,
    preset: str = "all",
    keep: list[str] | None = None,
    remove: list[str] | None = None,
    filename: str | None = None,
) -> bytes:
    """
    Scrub metadata from a file or raw bytes.

    Args:
        file_or_bytes: Path to a file, or raw bytes.
        preset: One of 'all', 'gps-only', 'personal-only', 'keep-technical', 'custom'.
        keep: Field paths to keep (for preset='custom').
        remove: Field paths to remove (for preset='custom').
        filename: Optional filename hint for format detection.

    Returns:
        Cleaned file as bytes.

    Raises:
        MetaScrubError with code UNSUPPORTED_FORMAT or SCRUB_ERROR.
    """
    data = to_bytes(file_or_bytes)

    fname = filename
    if not fname and isinstance(file_or_bytes, (str, os.PathLike)):
        fname = os.path.basename(str(file_or_bytes))

    p = detect_parser(data, fname)
    if not p:
        raise MetaScrubError(
            ERROR_UNSUPPORTED_FORMAT,
            f"Unsupported format: {fname or '<unknown>'}",
        )

    try:
        return p["scrub"](data, preset=preset, keep=keep, remove=remove)
    except MetaScrubError:
        raise
    except Exception as e:
        raise MetaScrubError(
            ERROR_SCRUB_ERROR,
            f"Failed to scrub {p['format']}: {e}",
            fmt=p["format"],
            cause=e,
        ) from e


def compare(
    a: str | bytes | os.PathLike,
    b: str | bytes | os.PathLike,
    filename_a: str | None = None,
    filename_b: str | None = None,
) -> MetadataDiff:
    """
    Compare metadata between two files.

    Returns MetadataDiff with only_in_a, only_in_b, and changed lists.
    """
    result_a = parse(a, filename=filename_a)
    result_b = parse(b, filename=filename_b)

    return _diff_results(result_a, result_b)


def _diff_results(a: MetadataResult, b: MetadataResult) -> MetadataDiff:
    """Compute field-level diff between two MetadataResult objects."""

    # Build flat key->field maps
    def flatten(result: MetadataResult) -> dict:
        out = {}
        for group, fields in result.groups.items():
            for f in fields:
                out[f"{group}.{f.key}"] = f
        return out

    map_a = flatten(a)
    map_b = flatten(b)

    keys_a = set(map_a.keys())
    keys_b = set(map_b.keys())

    only_in_a = [map_a[k] for k in sorted(keys_a - keys_b)]
    only_in_b = [map_b[k] for k in sorted(keys_b - keys_a)]
    changed = []

    for k in sorted(keys_a & keys_b):
        fa = map_a[k]
        fb = map_b[k]
        if str(fa.value) != str(fb.value):
            changed.append(ChangedField(a=fa, b=fb))

    return MetadataDiff(only_in_a=only_in_a, only_in_b=only_in_b, changed=changed)


def batch_view(
    directory: str | os.PathLike,
    as_dataframe: bool = False,
    recursive: bool = True,
):
    """
    Parse all supported files in a directory.

    Args:
        directory: Path to a directory.
        as_dataframe: If True, return a pandas DataFrame.
                      Requires 'pip install metascrub[pandas]'.
        recursive: Walk subdirectories (default True).

    Returns:
        List[MetadataResult] or pd.DataFrame (if as_dataframe=True).
    """
    import os as _os

    results = []
    ext_set = set()
    for p in get_parser.__module__ and [] or []:  # just a noop to satisfy linters
        pass
    from .formats import _registry

    for p in _registry():
        for ext in p["extensions"]:
            ext_set.add(ext.lower())

    walk = (
        _os.walk(str(directory))
        if recursive
        else [(str(directory), [], _os.listdir(str(directory)))]
    )
    for root, _dirs, files in walk:
        for fname in sorted(files):
            ext = ("." + fname.rsplit(".", 1)[-1].lower()) if "." in fname else ""
            if ext not in ext_set:
                continue
            fpath = _os.path.join(root, fname)
            try:
                result = parse(fpath)
                results.append(result)
            except Exception:
                pass

    if not as_dataframe:
        return results

    try:
        import pandas as pd
    except ImportError as e:
        raise ImportError(
            "pandas is required for as_dataframe=True. "
            "Install it with: pip install 'metascrub[pandas]'"
        ) from e

    rows = []
    for r in results:
        row = {
            "filename": r.filename,
            "format": r.format,
            "size_bytes": r.size_bytes,
            "captured_at": r.highlights.captured_at,
            "gps_lat": r.highlights.gps.lat if r.highlights.gps else None,
            "gps_lon": r.highlights.gps.lon if r.highlights.gps else None,
            "gps_alt": r.highlights.gps.alt if r.highlights.gps else None,
            "author": r.highlights.author,
            "software": r.highlights.software,
            "device_make": r.highlights.device.make if r.highlights.device else None,
            "device_model": r.highlights.device.model if r.highlights.device else None,
            "device_serial": r.highlights.device.serial if r.highlights.device else None,
            "last_modified_by": r.highlights.last_modified_by,
            "revision_history": r.highlights.revision_history,
            "warnings_count": len(r.warnings),
            "warnings": "; ".join(r.warnings),
        }
        rows.append(row)

    return pd.DataFrame(rows)
