"""Frozen slides -> vector PDF via WeasyPrint (no headless browser).

Reads the JSON produced by the freeze extractor (a list of {html, scene}) and
paints each slide onto a fixed 1280x720 (px @96dpi = 13.33x7.5in) page. Because
the frozen HTML is fully absolutely positioned there is no nested-flex layout for
WeasyPrint to mis-resolve, so the output matches the browser render while staying
vectorial and text-selectable.
"""
from __future__ import annotations

import json
import sys
from typing import Any

from weasyprint import HTML

try:
    from .fonts import embed_font_faces
except ImportError:  # run as a plain script
    from fonts import embed_font_faces

SLIDE_W = 1280
SLIDE_H = 720

# 1 CSS px @96dpi -> WeasyPrint page in inches (13.333in x 7.5in = 16:9).
PAGE_CSS = f"""
@page {{ size: {SLIDE_W / 96:.4f}in {SLIDE_H / 96:.4f}in; margin: 0; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {SLIDE_W}px; height: {SLIDE_H}px; }}
.frozen-slide {{ page-break-after: always; }}
.frozen-slide:last-child {{ page-break-after: auto; }}
"""


def _used_families(slides: list[dict[str, Any]]) -> set[str]:
    fams: set[str] = set()
    for s in slides:
        for b in s["scene"]["blocks"]:
            if b.get("type") == "text" and b.get("fontFamily"):
                fams.add(b["fontFamily"])
    return fams


def build_pdf(slides: list[dict[str, Any]], out_path: str, embed_fonts: bool = True) -> None:
    body = "".join(s["html"] for s in slides)
    font_css = embed_font_faces(_used_families(slides)) if embed_fonts else ""
    doc = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<style>{font_css}</style><style>{PAGE_CSS}</style></head><body>{body}</body></html>"
    )
    HTML(string=doc, base_url=".").write_pdf(out_path)


def main() -> None:
    frozen_path = sys.argv[1]
    out_path = sys.argv[2]
    with open(frozen_path, encoding="utf-8") as fh:
        slides = json.load(fh)
    build_pdf(slides, out_path)
    print(f"pdf: {len(slides)} slides -> {out_path}")


if __name__ == "__main__":
    main()
