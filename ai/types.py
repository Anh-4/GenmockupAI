"""Shared domain types for the AI pipeline.

Plain dataclasses + enums so the backend can map them to Pydantic schemas
without coupling the CV code to any web framework.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple

import numpy as np


class ApparelCategory(str, Enum):
    TSHIRT = "tshirt"
    POLO = "polo"
    HOODIE = "hoodie"
    JERSEY = "jersey"
    TANKTOP = "tanktop"
    SHORTS = "shorts"
    PANTS = "pants"
    CAP = "cap"
    MUG = "mug"
    UNKNOWN = "unknown"

    @property
    def is_apparel(self) -> bool:
        return self not in (ApparelCategory.MUG, ApparelCategory.UNKNOWN)


class View(str, Enum):
    FRONT = "front"
    BACK = "back"
    UNKNOWN = "unknown"


# A printable area is a convex quadrilateral given as 4 (x, y) corner points
# in clockwise order starting top-left, in source-image pixel coordinates.
Quad = List[Tuple[float, float]]
BBox = Tuple[int, int, int, int]  # x, y, w, h


@dataclass
class ClassificationResult:
    category: ApparelCategory
    view: View
    confidence: float
    # Full probability distribution over categories (for the UI / debugging).
    scores: dict = field(default_factory=dict)


@dataclass
class SegmentationResult:
    mask: np.ndarray            # uint8 HxW, 0 or 255
    bbox: BBox
    score: float
    method: str                 # "sam2" | "grabcut"


@dataclass
class PrintArea:
    quad: Quad
    bbox: BBox
    # Normalised confidence that this region is a good print location.
    confidence: float
    source: str                 # how it was derived


@dataclass
class MockupResult:
    image: np.ndarray           # HxWx3 (or 4) uint8 BGR(A)
    print_area: PrintArea
    classification: Optional[ClassificationResult] = None
