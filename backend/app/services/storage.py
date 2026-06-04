"""Filesystem-backed asset storage.

Swap this for S3/GCS by implementing the same two methods. Asset ids are
opaque uuids; outputs are served read-only via a static mount in main.py.
"""
from __future__ import annotations

import uuid
from pathlib import Path

import numpy as np
from PIL import Image

from ..config import get_settings


class Storage:
    def __init__(self) -> None:
        s = get_settings()
        self.uploads = s.uploads_dir
        self.outputs = s.outputs_dir
        self.uploads.mkdir(parents=True, exist_ok=True)
        self.outputs.mkdir(parents=True, exist_ok=True)

    def save_output_png(self, rgb: np.ndarray) -> tuple[str, Path]:
        """Persist a generated mockup; return (asset_id, path)."""
        asset_id = uuid.uuid4().hex
        path = self.outputs / f"{asset_id}.png"
        mode = "RGBA" if rgb.ndim == 3 and rgb.shape[2] == 4 else "RGB"
        Image.fromarray(rgb, mode=mode).save(path, format="PNG")
        return asset_id, path

    def output_path(self, asset_id: str) -> Path | None:
        path = self.outputs / f"{asset_id}.png"
        return path if path.exists() else None


_storage: Storage | None = None


def get_storage() -> Storage:
    global _storage
    if _storage is None:
        _storage = Storage()
    return _storage
