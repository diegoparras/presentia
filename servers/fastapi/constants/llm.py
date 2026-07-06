OPENAI_URL = "https://api.openai.com/v1"

# Default models
DEFAULT_OPENAI_MODEL = "gpt-4.1"
DEFAULT_DEEPSEEK_MODEL = "deepseek-chat"
DEFAULT_GOOGLE_MODEL = "models/gemini-2.5-flash"
DEFAULT_VERTEX_MODEL = "gemini-2.5-flash"
DEFAULT_AZURE_MODEL = "gpt-4.1"
DEFAULT_BEDROCK_MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-chat"
DEFAULT_FIREWORKS_MODEL = "accounts/fireworks/models/llama-v3p1-8b-instruct"
DEFAULT_TOGETHER_MODEL = "openai/gpt-oss-20b"
DEFAULT_CEREBRAS_MODEL = "llama-3.3-70b"
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
DEFAULT_LITELLM_MODEL = "gpt-4.1"
DEFAULT_LMSTUDIO_MODEL = "openai/gpt-oss-20b"
SUPPORTED_CODEX_MODELS = {
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
}
DEFAULT_CODEX_MODEL = "gpt-5.5"

# OpenRouter da de baja slugs cada tanto. Cuando una config guardada (localhost o
# server) apunta a un slug muerto, OpenRouter responde vacío y la generación
# explota con "No content returned from LLM". Remapeamos los conocidos a su
# reemplazo vivo, en memoria, al resolver el modelo (auto-migración liviana).
DEAD_OPENROUTER_SLUGS = {
    "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
    "gemini-2.0-flash": "google/gemini-2.5-flash",
}

# Modelo conocido-bueno para reintentar si el elegido no devuelve contenido.
# Una sola API key de OpenRouter lo habilita; es rápido y barato.
FALLBACK_OPENROUTER_MODEL = "deepseek/deepseek-chat"
