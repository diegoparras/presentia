"""
Anti-hallucination guard for data-grounded charts (Suite Escriba, Fase 4).

Every number the LLM puts inside a chart must exist in the provided dataset
(or be a whole-column aggregate: sum, mean, min, max, count). Numbers are
compared after rounding so legitimate LLM rounding still passes. Grouped
aggregations are deliberately out of scope: datasets are expected to arrive
already aggregated (e.g. Concilius summaries).
"""

import logging
import math
from typing import Any, Dict, List, Set

LOGGER = logging.getLogger(__name__)

CHART_CONTAINER_KEY = "chartData"


def schema_contains_chart(json_schema: Any) -> bool:
    """True when the layout's JSON Schema declares a chartData property."""
    if isinstance(json_schema, dict):
        properties = json_schema.get("properties")
        if isinstance(properties, dict) and CHART_CONTAINER_KEY in properties:
            return True
        return any(schema_contains_chart(v) for v in json_schema.values())
    if isinstance(json_schema, list):
        return any(schema_contains_chart(item) for item in json_schema)
    return False


def _rounded_variants(value: float) -> Set[float]:
    # float(round(value)) usa redondeo bancario; math.floor(value + 0.5) cubre
    # el redondeo aritmético que suele aplicar el LLM (150000.5 -> 150001)
    return {
        round(value, 2),
        round(value, 1),
        float(round(value)),
        float(math.floor(value + 0.5)),
    }


def _augur_values(dataset: Dict[str, Any]) -> Set[float]:
    """Verifiable figures produced by the Augur tabular model (importance
    scores, predictions). A third allowed source next to raw cells and
    whole-column aggregates: the model computes them, the LLM cannot invent
    them. Absent/malformed augur data contributes nothing."""
    allowed: Set[float] = set()
    augur = dataset.get("augur") if isinstance(dataset, dict) else None
    if not isinstance(augur, dict):
        return allowed
    for item in augur.get("importance") or []:
        if not isinstance(item, dict):
            continue
        for key in ("score", "std"):
            value = item.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                allowed |= _rounded_variants(float(value))
    for value in augur.get("values") or []:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            allowed |= _rounded_variants(float(value))
    return allowed


def allowed_values_from_dataset(dataset: Dict[str, Any]) -> Set[float]:
    """Raw numeric cells, whole-column aggregates, and any Augur-derived
    figures, in rounded variants."""
    allowed: Set[float] = set()
    rows: List[dict] = dataset.get("rows") or []
    columns = dataset.get("columns") or []

    for column in columns:
        numeric_values = [
            float(row[column])
            for row in rows
            if isinstance(row.get(column), (int, float))
            and not isinstance(row.get(column), bool)
        ]
        for value in numeric_values:
            allowed |= _rounded_variants(value)
        if numeric_values:
            allowed |= _rounded_variants(sum(numeric_values))
            allowed |= _rounded_variants(sum(numeric_values) / len(numeric_values))
            allowed |= _rounded_variants(min(numeric_values))
            allowed |= _rounded_variants(max(numeric_values))
            allowed |= _rounded_variants(float(len(numeric_values)))

    allowed |= _rounded_variants(float(len(rows)))
    allowed |= _augur_values(dataset)
    return allowed


def _collect_numbers(node: Any, into: List[float]) -> None:
    if isinstance(node, bool):
        return
    if isinstance(node, (int, float)):
        into.append(float(node))
        return
    if isinstance(node, dict):
        for value in node.values():
            _collect_numbers(value, into)
        return
    if isinstance(node, list):
        for item in node:
            _collect_numbers(item, into)


def extract_chart_numbers(slide_content: Any) -> List[float]:
    """All numbers found inside any chartData subtree of the slide content."""
    numbers: List[float] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key == CHART_CONTAINER_KEY:
                    _collect_numbers(value, numbers)
                else:
                    walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(slide_content)
    return numbers


def find_disallowed_numbers(
    slide_content: Any, allowed: Set[float]
) -> List[float]:
    disallowed = []
    for number in extract_chart_numbers(slide_content):
        variants = _rounded_variants(number)
        if not (variants & allowed):
            disallowed.append(number)
    return disallowed


def build_dataset_instructions(table_md: str) -> str:
    return (
        "# Chart Data Rules (STRICT):\n"
        "A dataset is provided below. Every numeric value inside chartData "
        "MUST be taken verbatim from this dataset (or be the exact sum, "
        "average, minimum, maximum or count of one of its numeric columns). "
        "Do NOT invent, estimate or extrapolate figures. Category names "
        "should match the dataset labels.\n\n"
        "# Dataset:\n"
        f"{table_md}\n"
    )


def build_insights_instructions(dataset: Dict[str, Any]) -> str:
    """Optional instructions block exposing Augur's model-derived figures to the
    LLM. Empty string when the dataset carries no Augur insights, so callers can
    always concatenate it unconditionally."""
    augur = dataset.get("augur") if isinstance(dataset, dict) else None
    importance = (augur or {}).get("importance") if isinstance(augur, dict) else None
    if not importance:
        return ""
    lines = "\n".join(
        f"- {item.get('feature')}: {float(item.get('score', 0)):.4g}"
        for item in importance[:15]
        if isinstance(item, dict) and item.get("feature") is not None
    )
    return (
        "# Model Insights (from Augur — verifiable, may be charted):\n"
        "A tabular model computed the following feature-importance scores over "
        "the dataset (higher = more predictive of the target). You MAY build a "
        "'key drivers' chart from these exact scores; they are pre-approved data "
        "just like the dataset values. Do NOT alter the numbers.\n"
        f"{lines}\n"
    )


def build_violation_feedback(disallowed: List[float]) -> str:
    numbers = ", ".join(f"{n:.12g}" for n in disallowed[:20])
    return (
        "\n# Correction Required:\n"
        f"Your previous chart included figures that are NOT in the dataset: "
        f"{numbers}. Regenerate the chart using ONLY values present in the "
        "dataset table above (or exact whole-column aggregates)."
    )
