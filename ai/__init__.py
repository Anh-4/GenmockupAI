"""AI mockup-generation pipeline.

Framework-agnostic computer-vision package consumed by the FastAPI backend.
"""
from .types import (
    ApparelCategory,
    View,
    ClassificationResult,
    SegmentationResult,
    PrintArea,
    MockupResult,
)
from .classifier import classify
from .segmentation import segment
from .print_area import detect_print_area
from .mockup import generate_mockup

__all__ = [
    "ApparelCategory",
    "View",
    "ClassificationResult",
    "SegmentationResult",
    "PrintArea",
    "MockupResult",
    "classify",
    "segment",
    "detect_print_area",
    "generate_mockup",
]
