"""Shared test fixtures and helpers."""

from __future__ import annotations

import os

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def fixture_path(name: str) -> str:
    return os.path.join(FIXTURES_DIR, name)


def fixture_bytes(name: str) -> bytes:
    with open(fixture_path(name), "rb") as f:
        return f.read()
