"""El guard anti-alucinación acepta las cifras de Augur como tercera fuente."""

from utils.chart_data_guard import (
    allowed_values_from_dataset,
    build_insights_instructions,
    find_disallowed_numbers,
)


def _dataset_with_insights():
    return {
        "columns": ["mes", "ventas"],
        "rows": [
            {"mes": "ene", "ventas": 100},
            {"mes": "feb", "ventas": 200},
        ],
        "augur": {
            "importance": [
                {"feature": "precio", "score": 0.42, "std": 0.05},
                {"feature": "canal", "score": 0.13, "std": 0.01},
            ]
        },
    }


def test_augur_scores_are_allowed():
    allowed = allowed_values_from_dataset(_dataset_with_insights())
    # Los scores de importancia entran al set permitido...
    assert 0.42 in allowed
    assert 0.13 in allowed
    # ...igual que los valores crudos del dataset.
    assert 100.0 in allowed


def test_chart_with_augur_scores_passes_guard():
    dataset = _dataset_with_insights()
    allowed = allowed_values_from_dataset(dataset)
    slide = {
        "title": "Factores clave",
        "chartData": {
            "series": [{"name": "importancia", "data": [0.42, 0.13]}],
        },
    }
    assert find_disallowed_numbers(slide, allowed) == []


def test_invented_number_still_rejected_with_insights():
    dataset = _dataset_with_insights()
    allowed = allowed_values_from_dataset(dataset)
    slide = {"chartData": {"data": [0.42, 0.99]}}  # 0.99 no viene de ningún lado
    assert find_disallowed_numbers(slide, allowed) == [0.99]


def test_dataset_without_augur_is_unaffected():
    dataset = {"columns": ["x"], "rows": [{"x": 5}]}
    allowed = allowed_values_from_dataset(dataset)
    assert 5.0 in allowed
    assert 0.42 not in allowed


def test_build_insights_instructions_lists_features():
    text = build_insights_instructions(_dataset_with_insights())
    assert "precio" in text
    assert "0.42" in text
    assert "Augur" in text


def test_build_insights_instructions_empty_without_augur():
    assert build_insights_instructions({"columns": ["x"], "rows": []}) == ""
