"""Resolución del modelo activo y fallback (Suite Escriba).

Cubre el fix del server: un slug de OpenRouter dado de baja se remapea a su
reemplazo vivo, el default es rápido y vivo, y hay un fallback conocido-bueno
para no tumbar la generación cuando el modelo elegido no devuelve nada.
"""

from utils.llm_provider import get_fallback_model, get_model


def _openrouter(monkeypatch, model=None):
    monkeypatch.setenv("LLM", "openrouter")
    if model is None:
        monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    else:
        monkeypatch.setenv("OPENROUTER_MODEL", model)


def test_dead_openrouter_slug_is_remapped(monkeypatch):
    _openrouter(monkeypatch, "google/gemini-2.0-flash-001")
    assert get_model() == "google/gemini-2.5-flash"


def test_live_slug_passes_through(monkeypatch):
    _openrouter(monkeypatch, "deepseek/deepseek-chat")
    assert get_model() == "deepseek/deepseek-chat"


def test_default_openrouter_model_is_fast_and_live(monkeypatch):
    _openrouter(monkeypatch, None)
    assert get_model() == "deepseek/deepseek-chat"


def test_fallback_for_openrouter_and_not_itself(monkeypatch):
    _openrouter(monkeypatch, "deepseek/deepseek-chat")
    assert get_fallback_model("openai/gpt-4o") == "deepseek/deepseek-chat"
    # Si ya estamos en el modelo de fallback, no reintentamos el mismo.
    assert get_fallback_model("deepseek/deepseek-chat") is None


def test_no_fallback_for_direct_provider(monkeypatch):
    monkeypatch.setenv("LLM", "openai")
    assert get_fallback_model("gpt-4o") is None
