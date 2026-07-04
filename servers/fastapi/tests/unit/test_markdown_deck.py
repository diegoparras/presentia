import pytest

from services.markdown_deck_service import (
    MarkdownDeckError,
    split_markdown_into_cards,
    text_mode_instructions,
)

MD_WITH_BREAKS = """# Título del deck
Introducción breve.

---

## Sección uno
Contenido de la primera tarjeta.

---

## Sección dos
Contenido de la segunda tarjeta.
"""

MD_WITH_HEADINGS = """# Informe mensual
Resumen ejecutivo del período.

## Ingresos
Los ingresos crecieron.

## Egresos
Los egresos se mantuvieron.

### Detalle
Este sub-encabezado no corta tarjeta.
"""

MD_PLAIN = """Primer párrafo sin estructura.

Segundo párrafo.

Tercer párrafo.

Cuarto párrafo.
"""


def test_split_by_explicit_breaks_wins():
    cards = split_markdown_into_cards(MD_WITH_BREAKS)
    assert len(cards) == 3
    assert cards[0].startswith("# Título del deck")
    assert cards[1].startswith("## Sección uno")
    assert cards[2].startswith("## Sección dos")


def test_split_by_headings_one_card_per_h1_h2():
    cards = split_markdown_into_cards(MD_WITH_HEADINGS)
    assert len(cards) == 3
    assert cards[0].startswith("# Informe mensual")
    assert cards[1].startswith("## Ingresos")
    # El ### queda dentro de la tarjeta de Egresos
    assert "### Detalle" in cards[2]


def test_split_plain_text_falls_back_to_even_chunks():
    cards = split_markdown_into_cards(MD_PLAIN, n_cards=2)
    assert len(cards) == 2
    assert "Primer párrafo" in cards[0]
    assert "Cuarto párrafo" in cards[1]


def test_split_rejects_empty_markdown():
    with pytest.raises(MarkdownDeckError):
        split_markdown_into_cards("   \n  ")


def test_split_rejects_too_many_cards():
    markdown = "\n---\n".join(f"tarjeta {i}" for i in range(60))
    with pytest.raises(MarkdownDeckError) as exc:
        split_markdown_into_cards(markdown)
    assert "maximum" in str(exc.value)


def test_setext_style_dashes_under_text_do_not_split():
    # --- pegado debajo de texto (encabezado setext) igual corta solo si está
    # en línea propia rodeada del patrón; verificamos que el título con
    # subrayado corto no explote en tarjetas vacías
    markdown = "Título\n---\nContenido único del deck."
    cards = split_markdown_into_cards(markdown)
    assert all(card.strip() for card in cards)


def test_text_mode_preserve_appends_directive():
    combined = text_mode_instructions("preserve", "Usar tono formal")
    assert combined.startswith("Usar tono formal")
    assert "VERBATIM" in combined


def test_text_mode_generate_keeps_user_instructions_only():
    assert text_mode_instructions("generate", "Tono formal") == "Tono formal"
    assert text_mode_instructions("generate", None) is None


def test_text_mode_condense_without_user_instructions():
    combined = text_mode_instructions("condense", None)
    assert "Summarize" in combined
