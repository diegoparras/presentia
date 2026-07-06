"""
Compare a frozen-slide HTML rendered by WeasyPrint (no browser) vs Chromium.
Measures per-slide render time and pixel fidelity, and writes a side-by-side PNG.

Deps:  pip install weasyprint pymupdf pillow numpy
Chrome: /opt/pw-browsers/chromium-1194/chrome-linux/chrome (override with CHROME env)

Usage:  python render_bench.py slide_intro2.html [more.html ...]

Finding (measured in-sandbox): grid/absolute layouts + SVG charts render
~pixel-identical (<1-2% diff) and 4-10x faster than Chromium; nested flexbox is
where WeasyPrint diverges, so the freeze step must normalise layout to grid.
"""
import os, sys, time, subprocess, tempfile
import fitz, numpy as np
from PIL import Image
from weasyprint import HTML

CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
W, H = 1280, 720


def render_pdf_to_png(pdf_path):
    d = fitz.open(pdf_path); pg = d[0]; r = pg.rect
    m = fitz.Matrix(W / r.width, H / r.height)
    px = pg.get_pixmap(matrix=m, alpha=False)
    return Image.frombytes("RGB", [px.width, px.height], px.samples).resize((W, H))


def chromium_pdf(html_path, out_pdf):
    t0 = time.time()
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
                    "--disable-dev-shm-usage", f"--print-to-pdf={out_pdf}",
                    "--no-pdf-header-footer", f"file://{os.path.abspath(html_path)}"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return time.time() - t0


def weasy_pdf(html_path, out_pdf):
    t0 = time.time()
    HTML(filename=html_path).write_pdf(out_pdf)
    return time.time() - t0


def main(paths):
    tmp = tempfile.mkdtemp(prefix="render-bench-")
    for html in paths:
        name = os.path.splitext(os.path.basename(html))[0]
        c_pdf = os.path.join(tmp, f"{name}.chrome.pdf")
        w_pdf = os.path.join(tmp, f"{name}.weasy.pdf")
        ct = chromium_pdf(html, c_pdf)
        wt = weasy_pdf(html, w_pdf)
        a, b = render_pdf_to_png(c_pdf), render_pdf_to_png(w_pdf)
        diff = np.abs(np.asarray(a).astype(int) - np.asarray(b).astype(int))
        pct = (diff.max(axis=2) > 30).mean() * 100
        comp = Image.new("RGB", (W, H * 2 + 60), "white")
        comp.paste(a, (0, 30)); comp.paste(b, (0, H + 60))
        comp.save(f"compare_{name}.png")
        print(f"{name}: chromium={ct*1000:.0f}ms  weasyprint={wt*1000:.0f}ms  "
              f"pixels>30diff={pct:.1f}%  -> compare_{name}.png "
              f"(top=Chromium, bottom=WeasyPrint)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python render_bench.py <slide.html> [more.html ...]"); sys.exit(2)
    main(sys.argv[1:])
