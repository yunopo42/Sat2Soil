"""Q13 (docs/QA_DEPLOY_DEMO.md): when the API cannot be reached the user sees a clear message and
a retry, never an empty white screen. The landing page does not depend on the API at all."""

from __future__ import annotations

import re

from playwright.sync_api import Page, expect

from conftest import API_URL, BASE_URL


def block_api(page: Page) -> None:
    page.route(re.compile(f"^{re.escape(API_URL)}/.*"), lambda route: route.abort("internetdisconnected"))


def test_field_page_explains_an_unreachable_api(page: Page, sample_field_id: str):
    block_api(page)
    page.goto(f"{BASE_URL}/fields/{sample_field_id}")
    expect(page.get_by_text("The Sat2Soil service is not reachable")).to_be_visible()
    expect(page.get_by_text("It may be waking up. Try again in a few seconds.")).to_be_visible()


def test_landing_works_without_the_api(page: Page):
    block_api(page)
    page.goto(f"{BASE_URL}/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("From Satellite to Soil")
    expect(page.get_by_role("link", name=re.compile("Start demo")).first).to_be_visible()
