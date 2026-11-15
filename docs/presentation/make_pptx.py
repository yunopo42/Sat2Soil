"""Export a deck to PowerPoint: one full-bleed 2× image per slide, slide text as alt text.

uv run --no-project --with playwright==1.55.0 --with python-pptx --with pillow \
    python docs/presentation/make_pptx.py sat2soil-demo-en.html
"""

import io
import pathlib
import sys
import tempfile

from PIL import Image
from playwright.sync_api import sync_playwright
from pptx import Presentation
from pptx.util import Emu, Inches

here = pathlib.Path(__file__).resolve().parent
deck = here / sys.argv[1]
out = deck.with_suffix(".pptx")

shots: list[tuple[bytes, str]] = []
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        tempfile.mkdtemp(),
        channel="msedge",
        headless=True,
        viewport={"width": 1920, "height": 1080},
        device_scale_factor=2,
    )
    page = ctx.new_page()
    page.goto(deck.as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(800)
    for slide in page.locator(".slide").all():
        png = slide.screenshot()
        buf = io.BytesIO()
        Image.open(io.BytesIO(png)).convert("RGB").save(buf, "JPEG", quality=90)
        text = " ".join(slide.inner_text().split())
        shots.append((buf.getvalue(), text))
    ctx.close()

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
blank = prs.slide_layouts[6]
for data, text in shots:
    s = prs.slides.add_slide(blank)
    pic = s.shapes.add_picture(
        io.BytesIO(data), 0, 0, Emu(prs.slide_width), Emu(prs.slide_height)
    )
    pic.name = "Slide image"
    pic._element.nvPicPr.cNvPr.set("descr", text)
prs.core_properties.title = deck.stem
prs.core_properties.author = "Hermes Five"
prs.save(out)
print("ok", out.name, len(shots), "slides")
