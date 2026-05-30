"""
AI-generated image / document detector — heuristic only, no ML inference.

Inspects metadata produced by metascrub.parse() for markers that indicate
the file was created by an AI tool (Midjourney, Stable Diffusion, DALL-E,
Adobe Firefly, etc.).  No model weights, no network calls.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

import metascrub

# ---------------------------------------------------------------------------
# Known AI software name patterns (case-insensitive substring match)
# ---------------------------------------------------------------------------

_AI_TOOL_PATTERNS: list[str] = [
    "midjourney",
    "stable diffusion",
    "stablediffusion",
    "dall-e",
    "dalle",
    "adobe firefly",
    "firefly",
    "leonardo",
    "bing image creator",
    "microsoft designer",
    "imagen",
    "gemini",
    "novelai",
    "nightcafe",
    "playgroundai",
    "invoke ai",
    "invokeai",
    "comfyui",
    "automatic1111",
    "a1111",
    "fooocus",
    "flux",  # Black Forest Labs FLUX models
]

# PDF Producer / Creator patterns that suggest AI generation
_AI_PDF_PATTERNS: list[str] = [
    "midjourney",
    "dall-e",
    "dalle",
    "stable diffusion",
    "adobe firefly",
    "gemini",
    "chatgpt",
    "openai",
]

# PNG text chunk keys written by Automatic1111 / ComfyUI
_AI_PNG_CHUNK_KEYS: set[str] = {
    "parameters",  # Automatic1111 webui
    "prompt",  # ComfyUI / many others
    "negative_prompt",
    "workflow",  # ComfyUI workflow JSON
    "comfyui",
    "invokeai_metadata",
    "invokeai_graph",
    "sd metadata",
}

# C2PA manifest chunk identifier
_C2PA_KEY = "c2pa.manifest"


Verdict = Literal["ai_generated", "unknown", "likely_human"]


@dataclass
class AIDetectionResult:
    """Result from the heuristic AI-generated detector."""

    verdict: Verdict
    confidence: float  # 0.0 – 1.0
    markers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "verdict": self.verdict,
            "confidence": self.confidence,
            "markers": self.markers,
        }


def _normalize(s: str) -> str:
    return s.lower().strip()


def _matches_ai_pattern(value: str, patterns: list[str]) -> list[str]:
    """Return all matching pattern strings found in value."""
    normalized = _normalize(value)
    return [p for p in patterns if p in normalized]


def detect(file_or_bytes: bytes | str, filename: str | None = None) -> AIDetectionResult:
    """
    Run heuristic AI-generation detection on a file.

    Args:
        file_or_bytes: Raw bytes or a path string.
        filename:      Optional filename hint for format detection.

    Returns:
        AIDetectionResult with verdict, confidence (0–1), and a list of
        human-readable marker strings that contributed to the verdict.
    """
    try:
        result = metascrub.parse(file_or_bytes, filename=filename)
    except metascrub.MetaScrubError:
        # Unsupported format or corrupt — cannot detect anything
        return AIDetectionResult(
            verdict="unknown",
            confidence=0.0,
            markers=["Could not parse file — format unsupported or corrupt"],
        )

    markers: list[str] = []
    high_confidence_hits = 0
    medium_confidence_hits = 0

    # Flatten all fields for easy iteration
    all_fields: list[tuple[str, str, str]] = []  # (group, key, str_value)
    for group, fields in result.groups.items():
        for f in fields:
            if f.value is not None:
                all_fields.append((group, f.key, str(f.value)))

    # ------------------------------------------------------------------
    # 1. EXIF Software / CreatorTool field
    # ------------------------------------------------------------------
    for group, key, value in all_fields:
        if key.lower() in ("software", "creatortool", "creator_tool", "xmp:creatortool"):
            hits = _matches_ai_pattern(value, _AI_TOOL_PATTERNS)
            if hits:
                for h in hits:
                    markers.append(f"EXIF/XMP Software tag identifies AI tool: {value!r}")
                high_confidence_hits += 1
                break  # one Software field is enough

    # ------------------------------------------------------------------
    # 2. PNG iTXt / tEXt chunk keys (Automatic1111, ComfyUI, etc.)
    # ------------------------------------------------------------------
    for group, key, value in all_fields:
        key_lower = key.lower().strip()
        if key_lower in _AI_PNG_CHUNK_KEYS:
            markers.append(
                f"PNG metadata chunk {key!r} is written by AI image generators "
                f"(Automatic1111 / ComfyUI convention)"
            )
            high_confidence_hits += 1

    # ------------------------------------------------------------------
    # 3. C2PA manifest presence
    # ------------------------------------------------------------------
    for group, key, value in all_fields:
        if _C2PA_KEY in key.lower() or _C2PA_KEY in value.lower():
            markers.append(
                f"C2PA content credentials manifest detected — "
                f"check manifest for provenance claim: {value!r}"
            )
            # C2PA can be used by both AI and non-AI; treat as medium confidence
            medium_confidence_hits += 1

    # ------------------------------------------------------------------
    # 4. XMP CreatorTool / producer in any namespace
    # ------------------------------------------------------------------
    for group, key, value in all_fields:
        if key.lower() in ("creatortool", "creator_tool") and group.lower() in ("xmp", "xmp:basic"):
            hits = _matches_ai_pattern(value, _AI_TOOL_PATTERNS)
            if hits:
                markers.append(f"XMP CreatorTool identifies AI tool: {value!r}")
                high_confidence_hits += 1

    # ------------------------------------------------------------------
    # 5. PDF Producer / Creator field
    # ------------------------------------------------------------------
    for group, key, value in all_fields:
        if group.lower() == "pdf" and key.lower() in ("producer", "creator"):
            hits = _matches_ai_pattern(value, _AI_PDF_PATTERNS)
            if hits:
                markers.append(f"PDF {key} field suggests AI generation: {value!r}")
                medium_confidence_hits += 1

    # ------------------------------------------------------------------
    # 6. Comment / Description fields with AI prompt text patterns
    # ------------------------------------------------------------------
    # Some tools embed the prompt in a generic Comment or Description field
    _prompt_hint_re = re.compile(
        r"\b(steps\s*:\s*\d|cfg\s*scale|sampler|seed\s*:\s*\d|negative prompt:)",
        re.IGNORECASE,
    )
    for group, key, value in all_fields:
        if key.lower() in ("comment", "description", "usercomment", "imagedescription"):
            if _prompt_hint_re.search(value):
                markers.append(
                    f"Field {key!r} contains Stable Diffusion generation parameters "
                    f"(steps/CFG/sampler/seed)"
                )
                high_confidence_hits += 1

    # ------------------------------------------------------------------
    # Compute verdict
    # ------------------------------------------------------------------
    if high_confidence_hits >= 1:
        verdict: Verdict = "ai_generated"
        # Scale confidence: 1 hit = 0.90, 2+ hits = 0.97+
        confidence = min(0.90 + (high_confidence_hits - 1) * 0.035, 0.99)
    elif medium_confidence_hits >= 1:
        verdict = "unknown"
        confidence = 0.50 + medium_confidence_hits * 0.10
    else:
        verdict = "unknown"
        confidence = 0.0
        markers.append(
            "No AI-generation markers detected in metadata. "
            "This does not rule out AI generation — many AI tools strip or omit metadata."
        )

    return AIDetectionResult(verdict=verdict, confidence=confidence, markers=markers)
