from fastapi.testclient import TestClient

from app import __version__
from app.core.config import Settings
from app.main import create_app


def make_client(**overrides: object) -> TestClient:
    settings = Settings(_env_file=None, **overrides)  # ignore any local .env
    return TestClient(create_app(settings))


def test_health_reports_ok() -> None:
    response = make_client().get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sat2soil-api",
        "version": __version__,
        "environment": "development",
        "database": "not_configured",
    }


def test_cors_allows_configured_origin() -> None:
    client = make_client(cors_origins="https://sat2soil.example")
    response = client.get("/health", headers={"Origin": "https://sat2soil.example"})

    assert response.headers["access-control-allow-origin"] == "https://sat2soil.example"


def test_cors_ignores_unknown_origin() -> None:
    client = make_client(cors_origins="https://sat2soil.example")
    response = client.get("/health", headers={"Origin": "https://evil.example"})

    assert "access-control-allow-origin" not in response.headers
