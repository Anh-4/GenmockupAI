"""Pydantic request/response models for the API layer."""
from __future__ import annotations

from typing import List, Optional, Tuple

from pydantic import BaseModel, Field


class ClassifyResponse(BaseModel):
    category: str = Field(..., examples=["tshirt"])
    view: str = Field(..., examples=["front"])
    confidence: float = Field(..., ge=0, le=1)
    scores: dict[str, float] = {}


class SegmentResponse(BaseModel):
    mask_png: str = Field(..., description="Base64-encoded PNG mask (white = product)")
    bbox: Tuple[int, int, int, int] = Field(..., description="x, y, w, h")
    score: float
    method: str


class PrintAreaResponse(BaseModel):
    quad: List[Tuple[float, float]] = Field(
        ..., description="4 corners CW from top-left, source pixels"
    )
    bbox: Tuple[int, int, int, int]
    confidence: float
    source: str


class MockupResponse(BaseModel):
    asset_id: str
    image_png: str = Field(..., description="Base64-encoded mockup PNG")
    url: str = Field(..., description="Download URL for the generated mockup")
    print_area: PrintAreaResponse
    classification: Optional[ClassifyResponse] = None


class ErrorResponse(BaseModel):
    detail: str
