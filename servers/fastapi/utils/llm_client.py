"""
Cliente LLM instrumentado (Suite Escriba, Fase 5).

Reemplazo drop-in de llmai.get_client: envuelve el cliente en un proxy que
intercepta generate() para registrar usage (tokens y costo estimado) en el
UsageRecorder, tanto en llamadas directas como en streaming (donde el usage
acumulado viaja en el evento final). Es el único punto de intercepción para
todos los call sites del backend. Con LLM_USAGE_TRACKING apagado devuelve el
cliente original sin envolver.
"""

import logging
from typing import Any

from services.llm_usage_service import (
    extract_usage,
    is_usage_tracking_enabled,
    record_usage,
)

LOGGER = logging.getLogger(__name__)


class InstrumentedLLMClient:
    def __init__(self, client: Any):
        self._client = client

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)

    def generate(self, **kwargs):
        model = kwargs.get("model")
        if kwargs.get("stream"):
            return self._generate_stream(model, kwargs)
        response = self._client.generate(**kwargs)
        try:
            record_usage(model, extract_usage(response))
        except Exception as exc:
            LOGGER.warning("[LLMUsage] usage capture failed: %s", exc)
        return response

    def _generate_stream(self, model, kwargs):
        last_usage = None
        for event in self._client.generate(**kwargs):
            try:
                usage = extract_usage(event)
                if usage:
                    last_usage = usage
            except Exception:
                pass
            yield event
        try:
            record_usage(model, last_usage)
        except Exception as exc:
            LOGGER.warning("[LLMUsage] stream usage capture failed: %s", exc)


def get_client(*args, **kwargs):
    """Firma passthrough de llmai.get_client, con instrumentación opcional."""
    from llmai import get_client as llmai_get_client

    client = llmai_get_client(*args, **kwargs)
    if not is_usage_tracking_enabled():
        return client
    return InstrumentedLLMClient(client)
