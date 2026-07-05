import pytest

from models.presentation_outline_model import PresentationOutlineModel, SlideOutlineModel
from utils.outline_utils import (
    _extract_outline_title,
    get_images_for_slides_from_outline,
    get_no_of_toc_required_for_n_outlines,
    get_presentation_outline_model_with_toc,
    get_presentation_title_from_presentation_outline,
    sanitize_layout_indices,
)


def test_sanitize_layout_indices_clamps_out_of_range():
    # El modelo devolvió un índice 9 pero la plantilla tiene 3 layouts (0-2).
    result = sanitize_layout_indices([0, 9, 2], total_outlines=3, total_slide_layouts=3)
    assert len(result) == 3
    assert all(0 <= i < 3 for i in result)
    assert result[0] == 0 and result[2] == 2  # los válidos se conservan


def test_sanitize_layout_indices_pads_when_too_few():
    # El modelo devolvió menos índices que slides: se completan válidos.
    result = sanitize_layout_indices([1], total_outlines=4, total_slide_layouts=2)
    assert len(result) == 4
    assert all(0 <= i < 2 for i in result)
    assert result[0] == 1


def test_sanitize_layout_indices_truncates_when_too_many():
    result = sanitize_layout_indices([0, 1, 0, 1, 0], total_outlines=2, total_slide_layouts=2)
    assert result == [0, 1]


def test_sanitize_layout_indices_handles_negatives_and_non_ints():
    result = sanitize_layout_indices([-1, "x", None, 1], total_outlines=4, total_slide_layouts=3)
    assert len(result) == 4
    assert all(isinstance(i, int) and 0 <= i < 3 for i in result)
    assert result[3] == 1


def test_sanitize_layout_indices_empty_template():
    assert sanitize_layout_indices([0, 1], total_outlines=2, total_slide_layouts=0) == []


def test_get_presentation_title_handles_prefixed_page_heading():
    outline = PresentationOutlineModel(
        slides=[SlideOutlineModel(content="## Page 1: Growth/Plan\\Roadmap\nBody")]
    )

    title = get_presentation_title_from_presentation_outline(outline)
    assert title == "GrowthPlanRoadmap"


def test_get_presentation_title_ignores_slide_body():
    outline = PresentationOutlineModel(
        slides=[
            SlideOutlineModel(
                content="# The Dogo Argentino: A Powerful Breed\nThe Dogo Argentino is a large, muscular dog."
            )
        ]
    )

    title = get_presentation_title_from_presentation_outline(outline)
    assert title == "The Dogo Argentino: A Powerful Breed"


def test_get_presentation_title_for_empty_outline():
    outline = PresentationOutlineModel(slides=[])
    assert get_presentation_title_from_presentation_outline(outline) == "Untitled Presentation"


@pytest.mark.parametrize(
    ("n_outlines", "title_slide", "target_total_slides", "expected"),
    [
        (0, True, None, 0),
        (12, True, None, 2),
        (12, False, None, 2),
        (8, True, 25, 3),
    ],
)
def test_calculate_no_of_toc_required_for_n_outlines(
    n_outlines: int,
    title_slide: bool,
    target_total_slides: int | None,
    expected: int,
):
    assert (
        get_no_of_toc_required_for_n_outlines(
            n_outlines=n_outlines,
            title_slide=title_slide,
            target_total_slides=target_total_slides,
        )
        == expected
    )


def test_get_presentation_outline_model_with_toc_inserts_expected_slide_structure():
    outline = PresentationOutlineModel(
        slides=[
            SlideOutlineModel(content="## Title slide"),
            SlideOutlineModel(content="## Market Overview"),
            SlideOutlineModel(content="## Product Strategy"),
        ]
    )

    with_toc = get_presentation_outline_model_with_toc(
        outline=outline,
        n_toc_slides=1,
        title_slide=True,
    )

    assert len(with_toc.slides) == 4
    toc_content = with_toc.slides[1].content
    assert toc_content.startswith("## Table of Contents")
    assert "Page number: 3, Title: Market Overview" in toc_content
    assert "Page number: 4, Title: Product Strategy" in toc_content


def test_extract_outline_title_uses_heading_then_sentence_then_fallback():
    assert _extract_outline_title("## Heading title\nBody") == "Heading title"
    assert _extract_outline_title("First sentence. Second sentence.") == "First sentence."
    assert _extract_outline_title(" \nline fallback\n") == "line fallback"
    assert _extract_outline_title("") == "Slide"


def test_get_images_for_slides_from_outline_deduplicates_and_filters():
    slides = [
        SlideOutlineModel(
            content=(
                "Image https://cdn.example.com/a.png and duplicate "
                "https://cdn.example.com/a.png and invalid https://example.com/nope.txt"
            )
        ),
        SlideOutlineModel(content="No URL here"),
    ]

    extracted = get_images_for_slides_from_outline(slides)

    assert extracted[0] == ["https://cdn.example.com/a.png"]
    assert extracted[1] == []
