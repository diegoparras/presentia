"""Contrato del motor de predicción. TabFM y TabPFN implementan esta interfaz."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

import pandas as pd


@dataclass
class PredictionResult:
    task: str
    predictions: list[Any]
    probabilities: Optional[list[dict[str, float]]] = None
    classes: Optional[list[str]] = None


@dataclass
class FeatureImportance:
    feature: str
    score: float
    std: float


@dataclass
class ValidationResult:
    task: str
    metric: str
    value: float
    detail: dict[str, Any] = field(default_factory=dict)


class PredictionEngine(ABC):
    """Interfaz que desacopla el servicio del modelo tabular concreto."""

    name: str = "base"

    @abstractmethod
    def predict(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_pred: pd.DataFrame,
        *,
        task: str,
        n_estimators: int,
        return_proba: bool,
    ) -> PredictionResult:
        ...

    @abstractmethod
    def importance(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        *,
        task: str,
        n_repeats: int,
        n_estimators: int,
    ) -> list[FeatureImportance]:
        ...

    @abstractmethod
    def validate(self, X: pd.DataFrame, y: pd.Series, *, task: str) -> ValidationResult:
        ...

    def health(self) -> dict[str, Any]:
        return {"engine": self.name, "device": "cpu", "weights_loaded": True}
