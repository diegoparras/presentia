"""
Catálogo curado de modelos para el selector guiado (Suite Escriba).

Cada entrada trae calidad (1 a 5, curación propia), precio (del catálogo de
pricing para texto; por imagen para los generadores) y qué credencial la
habilita. La disponibilidad se evalúa contra el entorno en el momento de la
consulta (el middleware de userConfig ya sincroniza las keys por request).
Los precios de imagen son aproximados y editables acá.
"""

import os
from typing import Optional

from constants.llm_pricing import get_model_price


def _has(env_key: str) -> bool:
    return bool((os.getenv(env_key) or "").strip())


# provider -> (env que lo habilita, etiqueta humana de la credencial)
TEXT_PROVIDER_REQUIREMENTS = {
    "anthropic": ("ANTHROPIC_API_KEY", "API key de Anthropic"),
    "openai": ("OPENAI_API_KEY", "API key de OpenAI"),
    "google": ("GOOGLE_API_KEY", "API key de Google"),
    "deepseek": ("DEEPSEEK_API_KEY", "API key de DeepSeek"),
    "ollama": ("OLLAMA_URL", "URL de Ollama"),
}

# id, provider, nombre, calidad 1-5, descripción corta
TEXT_MODELS = [
    ("claude-fable-5", "anthropic", "Claude Fable 5", 5, "El más capaz para trabajo exigente"),
    ("claude-opus-4-8", "anthropic", "Claude Opus 4.8", 5, "Máxima calidad Opus"),
    ("claude-sonnet-5", "anthropic", "Claude Sonnet 5", 4, "Casi Opus, mucho más barato"),
    ("claude-haiku-4-5", "anthropic", "Claude Haiku 4.5", 3, "Rápido y económico"),
    ("gpt-4.1", "openai", "GPT-4.1", 4, "Calidad alta de OpenAI"),
    ("gpt-4o", "openai", "GPT-4o", 4, "Multimodal equilibrado"),
    ("gpt-4o-mini", "openai", "GPT-4o mini", 2, "Muy barato para borradores"),
    ("gemini-2.5-pro", "google", "Gemini 2.5 Pro", 4, "Calidad alta de Google"),
    ("gemini-2.5-flash", "google", "Gemini 2.5 Flash", 3, "Veloz con buen nivel"),
    ("gemini-2.0-flash", "google", "Gemini 2.0 Flash", 2, "El más barato de Google"),
    ("deepseek-chat", "deepseek", "DeepSeek Chat", 3, "Gran relación precio-calidad"),
    ("__ollama__", "ollama", "Ollama (modelo local)", 3, "Gratis, corre en tu servidor"),
]

IMAGE_PROVIDER_REQUIREMENTS = {
    "dall-e-3": ("OPENAI_API_KEY", "API key de OpenAI"),
    "gpt-image-1.5": ("OPENAI_API_KEY", "API key de OpenAI"),
    "gemini_flash": ("GOOGLE_API_KEY", "API key de Google"),
    "pexels": ("PEXELS_API_KEY", "API key de Pexels"),
    "pixabay": ("PIXABAY_API_KEY", "API key de Pixabay"),
    "comfyui": ("COMFYUI_URL", "URL de ComfyUI"),
}

# id, nombre, calidad 1-5, precio USD por imagen (None = gratis/variable), descripción
IMAGE_MODELS = [
    ("gpt-image-1.5", "GPT Image 1.5", 5, 0.07, "La mejor generación, texto legible"),
    ("dall-e-3", "DALL-E 3", 4, 0.04, "Generación sólida y estable"),
    ("gemini_flash", "Gemini Flash Image", 4, 0.039, "Rápido y muy buen nivel"),
    ("comfyui", "ComfyUI (local)", 3, 0.0, "Gratis, corre en tu GPU"),
    ("pexels", "Pexels (stock)", 3, 0.0, "Fotos reales gratuitas"),
    ("pixabay", "Pixabay (stock)", 3, 0.0, "Fotos e ilustraciones gratis"),
]


def _blended_text_price(model_id: str, provider: str) -> Optional[float]:
    """Precio combinado por 1M (entrada + 3x salida), 0 para locales."""
    if provider == "ollama":
        return 0.0
    price = get_model_price(model_id)
    if price is None:
        return None
    input_price, output_price = price
    return input_price + 3 * output_price


def _assign_badges(models: list[dict]) -> None:
    """Marca Mejor calidad, Mejor precio-calidad y Más económico entre los
    disponibles con precio conocido."""
    available = [m for m in models if m["available"]]
    priced = [m for m in available if m["blended_price"] is not None]
    if not priced:
        return

    best_quality = max(priced, key=lambda m: (m["quality"], -m["blended_price"]))
    best_quality["badge"] = "quality"

    cheapest = min(priced, key=lambda m: (m["blended_price"], -m["quality"]))
    if cheapest is not best_quality:
        cheapest["badge"] = "budget"

    # Valor: mayor calidad por dólar entre los pagos; con precio 0 gana el local
    value_candidates = [
        m for m in priced if m["blended_price"] > 0 and m["quality"] >= 3
    ]
    if value_candidates:
        best_value = max(
            value_candidates, key=lambda m: m["quality"] / m["blended_price"]
        )
        if best_value.get("badge") is None:
            best_value["badge"] = "value"


def build_text_model_catalog() -> list[dict]:
    models = []
    for model_id, provider, name, quality, description in TEXT_MODELS:
        env_key, requirement = TEXT_PROVIDER_REQUIREMENTS[provider]
        price = get_model_price(model_id)
        models.append(
            {
                "id": model_id,
                "provider": provider,
                "name": name,
                "quality": quality,
                "description": description,
                "input_price": price[0] if price else (0.0 if provider == "ollama" else None),
                "output_price": price[1] if price else (0.0 if provider == "ollama" else None),
                "blended_price": _blended_text_price(model_id, provider),
                "available": _has(env_key),
                "requirement": requirement,
                "badge": None,
            }
        )
    _assign_badges(models)
    return models


def build_image_model_catalog() -> list[dict]:
    models = []
    for model_id, name, quality, price_per_image, description in IMAGE_MODELS:
        env_key, requirement = IMAGE_PROVIDER_REQUIREMENTS[model_id]
        models.append(
            {
                "id": model_id,
                "name": name,
                "quality": quality,
                "description": description,
                "price_per_image": price_per_image,
                "blended_price": price_per_image,
                "available": _has(env_key),
                "requirement": requirement,
                "badge": None,
            }
        )
    _assign_badges(models)
    return models
