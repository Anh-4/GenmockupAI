"""Desktop launcher: starts the FastAPI server (serving the bundled UI) and
opens the default browser. This is the PyInstaller entry point.

Layout when frozen (one-file exe):
  - bundled read-only data lives under sys._MEIPASS (frontend, ai, app code)
  - writable storage lives next to the .exe (so generated mockups persist)
"""
from __future__ import annotations

import os
import socket
import sys
import threading
import webbrowser
from pathlib import Path


def _resource_dir() -> Path:
    """Directory holding bundled read-only resources."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    # Dev: repo root (this file is in desktop/).
    return Path(__file__).resolve().parents[1]


def _exe_dir() -> Path:
    """Directory next to the running exe (writable)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def _free_port(preferred: int = 8000) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", preferred))
            return preferred
        except OSError:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]


def main() -> None:
    res = _resource_dir()
    port = _free_port(int(os.environ.get("PORT", "8000")))

    # Configure the backend BEFORE importing it (settings are cached on import).
    os.environ.setdefault("FRONTEND_DIR", str(res / "frontend_out"))
    os.environ.setdefault("STORAGE_DIR", str(_exe_dir() / "storage"))
    os.environ.setdefault("CORS_ORIGINS", f"http://127.0.0.1:{port}")

    # Make the bundled `app` and `ai` packages importable in dev too.
    if str(res) not in sys.path:
        sys.path.insert(0, str(res))
        sys.path.insert(0, str(res / "backend"))

    import uvicorn

    # Import the app object directly (not as a string) so PyInstaller's static
    # analysis bundles app.main and its whole dependency tree, including `ai`.
    from app.main import app as fastapi_app

    url = f"http://127.0.0.1:{port}"
    print(f"AI Mockup Generator running at {url}  (close this window to quit)")
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    uvicorn.run(fastapi_app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
