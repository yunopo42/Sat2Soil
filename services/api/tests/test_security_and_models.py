from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import DemoSession, decode_token, encode_token
from app.models.fields import FieldCreate, GeoJSONPolygon

SETTINGS = Settings(_env_file=None, demo_session_secret="test-secret-test-secret-test-secret")


def square(*ring: tuple[float, float]) -> dict:
    return {"type": "Polygon", "coordinates": [list(ring)]}


# --- tokens --------------------------------------------------------------------------------


def test_token_round_trip() -> None:
    session = DemoSession(workspace_id=uuid4(), expires_at=datetime.now(UTC) + timedelta(hours=1))
    decoded = decode_token(encode_token(session, SETTINGS), SETTINGS)

    assert decoded.workspace_id == session.workspace_id


def test_expired_token_is_rejected() -> None:
    session = DemoSession(workspace_id=uuid4(), expires_at=datetime.now(UTC) - timedelta(seconds=5))
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(encode_token(session, SETTINGS), SETTINGS)


def test_token_signed_with_another_secret_is_rejected() -> None:
    other = Settings(_env_file=None, demo_session_secret="another-secret-another-secret-xx")
    session = DemoSession(workspace_id=uuid4(), expires_at=datetime.now(UTC) + timedelta(hours=1))
    with pytest.raises(jwt.InvalidSignatureError):
        decode_token(encode_token(session, other), SETTINGS)


# --- polygons ------------------------------------------------------------------------------


def test_open_ring_is_closed_and_rounded() -> None:
    polygon = GeoJSONPolygon.model_validate(
        square((32.800000001, 37.6), (32.81, 37.6), (32.81, 37.61))
    )
    ring = polygon.coordinates[0]
    assert ring[0] == ring[-1] == (32.8, 37.6)
    assert len(ring) == 4


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (square((32.8, 37.6), (32.81, 37.6)), "at least 3 corners"),
        (square((32.8, 95.0), (32.81, 37.6), (32.81, 37.61)), "longitude, latitude"),
        (
            {
                "type": "Polygon",
                "coordinates": [
                    [[0, 0], [1, 0], [1, 1], [0, 0]],
                    [[0, 0], [0.1, 0], [0.1, 0.1], [0, 0]],
                ],
            },
            "without holes",
        ),
        (square(*[(32.8 + i * 1e-4, 37.6 + (i % 2) * 1e-4) for i in range(600)]), "at most"),
    ],
)
def test_invalid_polygons_explain_the_problem(payload: dict, message: str) -> None:
    with pytest.raises(ValidationError, match=message):
        GeoJSONPolygon.model_validate(payload)


def test_season_years_must_be_unique() -> None:
    with pytest.raises(ValidationError, match="once"):
        FieldCreate.model_validate(
            {
                "name": "Test",
                "boundary": square((32.8, 37.6), (32.81, 37.6), (32.81, 37.61)),
                "rotation_history": [
                    {"season_year": 2024, "crop": "wheat"},
                    {"season_year": 2024, "crop": "barley"},
                ],
            }
        )
