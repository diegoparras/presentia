"""Parseo de payloads a DataFrame y detección de tarea (clasificación/regresión)."""

from typing import Any, Optional

import pandas as pd
from pandas.api import types as pdt


def to_frame(rows: list[dict[str, Any]], columns: Optional[list[str]] = None) -> pd.DataFrame:
    """Construye un DataFrame; si se dan columnas, fija su orden."""
    df = pd.DataFrame(rows)
    if columns:
        df = df.reindex(columns=columns)
    return df


def detect_task(y: pd.Series) -> str:
    """Heurística de auto-detección; el cliente siempre puede forzar la tarea.

    - No numérico / booleano / categórico  -> clasificación.
    - Numérico con pocos valores enteros distintos -> clasificación.
    - Resto -> regresión.
    """
    non_null = y.dropna()
    if non_null.empty:
        return "classification"
    # Cualquier cosa no numérica (string/object/category) o booleana -> clasificación.
    # Nota: pandas 3.0 usa StringDtype por defecto, no 'object'.
    if not pdt.is_numeric_dtype(y) or pdt.is_bool_dtype(y):
        return "classification"
    n_unique = non_null.nunique()
    is_integer_like = bool((non_null % 1 == 0).all())
    if n_unique <= 20 and is_integer_like:
        return "classification"
    return "regression"


def resolve_task(requested: str, y: pd.Series) -> str:
    return detect_task(y) if requested == "auto" else requested
