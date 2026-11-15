"""The jury flow end to end (docs/QA_DEPLOY_DEMO.md "Tek akışlı sunum"):
landing → sample field → NASA data → water → rotation → twin → AgriSpray → summary.
Also checks the honesty rules that must never regress (CLAUDE.md §2)."""

from __future__ import annotations

import re

from playwright.sync_api import Page, expect

from conftest import BASE_URL


def test_landing_has_title_and_cta_on_first_screen(page: Page):
    page.goto(f"{BASE_URL}/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("From Satellite to Soil")
    cta = page.get_by_role("link", name=re.compile("Start demo")).first
    expect(cta).to_be_visible()
    expect(page.get_by_text("Concept animation (AI-generated)")).to_be_visible()
    # No NASA insignia: the brand is written as text only (CLAUDE.md rule 6).
    assert page.locator("img[src*='nasa' i][src*='logo' i], img[alt*='NASA logo' i]").count() == 0


def test_demo_page_opens_the_sample_field(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/demo")
    page.get_by_role("button", name=re.compile("Try the sample field")).click()
    page.wait_for_url(f"**/fields/{sample_field_id}")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Field")


def test_nasa_data_center_shows_power_and_planned_sources(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/climate")
    expect(page.get_by_text("Live", exact=True).first).to_be_visible()
    # Sources that are not connected must say so, never look live (CLAUDE.md rule 2).
    expect(page.get_by_text("Planned", exact=True).first).to_be_visible()
    # PRECTOTCORR is never presented as GPM/IMERG.
    expect(page.get_by_text("PRECTOTCORR").first).to_be_visible()


def test_water_balance_is_an_indicator_not_a_prescription(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/planning/water")
    expect(page.get_by_text(re.compile(r"rainfall covered about \d+% of the estimated water demand"))).to_be_visible()
    expect(page.get_by_text("This is not an irrigation prescription.")).to_be_visible()
    body = page.locator("main").inner_text()
    assert not re.search(r"\d\s*(litre|liter|m³/ha)", body, re.I), "no litre or m³/ha prescriptions"


def test_rotation_can_be_edited_and_rescored(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/planning/rotation")
    expect(page.get_by_text("Why this alternative?")).to_be_visible()
    before = page.get_by_text("Total over 3 years").nth(1).locator("..").inner_text()
    page.get_by_label("Crop in 2027").nth(1).select_option("sugar_beet")
    expect(page.get_by_role("button", name="Reset plans")).to_be_visible()
    expect(page.get_by_text("Total over 3 years").nth(1).locator("..")).not_to_have_text(before)
    expect(page.get_by_text(re.compile("not a yield estimate"))).to_be_visible()


def test_twin_separates_observed_and_scenario(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/twin")
    expect(page.get_by_text(re.compile(r"In a normal season, Scenario B"))).to_be_visible()
    page.get_by_role("radio", name="Dry (P10)").click()
    expect(page.get_by_text(re.compile(r"In a dry season, Scenario B"))).to_be_visible()
    expect(page.get_by_text("Field-average estimate. No within-field variation is modelled.")).to_be_visible()
    expect(page.get_by_text("Scenario estimate").first).to_be_visible()


def test_agrispray_is_always_labelled_simulated(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/spray")
    expect(page.get_by_text("Concept device · Simulated data. No physical device is connected.")).to_be_visible()
    page.get_by_role("button", name="Run example analysis").click()
    expect(page.get_by_text(re.compile(r"stains generated → \d+ regions detected"))).to_be_visible()
    body = page.locator("main").inner_text()
    assert not re.search(r"efficacy\s*[:=]?\s*%?\d|\d+\s*%\s*efficacy", body, re.I), "no efficacy percentage"
    assert not re.search(r"\bReal[- ]time\b", body), "the concept device is never shown as live"


def test_summary_lists_every_source_and_starts_the_demo_flow(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/fields/{sample_field_id}/summary")
    table = page.get_by_role("table").last
    expect(page.get_by_text("Methods and sources")).to_be_visible()
    for value in ["Rain, temperature", "Satellite basemap", "Rotation scores", "Dry / normal / wet", "AgriSpray readings", "Field boundary"]:
        expect(table).to_contain_text(value)
    page.get_by_role("button", name="Show demo flow").click()
    page.wait_for_url(f"**/fields/{sample_field_id}")
    pill = page.get_by_role("navigation", name="Demo flow")
    expect(pill).to_contain_text("Step 1 of 7")
    pill.get_by_role("link", name="Next step").click()
    page.wait_for_url("**/climate")
    expect(pill).to_contain_text("Step 2 of 7")
    pill.get_by_role("button", name="End demo flow").click()
    expect(pill).to_have_count(0)


def test_turkish_locale_works(page: Page, sample_field_id: str):
    page.goto(f"{BASE_URL}/tr/fields/{sample_field_id}/spray")
    expect(page.get_by_text("Konsept cihaz · Simüle veri. Bağlı fiziksel cihaz yok.")).to_be_visible()
