# AI Mockup Generator

Production-ready application that applies an uploaded design onto a product
photo and renders a realistic mockup. It auto-classifies the apparel type,
detects the view (front/back), segments the garment with **SAM2**, finds the
printable area, then warps the design with an OpenCV perspective transform
while preserving the garment's texture and shadows.

## Architecture

```
.
├── frontend/   Next.js 15 + TypeScript + TailwindCSS + Shadcn UI
├── backend/    FastAPI + Python 3.12 (REST API, clean architecture)
├── ai/         AI pipeline (classification, SAM2, print-area, warp)
└── storage/    Uploaded assets + generated mockups (gitignored)
```

### Request flow

```
 product.jpg ─┐
              ├─► POST /classify        → {category, view, confidence}
              ├─► POST /segment         → garment mask (SAM2)
              ├─► POST /detect-print-area → printable quad (4 corners)
 design.png ──┴─► POST /generate-mockup → realistic mockup PNG
```

## Quick start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # win: .venv\Scripts\activate
pip install -r requirements.txt
# Download SAM2 weights (see ai/README.md), then:
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

### Docker

```bash
docker compose up --build
```

### Desktop .exe

Package everything (backend + AI + UI) into one Windows executable:

```powershell
powershell -ExecutionPolicy Bypass -File desktop\build.ps1
# → dist\AIMockupGenerator\AIMockupGenerator.exe
```

Requires Python 3.12 + Node on the build machine. See
[desktop/README.md](desktop/README.md) for the lightweight vs. full-AI options.

## AI models

The pipeline degrades gracefully: if SAM2 weights or a torch GPU are absent it
falls back to a classical GrabCut + saliency segmentation so the API still
runs end-to-end in dev. See [ai/README.md](ai/README.md) for weight downloads
and the model registry.

## API

| Method | Path                  | Body (multipart)            | Returns                       |
|--------|-----------------------|-----------------------------|-------------------------------|
| POST   | `/classify`           | `image`                     | category, view, confidence    |
| POST   | `/segment`            | `image`                     | mask (PNG b64), bbox          |
| POST   | `/detect-print-area`  | `image`, `category?`        | quad corners, bbox            |
| POST   | `/generate-mockup`    | `product`, `design`, opts   | mockup PNG (b64) + asset id   |

Interactive docs at `http://localhost:8000/docs`.
