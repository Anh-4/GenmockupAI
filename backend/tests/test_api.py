"""Smoke tests exercising the full pipeline via the fallback CV path.

Run with: pytest  (from backend/, with PYTHONPATH=.. so `ai` is importable)
"""
import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png(rgb: np.ndarray, mode="RGB") -> bytes:
    buf = io.BytesIO()
    Image.fromarray(rgb, mode=mode).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def product_bytes():
    # Gray "garment" on white background.
    img = np.full((400, 300, 3), 255, np.uint8)
    img[60:340, 70:230] = (120, 130, 160)
    return _png(img)


@pytest.fixture
def design_bytes():
    img = np.zeros((100, 100, 4), np.uint8)
    img[..., 0] = 220  # red, opaque
    img[..., 3] = 255
    return _png(img, mode="RGBA")


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_classify(product_bytes):
    r = client.post("/classify", files={"image": ("p.png", product_bytes, "image/png")})
    assert r.status_code == 200
    body = r.json()
    assert "category" in body and 0 <= body["confidence"] <= 1


def test_segment(product_bytes):
    r = client.post("/segment", files={"image": ("p.png", product_bytes, "image/png")})
    assert r.status_code == 200
    assert r.json()["mask_png"]


def test_detect_print_area(product_bytes):
    r = client.post(
        "/detect-print-area",
        files={"image": ("p.png", product_bytes, "image/png")},
        data={"category": "tshirt"},
    )
    assert r.status_code == 200
    assert len(r.json()["quad"]) == 4


def test_generate_mockup(product_bytes, design_bytes):
    r = client.post(
        "/generate-mockup",
        files={
            "product": ("p.png", product_bytes, "image/png"),
            "design": ("d.png", design_bytes, "image/png"),
        },
        data={"category": "tshirt"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["image_png"] and body["asset_id"]


def test_reject_non_image():
    r = client.post(
        "/classify", files={"image": ("x.txt", b"hello", "text/plain")}
    )
    assert r.status_code == 415
