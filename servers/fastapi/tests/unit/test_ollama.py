import aiohttp
import pytest
from fastapi import HTTPException

from utils import ollama


class _FailingRequest:
    async def __aenter__(self):
        raise aiohttp.ClientConnectionError("connection refused")

    async def __aexit__(self, *_args):
        return False


class _FailingClientSession:
    def __init__(self, *_args, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    def get(self, *_args, **_kwargs):
        return _FailingRequest()

    def post(self, *_args, **_kwargs):
        return _FailingRequest()


@pytest.mark.asyncio
async def test_list_models_returns_service_unavailable_when_ollama_is_unreachable(
    monkeypatch,
):
    monkeypatch.setenv("OLLAMA_URL", "http://host.docker.internal:11434/")
    monkeypatch.setattr(ollama.aiohttp, "ClientSession", _FailingClientSession)

    with pytest.raises(HTTPException) as exc_info:
        await ollama.list_pulled_ollama_models()

    assert exc_info.value.status_code == 503
    assert "http://host.docker.internal:11434" in exc_info.value.detail
    assert "instead of localhost" in exc_info.value.detail


@pytest.mark.asyncio
async def test_pull_model_returns_service_unavailable_when_ollama_is_unreachable(
    monkeypatch,
):
    monkeypatch.setenv("OLLAMA_URL", "http://host.docker.internal:11434")
    monkeypatch.setattr(ollama.aiohttp, "ClientSession", _FailingClientSession)

    with pytest.raises(HTTPException) as exc_info:
        await anext(ollama.pull_ollama_model("llama3:8b"))

    assert exc_info.value.status_code == 503
