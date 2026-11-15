"""axe-core accessibility scan of every page (apps/web/task.md W06.2: no critical issues).

Fails on `critical` and `serious` violations (WCAG 2.1 A/AA rules). Lower-impact findings are
printed so they can be tracked without blocking.
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page

from conftest import BASE_URL

PAGES = [
    ("landing", "/", None),
    ("demo", "/demo", None),
    ("overview", "/fields/{id}", "Field details"),
    ("climate", "/fields/{id}/climate", "About this data"),
    ("water", "/fields/{id}/planning/water", "Assumptions"),
    ("rotation", "/fields/{id}/planning/rotation", "Why this alternative?"),
    ("twin", "/fields/{id}/twin", "Scenario comparison"),
    ("spray", "/fields/{id}/spray", "Device readings"),
    ("summary", "/fields/{id}/summary", "Methods and sources"),
    ("landing-tr", "/tr", None),
]
BLOCKING = {"critical", "serious"}


@pytest.mark.parametrize(("name", "path", "ready"), PAGES, ids=[p[0] for p in PAGES])
def test_no_serious_accessibility_violations(page: Page, axe_source: str, sample_field_id: str, name, path, ready):
    page.goto(f"{BASE_URL}{path.format(id=sample_field_id)}")
    if ready:
        page.get_by_text(ready).first.wait_for()
    page.wait_for_timeout(800)  # let entrance animations settle (colour contrast is measured on final styles)
    page.add_script_tag(content=axe_source)
    result = page.evaluate(
        """async () => await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
            resultTypes: ['violations'],
        })"""
    )
    report = [
        f"[{v['impact']}] {v['id']}: {v['help']} ({len(v['nodes'])}×) e.g. {v['nodes'][0]['target']}"
        for v in result["violations"]
    ]
    for line in report:
        print(name, line)
    blocking = [v for v in result["violations"] if v["impact"] in BLOCKING]
    assert not blocking, "\n".join(r for r in report if r.split("]")[0][1:] in BLOCKING)
