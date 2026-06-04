"""API endpoints: classify, segment, detect-print-area, generate-mockup.

Routes stay thin — validation + I/O only. All CV logic lives in the ``ai``
package, keeping the web layer decoupled and the pipeline independently
testable.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

import ai
from ai.types import ApparelCategory

from ..schemas import (
    ClassifyResponse,
    MockupResponse,
    PrintAreaResponse,
    SegmentResponse,
)
from ..services.images import encode_png_b64, read_upload_rgb, read_upload_rgba
from ..services.storage import Storage, get_storage

router = APIRouter()


def _parse_category(value: Optional[str]) -> Optional[ApparelCategory]:
    if not value:
        return None
    try:
        return ApparelCategory(value.lower())
    except ValueError:
        return None


@router.post("/classify", response_model=ClassifyResponse, tags=["ai"])
async def classify(image: UploadFile = File(...)) -> ClassifyResponse:
    rgb = await read_upload_rgb(image)
    r = ai.classify(rgb)
    return ClassifyResponse(
        category=r.category.value,
        view=r.view.value,
        confidence=r.confidence,
        scores=r.scores,
    )


@router.post("/segment", response_model=SegmentResponse, tags=["ai"])
async def segment(image: UploadFile = File(...)) -> SegmentResponse:
    rgb = await read_upload_rgb(image)
    r = ai.segment(rgb)
    return SegmentResponse(
        mask_png=encode_png_b64(r.mask),
        bbox=r.bbox,
        score=r.score,
        method=r.method,
    )


@router.post("/detect-print-area", response_model=PrintAreaResponse, tags=["ai"])
async def detect_print_area(
    image: UploadFile = File(...),
    category: Optional[str] = Form(None),
) -> PrintAreaResponse:
    rgb = await read_upload_rgb(image)
    cat = _parse_category(category)
    if cat is None:  # auto-classify when not supplied
        cat = ai.classify(rgb).category
    r = ai.detect_print_area(rgb, cat)
    return PrintAreaResponse(
        quad=r.quad, bbox=r.bbox, confidence=r.confidence, source=r.source
    )


@router.post("/generate-mockup", response_model=MockupResponse, tags=["ai"])
async def generate_mockup(
    product: UploadFile = File(...),
    design: UploadFile = File(...),
    category: Optional[str] = Form(None),
    shading_strength: float = Form(0.85),
    opacity: float = Form(1.0),
    storage: Storage = Depends(get_storage),
) -> MockupResponse:
    product_rgb = await read_upload_rgb(product)
    design_rgba = await read_upload_rgba(design)

    classification = ai.classify(product_rgb)
    cat = _parse_category(category) or classification.category

    seg = ai.segment(product_rgb)
    area = ai.detect_print_area(product_rgb, cat, mask=seg.mask)
    result = ai.generate_mockup(
        product_rgb,
        design_rgba,
        print_area=area,
        category=cat,
        mask=seg.mask,
        shading_strength=float(shading_strength),
        opacity=float(opacity),
    )

    # result.image is BGR -> convert to RGB for storage/encoding.
    import cv2

    rgb_out = cv2.cvtColor(result.image, cv2.COLOR_BGR2RGB)
    asset_id, _ = storage.save_output_png(rgb_out)

    return MockupResponse(
        asset_id=asset_id,
        image_png=encode_png_b64(rgb_out),
        url=f"/assets/{asset_id}.png",
        print_area=PrintAreaResponse(
            quad=area.quad, bbox=area.bbox, confidence=area.confidence, source=area.source
        ),
        classification=ClassifyResponse(
            category=classification.category.value,
            view=classification.view.value,
            confidence=classification.confidence,
            scores=classification.scores,
        ),
    )
