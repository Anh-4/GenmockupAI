"""Apparel classification + front/back view detection.

Primary path: zero-shot CLIP over text prompts. Fallback: aspect-ratio and
color heuristics so the endpoint always returns something sensible.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Tuple

import numpy as np

from .types import ApparelCategory, ClassificationResult, View
from .registry import get_clip, get_device

logger = logging.getLogger("ai.classifier")

# Natural-language prompts per category give CLIP good separation.
_CATEGORY_PROMPTS: Dict[ApparelCategory, List[str]] = {
    ApparelCategory.TSHIRT: ["a plain t-shirt", "a short sleeve cotton tee"],
    ApparelCategory.POLO: ["a polo shirt with a collar and buttons"],
    ApparelCategory.HOODIE: ["a hoodie sweatshirt with a hood and pocket"],
    ApparelCategory.JERSEY: ["a sports jersey", "an athletic team jersey"],
    ApparelCategory.TANKTOP: ["a sleeveless tank top"],
    ApparelCategory.SHORTS: ["a pair of shorts"],
    ApparelCategory.PANTS: ["a pair of long pants or trousers"],
    ApparelCategory.CAP: ["a baseball cap", "a hat with a brim"],
    ApparelCategory.MUG: ["a ceramic coffee mug"],
}

_VIEW_PROMPTS = {
    View.FRONT: ["the front of a garment", "front view of clothing showing chest"],
    View.BACK: ["the back of a garment", "rear view of clothing showing the back"],
}


def _clip_scores(image, prompts: List[str]) -> np.ndarray:
    model, processor = get_clip()
    import torch

    inputs = processor(text=prompts, images=image, return_tensors="pt", padding=True)
    inputs = {k: v.to(get_device()) for k, v in inputs.items()}
    with torch.no_grad():
        out = model(**inputs)
    # image-to-text similarity softmaxed over the prompt set
    return out.logits_per_image.softmax(dim=1)[0].cpu().numpy()


def _classify_clip(image_rgb: np.ndarray) -> ClassificationResult:
    from PIL import Image

    pil = Image.fromarray(image_rgb)

    # Category: flatten prompts, take max prob per category.
    flat: List[Tuple[ApparelCategory, str]] = [
        (cat, p) for cat, ps in _CATEGORY_PROMPTS.items() for p in ps
    ]
    probs = _clip_scores(pil, [p for _, p in flat])
    by_cat: Dict[ApparelCategory, float] = {}
    for (cat, _), prob in zip(flat, probs):
        by_cat[cat] = max(by_cat.get(cat, 0.0), float(prob))
    # renormalise the per-category maxima
    total = sum(by_cat.values()) or 1.0
    scores = {c.value: v / total for c, v in by_cat.items()}
    best = max(by_cat, key=by_cat.get)
    confidence = scores[best.value]

    # View only meaningful for apparel.
    view = View.UNKNOWN
    if best.is_apparel:
        vprompts = [p for ps in _VIEW_PROMPTS.values() for p in ps]
        vprobs = _clip_scores(pil, vprompts)
        front = vprobs[: len(_VIEW_PROMPTS[View.FRONT])].sum()
        back = vprobs[len(_VIEW_PROMPTS[View.FRONT]) :].sum()
        view = View.FRONT if front >= back else View.BACK

    return ClassificationResult(best, view, round(confidence, 4), scores)


def _classify_heuristic(image_rgb: np.ndarray) -> ClassificationResult:
    """Deterministic fallback using simple shape cues."""
    h, w = image_rgb.shape[:2]
    ar = w / max(h, 1)
    if ar > 1.4:
        cat = ApparelCategory.CAP
    elif ar < 0.7:
        cat = ApparelCategory.PANTS
    else:
        cat = ApparelCategory.TSHIRT
    return ClassificationResult(
        cat, View.FRONT, 0.34, {cat.value: 0.34}
    )


def classify(image_rgb: np.ndarray) -> ClassificationResult:
    """Classify an RGB ``uint8`` image (HxWx3)."""
    if get_clip() is not None:
        try:
            return _classify_clip(image_rgb)
        except Exception as exc:  # pragma: no cover
            logger.exception("CLIP classification failed: %s", exc)
    return _classify_heuristic(image_rgb)
