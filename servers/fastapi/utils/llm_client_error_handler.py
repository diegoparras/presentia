from fastapi import HTTPException
from openai import APIError as OpenAIAPIError
from google.genai.errors import APIError as GoogleAPIError
import traceback

from llmai.shared.errors import BaseError as LLMAIBaseError
from utils.image_generation_error import openai_error_detail


def handle_llm_client_exceptions(e: Exception) -> HTTPException:
    traceback.print_exc()
    if isinstance(e, HTTPException):
        return e
    if isinstance(e, LLMAIBaseError):
        detail = e.message or ""
        # El proveedor respondió sin contenido: casi siempre es un modelo mal
        # elegido (slug dado de baja o sin soporte del formato pedido). Damos
        # un mensaje accionable en lugar del "No content returned" críptico.
        if "no content returned" in detail.lower():
            detail = (
                "El modelo configurado no devolvió contenido. Revisá tu selección "
                "de modelo en /models: el slug puede no existir (por ejemplo un "
                "modelo dado de baja en OpenRouter) o no soportar el formato pedido."
            )
        return HTTPException(status_code=e.status_code, detail=detail)
    if isinstance(e, OpenAIAPIError):
        return HTTPException(
            status_code=getattr(e, "status_code", None) or 500,
            detail=openai_error_detail(e, operation="API request"),
        )
    if isinstance(e, GoogleAPIError):
        return HTTPException(status_code=500, detail=f"Google API error: {e.message}")
    return HTTPException(status_code=500, detail=f"LLM API error: {e}")
