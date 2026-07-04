import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from constants.llm_pricing import estimate_cost_usd, get_model_price
from services.llm_usage_service import (
    USAGE_RECORDER,
    extract_usage,
    flush_usage_events,
    record_usage,
    set_usage_scope,
)
from utils.llm_client import InstrumentedLLMClient


def setup_function():
    USAGE_RECORDER.drain()


# ---- Catálogo de precios -------------------------------------------------------


def test_price_lookup_matches_by_prefix():
    assert get_model_price("claude-sonnet-5") == (3.00, 15.00)
    assert get_model_price("claude-haiku-4-5-20251001") == (1.00, 5.00)
    assert get_model_price("gpt-4o-2024-08-06") == (2.50, 10.00)
    assert get_model_price("modelo-inventado") is None


def test_price_lookup_prefers_longest_prefix():
    # gpt-4o-mini no debe matchear el precio de gpt-4o
    assert get_model_price("gpt-4o-mini-2024-07-18") == (0.15, 0.60)


def test_price_lookup_strips_bedrock_prefix():
    assert get_model_price("us.anthropic.claude-opus-4-8") == (5.00, 25.00)


def test_price_lookup_strips_openrouter_vendor_prefix():
    assert get_model_price("openai/gpt-4o") == (2.50, 10.00)
    assert get_model_price("deepseek/deepseek-chat:free") == (0.27, 1.10)
    # Los slugs de Claude en OpenRouter usan puntos en la versión
    assert get_model_price("anthropic/claude-opus-4.8") == (5.00, 25.00)
    assert get_model_price("anthropic/claude-haiku-4.5") == (1.00, 5.00)


def test_estimate_cost_via_openrouter():
    assert estimate_cost_usd("openrouter", "openai/gpt-4o", 1_000_000, 1_000_000) == 12.5


def test_estimate_cost():
    # 1M de entrada + 1M de salida en Haiku 4.5 = 1 + 5
    assert estimate_cost_usd("anthropic", "claude-haiku-4-5", 1_000_000, 1_000_000) == 6.0
    assert estimate_cost_usd("ollama", "llama3", 5_000_000, 5_000_000) == 0.0
    assert estimate_cost_usd("custom", "modelo-inventado", 1000, 1000) is None


# ---- Extractor de usage --------------------------------------------------------


def test_extract_usage_from_response_object():
    response = SimpleNamespace(usage=SimpleNamespace(input_tokens=120, output_tokens=45))
    assert extract_usage(response) == {"input_tokens": 120, "output_tokens": 45}


def test_extract_usage_from_openai_style_dict():
    event = {"usage": {"prompt_tokens": 10, "completion_tokens": 20}}
    assert extract_usage(event) == {"input_tokens": 10, "output_tokens": 20}


def test_extract_usage_returns_none_without_data():
    assert extract_usage(SimpleNamespace(type="chunk", text="hola")) is None
    assert extract_usage(None) is None


# ---- Recorder y atribución -----------------------------------------------------


def test_record_usage_captures_scope_and_cost(monkeypatch):
    monkeypatch.delenv("LLM_USAGE_TRACKING", raising=False)
    set_usage_scope(presentation_id="pres-1", stage="slide", slide_index=3)
    record_usage("claude-haiku-4-5", {"input_tokens": 1_000_000, "output_tokens": 0})

    events = USAGE_RECORDER.drain()
    assert len(events) == 1
    event = events[0]
    assert event["presentation_id"] == "pres-1"
    assert event["stage"] == "slide"
    assert event["slide_index"] == 3
    assert event["input_tokens"] == 1_000_000
    assert event["cost_usd"] == 1.0


def test_record_usage_noop_when_disabled(monkeypatch):
    monkeypatch.setenv("LLM_USAGE_TRACKING", "false")
    record_usage("claude-haiku-4-5", {"input_tokens": 10, "output_tokens": 10})
    assert USAGE_RECORDER.pending_count() == 0


# ---- Cliente instrumentado -----------------------------------------------------


class _FakeClient:
    def __init__(self, response=None, events=None):
        self._response = response
        self._events = events or []
        self.custom_attr = "passthrough"

    def generate(self, **kwargs):
        if kwargs.get("stream"):
            return iter(self._events)
        return self._response


def test_instrumented_client_records_direct_call(monkeypatch):
    monkeypatch.delenv("LLM_USAGE_TRACKING", raising=False)
    response = SimpleNamespace(
        content="ok", usage=SimpleNamespace(input_tokens=50, output_tokens=25)
    )
    client = InstrumentedLLMClient(_FakeClient(response=response))

    result = client.generate(model="claude-haiku-4-5", messages=[])

    assert result is response
    events = USAGE_RECORDER.drain()
    assert len(events) == 1
    assert events[0]["input_tokens"] == 50
    assert events[0]["output_tokens"] == 25


def test_instrumented_client_records_stream_final_usage(monkeypatch):
    monkeypatch.delenv("LLM_USAGE_TRACKING", raising=False)
    stream_events = [
        SimpleNamespace(type="chunk", text="a"),
        SimpleNamespace(type="chunk", text="b"),
        SimpleNamespace(
            type="completion", usage=SimpleNamespace(input_tokens=300, output_tokens=120)
        ),
    ]
    client = InstrumentedLLMClient(_FakeClient(events=stream_events))

    consumed = list(client.generate(model="claude-sonnet-5", messages=[], stream=True))

    assert len(consumed) == 3
    events = USAGE_RECORDER.drain()
    assert len(events) == 1
    assert events[0]["input_tokens"] == 300
    assert events[0]["output_tokens"] == 120
    assert events[0]["model"] == "claude-sonnet-5"


def test_instrumented_client_passthrough_attributes():
    client = InstrumentedLLMClient(_FakeClient())
    assert client.custom_attr == "passthrough"


# ---- Flush ---------------------------------------------------------------------


def test_flush_persists_and_empties_buffer(monkeypatch):
    monkeypatch.delenv("LLM_USAGE_TRACKING", raising=False)
    set_usage_scope(presentation_id="pres-2", stage="outline")
    record_usage("claude-haiku-4-5", {"input_tokens": 5, "output_tokens": 5})

    session = MagicMock()
    session.add_all = MagicMock()
    session.commit = AsyncMock()

    saved = asyncio.run(flush_usage_events(session))

    assert saved == 1
    session.add_all.assert_called_once()
    rows = session.add_all.call_args.args[0]
    assert rows[0].presentation_id == "pres-2"
    assert USAGE_RECORDER.pending_count() == 0


def test_flush_with_empty_buffer_is_noop():
    session = MagicMock()
    saved = asyncio.run(flush_usage_events(session))
    assert saved == 0
    session.add_all.assert_not_called()
