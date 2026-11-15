"""Export a deck to an editable PowerPoint.

Each slide = a background picture (the slide with its text hidden: cards, images, badges, icons)
plus one editable text box per text block, placed where the browser laid it out. Fonts are swapped
to ones every Windows/Office machine has (Segoe UI, Consolas) *before* layout, so the boxes match
what PowerPoint will draw.

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
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

SANS, MONO = "Segoe UI", "Consolas"
SLIDE_W_PX = 1920
EMU_PER_PX = 12192000 / SLIDE_W_PX  # 13.333 in wide

PREPARE = """([sans, mono]) => {
  // 1. Fonts PowerPoint will have; weights PowerPoint can draw (regular / bold).
  const els = [...document.querySelectorAll('.slide, .slide *')];
  const before = els.map(el => { const cs = getComputedStyle(el); return [/mono/i.test(cs.fontFamily), parseInt(cs.fontWeight)]; });
  els.forEach((el, i) => {
    el.style.fontFamily = before[i][0] ? `"${mono}"` : `"${sans}"`;
    el.style.fontWeight = before[i][1] >= 600 ? '700' : '400';
  });
  // 2. Wrap every text node so it can be measured and hidden without touching pseudo-elements.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!n.parentElement.closest('.slide')) continue;
    const s = document.createElement('span');
    s.className = '__t';
    n.replaceWith(s);
    s.appendChild(n);
  }
}"""

EXTRACT = """(slide) => {
  const sr = slide.getBoundingClientRect();
  const hex = c => { const m = c.match(/\\d+(\\.\\d+)?/g).map(Number); return m.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); };
  const isInline = el => getComputedStyle(el).display === 'inline';
  const lang = document.documentElement.lang || 'en';
  const blocks = new Map();
  for (const span of slide.querySelectorAll('span.__t')) {
    // the box this text belongs to: nearest non-inline ancestor, or the flex/grid item it sits in
    let el = span.parentElement, child = span;
    while (isInline(el)) { child = el; el = el.parentElement; }
    const d = getComputedStyle(el).display;
    const key = /flex|grid/.test(d) && child !== span ? child : (/flex|grid/.test(d) ? span : el);
    if (!blocks.has(key)) blocks.set(key, { owner: el, spans: [] });
    blocks.get(key).spans.push(span);
  }
  const out = [];
  for (const [key, b] of blocks) {
    const ocs = getComputedStyle(b.owner);
    // paragraphs: split at <br> between spans
    const paras = [[]];
    let prev = null;
    for (const s of b.spans) {
      if (prev) {
        const r = document.createRange(); r.setStartAfter(prev); r.setEndBefore(s);
        if (r.cloneContents().querySelector('br')) paras.push([]);
        else if (/\\s/.test(r.toString())) {
          const cur = paras[paras.length - 1];
          if (cur.length && !/\\s$/.test(cur[cur.length - 1].t) && !/^\\s/.test(s.textContent)) cur[cur.length - 1].t += ' ';
        }
      }
      const cs = getComputedStyle(s);
      let t = s.textContent.replace(/\\s+/g, ' ');
      if (cs.textTransform === 'uppercase') t = t.toLocaleUpperCase(lang);
      const va = (() => { let e = s; while (e && e !== b.owner) { const v = getComputedStyle(e).verticalAlign; if (v === 'sub' || v === 'super') return v; e = e.parentElement; } return 'baseline'; })();
      paras[paras.length - 1].push({
        t, size: parseFloat(cs.fontSize), bold: parseInt(cs.fontWeight) >= 600, italic: cs.fontStyle === 'italic',
        color: hex(cs.color), mono: /consolas/i.test(cs.fontFamily), ls: parseFloat(cs.letterSpacing) || 0, va,
      });
      prev = s;
    }
    for (const p of paras) { if (p.length) { p[0].t = p[0].t.replace(/^ /, ''); p[p.length - 1].t = p[p.length - 1].t.replace(/ $/, ''); } }
    // geometry: union of the text's line boxes; wrap width = the owner's content box
    const rects = b.spans.flatMap(s => [...s.getClientRects()]).filter(r => r.width && r.height);
    if (!rects.length) continue;
    const u = { l: Math.min(...rects.map(r => r.left)), t: Math.min(...rects.map(r => r.top)),
                r: Math.max(...rects.map(r => r.right)), b: Math.max(...rects.map(r => r.bottom)) };
    const lineTops = new Set(rects.map(r => Math.round(r.top / 4)));
    const ob = (key instanceof Element && key !== b.owner ? key : b.owner).getBoundingClientRect();
    const pl = parseFloat(ocs.paddingLeft), pr = parseFloat(ocs.paddingRight);
    const contentL = key === b.owner ? ob.left + pl : ob.left, contentR = key === b.owner ? ob.right - pr : ob.right;
    const fs = parseFloat(ocs.fontSize);
    const lh = ocs.lineHeight === 'normal' ? fs * 1.3 : parseFloat(ocs.lineHeight);
    out.push({
      x: u.l - sr.left, y: u.t - sr.top, w: u.r - u.l, h: u.b - u.t,
      cl: contentL - sr.left, cw: contentR - contentL,
      multi: lineTops.size > paras.filter(p => p.length).length,
      align: ocs.textAlign, lh, paras: paras.filter(p => p.length),
    });
  }
  return out;
}"""


def px(v: float) -> Emu:
    return Emu(round(v * EMU_PER_PX))


def add_block(slide, b: dict) -> None:
    slack = 0.04 * b["w"] + 8
    if b["multi"]:
        x, w = b["cl"], max(b["cw"], b["w"]) + 6
    elif b["align"] == "center":
        x, w = b["x"] - slack / 2, b["w"] + slack
    elif b["align"] in ("right", "end"):
        x, w = b["x"] - slack, b["w"] + slack
    else:
        x, w = b["x"], b["w"] + slack
    tb = slide.shapes.add_textbox(px(x), px(b["y"]), px(w), px(b["h"]))
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = b["multi"]
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = MSO_ANCHOR.TOP
    align = {
        "center": PP_ALIGN.CENTER,
        "right": PP_ALIGN.RIGHT,
        "end": PP_ALIGN.RIGHT,
    }.get(b["align"], PP_ALIGN.LEFT)
    for i, runs in enumerate(b["paras"]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = Pt(b["lh"] * 0.5)
        p.space_before = p.space_after = Pt(0)
        for r in runs:
            if not r["t"]:
                continue
            run = p.add_run()
            run.text = r["t"]
            f = run.font
            f.name = MONO if r["mono"] else SANS
            f.size = Pt(round(r["size"] * 0.5 * 2) / 2)
            f.bold, f.italic = r["bold"], r["italic"]
            f.color.rgb = RGBColor.from_string(r["color"].upper())
            rpr = run._r.get_or_add_rPr()
            if r["ls"]:
                rpr.set("spc", str(round(r["ls"] * 0.5 * 100)))
            if r["va"] != "baseline":
                rpr.set("baseline", "-25000" if r["va"] == "sub" else "30000")
            for tag in ("a:latin", "a:cs"):
                el = rpr.find(qn(tag))
                if el is not None:
                    el.set("typeface", f.name)


here = pathlib.Path(__file__).resolve().parent
deck = here / sys.argv[1]
out = deck.with_suffix(".pptx")

with sync_playwright() as pw:
    ctx = pw.chromium.launch_persistent_context(
        tempfile.mkdtemp(),
        channel="msedge",
        headless=True,
        viewport={"width": 1920, "height": 1080},
        device_scale_factor=2,
    )
    page = ctx.new_page()
    page.goto(deck.as_uri(), wait_until="networkidle")
    page.evaluate(PREPARE, [SANS, MONO])
    page.wait_for_timeout(500)
    slides = page.locator(".slide").all()
    layouts = [s.evaluate(EXTRACT) for s in slides]
    page.add_style_tag(content="span.__t { color: transparent !important; }")
    page.wait_for_timeout(300)
    backgrounds = []
    for s in slides:
        buf = io.BytesIO()
        Image.open(io.BytesIO(s.screenshot())).convert("RGB").save(
            buf, "JPEG", quality=90
        )
        backgrounds.append(buf.getvalue())
    ctx.close()

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)
for bg, blocks in zip(backgrounds, layouts, strict=True):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    pic = slide.shapes.add_picture(
        io.BytesIO(bg), 0, 0, prs.slide_width, prs.slide_height
    )
    pic.name = "Background"
    pic._element.nvPicPr.cNvPr.set("descr", "Slide background: cards, images and icons")
    for b in blocks:
        add_block(slide, b)
prs.core_properties.title = deck.stem
prs.core_properties.author = "Hermes Five"
prs.save(out)
print("ok", out.name, len(layouts), "slides,", sum(map(len, layouts)), "text boxes")
