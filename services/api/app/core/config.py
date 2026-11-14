from functools import lru_cache
from typing import Annotated, Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration from environment variables (see .env.example)."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True
    )

    environment: Literal["development", "preview", "production"] = "development"
    # Exact origins only (docs/ARCHITECTURE.md: CORS allowlist). Comma-separated in the env var.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    nasa_power_base_url: str = "https://power.larc.nasa.gov/api"
    nasa_power_timeout_s: float = 20.0
    # Daily data changes at most once a day; 6 h keeps NASA load low (docs/ARCHITECTURE.md).
    nasa_power_cache_ttl_s: int = 6 * 3600
    # Longest period one request may cover (≈ 3 years).
    nasa_power_max_days: int = 1100

    # Phase 3: Supabase and demo session. Secrets stay server-side (D-008).
    database_url: SecretStr | None = None
    supabase_url: str | None = None
    supabase_service_role_key: SecretStr | None = None
    demo_session_secret: SecretStr | None = None
    # A visitor's workspace (and the fields drawn in it) lives this long, then is purged.
    demo_session_ttl_hours: int = 7 * 24
    # Per-IP limits (slowapi). Off only in unit tests.
    rate_limit_enabled: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def _reject_wildcards(cls, origins: list[str]) -> list[str]:
        if any("*" in origin for origin in origins):
            raise ValueError("CORS_ORIGINS must list exact origins; wildcards are not allowed")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
