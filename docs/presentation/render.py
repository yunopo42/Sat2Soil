"""Render a deck to PDF (and optional PNG previews) with the installed Edge.

uv run --no-project --with playwright==1.55.0 python docs/presentation/render.py sat2soil-demo-en.html [png_dir]
"""

import pathlib
import sys
import tempfile

from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent
deck = here / sys.argv[1]
png_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        tempfile.mkdtemp(),
        channel="msedge",
        headless=True,
        viewport={"width": 1920, "height": 1080},
    )
    page = ctx.new_page()
    page.goto(deck.as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(800)
    overflow = page.evaluate(
        """[...document.querySelectorAll('.slide')].map((s, i) => {
            const r = s.getBoundingClientRect();
            const bad = [...s.querySelectorAll('*')].filter(e => {
              const b = e.getBoundingClientRect();
              return b.width && (b.bottom > r.bottom + 1 || b.right > r.right + 1);
            }).length;
            return bad ? `slide ${i + 1}: ${bad} element(s) overflow` : null;
          }).filter(Boolean)"""
    )
    for line in overflow:
        print("WARN", line)
    if png_dir:
        png_dir.mkdir(parents=True, exist_ok=True)
        for i, slide in enumerate(page.locator(".slide").all(), 1):
            slide.screenshot(path=str(png_dir / f"{deck.stem}-{i:02d}.png"))
    page.emulate_media(media="print")
    page.pdf(
        path=str(deck.with_suffix(".pdf")),
        width="1920px",
        height="1080px",
        print_background=True,
    )
    ctx.close()
print("ok", deck.with_suffix(".pdf").name)
