"""Modelos de request/response (Pydantic v2)."""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field

Task = Literal["auto", "classification", "regression"]


class Dataset(BaseModel):
    columns: Optional[list[str]] = None
    rows: list[dict[str, Any]] = Field(..., min_length=1)


# ---- predict ---------------------------------------------------------------
class PredictOptions(BaseModel):
    n_estimators: Optional[int] = Field(default=None, ge=1, le=64)
    return_proba: bool = True


class PredictRequest(BaseModel):
    task: Task = "auto"
    target: str
    train: Dataset
    predict: Dataset
    options: PredictOptions = PredictOptions()


class PredictResponse(BaseModel):
    task: str
    predictions: list[Any]
    probabilities: Optional[list[dict[str, float]]] = None
    engine: str
    n_estimators: int
    latency_ms: int


# ---- importance ------------------------------------------------------------
class ImportanceOptions(BaseModel):
    n_repeats: int = Field(default=5, ge=1, le=50)
    n_estimators: Optional[int] = Field(default=None, ge=1, le=64)


class ImportanceRequest(BaseModel):
    task: Task = "auto"
    target: str
    dataset: Dataset
    options: ImportanceOptions = ImportanceOptions()


class FeatureImportanceModel(BaseModel):
    feature: str
    score: float
    std: float


class ImportanceResponse(BaseModel):
    task: str
    importance: list[FeatureImportanceModel]
    engine: str
    latency_ms: int


# ---- anomalies -------------------------------------------------------------
class AnomaliesOptions(BaseModel):
    top_k: int = Field(default=20, ge=1, le=1000)
    contamination: Union[float, Literal["auto"]] = "auto"


class AnomaliesRequest(BaseModel):
    dataset: Dataset
    options: AnomaliesOptions = AnomaliesOptions()


class AnomalyModel(BaseModel):
    row_index: int
    score: float


class AnomaliesResponse(BaseModel):
    method: str
    anomalies: list[AnomalyModel]
    latency_ms: int


# ---- validate --------------------------------------------------------------
class ValidateRequest(BaseModel):
    task: Task = "auto"
    target: str
    dataset: Dataset


class ValidateResponse(BaseModel):
    task: str
    metric: str
    value: float
    detail: dict[str, Any]
    engine: str
    latency_ms: int


# ---- health ----------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    engine: str
    device: str
    weights_loaded: bool
