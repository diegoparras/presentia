import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.augur_service import (
    AugurError,
    AugurService,
    FeatureImportance,
    attach_insights,
)


class _AsyncCM:
    def __init__(self, obj):
        self.obj = obj

    async def __aenter__(self):
        return self.obj

    async def __aexit__(self, *args):
        return False


def _mock_client_session(response):
    session = MagicMock()
    session.post = MagicMock(return_value=_AsyncCM(response))
    return MagicMock(return_value=_AsyncCM(session)), session


def _mock_response(status=200, json_payload=None):
    response = MagicMock()
    response.status = status
    response.json = AsyncMock(return_value=json_payload)
    return response


def _service():
    return AugurService(base_url="http://augur:8000", token="secreto", timeout_seconds=30)


def _dataset():
    return {
        "columns": ["dias_inactivo", "plan", "churn"],
        "rows": [
            {"dias_inactivo": 3, "plan": "pro", "churn": "stay"},
            {"dias_inactivo": 60, "plan": "free", "churn": "churn"},
        ],
    }


# ---- Configuración -----------------------------------------------------------


def test_is_enabled_requires_flag_and_url(monkeypatch):
    monkeypatch.delenv("AUGUR_ENABLED", raising=False)
    monkeypatch.delenv("AUGUR_URL", raising=False)
    assert AugurService.is_enabled() is False

    monkeypatch.setenv("AUGUR_ENABLED", "true")
    assert AugurService.is_enabled() is False

    monkeypatch.setenv("AUGUR_URL", "http://augur:8000")
    assert AugurService.is_enabled() is True

    monkeypatch.setenv("AUGUR_ENABLED", "false")
    assert AugurService.is_enabled() is False


def test_int_env_fallbacks(monkeypatch):
    monkeypatch.setenv("AUGUR_TIMEOUT", "abc")
    monkeypatch.setenv("AUGUR_N_ESTIMATORS", "0")
    service = AugurService(base_url="http://x")
    assert service.timeout_seconds == 120
    assert service.n_estimators == 8

    monkeypatch.setenv("AUGUR_TIMEOUT", "45")
    monkeypatch.setenv("AUGUR_N_ESTIMATORS", "32")
    service = AugurService(base_url="http://x")
    assert service.timeout_seconds == 45
    assert service.n_estimators == 32


# ---- importance --------------------------------------------------------------


def test_importance_parses_items():
    response = _mock_response(
        200,
        {
            "task": "classification",
            "importance": [
                {"feature": "dias_inactivo", "score": 0.42, "std": 0.05},
                {"feature": "plan", "score": 0.1, "std": 0.02},
            ],
        },
    )
    factory, _ = _mock_client_session(response)
    with patch("services.augur_service.aiohttp.ClientSession", factory):
        items = asyncio.run(_service().importance(_dataset(), "churn"))

    assert items == [
        FeatureImportance("dias_inactivo", 0.42, 0.05),
        FeatureImportance("plan", 0.1, 0.02),
    ]


def test_importance_sends_token_and_payload():
    response = _mock_response(200, {"importance": []})
    factory, session = _mock_client_session(response)
    with patch("services.augur_service.aiohttp.ClientSession", factory):
        asyncio.run(_service().importance(_dataset(), "churn", n_repeats=7))

    call = session.post.call_args
    assert call.kwargs["headers"]["X-Augur-Token"] == "secreto"
    sent = call.kwargs["json"]
    assert sent["target"] == "churn"
    assert sent["dataset"]["columns"] == ["dias_inactivo", "plan", "churn"]
    assert sent["options"]["n_repeats"] == 7


def test_importance_raises_on_http_error():
    response = _mock_response(500, {"detail": "boom"})
    factory, _ = _mock_client_session(response)
    with patch("services.augur_service.aiohttp.ClientSession", factory):
        with pytest.raises(AugurError) as exc:
            asyncio.run(_service().importance(_dataset(), "churn"))
    assert "500" in str(exc.value)


def test_importance_wraps_connection_errors():
    with patch(
        "services.augur_service.aiohttp.ClientSession",
        MagicMock(side_effect=ConnectionError("refused")),
    ):
        with pytest.raises(AugurError):
            asyncio.run(_service().importance(_dataset(), "churn"))


# ---- attach_insights (graceful degradation) ----------------------------------


def test_attach_insights_noop_when_disabled(monkeypatch):
    monkeypatch.delenv("AUGUR_ENABLED", raising=False)
    dataset = _dataset()
    result = asyncio.run(attach_insights(dataset, "churn"))
    assert "augur" not in result


def _enable(monkeypatch):
    monkeypatch.setenv("AUGUR_ENABLED", "true")
    monkeypatch.setenv("AUGUR_URL", "http://augur:8000")


def test_attach_insights_populates_augur_key(monkeypatch):
    _enable(monkeypatch)
    with patch.object(
        AugurService,
        "importance",
        AsyncMock(return_value=[FeatureImportance("dias_inactivo", 0.42, 0.05)]),
    ):
        dataset = asyncio.run(attach_insights(_dataset(), "churn"))

    assert dataset["augur"]["importance"] == [
        {"feature": "dias_inactivo", "score": 0.42, "std": 0.05}
    ]


def test_attach_insights_degrades_gracefully_on_error(monkeypatch):
    _enable(monkeypatch)
    with patch.object(
        AugurService, "importance", AsyncMock(side_effect=AugurError("down"))
    ):
        dataset = asyncio.run(attach_insights(_dataset(), "churn"))

    # El deck debe generarse igual: sin insights, sin excepción.
    assert "augur" not in dataset
