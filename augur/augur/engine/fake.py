"""Motor determinista sin dependencias de pesos. Para tests/CI y smoke checks.

Devuelve la clase mayoritaria (clasificación) o la media (regresión). No pretende
ser preciso: existe para ejercitar el servicio end-to-end sin bajar TabFM.
"""

from __future__ import annotations

import pandas as pd

from .base import (
    FeatureImportance,
    PredictionEngine,
    PredictionResult,
    ValidationResult,
)


class FakeEngine(PredictionEngine):
    name = "fake"

    def predict(self, X_train, y_train, X_pred, *, task, n_estimators, return_proba):
        y = pd.Series(y_train)
        n = len(X_pred)
        if task == "classification":
            classes = sorted(y.astype(str).unique().tolist())
            majority = y.astype(str).mode().iloc[0]
            predictions = [majority] * n
            probabilities = None
            if return_proba:
                probabilities = [
                    {c: (1.0 if c == majority else 0.0) for c in classes}
                    for _ in range(n)
                ]
            return PredictionResult(task, predictions, probabilities, classes)
        mean = float(y.astype(float).mean())
        return PredictionResult(task, [mean] * n)

    def importance(self, X, y, *, task, n_repeats, n_estimators):
        return [FeatureImportance(str(c), 0.0, 0.0) for c in X.columns]

    def validate(self, X, y, *, task):
        metric = "accuracy" if task == "classification" else "r2"
        return ValidationResult(task, metric, 0.0, {"n_samples": int(len(y)), "note": "fake engine"})

    def health(self):
        return {"engine": self.name, "device": "cpu", "weights_loaded": True}
