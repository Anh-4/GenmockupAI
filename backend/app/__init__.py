"""Backend application package.

Ensure the sibling ``ai`` package (one directory above ``backend/``) is
importable when running ``uvicorn app.main:app`` from inside ``backend/``,
without requiring the caller to set PYTHONPATH manually. In Docker we set
PYTHONPATH=/app, so this is a no-op there.
"""
import sys
from pathlib import Path

# Skip when running inside a PyInstaller bundle (paths are handled by the
# launcher / bundle, and `ai` is packaged directly).
if not getattr(sys, "frozen", False):
    _project_root = Path(__file__).resolve().parents[2]
    if str(_project_root) not in sys.path:
        sys.path.insert(0, str(_project_root))
