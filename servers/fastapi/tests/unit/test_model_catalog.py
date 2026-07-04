from constants.model_catalog import (
    build_image_model_catalog,
    build_text_model_catalog,
)

ALL_KEYS = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "DEEPSEEK_API_KEY",
    "OLLAMA_URL",
    "PEXELS_API_KEY",
    "PIXABAY_API_KEY",
    "COMFYUI_URL",
]


def _clear(monkeypatch):
    for key in ALL_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_availability_follows_configured_keys(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")

    models = {m["id"]: m for m in build_text_model_catalog()}
    assert models["claude-sonnet-5"]["available"] is True
    assert models["gpt-4o"]["available"] is False
    assert "OpenAI" in models["gpt-4o"]["requirement"]


def test_badges_only_among_available(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")

    models = build_text_model_catalog()
    badged = {m["badge"] for m in models if m["badge"]}
    assert "quality" in badged
    # Ningún modelo no disponible lleva badge
    assert all(m["badge"] is None for m in models if not m["available"])
    # Mejor calidad entre los Anthropic disponibles: Fable 5 (q5, aunque más caro)
    quality_pick = next(m for m in models if m["badge"] == "quality")
    assert quality_pick["quality"] == 5
    assert quality_pick["provider"] == "anthropic"


def test_budget_badge_prefers_free_local(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setenv("OLLAMA_URL", "http://localhost:11434")

    models = build_text_model_catalog()
    budget = next(m for m in models if m["badge"] == "budget")
    assert budget["provider"] == "ollama"
    assert budget["blended_price"] == 0.0


def test_image_catalog_badges_and_prices(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("PEXELS_API_KEY", "px-test")

    models = {m["id"]: m for m in build_image_model_catalog()}
    assert models["gpt-image-1.5"]["available"] is True
    assert models["gpt-image-1.5"]["badge"] == "quality"
    # Pexels es gratis y está disponible: más económico
    assert models["pexels"]["badge"] == "budget"
    assert models["gemini_flash"]["available"] is False


def test_no_keys_means_no_badges(monkeypatch):
    _clear(monkeypatch)
    models = build_text_model_catalog()
    assert all(m["badge"] is None for m in models)
    assert all(m["available"] is False for m in models)
