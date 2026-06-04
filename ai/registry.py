"""Lazy, thread-safe model registry.

Models are expensive to load, so we load them once on first use and cache the
instance. Everything is optional: if torch / CLIP / SAM2 are unavailable the
loaders return ``None`` and the pipeline falls back to classical CV.
"""
from __future__ import annotations

import logging
import os
import threading
from functools import lru_cache
from typing import Optional

logger = logging.getLogger("ai.registry")

_lock = threading.Lock()


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


@lru_cache(maxsize=1)
def get_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:  # pragma: no cover - torch optional
        pass
    return "cpu"


@lru_cache(maxsize=1)
def get_clip():
    """Return (model, processor) for zero-shot classification, or None."""
    try:
        import torch  # noqa: F401
        from transformers import CLIPModel, CLIPProcessor

        name = _env("CLIP_MODEL", "openai/clip-vit-base-patch32")
        with _lock:
            logger.info("Loading CLIP model %s on %s", name, get_device())
            model = CLIPModel.from_pretrained(name).to(get_device()).eval()
            processor = CLIPProcessor.from_pretrained(name)
        return model, processor
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning("CLIP unavailable (%s); using heuristic classifier", exc)
        return None


@lru_cache(maxsize=1)
def get_sam2():
    """Return a SAM2 image predictor, or None if weights/lib are missing."""
    ckpt = _env("SAM2_CHECKPOINT", "ai/weights/sam2.1_hiera_small.pt")
    cfg = _env("SAM2_CONFIG", "configs/sam2.1/sam2.1_hiera_s.yaml")
    if not os.path.exists(ckpt):
        logger.warning("SAM2 checkpoint not found at %s; using GrabCut fallback", ckpt)
        return None
    try:
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor

        with _lock:
            logger.info("Loading SAM2 %s on %s", ckpt, get_device())
            model = build_sam2(cfg, ckpt, device=get_device())
            predictor = SAM2ImagePredictor(model)
        return predictor
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning("SAM2 unavailable (%s); using GrabCut fallback", exc)
        return None
