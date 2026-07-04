"""
Adapter for Escriba, the Suite Escriba document-to-markdown service.

Mirrors the LiteParseService contract (parse_to_markdown) so DocumentsLoader
can try Escriba first and fall back to the original parsers when the service
is disabled, unreachable or fails on a given file. With ESCRIBA_ENABLED unset
the adapter reports itself as disabled and Presenton behaves exactly like
vanilla upstream.
"""

import logging
import os
from typing import Optional

import aiohttp

from utils.get_env import (
    get_escriba_api_token_env,
    get_escriba_timeout_env,
    get_escriba_url_env,
    is_escriba_enabled_env,
)

LOGGER = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 600
HEALTH_TIMEOUT_SECONDS = 2

# DocumentsLoader speaks ISO 639-3 OCR codes; Escriba expects short codes or "auto".
_OCR_TO_ESCRIBA_LANG = {
    "spa": "es",
    "eng": "en",
    "por": "pt",
    "fra": "fr",
    "deu": "de",
    "ita": "it",
}


class EscribaParseError(Exception):
    pass


def ocr_code_to_escriba_lang(ocr_language: Optional[str]) -> str:
    if not ocr_language:
        return "auto"
    return _OCR_TO_ESCRIBA_LANG.get(ocr_language.strip().lower(), "auto")


class EscribaParseService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_token: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ):
        self.base_url = (base_url or get_escriba_url_env() or "").strip().rstrip("/")
        self.api_token = (api_token or get_escriba_api_token_env() or "").strip()
        self.timeout_seconds = timeout_seconds or self._timeout_from_env()
        self._available: Optional[bool] = None

    @staticmethod
    def _timeout_from_env() -> int:
        raw = (get_escriba_timeout_env() or "").strip()
        try:
            value = int(raw)
            return value if value > 0 else DEFAULT_TIMEOUT_SECONDS
        except ValueError:
            return DEFAULT_TIMEOUT_SECONDS

    @staticmethod
    def is_enabled() -> bool:
        return is_escriba_enabled_env() and bool((get_escriba_url_env() or "").strip())

    def _headers(self) -> dict:
        if self.api_token:
            return {"X-API-Key": self.api_token}
        return {}

    async def is_available(self) -> bool:
        """Health check against /api/health, cached per instance (one probe per request batch)."""
        if self._available is not None:
            return self._available
        try:
            timeout = aiohttp.ClientTimeout(total=HEALTH_TIMEOUT_SECONDS)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{self.base_url}/api/health") as response:
                    self._available = response.status == 200
        except Exception as exc:
            LOGGER.warning("[Escriba] Health check failed url=%s error=%s", self.base_url, exc)
            self._available = False
        return self._available

    async def parse_to_markdown(
        self,
        file_path: str,
        ocr_enabled: bool = True,
        ocr_language: str = "eng",
        dpi: Optional[int] = None,
    ) -> str:
        """Convert a document via Escriba's /api/convert. `dpi` is accepted for
        interface compatibility with LiteParseService; Escriba manages its own OCR."""
        url = f"{self.base_url}/api/convert"
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        try:
            with open(file_path, "rb") as file_handle:
                form = aiohttp.FormData()
                form.add_field("file", file_handle, filename=os.path.basename(file_path))
                form.add_field("lang", ocr_code_to_escriba_lang(ocr_language))
                if ocr_enabled:
                    form.add_field("ocr", "true")
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(url, data=form, headers=self._headers()) as response:
                        if response.status != 200:
                            detail = await self._error_detail(response)
                            raise EscribaParseError(
                                f"Escriba returned {response.status}: {detail}"
                            )
                        payload = await response.json(content_type=None)
        except EscribaParseError:
            raise
        except Exception as exc:
            raise EscribaParseError(f"Escriba request failed: {exc}") from exc

        markdown = payload.get("markdown") if isinstance(payload, dict) else None
        if not isinstance(markdown, str) or not markdown.strip():
            raise EscribaParseError("Escriba response did not include markdown content")
        return markdown

    @staticmethod
    async def _error_detail(response: aiohttp.ClientResponse) -> str:
        try:
            payload = await response.json(content_type=None)
            if isinstance(payload, dict) and payload.get("detail"):
                return str(payload["detail"])
        except Exception:
            pass
        return "no detail"
