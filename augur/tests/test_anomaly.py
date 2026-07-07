import pandas as pd

from augur.anomaly import detect_anomalies


def test_detect_anomalies_flags_obvious_outlier():
    rows = [{"x": v, "y": v + 1} for v in range(40)]
    rows.append({"x": 9999, "y": -9999})  # outlier evidente, índice 40
    df = pd.DataFrame(rows)
    found = detect_anomalies(df, top_k=3)
    top_indices = [a["row_index"] for a in found]
    assert 40 in top_indices
    assert all(0.0 <= a["score"] <= 1.0 for a in found)


def test_detect_anomalies_handles_categoricals():
    df = pd.DataFrame({"cat": ["a", "a", "a", "z"], "n": [1, 1, 1, 50]})
    found = detect_anomalies(df, top_k=1)
    assert found[0]["row_index"] == 3
