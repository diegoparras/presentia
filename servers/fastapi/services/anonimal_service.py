"""
Sidecar for Anonimal, the Suite Escriba PII anonymization service.

Anonymizes user content and extracted document text before it reaches the
LLM provider (and Mem0). Unlike the Escriba parsing adapter, this service is
FAIL-CLOSED: when ANONIMAL_ENABLED is set and the service fails, generation
must abort instead of silently sending raw PII to the provider. Turning the
flag off is the only way to generate without anonymization, which keeps that
decision explicit.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Tuple

import aiohttp
from fastapi import HTTPException

from utils.get_env import (
    get_anonimal_engine_env,
    get_anonimal_mode_env,
    get_anonimal_timeout_env,
    get_anonimal_token_env,
    get_anonimal_url_env,
    is_anonimal_enabled_env,
)

LOGGER = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_MODE = "pseudo"
VALID_MODES = {"typed", "anon", "pseudo", "mask", "hash"}

FAIL_CLOSED_DETAIL = (
    "Anonymization service (Anonimal) is unavailable or failed. Generation was "
    "stopped to avoid sending un-anonymized content to the LLM provider. "
    "Check ANONIMAL_URL or disable ANONIMAL_ENABLED explicitly."
)


class AnonimalError(Exception):
    pass


@dataclass
class AnonymizationResult:
    text: str
    summary: dict = field(default_factory=dict)
    pseudonym_map: Optional[dict] = None


class AnonimalService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        mode: Optional[str] = None,
        engine: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ):
        self.base_url = (base_url or get_anonimal_url_env() or "").strip().rstrip("/")
        self.token = (token or get_anonimal_token_env() or "").strip()
        self.mode = self._resolve_mode(mode)
        self.engine = (engine or get_anonimal_engine_env() or "").strip() or None
        self.timeout_seconds = timeout_seconds or self._timeout_from_env()

    @staticmethod
    def _resolve_mode(mode: Optional[str]) -> str:
        value = (mode or get_anonimal_mode_env() or "").strip().lower() or DEFAULT_MODE
        if value not in VALID_MODES:
            LOGGER.warning(
                "[Anonimal] Invalid ANONIMAL_MODE=%s, using default '%s'",
                value,
                DEFAULT_MODE,
            )
            return DEFAULT_MODE
        return value

    @staticmethod
    def _timeout_from_env() -> int:
        raw = (get_anonimal_timeout_env() or "").strip()
        try:
            value = int(raw)
            return value if value > 0 else DEFAULT_TIMEOUT_SECONDS
        except ValueError:
            return DEFAULT_TIMEOUT_SECONDS

    @staticmethod
    def is_enabled() -> bool:
        return is_anonimal_enabled_env() and bool((get_anonimal_url_env() or "").strip())

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["X-Anonimal-Token"] = self.token
        return headers

    async def anonymize(self, text: str) -> AnonymizationResult:
        """Anonymize plain text via POST /anonymize. `mode` is always sent
        explicitly: without it Anonimal answers with its legacy detection-only
        contract, whose response shape is different."""
        if not text:
            return AnonymizationResult(text=text)

        payload: dict = {"text": text, "mode": self.mode}
        if self.engine:
            payload["engine"] = self.engine

        url = f"{self.base_url}/anonymize"
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=payload, headers=self._headers()) as response:
                    if response.status != 200:
                        detail = await self._error_detail(response)
                        raise AnonimalError(
                            f"Anonimal returned {response.status}: {detail}"
                        )
                    body = await response.json(content_type=None)
        except AnonimalError:
            raise
        except Exception as exc:
            raise AnonimalError(f"Anonimal request failed: {exc}") from exc

        output = body.get("output") if isinstance(body, dict) else None
        if not isinstance(output, str):
            raise AnonimalError("Anonimal response did not include anonymized output")

        return AnonymizationResult(
            text=output,
            summary=body.get("summary") or {},
            pseudonym_map=body.get("map"),
        )

    @staticmethod
    async def _error_detail(response: aiohttp.ClientResponse) -> str:
        try:
            body = await response.json(content_type=None)
            if isinstance(body, dict) and body.get("detail"):
                return str(body["detail"])
        except Exception:
            pass
        return "no detail"


async def anonymize_generation_inputs(
    content: Optional[str],
    additional_context: str,
) -> Tuple[Optional[str], str]:
    """Fail-closed helper for the generation handlers: anonymizes the user
    content and the extracted document text, or raises HTTPException(503) so
    nothing un-anonymized ever reaches the prompts or Mem0."""
    if not AnonimalService.is_enabled():
        return content, additional_context

    service = AnonimalService()
    try:
        anonymized_content = content
        if content and content.strip():
            result = await service.anonymize(content)
            anonymized_content = result.text
            LOGGER.info("[Anonimal] Content anonymized: %s", result.summary)

        anonymized_context = additional_context
        if additional_context and additional_context.strip():
            result = await service.anonymize(additional_context)
            anonymized_context = result.text
            LOGGER.info("[Anonimal] Document context anonymized: %s", result.summary)

        return anonymized_content, anonymized_context
    except AnonimalError as exc:
        LOGGER.error("[Anonimal] Anonymization failed, aborting generation: %s", exc)
        raise HTTPException(status_code=503, detail=FAIL_CLOSED_DETAIL) from exc
