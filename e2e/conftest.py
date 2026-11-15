"""End-to-end tests (apps/web/task.md W06.1–W06.2, docs/QA_DEPLOY_DEMO.md Q10/Q12).

They drive a real browser against a running web app and API:

    pnpm dev            # web on :3000
    pnpm api:dev        # API on :8000
    pnpm e2e            # this suite (Python Playwright + pytest, via uv)

Environment overrides:
    SAT2SOIL_E2E_BASE_URL   default http://localhost:3000 (set to the Vercel URL for a prod smoke test)
    SAT2SOIL_E2E_API_URL    default http://localhost:8000 (set to the Render URL)
    SAT2SOIL_E2E_CHANNEL    default msedge (an installed browser: msedge or chrome; no download needed)
"""

from __future__ import annotations

import json
import os
import pathlib
import urllib.request

import pytest
from playwright.sync_api import Browser, Page, sync_playwright

BASE_URL = os.environ.get("SAT2SOIL_E2E_BASE_URL", "http://localhost:3000").rstrip("/")
API_URL = os.environ.get("SAT2SOIL_E2E_API_URL", "http://localhost:8000").rstrip("/")
CHANNEL = os.environ.get("SAT2SOIL_E2E_CHANNEL", "msedge")
ROOT = pathlib.Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def sample_field_id() -> str:
    with urllib.request.urlopen(f"{API_URL}/v1/demo/fields", timeout=60) as response:
        fields = json.load(response)
    assert fields, "the API returned no sample field (run pnpm db:migrate --seed)"
    return fields[0]["id"]


@pytest.fixture(scope="session")
def browser() -> Browser:
    with sync_playwright() as p:
        instance = p.chromium.launch(channel=CHANNEL, headless=os.environ.get("HEADED") != "1")
        yield instance
        instance.close()


@pytest.fixture()
def page(browser: Browser) -> Page:
    context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-US")
    context.set_default_timeout(45_000)  # first API calls can wake a cold Render instance
    p = context.new_page()
    errors: list[str] = []
    p.on("pageerror", lambda error: errors.append(str(error)))
    yield p
    context.close()
    assert not errors, f"uncaught page errors: {errors}"


@pytest.fixture(scope="session")
def axe_source() -> str:
    """axe-core is already in the pnpm store (a transitive dependency); use it directly."""
    candidates = sorted((ROOT / "node_modules" / ".pnpm").glob("axe-core@*/node_modules/axe-core/axe.min.js"))
    assert candidates, "axe-core not found in node_modules; run pnpm install"
    return candidates[-1].read_text(encoding="utf-8")
