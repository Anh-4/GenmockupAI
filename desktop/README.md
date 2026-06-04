# Desktop build (.exe)

Packages the whole app — FastAPI backend, the AI pipeline, and the Next.js UI —
into a single Windows executable. Launching it starts a local server and opens
your browser at the app.

## How it works

```
AIMockupGenerator.exe
  ├─ launcher.py        starts uvicorn on a free port, opens the browser
  ├─ app/ + ai/         the FastAPI backend + CV pipeline (bundled)
  └─ frontend_out/      the statically-exported Next.js UI (served at "/")
```

The UI talks to the backend on the **same origin**, so there's no CORS or
separate Node process — one window, one process.

## Build it

Requires **Python 3.12** and **Node 18+** on the build machine.

```powershell
# from the repo root
powershell -ExecutionPolicy Bypass -File desktop\build.ps1
```

Result: `dist\AIMockupGenerator\AIMockupGenerator.exe`. Ship the whole
`dist\AIMockupGenerator\` folder (one-folder build = fast startup).

## Lightweight vs. full-AI build

By default `desktop/app.spec` **excludes** `torch`, `transformers` and `sam2`
to keep the exe ~150–250 MB. The app still runs end-to-end using the OpenCV
fallback (GrabCut segmentation + heuristic classification).

To ship the full SAM2 + CLIP pipeline:

1. Uncomment the AI stack in `backend/requirements.txt` and reinstall.
2. Remove `"torch", "torchvision", "transformers", "sam2"` from `excludes` in
   `desktop/app.spec`.
3. Place SAM2 weights in `ai/weights/` and add them to `datas` in the spec.

Expect a multi-GB executable and longer build/startup times.

## Notes

- Generated mockups are written to a `storage/` folder created **next to the
  exe**, so results persist between runs.
- The console window shows the local URL and server logs; closing it quits the
  app.
- Cross-platform: the same `app.spec` builds on macOS/Linux via
  `pyinstaller desktop/app.spec` (produces a native binary, not an .exe).
