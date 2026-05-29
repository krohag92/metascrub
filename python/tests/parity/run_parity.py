"""
Parity test runner — generate JSON from Python parse().
Usage: python tests/parity/run_parity.py <fixture_file> [output_json]
"""

from __future__ import annotations

import json
import os
import sys


def run(fixture_path: str) -> dict:
    """Run Python parse on a fixture and return JSON-serializable dict."""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
    from metascrub.api import parse

    result = parse(fixture_path)
    return {
        "format": result.format,
        "highlights": result.highlights.to_dict(),
        "warnings": result.warnings,
        "groups": {group: [f.to_dict() for f in fields] for group, fields in result.groups.items()},
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: run_parity.py <fixture_file> [output.json]", file=sys.stderr)
        sys.exit(1)

    fixture = sys.argv[1]
    result = run(fixture)

    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"Written to {sys.argv[2]}", file=sys.stderr)
    else:
        print(json.dumps(result, indent=2, default=str))
