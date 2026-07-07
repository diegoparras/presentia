"""Selección del motor por configuración."""

from __future__ import annotations

from ..config import Settings
from .base import PredictionEngine


def build_engine(settings: Settings) -> PredictionEngine:
    name = settings.engine.lower()
    if name == "tabfm":
        from .tabfm_engine import TabFMEngine

        return TabFMEngine(device=settings.device)
    if name == "fake":
        from .fake import FakeEngine

        return FakeEngine()
    raise ValueError(f"motor desconocido: {settings.engine!r} (usar 'tabfm' o 'fake')")
