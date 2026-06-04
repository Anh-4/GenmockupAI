"""Mockup compositing.

Warps the design onto the printable quad with a perspective transform, then
composites it so the garment's own texture, wrinkles and shadows show through
the print. Pipeline:

  1. Perspective-warp design (RGBA) from its own corners to the print quad.
  2. Constrain to the garment mask so ink never lands on background.
  3. Build a shading map from the garment luminance under the print region and
     multiply it into the design (preserves folds + shadows).
  4. Feather the design alpha and alpha-composite in float space.
"""
from __future__ import annotations

from typing import Optional

import cv2
import numpy as np

from .types import ApparelCategory, MockupResult, PrintArea
from .print_area import detect_print_area
from .segmentation import segment


def _ensure_rgba(img: np.ndarray) -> np.ndarray:
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 3:
        a = np.full(img.shape[:2], 255, np.uint8)
        img = np.dstack([img, a])
    return img


def _shading_map(product_bgr: np.ndarray, region_mask: np.ndarray, strength: float) -> np.ndarray:
    """Per-pixel multiplier (HxWx1, ~0.5..1.3) capturing garment light/shadow.

    We take the garment luminance, normalise it around its local mean, and
    blend toward 1.0 by ``strength`` so the design keeps its own colors while
    inheriting the fabric's shading.
    """
    lab = cv2.cvtColor(product_bgr, cv2.COLOR_BGR2LAB)
    lum = lab[:, :, 0].astype(np.float32) / 255.0
    lum = cv2.GaussianBlur(lum, (0, 0), sigmaX=3)
    vals = lum[region_mask > 0]
    mean = float(vals.mean()) if vals.size else 0.5
    mean = max(mean, 1e-3)
    shading = lum / mean                     # 1.0 == average lit fabric
    shading = 1.0 + (shading - 1.0) * strength
    shading = np.clip(shading, 0.5, 1.35)
    return shading[:, :, None]


def generate_mockup(
    product_rgb: np.ndarray,
    design_rgba: np.ndarray,
    print_area: Optional[PrintArea] = None,
    category: Optional[ApparelCategory] = None,
    *,
    mask: Optional[np.ndarray] = None,
    shading_strength: float = 0.85,
    opacity: float = 1.0,
) -> MockupResult:
    """Render a realistic mockup.

    Args:
        product_rgb: product photo, uint8 HxWx3 (RGB).
        design_rgba: design, uint8 HxWx{3,4}.
        print_area: pre-computed quad; detected if omitted.
        category: apparel category for default print placement.
        mask: garment mask; segmented if omitted.
        shading_strength: 0 keeps design flat, 1 fully inherits fabric shading.
        opacity: global design opacity (0..1).
    """
    product_bgr = cv2.cvtColor(product_rgb, cv2.COLOR_RGB2BGR).astype(np.float32)
    H, W = product_rgb.shape[:2]

    if mask is None:
        mask = segment(product_rgb).mask
    if print_area is None:
        print_area = detect_print_area(product_rgb, category, mask=mask)

    design = _ensure_rgba(design_rgba)
    # The design arrives in RGB(A) channel order (PIL), but we composite in the
    # product's BGR space — swap R/B so colors are preserved (keep alpha).
    design = design[:, :, [2, 1, 0, 3]]
    dh, dw = design.shape[:2]
    src = np.float32([[0, 0], [dw, 0], [dw, dh], [0, dh]])
    dst = np.float32(print_area.quad)

    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        design, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0)
    )
    warped_bgr = warped[:, :, :3].astype(np.float32)
    warped_a = warped[:, :, 3].astype(np.float32) / 255.0

    # Restrict the print to the garment so nothing spills onto background.
    garment = (mask > 0).astype(np.float32)
    region = warped_a * garment

    # Feather edges for a soft, printed-on look.
    region = cv2.GaussianBlur(region, (0, 0), sigmaX=1.2)
    region *= float(np.clip(opacity, 0.0, 1.0))

    # Texture + shadow preservation.
    region_u8 = (region > 0.05).astype(np.uint8)
    shading = _shading_map(
        cv2.cvtColor(product_rgb, cv2.COLOR_RGB2BGR), region_u8, shading_strength
    )
    inked = np.clip(warped_bgr * shading, 0, 255)

    alpha = region[:, :, None]
    out = product_bgr * (1.0 - alpha) + inked * alpha
    out = np.clip(out, 0, 255).astype(np.uint8)
    return MockupResult(image=out, print_area=print_area)
