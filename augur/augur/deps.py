"""Dependencias FastAPI: motor compartido y auth opcional por token."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, Request

from .config import Settings, get_settings
from .engine.base import PredictionEngine


def get_engine(request: Request) -> PredictionEngine:
    return request.app.state.engine


def require_token(
    settings: Settings = Depends(get_settings),
    x_augur_token: Optional[str] = Header(default=None),
) -> None:
    if settings.token and x_augur_token != settings.token:
        raise HTTPException(status_code=401, detail="X-Augur-Token inválido o ausente")
