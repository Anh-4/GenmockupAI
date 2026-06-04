"""Printable-area detection.

Given the garment mask (and optionally its category) we estimate the convex
quad where a design should be placed. We combine:

  1. Category priors — a normalised rectangle inside the garment bbox
     (e.g. chest area for a t-shirt, center for a mug).
  2. Mask geometry — clip the prior to the actual mask so the quad never
     bleeds onto the background, and follow the garment's local slant by
     sampling mask widths at the top/bottom of the region.
"""
from __future__ import annotations

from typing import Optional

import cv2
import numpy as np

from .types import ApparelCategory, PrintArea
from .segmentation import segment

# Normalised print rectangles (x, y, w, h) within the garment bounding box.
# Tuned for typical front-facing studio shots.
_PRIORS = {
    ApparelCategory.TSHIRT: (0.30, 0.26, 0.40, 0.42),
    ApparelCategory.POLO: (0.32, 0.30, 0.36, 0.34),
    ApparelCategory.HOODIE: (0.32, 0.30, 0.36, 0.34),
    ApparelCategory.JERSEY: (0.28, 0.22, 0.44, 0.50),
    ApparelCategory.TANKTOP: (0.34, 0.24, 0.32, 0.44),
    ApparelCategory.SHORTS: (0.30, 0.30, 0.40, 0.30),
    ApparelCategory.PANTS: (0.32, 0.18, 0.36, 0.28),
    ApparelCategory.CAP: (0.30, 0.34, 0.40, 0.30),
    ApparelCategory.MUG: (0.30, 0.28, 0.40, 0.44),
    ApparelCategory.UNKNOWN: (0.32, 0.30, 0.36, 0.36),
}


def _mask_row_span(mask: np.ndarray, y: int):
    """Return (x_left, x_right) of the garment on a given row, or None."""
    row = np.where(mask[y] > 0)[0]
    if row.size == 0:
        return None
    return int(row.min()), int(row.max())


def detect_print_area(
    image_rgb: np.ndarray,
    category: Optional[ApparelCategory] = None,
    mask: Optional[np.ndarray] = None,
) -> PrintArea:
    """Detect the printable quad. Segments internally if ``mask`` is None."""
    if mask is None:
        mask = segment(image_rgb).mask
    category = category or ApparelCategory.UNKNOWN

    ys, xs = np.where(mask > 0)
    if xs.size == 0:  # empty mask -> use whole image center
        h, w = mask.shape[:2]
        bx, by, bw, bh = int(w * 0.25), int(h * 0.25), int(w * 0.5), int(h * 0.5)
    else:
        bx, by = int(xs.min()), int(ys.min())
        bw, bh = int(xs.max() - bx + 1), int(ys.max() - by + 1)

    rx, ry, rw, rh = _PRIORS.get(category, _PRIORS[ApparelCategory.UNKNOWN])
    px = bx + rx * bw
    py = by + ry * bh
    pw = rw * bw
    ph = rh * bh

    y_top = int(np.clip(py, 0, mask.shape[0] - 1))
    y_bot = int(np.clip(py + ph, 0, mask.shape[0] - 1))
    cx = px + pw / 2.0
    half = pw / 2.0

    # Follow the garment slant: clamp each edge to the mask span on that row,
    # so the quad hugs the body and respects tapering (e.g. fitted jerseys).
    def edge(y: int):
        span = _mask_row_span(mask, y)
        if span is None:
            return cx - half, cx + half
        left = max(cx - half, span[0] + 0.02 * bw)
        right = min(cx + half, span[1] - 0.02 * bw)
        if right <= left:  # degenerate -> fall back to prior width
            return cx - half, cx + half
        return left, right

    tl_x, tr_x = edge(y_top)
    bl_x, br_x = edge(y_bot)

    quad = [
        (round(tl_x, 1), float(y_top)),   # top-left
        (round(tr_x, 1), float(y_top)),   # top-right
        (round(br_x, 1), float(y_bot)),   # bottom-right
        (round(bl_x, 1), float(y_bot)),   # bottom-left
    ]
    bbox = (
        int(min(tl_x, bl_x)),
        y_top,
        int(max(tr_x, br_x) - min(tl_x, bl_x)),
        y_bot - y_top,
    )
    # Confidence: how much of the prior rect actually landed on the garment.
    area_mask = mask[y_top : y_bot + 1, bbox[0] : bbox[0] + bbox[2]]
    coverage = float((area_mask > 0).mean()) if area_mask.size else 0.0
    return PrintArea(quad, bbox, round(coverage, 3), f"prior:{category.value}")
