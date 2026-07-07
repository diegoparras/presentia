"""Detección de outliers, independiente del motor (IsolationForest).

TabFM no expone densidad/verosimilitud, así que las anomalías usan un método
clásico y explícito. Queda como método propio para poder cambiarlo en el futuro
por un score basado en el desacuerdo del ensemble de TabFM.
"""

from __future__ import annotations

from typing import Any, Union

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import OrdinalEncoder

METHOD = "isolation_forest"


def _encode(df: pd.DataFrame) -> np.ndarray:
    numeric = df.select_dtypes(include=["number"]).columns
    categorical = df.select_dtypes(include=["object", "string", "bool", "category"]).columns
    parts: list[np.ndarray] = []
    if len(numeric):
        block = df[numeric].apply(lambda c: c.fillna(c.median()))
        parts.append(block.to_numpy(dtype=float))
    if len(categorical):
        encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        parts.append(encoder.fit_transform(df[categorical].astype(str)))
    if not parts:
        raise ValueError("el dataset no tiene columnas utilizables")
    return np.hstack(parts)


def detect_anomalies(
    df: pd.DataFrame,
    *,
    top_k: int = 20,
    contamination: Union[float, str] = "auto",
) -> list[dict[str, Any]]:
    X = _encode(df)
    model = IsolationForest(contamination=contamination, random_state=0)
    model.fit(X)
    raw = -model.score_samples(X)  # mayor = más anómalo
    lo, hi = float(raw.min()), float(raw.max())
    norm = (raw - lo) / (hi - lo) if hi > lo else np.zeros_like(raw)
    order = np.argsort(raw)[::-1][:top_k]
    return [{"row_index": int(i), "score": round(float(norm[i]), 4)} for i in order]
