"""
Splitter de markdown a tarjetas (Suite Escriba, modo Gamma).

Replica la semántica de división de Gamma: si el markdown trae separadores
`---` en línea propia, cada sección es una tarjeta; si no, corta una tarjeta
por encabezado (# o ##); como último recurso reparte los párrafos en partes
iguales según la cantidad pedida. Determinístico, sin LLM.
"""

import re
from typing import List, Optional

from constants.presentation import MAX_NUMBER_OF_SLIDES

# Separador estilo Gamma: --- (o *** / ___) solo en su propia línea
_BREAK_PATTERN = re.compile(r"^\s*(?:-{3,}|\*{3,}|_{3,})\s*$", re.MULTILINE)
_HEADING_PATTERN = re.compile(r"^#{1,2}\s+\S", re.MULTILINE)

TEXT_MODE_INSTRUCTIONS = {
    "preserve": (
        "# Text Mode: PRESERVE\n"
        "The slide content provided is final copy written by the user. Use it "
        "VERBATIM: keep the exact wording, order and level of detail while "
        "mapping it into the layout fields. Do not rewrite, summarize, expand "
        "or translate it."
    ),
    "condense": (
        "# Text Mode: CONDENSE\n"
        "The slide content provided is source material. Summarize it into "
        "concise slide copy, keeping the key facts and figures and the "
        "original language and terminology."
    ),
    "generate": "",
}

VALID_TEXT_MODES = set(TEXT_MODE_INSTRUCTIONS.keys())


class MarkdownDeckError(Exception):
    pass


def _clean_cards(cards: List[str]) -> List[str]:
    return [card.strip() for card in cards if card and card.strip()]


def _split_by_breaks(markdown: str) -> List[str]:
    return _clean_cards(_BREAK_PATTERN.split(markdown))


def _split_by_headings(markdown: str) -> List[str]:
    matches = list(_HEADING_PATTERN.finditer(markdown))
    if len(matches) < 2:
        return []
    cards = []
    preamble = markdown[: matches[0].start()]
    if preamble.strip():
        cards.append(preamble)
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        cards.append(markdown[match.start():end])
    return _clean_cards(cards)


def _split_evenly(markdown: str, n_cards: int) -> List[str]:
    paragraphs = _clean_cards(re.split(r"\n\s*\n", markdown))
    if not paragraphs:
        return []
    n_cards = max(1, min(n_cards, len(paragraphs)))
    size = -(-len(paragraphs) // n_cards)  # ceil
    return [
        "\n\n".join(paragraphs[i : i + size]) for i in range(0, len(paragraphs), size)
    ]


def split_markdown_into_cards(
    markdown: str, n_cards: Optional[int] = None
) -> List[str]:
    """Divide el markdown en tarjetas (una por slide), estilo Gamma:
    1. Separadores `---` explícitos ganan siempre.
    2. Sin separadores, una tarjeta por encabezado # o ##.
    3. Sin estructura, reparto parejo de párrafos según n_cards (default 10).
    """
    if not markdown or not markdown.strip():
        raise MarkdownDeckError("Markdown content is empty")

    normalized = markdown.replace("\r\n", "\n").replace("\r", "\n")

    # El separador \n---\n también es sintaxis de encabezado setext y de
    # frontmatter; el patrón exige línea propia, igual que Gamma.
    cards = _split_by_breaks(normalized)
    if len(cards) < 2:
        cards = _split_by_headings(normalized)
    if len(cards) < 2:
        cards = _split_evenly(normalized, n_cards or 10)
    if not cards:
        raise MarkdownDeckError("Markdown content produced no cards")

    if len(cards) > MAX_NUMBER_OF_SLIDES:
        raise MarkdownDeckError(
            f"Markdown produced {len(cards)} cards; the maximum is "
            f"{MAX_NUMBER_OF_SLIDES}. Merge sections or remove separators."
        )
    return cards


def text_mode_instructions(text_mode: str, user_instructions: Optional[str]) -> Optional[str]:
    """Compone las instrucciones del usuario con la directiva del modo de texto."""
    directive = TEXT_MODE_INSTRUCTIONS.get(text_mode, "")
    parts = [part for part in [user_instructions, directive] if part]
    return "\n\n".join(parts) if parts else None
