"""
Selector guiado de modelos (Suite Escriba): recomendaciones por precio y
calidad a partir de las credenciales configuradas. La selección se aplica
con el mecanismo existente de userConfig (POST /api/user-config del
frontend), así que este endpoint es solo lectura.
"""

import os

from fastapi import APIRouter

from constants.model_catalog import (
    build_image_model_catalog,
    build_text_model_catalog,
)
from utils.llm_provider import get_llm_provider, get_model

MODEL_RECOMMENDATIONS_ROUTER = APIRouter(prefix="/models", tags=["Model Selector"])


@MODEL_RECOMMENDATIONS_ROUTER.get("/recommendations")
async def model_recommendations():
    try:
        current_provider = get_llm_provider().value
    except Exception:
        current_provider = None
    try:
        current_model = get_model()
    except Exception:
        current_model = None

    return {
        "text": {
            "current": {"provider": current_provider, "model": current_model},
            "models": build_text_model_catalog(),
        },
        "image": {
            "current": (os.getenv("IMAGE_PROVIDER") or "").strip() or None,
            "models": build_image_model_catalog(),
        },
    }
