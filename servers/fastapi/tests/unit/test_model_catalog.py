from constants.model_catalog import (
    OPENROUTER_IDS,
    build_image_model_catalog,
    build_text_model_catalog,
)

ALL_KEYS = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "DEEPSEEK_API_KEY",
    "OLLAMA_URL",
    "OPENROUTER_API_KEY",
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


def test_openrouter_key_unlocks_catalog(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")

    models = {m["id"]: m for m in build_text_model_catalog()}
    assert models["gpt-4o"]["available"] is True
    assert models["gpt-4o"]["via"] == "openrouter"
    assert models["gpt-4o"]["openrouter_id"] == "openai/gpt-4o"
    assert models["claude-sonnet-5"]["available"] is True
    # Ollama es local: OpenRouter no lo habilita
    assert models["__ollama__"]["available"] is False
    assert models["__ollama__"]["via"] is None


def test_dead_gemini_slug_is_gone(monkeypatch):
    # google/gemini-2.0-flash-001 fue dado de baja en OpenRouter: no debe quedar
    # ningún slug muerto en el catálogo (rompía la generación con "No content").
    assert "gemini-2.0-flash" not in OPENROUTER_IDS
    assert "google/gemini-2.0-flash-001" not in OPENROUTER_IDS.values()


def test_flash_lite_replaces_it_and_is_selectable(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")

    models = {m["id"]: m for m in build_text_model_catalog()}
    assert "gemini-2.5-flash-lite" in models
    assert (
        models["gemini-2.5-flash-lite"]["openrouter_id"]
        == "google/gemini-2.5-flash-lite"
    )
    assert models["gemini-2.5-flash-lite"]["available"] is True


def test_direct_key_wins_over_openrouter(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    models = {m["id"]: m for m in build_text_model_catalog()}
    assert models["gpt-4o"]["via"] == "direct"
    assert models["claude-sonnet-5"]["via"] == "openrouter"
