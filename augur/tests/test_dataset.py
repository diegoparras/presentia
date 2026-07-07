import pandas as pd

from augur.dataset import detect_task, resolve_task, to_frame


def test_to_frame_orders_columns():
    df = to_frame([{"a": 1, "b": 2}], columns=["b", "a"])
    assert list(df.columns) == ["b", "a"]


def test_detect_task_string_target_is_classification():
    y = pd.Series(["churn", "stay", "churn"])
    assert detect_task(y) == "classification"


def test_detect_task_boolean_is_classification():
    assert detect_task(pd.Series([True, False, True])) == "classification"


def test_detect_task_few_integers_is_classification():
    assert detect_task(pd.Series([0, 1, 0, 1, 2])) == "classification"


def test_detect_task_continuous_is_regression():
    y = pd.Series([1.4, 99.2, 33.7, 250000.5, 12.1, 7.8])
    assert detect_task(y) == "regression"


def test_resolve_task_respects_explicit_choice():
    y = pd.Series([1.4, 2.7, 3.9])  # sería regresión por heurística
    assert resolve_task("classification", y) == "classification"
