"""
Incrustado de Google Fonts en archivos PPTX exportados.

Un .pptx solo referencia fuentes por nombre (typeface); si la máquina que lo
abre no las tiene instaladas, PowerPoint las sustituye y se pierde el diseño.
Este módulo post-procesa el .pptx generado por cualquiera de los motores de
export: detecta las typefaces realmente usadas en los XML del archivo,
descarga los TTF desde Google Fonts (con caché en disco) y los incrusta según
OOXML (p:embeddedFontLst + partes fonts/*.fntdata + embedTrueTypeFonts).

Casi todas las Google Fonts son licencia OFL: incrustarlas está permitido.
Si una fuente no existe en Google Fonts (p.ej. una del sistema) simplemente
se omite. Cualquier error deja el archivo original intacto.
"""

import logging
import os
import re
import shutil
import tempfile
import urllib.error
import urllib.request
import zipfile

LOGGER = logging.getLogger(__name__)

# Fuentes que ya vienen con Windows/Office — no tiene sentido incrustarlas y
# además no están en Google Fonts.
STANDARD_FONTS = {
    "arial", "arial black", "calibri", "calibri light", "cambria", "candara",
    "comic sans ms", "consolas", "constantia", "corbel", "courier new",
    "franklin gothic", "gabriola", "garamond", "georgia", "impact",
    "lucida console", "lucida sans", "palatino linotype", "segoe ui",
    "segoe ui light", "segoe ui semibold", "symbol", "tahoma",
    "times new roman", "trebuchet ms", "verdana", "webdings", "wingdings",
}

FONT_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"
)
FNTDATA_CONTENT_TYPE = "application/x-fontdata"
# Sin User-Agent de navegador, fonts.googleapis.com responde URLs TTF
# (format 'truetype'), que es lo que PowerPoint necesita como fntdata.
# (Con UAs de navegador devuelve woff/woff2 — verificado empíricamente.)
MAX_FONT_BYTES = 15 * 1024 * 1024  # por archivo de fuente
STYLE_ORDER = ["regular", "bold", "italic", "boldItalic"]


def _cache_dir() -> str:
    base = os.getenv("APP_DATA_DIRECTORY") or tempfile.gettempdir()
    path = os.path.join(base, "fonts", "google-cache")
    os.makedirs(path, exist_ok=True)
    return path


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def collect_pptx_typefaces(pptx_path: str) -> set[str]:
    """Typefaces realmente referenciadas por los XML de slides/layouts/masters."""
    families: set[str] = set()
    with zipfile.ZipFile(pptx_path) as zf:
        for info in zf.infolist():
            if not info.filename.endswith(".xml"):
                continue
            if not info.filename.startswith("ppt/"):
                continue
            try:
                xml = zf.read(info.filename).decode("utf-8", errors="ignore")
            except Exception:
                continue
            for m in re.finditer(r'typeface="([^"]+)"', xml):
                name = m.group(1).strip()
                # '+mj-lt' / '+mn-lt' son referencias al esquema del theme.
                if not name or name.startswith("+"):
                    continue
                families.add(name)
    return families


