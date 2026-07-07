"""Resolve @font-face CSS with the used web fonts embedded as data: URIs.

WeasyPrint renders with whatever fonts it can find; the slides use Google Fonts
(Poppins, DM Serif Display, ...) that are not installed, so without this the PDF
falls back to a default face and text reflows. This fetches the needed families
from the Google Fonts CSS2 API once, inlines the font binaries as base64, and
caches the result on disk so later exports are network-free.

Degrades gracefully: if a family can't be fetched, it's skipped (WeasyPrint keeps
its fallback) instead of failing the export.
"""
from __future__ import annotations

import base64
import hashlib
import os
import re
import ssl
import urllib.request
from typing import Iterable

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".font-cache")
_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_CA_BUNDLE = os.environ.get("REQUESTS_CA_BUNDLE") or "/root/.ccr/ca-bundle.crt"
# Weights slides realistically use; the API clamps to what the family provides.
_WEIGHTS = "400;500;600;700;800"


def _ctx() -> ssl.SSLContext:
    if os.path.exists(_CA_BUNDLE):
        return ssl.create_default_context(cafile=_CA_BUNDLE)
    return ssl.create_default_context()


def _fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=15, context=_ctx()) as resp:
        return resp.read()


def _cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, hashlib.sha1(key.encode()).hexdigest() + ".css")


def _family_query(name: str) -> str:
    return name.replace(" ", "+")


def embed_font_faces(families: Iterable[str]) -> str:
    """Return @font-face CSS (data: URIs) for the given family names."""
    names = sorted({f.split(",")[0].strip().strip("'\"") for f in families if f and f.strip()})
    # Skip generic families WeasyPrint already resolves.
    names = [n for n in names if n.lower() not in {"sans-serif", "serif", "monospace", "inherit", "system-ui"}]
    if not names:
        return ""
    key = "|".join(names) + "@" + _WEIGHTS
    cached = _cache_path(key)
    if os.path.exists(cached):
        with open(cached, encoding="utf-8") as fh:
            return fh.read()

    os.makedirs(CACHE_DIR, exist_ok=True)
    blocks: list[str] = []
    for name in names:
        try:
            css_url = f"https://fonts.googleapis.com/css2?family={_family_query(name)}:wght@{_WEIGHTS}&display=swap"
            css = _fetch(css_url).decode("utf-8")
        except Exception:
            continue
        # Inline every url(...) src as a data: URI.
        def _inline(m: re.Match) -> str:
            font_url = m.group(1)
            try:
                data = _fetch(font_url)
            except Exception:
                return m.group(0)
            fmt = "woff2" if font_url.endswith(".woff2") else "truetype"
            b64 = base64.b64encode(data).decode("ascii")
            return f"url(data:font/{fmt};base64,{b64})"

        css = re.sub(r"url\((https://[^)]+)\)", _inline, css)
        blocks.append(css)

    result = "\n".join(blocks)
    with open(cached, "w", encoding="utf-8") as fh:
        fh.write(result)
    return result
