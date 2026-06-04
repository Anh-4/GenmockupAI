# AI pipeline

Pure, framework-agnostic computer-vision logic. The FastAPI backend imports
this package; nothing here depends on FastAPI so the pipeline is unit-testable
and reusable.

## Modules

| Module             | Responsibility                                                        |
|--------------------|-----------------------------------------------------------------------|
| `registry.py`      | Lazy, cached model loading (CLIP classifier, SAM2). Thread-safe.      |
| `classifier.py`    | Apparel category + front/back view via zero-shot CLIP.                |
| `segmentation.py`  | Garment mask via SAM2, with GrabCut fallback.                         |
| `print_area.py`    | Printable quad detection (heuristics per category + mask geometry).   |
| `mockup.py`        | Perspective warp + texture/shadow preservation + compositing.         |
| `types.py`         | Shared dataclasses (Category, View, results).                         |

## Model weights

SAM2 weights are **not** committed. Download into `ai/weights/`:

```bash
# SAM2.1 small (recommended balance of speed/quality)
curl -L -o ai/weights/sam2.1_hiera_small.pt \
  https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt
```

Install SAM2 itself (separate from this repo's deps):

```bash
pip install "git+https://github.com/facebookresearch/sam2.git"
```

If weights/torch are missing the pipeline logs a warning and uses the
classical fallback so the whole app still runs in development.

## Design philosophy

- **Graceful degradation** — every AI stage has a deterministic CV fallback.
- **No global state** — models are cached in a registry, not module globals.
- **Float32 + alpha** — compositing is done in linear-ish float space with a
  feathered mask to avoid hard seams.
