"""Application settings (12-factor, env-driven)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Mockup Generator"
    debug: bool = False

    # CORS — comma-separated origins.
    cors_origins: str = "http://localhost:3000"

    # Storage roots (created on startup).
    storage_dir: Path = Path("../storage")

    # When set, the backend also serves the exported Next.js UI from this dir
    # (used by the packaged desktop .exe). Empty in normal API-only dev.
    frontend_dir: Path | None = None

    # Upload guards.
    max_upload_mb: int = 15
    allowed_content_types: str = "image/png,image/jpeg,image/webp"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_types(self) -> set[str]:
        return {t.strip() for t in self.allowed_content_types.split(",")}

    @property
    def uploads_dir(self) -> Path:
        return self.storage_dir / "uploads"

    @property
    def outputs_dir(self) -> Path:
        return self.storage_dir / "outputs"


@lru_cache
def get_settings() -> Settings:
    return Settings()
