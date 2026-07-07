"""
Dataset-guarded slide content generation (Suite Escriba, Fase 4).

Wraps get_slide_content_from_type_and_outline: when the presentation carries
a dataset and the chosen layout renders a chart, the dataset table is injected
into the instructions and the returned chart figures are validated against the
dataset. Hallucinated figures trigger a retry with explicit feedback; after
MAX_DATA_RETRIES the slide is rejected instead of shipping invented numbers.
"""

import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException

from models.presentation_layout import SlideLayoutModel
from models.presentation_outline_model import SlideOutlineModel
from utils.chart_data_guard import (
    allowed_values_from_dataset,
    build_dataset_instructions,
    build_insights_instructions,
    build_violation_feedback,
    find_disallowed_numbers,
    schema_contains_chart,
)
LOGGER = logging.getLogger(__name__)


async def _generate_slide_content(*args):
    """Indirection seam: lazy import keeps this module importable without the
    LLM client stack (llmai) and gives tests a single patch point."""
    from utils.llm_calls.generate_slide_content import (
        get_slide_content_from_type_and_outline,
    )

    return await get_slide_content_from_type_and_outline(*args)

MAX_DATA_RETRIES = 3

REJECTION_DETAIL = (
    "Chart data validation failed: the model kept returning figures that are "
    "not present in the provided dataset. The slide was rejected instead of "
    "shipping invented numbers."
)


async def get_slide_content_with_dataset_guard(
    slide_layout: SlideLayoutModel,
    outline: SlideOutlineModel,
    language: Optional[str],
    tone: Optional[str] = None,
    verbosity: Optional[str] = None,
    instructions: Optional[str] = None,
    dataset: Optional[Dict[str, Any]] = None,
    slide_index: Optional[int] = None,
):
    """Drop-in replacement for get_slide_content_from_type_and_outline with
    extra `dataset` and `slide_index` parameters. Without dataset (or on
    chartless layouts) it delegates untouched, so vanilla behavior is
    preserved. slide_index feeds the usage attribution (Fase 5)."""
    if slide_index is not None:
        from services.llm_usage_service import set_usage_scope

        set_usage_scope(stage="slide", slide_index=slide_index)
    has_chart = bool(dataset) and schema_contains_chart(slide_layout.json_schema)
    if not has_chart:
        return await _generate_slide_content(
            slide_layout, outline, language, tone, verbosity, instructions
        )

    table_md = dataset.get("table_md") or ""
    base_instructions = "\n\n".join(
        part
        for part in [
            instructions,
            build_dataset_instructions(table_md),
            build_insights_instructions(dataset),
        ]
        if part
    )
    allowed = allowed_values_from_dataset(dataset)

    feedback = ""
    for attempt in range(1, MAX_DATA_RETRIES + 1):
        content = await _generate_slide_content(
            slide_layout,
            outline,
            language,
            tone,
            verbosity,
            base_instructions + feedback,
        )
        disallowed = find_disallowed_numbers(content, allowed)
        if not disallowed:
            return content
        LOGGER.warning(
            "[ChartGuard] Attempt %s/%s rejected: figures not in dataset: %s",
            attempt,
            MAX_DATA_RETRIES,
            disallowed[:10],
        )
        feedback = build_violation_feedback(disallowed)

    raise HTTPException(status_code=400, detail=REJECTION_DETAIL)
