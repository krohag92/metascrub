"""
Tests for src/ai_detection.py — heuristic AI-generated file detector.

Fixtures are built synthetically (no dependency on on-disk fixture files),
mirroring the approach in python/tests/fixtures/build_fixtures.py.
"""

from __future__ import annotations

import io
import struct
import sys
import os
import zlib

import pytest

# Make the huggingface/src package importable regardless of cwd
_HF_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _HF_ROOT not in sys.path:
    sys.path.insert(0, _HF_ROOT)

from src.ai_detection import AIDetectionResult, detect


# ---------------------------------------------------------------------------
# Fixture builders (self-contained, no file-system reads)
# ---------------------------------------------------------------------------


def _build_jpeg_with_software(software: str) -> bytes:
    """Build a minimal JPEG with the given EXIF Software tag value."""
    import piexif
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(200, 200, 200))
    buf = io.BytesIO()
    exif_dict = {
        "0th": {
            piexif.ImageIFD.Software: software.encode("utf-8", errors="replace"),
        },
        "Exif": {},
        "GPS": {},
        "1st": {},
        "thumbnail": None,
    }
    exif_bytes = piexif.dump(exif_dict)
    img.save(buf, format="JPEG", exif=exif_bytes, quality=50)
    return buf.getvalue()


def _make_png_chunk(chunk_type: str, data: bytes) -> bytes:
    type_bytes = chunk_type.encode("latin-1")
    crc = zlib.crc32(type_bytes + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + type_bytes + data + struct.pack(">I", crc)


def _build_png_with_itxt(key: str, value: str) -> bytes:
    """Build a PNG that contains an iTXt chunk with the given key and value."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    base = buf.getvalue()

    # Build iTXt chunk: keyword\x00\x00\x00\x00\x00value (simplified, uncompressed)
    itxt_data = (
        key.encode("utf-8")
        + b"\x00"   # null separator after keyword
        + b"\x00"   # compression flag = 0 (uncompressed)
        + b"\x00"   # compression method = 0
        + b"\x00"   # language tag (empty)
        + b"\x00"   # translated keyword (empty)
        + value.encode("utf-8")
    )
    itxt_chunk = _make_png_chunk("iTXt", itxt_data)

    # Insert before IEND
    iend_pos = base.rfind(b"IEND")
    insert_at = iend_pos - 4  # before the 4-byte length prefix
    return base[:insert_at] + itxt_chunk + base[insert_at:]


def _build_jpeg_no_metadata() -> bytes:
    """Plain JPEG with no EXIF data."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=50)
    return buf.getvalue()


def _build_png_no_metadata() -> bytes:
    """Plain PNG with no text chunks."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestAIDetection:
    def test_jpeg_midjourney_software_tag(self):
        """JPEG with EXIF Software='Midjourney/5.2' → ai_generated, high confidence."""
        data = _build_jpeg_with_software("Midjourney/5.2")
        result = detect(data, filename="test.jpg")

        assert isinstance(result, AIDetectionResult)
        assert result.verdict == "ai_generated", (
            f"Expected 'ai_generated', got {result.verdict!r}. Markers: {result.markers}"
        )
        assert result.confidence >= 0.85, (
            f"Confidence {result.confidence} is too low for a clear Midjourney tag"
        )
        assert len(result.markers) >= 1
        # At least one marker should mention the software value
        assert any("midjourney" in m.lower() or "Midjourney" in m for m in result.markers)

    def test_jpeg_stable_diffusion_software_tag(self):
        """JPEG with EXIF Software='Stable Diffusion WebUI' → ai_generated."""
        data = _build_jpeg_with_software("Stable Diffusion WebUI 1.7.0")
        result = detect(data, filename="photo.jpg")

        assert result.verdict == "ai_generated"
        assert result.confidence >= 0.85

    def test_jpeg_dall_e_software_tag(self):
        """JPEG with EXIF Software='DALL-E 3' → ai_generated."""
        data = _build_jpeg_with_software("DALL-E 3 by OpenAI")
        result = detect(data, filename="image.jpg")

        assert result.verdict == "ai_generated"
        assert result.confidence >= 0.85

    def test_png_itxt_parameters_chunk(self):
        """PNG with iTXt chunk keyed 'parameters' (Automatic1111 standard) → ai_generated."""
        prompt_text = (
            "masterpiece, best quality, 1girl\n"
            "Negative prompt: lowres, bad anatomy\n"
            "Steps: 20, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 123456789"
        )
        data = _build_png_with_itxt("parameters", prompt_text)
        result = detect(data, filename="generated.png")

        assert result.verdict == "ai_generated", (
            f"Expected 'ai_generated', got {result.verdict!r}. Markers: {result.markers}"
        )
        assert result.confidence >= 0.85

    def test_png_comfyui_workflow_chunk(self):
        """PNG with iTXt chunk keyed 'workflow' (ComfyUI standard) → ai_generated."""
        data = _build_png_with_itxt("workflow", '{"nodes": [], "links": []}')
        result = detect(data, filename="comfyui_output.png")

        assert result.verdict == "ai_generated", (
            f"Expected 'ai_generated', got {result.verdict!r}. Markers: {result.markers}"
        )

    def test_jpeg_human_camera_software(self):
        """JPEG with EXIF Software='Google Camera 9.2' → unknown or likely_human (not ai_generated)."""
        data = _build_jpeg_with_software("Google Camera 9.2")
        result = detect(data, filename="pixel_photo.jpg")

        assert result.verdict in ("unknown", "likely_human"), (
            f"Camera software should not trigger AI verdict, got {result.verdict!r}"
        )

    def test_jpeg_pixel_camera(self):
        """JPEG with EXIF Software='Pixel 8' → not ai_generated."""
        data = _build_jpeg_with_software("Pixel 8")
        result = detect(data, filename="pixel8.jpg")

        assert result.verdict != "ai_generated", (
            f"Pixel 8 camera should not trigger AI verdict, got {result.verdict!r}"
        )

    def test_no_metadata_jpeg(self):
        """Plain JPEG with no metadata → unknown (0.0 confidence, note in markers)."""
        data = _build_jpeg_no_metadata()
        result = detect(data, filename="plain.jpg")

        assert result.verdict == "unknown"
        assert result.confidence == 0.0
        assert len(result.markers) >= 1
        # Should have a note that no markers were found
        combined = " ".join(result.markers).lower()
        assert "no ai" in combined or "not detect" in combined or "no markers" in combined or "no" in combined

    def test_no_metadata_png(self):
        """Plain PNG with no metadata → unknown."""
        data = _build_png_no_metadata()
        result = detect(data, filename="plain.png")

        assert result.verdict == "unknown"
        assert result.confidence == 0.0

    def test_adobe_firefly_tag(self):
        """JPEG with 'Adobe Firefly' in Software tag → ai_generated."""
        data = _build_jpeg_with_software("Adobe Firefly 2.0")
        result = detect(data, filename="firefly.jpg")

        assert result.verdict == "ai_generated"
        assert result.confidence >= 0.85

    def test_result_has_required_fields(self):
        """AIDetectionResult always exposes verdict, confidence, markers."""
        data = _build_jpeg_no_metadata()
        result = detect(data, filename="test.jpg")

        assert hasattr(result, "verdict")
        assert hasattr(result, "confidence")
        assert hasattr(result, "markers")
        assert isinstance(result.markers, list)
        assert 0.0 <= result.confidence <= 1.0

    def test_to_dict_serialisable(self):
        """to_dict() produces a JSON-serialisable dict."""
        import json

        data = _build_jpeg_with_software("Midjourney/6.0")
        result = detect(data, filename="mj.jpg")
        d = result.to_dict()
        # Must not raise
        serialised = json.dumps(d)
        loaded = json.loads(serialised)
        assert loaded["verdict"] == result.verdict
        assert loaded["confidence"] == result.confidence

    def test_unsupported_format_returns_unknown(self):
        """Passing random bytes that aren't a recognised format → unknown, no crash."""
        garbage = b"\x00\x01\x02\x03 this is not a real file format XYZ"
        result = detect(garbage, filename="garbage.xyz")

        assert result.verdict == "unknown"
        # Should not raise; markers explain the parse failure
        assert len(result.markers) >= 1
