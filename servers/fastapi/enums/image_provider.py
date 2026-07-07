from enum import Enum


class ImageProvider(Enum):
    PEXELS = "pexels"
    PIXABAY = "pixabay"
    GEMINI_FLASH = "gemini_flash"
    NANOBANANA_PRO = "nanobanana_pro"
    DALLE3 = "dall-e-3"
    GPT_IMAGE_1_5 = "gpt-image-1.5"
    COMFYUI = "comfyui"
    OPEN_WEBUI = "open_webui"
    OPENAI_COMPATIBLE = "openai_compatible"
    # Provider-level entries: the concrete model is chosen by the user via
    # IMAGE_MODEL, instead of being baked into the provider (dall-e-3, etc.).
    OPENAI = "openai"
    GOOGLE = "google"
