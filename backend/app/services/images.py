"""Image I/O helpers bridging HTTP uploads and numpy arrays."""
from __future__ import annotations

import base64
import io

import numpy as np
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from ..config import get_settings


async def read_upload_rgb(file: UploadFile) -> np.ndarray:
    """Validate an upload and decode it to an RGB uint8 array."""
    settings = get_settings()
    if file.content_type not in settings.allowed_types:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported type {file.content_type}; allowed: {settings.allowed_types}",
        )
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {settings.max_upload_mb} MB",
        )
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not decode image")
    return np.asarray(img, dtype=np.uint8)


async def read_upload_rgba(file: UploadFile) -> np.ndarray:
    """Decode an upload preserving alpha (for design overlays)."""
    settings = get_settings()
    if file.content_type not in settings.allowed_types:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported type {file.content_type}",
        )
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGBA")
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not decode image")
    return np.asarray(img, dtype=np.uint8)


def encode_png_b64(rgb_or_bgr: np.ndarray, *, is_bgr: bool = False) -> str:
    """Encode an array to a base64 PNG string (no data-URI prefix)."""
    import cv2

    arr = rgb_or_bgr
    if arr.ndim == 3 and arr.shape[2] >= 3 and is_bgr:
        arr = cv2.cvtColor(arr, cv2.COLOR_BGR2RGB)
    mode = "L" if arr.ndim == 2 else ("RGBA" if arr.shape[2] == 4 else "RGB")
    buf = io.BytesIO()
    Image.fromarray(arr, mode=mode).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
