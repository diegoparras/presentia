import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from services.dataset_service import (
    DatasetError,
    dataset_to_markdown,
    parse_csv_text,
    parse_dataset_file,
    parse_json_text,
)
from utils.chart_data_guard import (
    allowed_values_from_dataset,
    extract_chart_numbers,
    find_disallowed_numbers,
    schema_contains_chart,
)

# Dataset de referencia: resumen de conciliación estilo Concilius
CONCILIUS_CSV = """categoria,monto,operaciones
Conciliado,150000.50,320
Pendiente banco,12500.75,18
Pendiente contable,8300.25,11
Diferencias,420.00,3
"""


def _concilius_dataset():
    return parse_csv_text(CONCILIUS_CSV)


# ---- Parser -------------------------------------------------------------------


def test_parse_csv_builds_canonical_dataset():
    dataset = _concilius_dataset()
    assert dataset["columns"] == ["categoria", "monto", "operaciones"]
    assert len(dataset["rows"]) == 4
    assert dataset["rows"][0]["monto"] == 150000.50
    assert dataset["rows"][0]["operaciones"] == 320
    assert dataset["rows"][0]["categoria"] == "Conciliado"
    assert "| categoria | monto | operaciones |" in dataset["table_md"]


def test_parse_csv_with_semicolon_delimiter():
    dataset = parse_csv_text("nombre;valor\nA;10\nB;20\n")
    assert dataset["columns"] == ["nombre", "valor"]
    assert dataset["rows"][1]["valor"] == 20


def test_parse_json_array_of_objects():
    dataset = parse_json_text('[{"mes": "Enero", "ventas": 100}, {"mes": "Febrero", "ventas": 200}]')
    assert dataset["columns"] == ["mes", "ventas"]
    assert dataset["rows"][1]["ventas"] == 200


def test_parse_json_rows_wrapper():
    dataset = parse_json_text('{"rows": [{"a": 1}]}')
    assert dataset["rows"] == [{"a": 1}]


def test_parse_json_rejects_non_array():
    with pytest.raises(DatasetError):
        parse_json_text('"solo un string"')


def test_row_limit_enforced(monkeypatch):
    monkeypatch.setenv("DATASET_MAX_ROWS", "2")
    with pytest.raises(DatasetError) as exc:
        parse_csv_text("a,b\n1,2\n3,4\n5,6\n")
    assert "limit is 2" in str(exc.value)


def test_unsupported_extension_rejected(tmp_path):
    path = tmp_path / "datos.xlsx"
    path.write_bytes(b"fake")
    with pytest.raises(DatasetError):
        parse_dataset_file(str(path))


def test_parse_dataset_file_csv(tmp_path):
    path = tmp_path / "datos.csv"
    path.write_text(CONCILIUS_CSV, encoding="utf-8")
    dataset = parse_dataset_file(str(path))
    assert len(dataset["rows"]) == 4


# ---- Guard: valores permitidos y extracción ------------------------------------


def test_allowed_values_include_raw_and_aggregates():
    allowed = allowed_values_from_dataset(_concilius_dataset())
    assert 150000.50 in allowed
    assert 320.0 in allowed
    # Suma de la columna monto
    assert round(150000.50 + 12500.75 + 8300.25 + 420.00, 2) in allowed
    # Conteo de filas
    assert 4.0 in allowed
    # Un número inventado no está
    assert 99999.0 not in allowed


def test_schema_contains_chart_detects_nested_chart_data():
    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "chartData": {"type": "object", "properties": {"type": {}, "data": {}}},
        },
    }
    assert schema_contains_chart(schema) is True
    assert schema_contains_chart({"type": "object", "properties": {"title": {}}}) is False


def test_extract_numbers_covers_all_data_shapes():
    content = {
        "title": "Resumen 2026",  # números fuera de chartData se ignoran... (string)
        "metric": 42,  # número fuera de chartData: ignorado
        "chartData": {
            "type": "bar",
            "data": [
                {"name": "A", "value": 10},
                {"name": "B", "positive": 5, "negative": 3},
                {"x": 1.5, "y": 2.5},
                {"label": "C", "valueA": 7, "valueB": 8},
                {"name": "D", "values": {"s1": 20, "s2": 30}},
            ],
            "series": ["s1", "s2"],
        },
    }
    numbers = sorted(extract_chart_numbers(content))
    assert numbers == [1.5, 2.5, 3.0, 5.0, 7.0, 8.0, 10.0, 20.0, 30.0]