def _fetch(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as res:  # noqa: S310
        return res.read(MAX_FONT_BYTES + 1)


def download_google_font(family: str) -> dict[str, bytes]:
    """
    Devuelve {estilo: bytes TTF} para regular/bold/italic/boldItalic.
    Dict vacío si la familia no existe en Google Fonts. Usa caché en disco.
    """
    styles: dict[str, bytes] = {}
    cache = _cache_dir()
    # Miss cacheado: familia que ya sabemos que no está en Google Fonts
    # (p.ej. fuentes de sistema del theme) — evita un request por export.
    miss_marker = os.path.join(cache, f"{_slug(family)}--miss")
    if os.path.isfile(miss_marker):
        return {}
    cached_any = False
    for style in STYLE_ORDER:
        p = os.path.join(cache, f"{_slug(family)}--{style}.ttf")
        if os.path.isfile(p):
            with open(p, "rb") as fh:
                styles[style] = fh.read()
            cached_any = True
    if cached_any:
        return styles

    query = family.replace(" ", "+")
    url = (
        "https://fonts.googleapis.com/css2?family="
        f"{query}:ital,wght@0,400;0,700;1,400;1,700&display=swap"
    )
    try:
        css = _fetch(url).decode("utf-8", errors="ignore")
    except urllib.error.HTTPError:
        # Familia inexistente en Google Fonts → cachear el miss.
        try:
            open(miss_marker, "w").close()
        except OSError:
            pass
        return {}
    except Exception:
        # Sin red u otro problema transitorio — no cachear.
        return {}

    # Parsear cada bloque @font-face: estilo + peso + URL ttf.
    for block in re.findall(r"@font-face\s*{[^}]+}", css):
        style_m = re.search(r"font-style:\s*(\w+)", block)
        weight_m = re.search(r"font-weight:\s*(\d+)", block)
        url_m = re.search(r"src:\s*url\((https[^)]+)\)", block)
        if not (style_m and weight_m and url_m):
            continue
        italic = style_m.group(1) == "italic"
        bold = weight_m.group(1) == "700"
        key = ("boldItalic" if bold else "italic") if italic else ("bold" if bold else "regular")
        if key in styles:
            continue
        try:
            data = _fetch(url_m.group(1))
        except Exception:
            continue
        if not data or len(data) > MAX_FONT_BYTES:
            continue
        # PowerPoint espera TrueType/OpenType crudo en fntdata (no woff).
        if data[:4] not in (b"\x00\x01\x00\x00", b"true", b"OTTO"):
            continue
        styles[key] = data

    for style, data in styles.items():
        try:
            with open(os.path.join(cache, f"{_slug(family)}--{style}.ttf"), "wb") as fh:
                fh.write(data)
        except OSError:
            pass
    return styles


def _add_content_type_default(xml: str) -> str:
    if 'Extension="fntdata"' in xml:
        return xml
    return xml.replace(
        "</Types>",
        f'<Default Extension="fntdata" ContentType="{FNTDATA_CONTENT_TYPE}"/></Types>',
        1,
    )


def _add_relationships(xml: str, rels: list[tuple[str, str]]) -> str:
    """rels: [(rId, target)] — se agregan antes de </Relationships>."""
    add = "".join(
        f'<Relationship Id="{rid}" Type="{FONT_REL_TYPE}" Target="{target}"/>'
        for rid, target in rels
    )
    return xml.replace("</Relationships>", add + "</Relationships>", 1)


def _add_embedded_font_lst(xml: str, entries: list[str]) -> str:
    """
    Inserta <p:embeddedFontLst> respetando el orden del schema CT_Presentation
    (después de notesSz; si no está, después de sldSz o sldIdLst) y marca
    embedTrueTypeFonts="1" en la raíz.
    """
    if "<p:embeddedFontLst>" in xml:
        return xml  # ya hay una (raro) — no tocar

    if "embedTrueTypeFonts" not in xml:
        xml = xml.replace("<p:presentation ", '<p:presentation embedTrueTypeFonts="1" ', 1)

    lst = "<p:embeddedFontLst>" + "".join(entries) + "</p:embeddedFontLst>"
    for anchor in (r"<p:notesSz[^>]*/>", r"</p:notesSz>", r"<p:sldSz[^>]*/>", r"</p:sldIdLst>"):
        m = re.search(anchor, xml)
        if m:
            return xml[: m.end()] + lst + xml[m.end():]
    LOGGER.warning("pptx_font_embed: no anchor found in presentation.xml; skipping")
    return xml


def embed_google_fonts_into_pptx(pptx_path: str) -> int:
    """
    Incrusta en el .pptx las Google Fonts que use. Devuelve la cantidad de
    familias incrustadas. Ante cualquier problema, deja el archivo intacto.
    """
    families = sorted(
        f
        for f in collect_pptx_typefaces(pptx_path)
        if f.lower() not in STANDARD_FONTS
    )
    if not families:
        return 0

    fonts: dict[str, dict[str, bytes]] = {}
    for family in families:
        styles = download_google_font(family)
        if styles:
            fonts[family] = styles
    if not fonts:
        return 0

    # Preparar partes y XML nuevos.
    font_parts: list[tuple[str, bytes]] = []  # (ruta en zip, bytes)
    rels: list[tuple[str, str]] = []
    entries: list[str] = []
    n = 0
    for family, styles in fonts.items():
        refs = []
        for style in STYLE_ORDER:
            data = styles.get(style)
            if not data:
                continue
            n += 1
            rid = f"rIdEmbFont{n}"
            font_parts.append((f"ppt/fonts/font{n}.fntdata", data))
            rels.append((rid, f"fonts/font{n}.fntdata"))
            refs.append(f'<p:{style} r:id="{rid}"/>')
        if refs:
            entries.append(
                f'<p:embeddedFont><p:font typeface="{family}"/>' + "".join(refs) + "</p:embeddedFont>"
            )
    if not entries:
        return 0

    # Reescribir el zip a un temporal y reemplazar de forma atómica.
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pptx", dir=os.path.dirname(pptx_path))
    os.close(tmp_fd)
    try:
        with zipfile.ZipFile(pptx_path) as zin, zipfile.ZipFile(
            tmp_path, "w", zipfile.ZIP_DEFLATED
        ) as zout:
            for info in zin.infolist():
                data = zin.read(info.filename)
                if info.filename == "[Content_Types].xml":
                    data = _add_content_type_default(data.decode("utf-8")).encode("utf-8")
                elif info.filename == "ppt/presentation.xml":
                    data = _add_embedded_font_lst(data.decode("utf-8"), entries).encode("utf-8")
                elif info.filename == "ppt/_rels/presentation.xml.rels":
                    data = _add_relationships(data.decode("utf-8"), rels).encode("utf-8")
                zout.writestr(info.filename, data)
            for path, data in font_parts:
                zout.writestr(path, data)
        shutil.move(tmp_path, pptx_path)
    except Exception:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise
    return len(entries)
