"""Motor TabFM (google-research/tabfm, Apache 2.0), backend PyTorch.

`tabfm` se importa de forma perezosa: el servicio arranca aunque los pesos aún no
estén disponibles, y la descarga desde HuggingFace ocurre en la primera predicción.
La inferencia corre 100% local; los datos del usuario nunca salen del host.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .base import (
    FeatureImportance,
    PredictionEngine,
    PredictionResult,
    ValidationResult,
)


def _py(value: Any) -> Any:
    """numpy scalar -> tipo Python nativo, para serializar en JSON."""
    return value.item() if isinstance(value, np.generic) else value


class TabFMEngine(PredictionEngine):
    name = "tabfm-1.0.0"

    def __init__(self, device: str = "auto"):
        self._device = device
        self._clf_model = None
        self._reg_model = None

    # ---- carga perezosa de pesos -------------------------------------------
    def _backend(self):
        from tabfm import tabfm_v1_0_0_pytorch as backend  # noqa: PLC0415

        return backend

    def _clf_weights(self):
        if self._clf_model is None:
            self._clf_model = self._backend().load()
        return self._clf_model

    def _reg_weights(self):
        if self._reg_model is None:
            self._reg_model = self._backend().load(model_type="regression")
        return self._reg_model

    def _classifier(self, n_estimators: int):
        from tabfm import TabFMClassifier  # noqa: PLC0415

        return TabFMClassifier(model=self._clf_weights(), n_estimators=n_estimators)

    def _regressor(self, n_estimators: int):
        from tabfm import TabFMRegressor  # noqa: PLC0415

        return TabFMRegressor(model=self._reg_weights(), n_estimators=n_estimators)

    # ---- API ----------------------------------------------------------------
    def predict(self, X_train, y_train, X_pred, *, task, n_estimators, return_proba):
        if task == "classification":
            est = self._classifier(n_estimators)
            est.fit(X_train, y_train)
            predictions = [_py(p) for p in est.predict(X_pred)]
            probabilities = None
            classes = [str(c) for c in est.classes_]
            if return_proba:
                proba = np.asarray(est.predict_proba(X_pred))
                probabilities = [
                    {cls: float(p) for cls, p in zip(classes, row)} for row in proba
                ]
            return PredictionResult(task, predictions, probabilities, classes)

        est = self._regressor(n_estimators)
        est.fit(X_train, y_train)
        predictions = [float(p) for p in est.predict(X_pred)]
        return PredictionResult(task, predictions)

    def importance(self, X, y, *, task, n_repeats, n_estimators):
        from sklearn.inspection import permutation_importance  # noqa: PLC0415
        from sklearn.model_selection import train_test_split  # noqa: PLC0415

        stratify = y if task == "classification" else None
        X_fit, X_eval, y_fit, y_eval = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=stratify
        )
        if task == "classification":
            est = self._classifier(n_estimators)
            scoring = "accuracy"
        else:
            est = self._regressor(n_estimators)
            scoring = "r2"
        est.fit(X_fit, y_fit)
        result = permutation_importance(
            est, X_eval, y_eval, n_repeats=n_repeats, random_state=0, scoring=scoring
        )
        items = [
            FeatureImportance(str(col), float(mean), float(std))
            for col, mean, std in zip(
                X.columns, result.importances_mean, result.importances_std
            )
        ]
        items.sort(key=lambda f: f.score, reverse=True)
        return items

    def validate(self, X, y, *, task):
        # Out-of-fold sobre el propio train (sin fuga) vía predict_oof*.
        # NOTA: el manejo de shape del OOF queda por confirmar contra los pesos
        # reales (M0) — es defensivo ante 2D/3D.
        from sklearn.metrics import accuracy_score, r2_score  # noqa: PLC0415

        if task == "classification":
            est = self._classifier(self._default_n())
            est.fit(X, y)
            proba = np.asarray(est.predict_oof_proba())
            if proba.ndim == 3:  # [E, N, K] -> promedio sobre el ensemble
                proba = proba.mean(axis=0)
            preds = np.asarray(est.classes_)[proba.argmax(axis=1)]
            value = float(accuracy_score(y, preds))
            return ValidationResult(task, "accuracy", value, {"n_samples": int(len(y))})

        est = self._regressor(self._default_n())
        est.fit(X, y)
        oof = np.asarray(est.predict_oof())
        if oof.ndim == 2:  # [E, N] -> promedio sobre el ensemble
            oof = oof.mean(axis=0)
        value = float(r2_score(y, oof))
        return ValidationResult(task, "r2", value, {"n_samples": int(len(y))})

    def _default_n(self) -> int:
        return 8

    def health(self):
        return {
            "engine": self.name,
            "device": self._resolved_device(),
            "weights_loaded": self._clf_model is not None or self._reg_model is not None,
        }

    def _resolved_device(self) -> str:
        if self._device != "auto":
            return self._device
        try:
            import torch  # noqa: PLC0415

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"
