"""Garment segmentation.

Primary: SAM2 prompted with a center box (the product usually dominates the
frame). Fallback: GrabCut seeded from a center rectangle, cleaned with
morphology. Both return a binary uint8 mask + tight bbox.
"""
from __future__ import annotations

import logging

import cv2
import numpy as np

from .types import SegmentationResult
from .registry import get_sam2

logger = logging.getLogger("ai.segmentation")


def _bbox_from_mask(mask: np.ndarray):
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        h, w = mask.shape[:2]
        return (0, 0, w, h)
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return (x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def _clean(mask: np.ndarray) -> np.ndarray:
    """Keep the largest component, fill holes, smooth edges."""
    mask = (mask > 0).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = (labels == largest).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    return (mask * 255).astype(np.uint8)


def _segment_sam2(image_rgb: np.ndarray) -> SegmentationResult:
    predictor = get_sam2()
    import torch

    h, w = image_rgb.shape[:2]
    # Center box covering the inner 80% — a strong prior for studio product shots.
    box = np.array([w * 0.1, h * 0.1, w * 0.9, h * 0.9])
    predictor.set_image(image_rgb)
    with torch.inference_mode():
        masks, scores, _ = predictor.predict(box=box[None, :], multimask_output=True)
    best = int(np.argmax(scores))
    mask = _clean((masks[best] * 255).astype(np.uint8))
    return SegmentationResult(mask, _bbox_from_mask(mask), float(scores[best]), "sam2")


def _segment_grabcut(image_rgb: np.ndarray) -> SegmentationResult:
    h, w = image_rgb.shape[:2]
    bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    mask = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    rect = (int(w * 0.08), int(h * 0.08), int(w * 0.84), int(h * 0.84))
    try:
        cv2.grabCut(bgr, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    except cv2.error as exc:  # pragma: no cover
        logger.warning("GrabCut failed (%s); returning rect mask", exc)
        m = np.zeros((h, w), np.uint8)
        x, y, rw, rh = rect
        m[y : y + rh, x : x + rw] = 255
        return SegmentationResult(_clean(m), rect, 0.2, "grabcut")
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    fg = _clean(fg)
    return SegmentationResult(fg, _bbox_from_mask(fg), 0.5, "grabcut")


def segment(image_rgb: np.ndarray) -> SegmentationResult:
    """Segment the product from its background. ``image_rgb`` is uint8 HxWx3."""
    if get_sam2() is not None:
        try:
            return _segment_sam2(image_rgb)
        except Exception as exc:  # pragma: no cover
            logger.exception("SAM2 segmentation failed: %s", exc)
    return _segment_grabcut(image_rgb)
