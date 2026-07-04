"""
Instrumentación de usage/costos de llamadas LLM (Suite Escriba, Fase 5).

Piezas:
- Un contextvar de atribución (presentation_id, etapa, slide) que los handlers
  setean y que se propaga a tasks y threads (asyncio copia el contexto).
- Un extractor tolerante de usage: llmai devuelve ResponseUsage en las
  respuestas y usage acumulado en el evento final de streaming, pero la forma
  exacta varía por proveedor; este módulo fija el contrato con tests.
- Un buffer thread-safe de eventos (las llamadas corren en worker threads vía
  asyncio.to_thread) que se persiste con flush_usage_events() al final de la
  generación y al consultar el panel.

Se controla con LLM_USAGE_TRACKING (default: activo). Apagarlo deja a
Presentia comportándose como el vanilla: el usage se descarta.
"""

import logging
import os
import threading
from contextvars import ContextVar
from typing import Any, Dict, List, Optional

from constants.llm_pricing import estimate_cost_usd

LOGGER = logging.getLogger(__name__)

_SCOPE: ContextVar[dict] = ContextVar("llm_usage_scope", default={})

_INPUT_KEYS = ("input_tokens", "prompt_tokens", "inputTokens", "promptTokens")
_OUTPUT_KEYS = ("output_tokens", "completion_tokens", "outputTokens", "completionTokens")


def is_usage_tracking_enabled() -> bool:
    value = (os.getenv("LLM_USAGE_TRACKING") or "").strip().lower()
    return value not in {"false", "0", "no", "off"}


def set_usage_scope(**kwargs) -> None:
    """Mergea atribución en el contexto actual (presentation_id, stage, slide_index)."""
    current = dict(_SCOPE.get() or {})
    current.update({k: v for k, v in kwargs.items() if v is not None})
    _SCOPE.set(current)


def get_usage_scope() -> dict:
    return dict(_SCOPE.get() or {})


def _read_int(source: Any, keys: tuple) -> Optional[int]:
    for key in keys:
        if isinstance(source, dict):
            value = source.get(key)
        else:
            value = getattr(source, key, None)
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            return int(value)
    return None


def extract_usage(source: Any) -> Optional[Dict[str, int]]:
    """Extrae {input_tokens, output_tokens} de una respuesta o evento de llmai.

    Acepta el objeto respuesta (con .usage), el usage directo, o un evento de
    stream cuyo .usage viene en el chunk final. Devuelve None si no hay datos.
    """
    if source is None:
        return None
    usage = source
    nested = getattr(source, "usage", None) or (
        source.get("usage") if isinstance(source, dict) else None
    )
    if nested is not None:
        usage = nested

    input_tokens = _read_int(usage, _INPUT_KEYS)
    output_tokens = _read_int(usage, _OUTPUT_KEYS)
    if input_tokens is None and output_tokens is None:
        return None
    return {
        "input_tokens": input_tokens or 0,
        "output_tokens": output_tokens or 0,
    }


class UsageRecorder:
    """Buffer thread-safe: record_usage() puede llamarse desde worker threads;
    flush_usage_events() persiste desde el event loop con la sesión async."""

    def __init__(self):
        self._lock = threading.Lock()
        self._events: List[dict] = []

    def record(self, provider: Optional[str], model: Optional[str], usage: Dict[str, int]) -> None:
        scope = get_usage_scope()
        event = {
            "presentation_id": scope.get("presentation_id"),
            "stage": scope.get("stage") or "other",
            "slide_index": scope.get("slide_index"),
            "provider": provider,
            "model": model,
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "cost_usd": estimate_cost_usd(
                provider, model, usage.get("input_tokens"), usage.get("output_tokens")
            ),
        }
        with self._lock:
            self._events.append(event)

    def drain(self) -> List[dict]:
        with self._lock:
            events, self._events = self._events, []
        return events

    def pending_count(self) -> int:
        with self._lock:
            return len(self._events)


USAGE_RECORDER = UsageRecorder()


def record_usage(model: Optional[str], usage: Optional[Dict[str, int]]) -> None:
    """Punto único de registro; no-op si el tracking está apagado o no hay datos."""
    if not usage or not is_usage_tracking_enabled():
        return
    try:
        from utils.llm_provider import get_llm_provider

        provider = get_llm_provider().value
    except Exception:
        provider = None
    try:
        USAGE_RECORDER.record(provider, model, usage)
    except Exception as exc:
        LOGGER.warning("[LLMUsage] Failed to record usage event: %s", exc)


async def flush_usage_events(sql_session) -> int:
    """Persiste los eventos buffereados. Devuelve cuántos guardó."""
    events = USAGE_RECORDER.drain()
    if not events:
        return 0
    try:
        from models.sql.llm_usage_event import LLMUsageEventModel

        rows = [LLMUsageEventModel(**event) for event in events]
        sql_session.add_all(rows)
        await sql_session.commit()
        return len(rows)
    except Exception as exc:
        LOGGER.error("[LLMUsage] Failed to flush %s usage events: %s", len(events), exc)
        # Devolver los eventos al buffer para reintentarlos en el próximo flush
        with USAGE_RECORDER._lock:
            USAGE_RECORDER._events = events + USAGE_RECORDER._events
        return 0
