# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the AI Mockup Generator desktop app.

Build (from repo root, after `npm run build:static` in frontend/):
    pyinstaller desktop/app.spec --noconfirm

Produces: dist/AIMockupGenerator/AIMockupGenerator.exe  (one-folder, faster start)
Switch EXE(... ) to onefile by moving binaries/datas into the EXE() call if you
prefer a single file (slower cold start, larger temp extraction).
"""
import os
from PyInstaller.utils.hooks import collect_submodules

ROOT = os.path.abspath(os.path.join(os.getcwd()))
BACKEND = os.path.join(ROOT, "backend")

# Bundle the exported Next.js UI under "frontend_out" (launcher points here).
datas = [
    (os.path.join(ROOT, "frontend", "out"), "frontend_out"),
]

# FastAPI/uvicorn/anyio pull a few things in via dynamic import.
hiddenimports = (
    collect_submodules("uvicorn")
    + collect_submodules("anyio")
    + ["app.main", "ai"]
)

a = Analysis(
    ["launcher.py"],
    pathex=[ROOT, BACKEND],            # so `app` and `ai` resolve
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    # Trim the heavy optional AI stack from the default (lightweight) build.
    # Remove these from `excludes` to ship the full torch/SAM2 pipeline.
    excludes=["torch", "torchvision", "transformers", "sam2"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="AIMockupGenerator",
    console=True,           # keep a console so users see the local URL / logs
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    name="AIMockupGenerator",
)