def test_find_disallowed_accepts_rounded_values():
    dataset = _concilius_dataset()
    allowed = allowed_values_from_dataset(dataset)
    # 150000.5 redondeado por el LLM a entero
    content = {"chartData": {"type": "pie", "data": [{"name": "Conciliado", "value": 150001}]}}
    assert find_disallowed_numbers(content, allowed) == []


def test_find_disallowed_flags_invented_figures():
    allowed = allowed_values_from_dataset(_concilius_dataset())
    content = {
        "chartData": {
            "type": "bar",
            "data": [
                {"name": "Conciliado", "value": 150000.5},
                {"name": "Inventado", "value": 77777.77},
            ],
        }
    }
    assert find_disallowed_numbers(content, allowed) == [77777.77]


# ---- Wrapper con reintentos -----------------------------------------------------

CHART_SCHEMA = {
    "type": "object",
    "properties": {"title": {"type": "string"}, "chartData": {"type": "object"}},
}
NO_CHART_SCHEMA = {"type": "object", "properties": {"title": {"type": "string"}}}


def _layout(schema):
    from models.presentation_layout import SlideLayoutModel

    return SlideLayoutModel(
        id="test-layout",
        name="Test",
        description="test",
        json_schema=schema,
    )


def _outline():
    from models.presentation_outline_model import SlideOutlineModel

    return SlideOutlineModel(content="## Resumen de conciliación")


def _valid_content():
    return {
        "title": "Resumen",
        "chartData": {"type": "bar", "data": [{"name": "Conciliado", "value": 150000.5}]},
    }


def _invented_content():
    return {
        "title": "Resumen",
        "chartData": {"type": "bar", "data": [{"name": "Fake", "value": 123456.78}]},
    }


def test_guard_passes_through_without_dataset():
    from utils.llm_calls import generate_slide_content_with_data as mod

    with patch.object(
        mod, "_generate_slide_content", AsyncMock(return_value={"title": "x"})
    ) as inner:
        result = asyncio.run(
            mod.get_slide_content_with_dataset_guard(
                _layout(CHART_SCHEMA), _outline(), None, dataset=None
            )
        )
    assert result == {"title": "x"}
    # Sin dataset no se tocan las instructions
    assert inner.await_args.args[5] is None


def test_guard_skips_chartless_layouts():
    from utils.llm_calls import generate_slide_content_with_data as mod

    with patch.object(
        mod, "_generate_slide_content", AsyncMock(return_value={"title": "x"})
    ) as inner:
        asyncio.run(
            mod.get_slide_content_with_dataset_guard(
                _layout(NO_CHART_SCHEMA), _outline(), None, dataset=_concilius_dataset()
            )
        )
    assert inner.await_args.args[5] is None


def test_guard_accepts_valid_chart_first_try():
    from utils.llm_calls import generate_slide_content_with_data as mod

    inner = AsyncMock(return_value=_valid_content())
    with patch.object(mod, "_generate_slide_content", inner):
        result = asyncio.run(
            mod.get_slide_content_with_dataset_guard(
                _layout(CHART_SCHEMA), _outline(), None, dataset=_concilius_dataset()
            )
        )
    assert result == _valid_content()
    assert inner.await_count == 1
    # Las instructions llevan el dataset y la regla estricta
    instructions = inner.await_args.args[5]
    assert "Chart Data Rules" in instructions
    assert "| categoria | monto | operaciones |" in instructions


def test_guard_retries_with_feedback_then_succeeds():
    from utils.llm_calls import generate_slide_content_with_data as mod

    inner = AsyncMock(side_effect=[_invented_content(), _valid_content()])
    with patch.object(mod, "_generate_slide_content", inner):
        result = asyncio.run(
            mod.get_slide_content_with_dataset_guard(
                _layout(CHART_SCHEMA), _outline(), None, dataset=_concilius_dataset()
            )
        )
    assert result == _valid_content()
    assert inner.await_count == 2
    # El segundo intento lleva el feedback con la cifra ofensora
    second_instructions = inner.await_args_list[1].args[5]
    assert "123456.78" in second_instructions
    assert "Correction Required" in second_instructions


def test_guard_rejects_after_max_retries():
    from utils.llm_calls import generate_slide_content_with_data as mod

    inner = AsyncMock(return_value=_invented_content())
    with patch.object(mod, "_generate_slide_content", inner):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                mod.get_slide_content_with_dataset_guard(
                    _layout(CHART_SCHEMA), _outline(), None, dataset=_concilius_dataset()
                )
            )
    assert exc.value.status_code == 400
    assert inner.await_count == 3
