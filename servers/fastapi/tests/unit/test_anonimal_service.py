import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from services.anonimal_service import (
    AnonimalError,
    AnonimalService,
    AnonymizationResult,
    anonymize_generation_inputs,
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
    return AnonimalService(
        base_url="http://anonimal:8000", token="secreto", timeout_seconds=30
    )


# ---- Configuración -----------------------------------------------------------


def test_is_enabled_requires_flag_and_url(monkeypatch):
    monkeypatch.delenv("ANONIMAL_ENABLED", raising=False)
    monkeypatch.delenv("ANONIMAL_URL", raising=False)
    assert AnonimalService.is_enabled() is False

    monkeypatch.setenv("ANONIMAL_ENABLED", "true")
    assert AnonimalService.is_enabled() is False

    monkeypatch.setenv("ANONIMAL_URL", "http://anonimal:8000")
    assert AnonimalService.is_enabled() is True

    monkeypatch.setenv("ANONIMAL_ENABLED", "false")
    assert AnonimalService.is_enabled() is False


def test_invalid_mode_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("ANONIMAL_MODE", "nope")
    assert AnonimalService(base_url="http://x").mode == "pseudo"

    monkeypatch.setenv("ANONIMAL_MODE", "typed")
    assert AnonimalService(base_url="http://x").mode == "typed"

    monkeypatch.delenv("ANONIMAL_MODE", raising=False)
    assert AnonimalService(base_url="http://x").mode == "pseudo"


def test_timeout_falls_back_to_default_on_invalid_value(monkeypatch):
    monkeypatch.setenv("ANONIMAL_TIMEOUT", "abc")
    assert AnonimalService(base_url="http://x").timeout_seconds == 120

    monkeypatch.setenv("ANONIMAL_TIMEOUT", "45")
    assert AnonimalService(base_url="http://x").timeout_seconds == 45


# ---- anonymize ---------------------------------------------------------------


def test_anonymize_returns_output_summary_and_map():
    response = _mock_response(
        200,
        {
            "output": "Email: «EMAIL_1»",
            "summary": {"EMAIL": 1},
            "map": {"«EMAIL_1»": "juan@acme.com"},
        },
    )
    factory, _ = _mock_client_session(response)

    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        result = asyncio.run(_service().anonymize("Email: juan@acme.com"))

    assert result.text == "Email: «EMAIL_1»"
    assert result.summary == {"EMAIL": 1}
    assert result.pseudonym_map == {"«EMAIL_1»": "juan@acme.com"}


def test_anonymize_always_sends_mode_explicitly():
    """Sin mode explícito, Anonimal responde con el contrato legacy de solo
    detección (otra forma de respuesta); este test protege ese contrato."""
    response = _mock_response(200, {"output": "ok", "summary": {}})
    factory, session = _mock_client_session(response)

    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        asyncio.run(_service().anonymize("texto"))

    sent_json = session.post.call_args.kwargs["json"]
    assert sent_json["mode"] in {"typed", "anon", "pseudo", "mask", "hash"}


def test_anonymize_sends_token_header():
    response = _mock_response(200, {"output": "ok"})
    factory, session = _mock_client_session(response)

    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        asyncio.run(_service().anonymize("texto"))

    headers = session.post.call_args.kwargs["headers"]
    assert headers["X-Anonimal-Token"] == "secreto"


def test_anonymize_raises_on_http_error():
    response = _mock_response(503, {"detail": "Motor ML no disponible."})
    factory, _ = _mock_client_session(response)

    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        with pytest.raises(AnonimalError) as exc:
            asyncio.run(_service().anonymize("texto"))

    assert "503" in str(exc.value)
    assert "Motor ML" in str(exc.value)


def test_anonymize_raises_on_missing_output():
    response = _mock_response(200, {"text": "contrato legacy sin output"})
    factory, _ = _mock_client_session(response)

    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        with pytest.raises(AnonimalError):
            asyncio.run(_service().anonymize("texto"))


def test_anonymize_wraps_connection_errors():
    with patch(
        "services.anonimal_service.aiohttp.ClientSession",
        MagicMock(side_effect=ConnectionError("refused")),
    ):
        with pytest.raises(AnonimalError):
            asyncio.run(_service().anonymize("texto"))


def test_anonymize_short_circuits_empty_text():
    factory = MagicMock()
    with patch("services.anonimal_service.aiohttp.ClientSession", factory):
        result = asyncio.run(_service().anonymize(""))

    assert result.text == ""
    factory.assert_not_called()


# ---- anonymize_generation_inputs (fail-closed) -------------------------------


def test_inputs_passthrough_when_disabled(monkeypatch):
    monkeypatch.delenv("ANONIMAL_ENABLED", raising=False)
    content, context = asyncio.run(
        anonymize_generation_inputs("hola juan@acme.com", "contexto")
    )
    assert content == "hola juan@acme.com"
    assert context == "contexto"


def _enable(monkeypatch):
    monkeypatch.setenv("ANONIMAL_ENABLED", "true")
    monkeypatch.setenv("ANONIMAL_URL", "http://anonimal:8000")


def test_inputs_anonymized_when_enabled(monkeypatch):
    _enable(monkeypatch)
    with patch.object(
        AnonimalService,
        "anonymize",
        AsyncMock(
            side_effect=[
                AnonymizationResult(text="contenido limpio", summary={"EMAIL": 1}),
                AnonymizationResult(text="contexto limpio", summary={}),
            ]
        ),
    ):
        content, context = asyncio.run(
            anonymize_generation_inputs("contenido sucio", "contexto sucio")
        )

    assert content == "contenido limpio"
    assert context == "contexto limpio"


def test_inputs_fail_closed_raises_503(monkeypatch):
    _enable(monkeypatch)
    with patch.object(
        AnonimalService,
        "anonymize",
        AsyncMock(side_effect=AnonimalError("boom")),
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(anonymize_generation_inputs("contenido", "contexto"))

    assert exc.value.status_code == 503
    assert "Anonimal" in exc.value.detail


def test_inputs_skips_empty_content_but_processes_context(monkeypatch):
    _enable(monkeypatch)
    mock = AsyncMock(return_value=AnonymizationResult(text="contexto limpio"))
    with patch.object(AnonimalService, "anonymize", mock):
        content, context = asyncio.run(anonymize_generation_inputs(None, "contexto"))

    assert content is None
    assert context == "contexto limpio"
    mock.assert_awaited_once()
