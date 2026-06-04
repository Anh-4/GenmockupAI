"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import get_settings

logging.basicConfig(level=logging.INFO)
settings = get_settings()

_serving_ui = settings.frontend_dir is not None and settings.frontend_dir.exists()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.outputs_dir.mkdir(parents=True, exist_ok=True)
    # Serve generated mockups read-only for download URLs.
    app.mount("/assets", StaticFiles(directory=settings.outputs_dir), name="assets")
    # When bundled as a desktop app, also serve the exported UI at "/".
    # Mounted LAST so API routes (POST /classify, /assets, /docs) win.
    if _serving_ui:
        app.mount(
            "/",
            StaticFiles(directory=settings.frontend_dir, html=True),
            name="ui",
        )
        logging.getLogger("uvicorn").info("Serving UI from %s", settings.frontend_dir)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Classify, segment and apply designs to product photos.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "app": settings.app_name}


if not _serving_ui:

    @app.get("/", tags=["meta"])
    def root() -> dict:
        return {"name": settings.app_name, "docs": "/docs"}
