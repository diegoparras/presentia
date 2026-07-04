"""
Catálogo de precios de modelos LLM (Suite Escriba, Fase 5).

USD por millón de tokens (entrada, salida). Versionado en el repo: cuando un
proveedor cambia precios, se actualiza acá y el commit deja el registro.
Precios de Anthropic verificados contra la documentación oficial (2026-06);
el resto proviene de las tablas públicas de cada proveedor y puede requerir
ajuste. Un modelo sin entrada en el catálogo reporta costo None (el panel
muestra solo tokens). Los proveedores locales cuestan 0.
"""

from typing import Optional, Tuple

# (input_usd_per_1m, output_usd_per_1m), matching por prefijo de model id
MODEL_PRICES: dict = {
    # Anthropic
    "claude-fable-5": (10.00, 50.00),
    "claude-opus-4-8": (5.00, 25.00),
    "claude-opus-4-7": (5.00, 25.00),
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-4-5": (5.00, 25.00),
    "claude-opus-4-1": (15.00, 75.00),
    "claude-sonnet-5": (3.00, 15.00),
    "claude-sonnet-4": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-3-5-sonnet": (3.00, 15.00),
    "claude-3-5-haiku": (0.80, 4.00),
    # OpenAI (aprox., tabla pública)
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
    "o3-mini": (1.10, 4.40),
    # Google (aprox.)
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-1.5-pro": (1.25, 5.00),
    # DeepSeek (aprox.)
    "deepseek-chat": (0.27, 1.10),
    "deepseek-reasoner": (0.55, 2.19),
}

# Proveedores locales/self-hosted: costo cero por definición
FREE_PROVIDERS = {"ollama", "lmstudio"}


def get_model_price(model: Optional[str]) -> Optional[Tuple[float, float]]:
    """Busca el precio por prefijo (los ids suelen traer sufijos de fecha)."""
    if not model:
        return None
    normalized = model.strip().lower()
    # Bedrock/Vertex anteponen prefijos tipo "anthropic." o "us.anthropic."
    for provider_prefix in ("us.anthropic.", "eu.anthropic.", "anthropic."):
        if normalized.startswith(provider_prefix):
            normalized = normalized[len(provider_prefix):]
            break
    best_match = None
    for prefix, price in MODEL_PRICES.items():
        if normalized.startswith(prefix):
            if best_match is None or len(prefix) > len(best_match[0]):
                best_match = (prefix, price)
    return best_match[1] if best_match else None


def estimate_cost_usd(
    provider: Optional[str],
    model: Optional[str],
    input_tokens: Optional[int],
    output_tokens: Optional[int],
) -> Optional[float]:
    """Costo estimado en USD, None si el modelo no está en el catálogo."""
    if provider and provider.strip().lower() in FREE_PROVIDERS:
        return 0.0
    price = get_model_price(model)
    if price is None:
        return None
    input_price, output_price = price
    cost = ((input_tokens or 0) / 1_000_000) * input_price
    cost += ((output_tokens or 0) / 1_000_000) * output_price
    return round(cost, 6)
