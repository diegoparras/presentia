"""Aplicación FastAPI de Augur."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException

from . import schemas
from .anomaly import METHOD as ANOMALY_METHOD
from .anomaly import detect_anomalies
from .config import Settings, get_settings
from .dataset import resolve_task, to_frame
from .deps import get_engine, require_token
from .engine.base import PredictionEngine
from .engine.registry import build_engine


def _elapsed_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def _frame_from(dataset: schemas.Dataset):
    return to_frame(dataset.rows, dataset.columns)


def _check_size(n_rows: int, n_features: int, settings: Settings) -> None:
    if n_rows > settings.max_rows:
        raise HTTPException(413, f"{n_rows} filas supera el máximo ({settings.max_rows})")
    if n_features > settings.max_features:
        raise HTTPException(
            413, f"{n_features} features supera el máximo ({settings.max_features})"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.engine = build_engine(settings)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Augur",
        version="0.1.0",
        summary="Predicción tabular zero-shot, self-hosted, sin alucinar.",
        lifespan=lifespan,
    )

    @app.get("/v1/health", response_model=schemas.HealthResponse)
    def health(engine: PredictionEngine = Depends(get_engine)):
        info = engine.health()
        return schemas.HealthResponse(status="ok", **info)

    @app.post(
        "/v1/predict",
        response_model=schemas.PredictResponse,
        dependencies=[Depends(require_token)],
    )
    def predict(
        req: schemas.PredictRequest,
        engine: PredictionEngine = Depends(get_engine),
        settings: Settings = Depends(get_settings),
    ):
        start = time.perf_counter()
        train = _frame_from(req.train)
        if req.target not in train.columns:
            raise HTTPException(422, f"target '{req.target}' no está en el train")
        _check_size(len(train), train.shape[1] - 1, settings)

        X_train = train.drop(columns=[req.target])
        y_train = train[req.target]
        pred = _frame_from(req.predict).drop(columns=[req.target], errors="ignore")
        X_pred = pred.reindex(columns=X_train.columns)

        task = resolve_task(req.task, y_train)
        n_estimators = req.options.n_estimators or settings.n_estimators
        result = engine.predict(
            X_train,
            y_train,
            X_pred,
            task=task,
            n_estimators=n_estimators,
            return_proba=req.options.return_proba,
        )
        return schemas.PredictResponse(
            task=result.task,
            predictions=result.predictions,
            probabilities=result.probabilities,
            engine=engine.name,
            n_estimators=n_estimators,
            latency_ms=_elapsed_ms(start),
        )

    @app.post(
        "/v1/importance",
        response_model=schemas.ImportanceResponse,
        dependencies=[Depends(require_token)],
    )
    def importance(
        req: schemas.ImportanceRequest,
        engine: PredictionEngine = Depends(get_engine),
        settings: Settings = Depends(get_settings),
    ):
        start = time.perf_counter()
        df = _frame_from(req.dataset)
        if req.target not in df.columns:
            raise HTTPException(422, f"target '{req.target}' no está en el dataset")
        _check_size(len(df), df.shape[1] - 1, settings)

        X = df.drop(columns=[req.target])
        y = df[req.target]
        task = resolve_task(req.task, y)
        n_estimators = req.options.n_estimators or settings.n_estimators
        items = engine.importance(
            X, y, task=task, n_repeats=req.options.n_repeats, n_estimators=n_estimators
        )
        return schemas.ImportanceResponse(
            task=task,
            importance=[
                schemas.FeatureImportanceModel(feature=i.feature, score=i.score, std=i.std)
                for i in items
            ],
            engine=engine.name,
            latency_ms=_elapsed_ms(start),
        )

    @app.post(
        "/v1/anomalies",
        response_model=schemas.AnomaliesResponse,
        dependencies=[Depends(require_token)],
    )
    def anomalies(
        req: schemas.AnomaliesRequest,
        settings: Settings = Depends(get_settings),
    ):
        start = time.perf_counter()
        df = _frame_from(req.dataset)
        _check_size(len(df), df.shape[1], settings)
        try:
            found = detect_anomalies(
                df, top_k=req.options.top_k, contamination=req.options.contamination
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        return schemas.AnomaliesResponse(
            method=ANOMALY_METHOD,
            anomalies=[schemas.AnomalyModel(**a) for a in found],
            latency_ms=_elapsed_ms(start),
        )

    @app.post(
        "/v1/validate",
        response_model=schemas.ValidateResponse,
        dependencies=[Depends(require_token)],
    )
    def validate(
        req: schemas.ValidateRequest,
        engine: PredictionEngine = Depends(get_engine),
        settings: Settings = Depends(get_settings),
    ):
        start = time.perf_counter()
        df = _frame_from(req.dataset)
        if req.target not in df.columns:
            raise HTTPException(422, f"target '{req.target}' no está en el dataset")
        _check_size(len(df), df.shape[1] - 1, settings)

        X = df.drop(columns=[req.target])
        y = df[req.target]
        task = resolve_task(req.task, y)
        result = engine.validate(X, y, task=task)
        return schemas.ValidateResponse(
            task=result.task,
            metric=result.metric,
            value=result.value,
            detail=result.detail,
            engine=engine.name,
            latency_ms=_elapsed_ms(start),
        )

    return app


app = create_app()
