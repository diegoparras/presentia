"""
Sidecar for Augur, the Suite Escriba tabular-prediction service.

Given the dataset that already travels with a data-grounded presentation, Augur
computes verifiable, model-derived figures (feature importance / drivers,
predictions) that the deck can chart. Because a tabular foundation model produces
them — not the LLM — they fit the same "charts that can't hallucinate" contract:
the guard treats them as an allowed source alongside the raw dataset values.

Unlike Anonimal (fail-closed), this adapter DEGRADES GRACEFULLY: insights are
additive, so if Augur is disabled or unavailable the deck is generated exactly as
before, just without the extra insight figures. It never aborts a generation.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import aiohttp

from utils.get_env import (
    get_augur_n_estimators_env,
    get_augur_timeout_env,
    get_augur_token_env,
    get_augur_url_env,
    is_augur_enabled_env,
)

LOGGER = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_N_ESTIMATORS = 8


class AugurError(Exception):
    pass


@dataclass
class FeatureImportance:
    feature: str
    score: float
    std: float


class AugurService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
        n_estimators: Optional[int] = None,
    ):
        self.base_url = (base_url or get_augur_url_env() or "").strip().rstrip("/")
        self.token = (token or get_augur_token_env() or "").strip()
        self.timeout_seconds = timeout_seconds or self._int_from_env(
            get_augur_timeout_env(), DEFAULT_TIMEOUT_SECONDS
        )
        self.n_estimators = n_estimators or self._int_from_env(
            get_augur_n_estimators_env(), DEFAULT_N_ESTIMATORS
        )

    @staticmethod
    def _int_from_env(raw: Optional[str], default: int) -> int:
        try:
            value = int((raw or "").strip())
            return value if value > 0 else default
        except ValueError:
            return default

    @staticmethod
    def is_enabled() -> bool:
        return is_augur_enabled_env() and bool((get_augur_url_env() or "").strip())

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["X-Augur-Token"] = self.token
        return headers

    @staticmethod
    def _dataset_payload(dataset: Dict[str, Any]) -> Dict[str, Any]:
        """The canonical Presentia dataset already matches Augur's contract."""
        return {"columns": dataset.get("columns"), "rows": dataset.get("rows") or []}

    async def importance(
        self,
        dataset: Dict[str, Any],
        target: str,
        *,
        n_repeats: int = 5,
    ) -> List[FeatureImportance]:
        """POST /v1/importance -> drivers of `target`. Raises AugurError on failure."""
        payload = {
            "target": target,
            "dataset": self._dataset_payload(dataset),
            "options": {"n_repeats": n_repeats, "n_estimators": self.n_estimators},
        }
        body = await self._post("/v1/importance", payload)
        items = body.get("importance") if isinstance(body, dict) else None
        if not isinstance(items, list):
            raise AugurError("Augur response did not include an importance list")
        return [
            FeatureImportance(
                feature=str(item.get("feature")),
                score=float(item.get("score")),
                std=float(item.get("std", 0.0)),
            )
            for item in items
            if isinstance(item, dict) and item.get("feature") is not None
        ]

    async def _post(self, path: str, payload: dict) -> Any:
        url = f"{self.base_url}{path}"
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=payload, headers=self._headers()) as response:
                    if response.status != 200:
                        detail = await self._error_detail(response)
                        raise AugurError(f"Augur returned {response.status}: {detail}")
                    return await response.json(content_type=None)
        except AugurError:
            raise
        except Exception as exc:
            raise AugurError(f"Augur request failed: {exc}") from exc

    @staticmethod
    async def _error_detail(response: aiohttp.ClientResponse) -> str:
        try:
            body = await response.json(content_type=None)
            if isinstance(body, dict) and body.get("detail"):
                return str(body["detail"])
        except Exception:
            pass
        return "no detail"


async def attach_insights(dataset: Dict[str, Any], target: str) -> Dict[str, Any]:
    """Enrich a dataset in place with Augur insights, degrading gracefully.

    Populates ``dataset["augur"] = {"importance": [{feature, score, std}, ...]}``
    when Augur is enabled and answers. On any failure it logs and returns the
    dataset untouched — insights are additive and must never block a deck.
    Returns the (possibly enriched) dataset for convenience.
    """
    if not AugurService.is_enabled():
        return dataset
    try:
        importance = await AugurService().importance(dataset, target)
    except AugurError as exc:
        LOGGER.warning("[Augur] Skipping insights (%s)", exc)
        return dataset
    dataset["augur"] = {
        "importance": [
            {"feature": item.feature, "score": item.score, "std": item.std}
            for item in importance
        ]
    }
    LOGGER.info("[Augur] Attached %s importance scores", len(importance))
    return dataset
