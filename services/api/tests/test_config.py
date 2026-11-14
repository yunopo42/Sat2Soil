import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_cors_origins_are_split_from_a_comma_separated_string() -> None:
    settings = Settings(_env_file=None, cors_origins="http://localhost:3000, https://a.example ,")

    assert settings.cors_origins == ["http://localhost:3000", "https://a.example"]


def test_cors_wildcard_is_rejected() -> None:
    with pytest.raises(ValidationError, match="wildcards are not allowed"):
        Settings(_env_file=None, cors_origins="*")


def test_secrets_are_not_printed() -> None:
    settings = Settings(_env_file=None, demo_session_secret="do-not-print-me")

    assert "do-not-print-me" not in repr(settings)
