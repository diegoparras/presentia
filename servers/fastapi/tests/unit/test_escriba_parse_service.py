import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.documents_loader import DocumentsLoader
from services.escriba_parse_service import (
    EscribaParseError,
    EscribaParseService,
    ocr_code_to_escriba_lang,
)
from services.temp_file_service import TEMP_FILE_SERVICE


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
    session.get = MagicMock(return_value=_AsyncCM(response))
    return MagicMock(return_value=_AsyncCM(session))


def _mock_response(status=200, json_payload=None):
    response = MagicMock()
    response.status = status
    response.json = AsyncMock(return_value=json_payload)
    return response


# ---- Configuración -----------------------------------------------------------


def test_is_enabled_requires_flag_and_url(monkeypatch):
    monkeypatch.delenv("ESCRIBA_ENABLED", raising=False)
    monkeypatch.delenv("ESCRIBA_URL", raising=False)
    assert EscribaParseService.is_enabled() is False

    monkeypatch.setenv("ESCRIBA_ENABLED", "true")
    assert EscribaParseService.is_enabled() is False

    monkeypatch.setenv("ESCRIBA_URL", "http://escriba:8000")
    assert EscribaParseService.is_enabled() is True

    monkeypatch.setenv("ESCRIBA_ENABLED", "false")
    assert EscribaParseService.is_enabled() is False


def test_ocr_code_maps_to_escriba_lang():
    assert ocr_code_to_escriba_lang("spa") == "es"
    assert ocr_code_to_escriba_lang("ENG") == "en"
    assert ocr_code_to_escriba_lang("jpn") == "auto"
    assert ocr_code_to_escriba_lang(None) == "auto"
    assert ocr_code_to_escriba_lang("") == "auto"


def test_timeout_falls_back_to_default_on_invalid_value(monkeypatch):
    monkeypatch.setenv("ESCRIBA_TIMEOUT", "not-a-number")
    assert EscribaParseService(base_url="http://x").timeout_seconds == 600

    monkeypatch.setenv("ESCRIBA_TIMEOUT", "-5")
    assert EscribaParseService(base_url="http://x").timeout_seconds == 600

    monkeypatch.setenv("ESCRIBA_TIMEOUT", "120")
    assert EscribaParseService(base_url="http://x").timeout_seconds == 120


# ---- parse_to_markdown -------------------------------------------------------


def _service():
    return EscribaParseService(
        base_url="http://escriba:8000", api_token="token", timeout_seconds=30
    )


def test_parse_to_markdown_returns_markdown(tmp_path):
    source = tmp_path / "doc.pdf"
    source.write_bytes(b"pdf-bytes")
    response = _mock_response(200, {"markdown": "# Hola\n\nContenido."})

    with patch(
        "services.escriba_parse_service.aiohttp.ClientSession",
        _mock_client_session(response),
    ):
        result = asyncio.run(_service().parse_to_markdown(str(source), ocr_language="spa"))

    assert result == "# Hola\n\nContenido."


def test_parse_to_markdown_raises_on_http_error(tmp_path):
    source = tmp_path / "doc.pdf"
    source.write_bytes(b"pdf-bytes")
    response = _mock_response(503, {"detail": "Anonimizador no disponible"})

    with patch(
        "services.escriba_parse_service.aiohttp.ClientSession",
        _mock_client_session(response),
    ):
        with pytest.raises(EscribaParseError) as exc:
            asyncio.run(_service().parse_to_markdown(str(source)))

    assert "503" in str(exc.value)
    assert "Anonimizador no disponible" in str(exc.value)


def test_parse_to_markdown_raises_on_missing_markdown(tmp_path):
    source = tmp_path / "doc.pdf"
    source.write_bytes(b"pdf-bytes")
    response = _mock_response(200, {"source": "doc.pdf"})

    with patch(
        "services.escriba_parse_service.aiohttp.ClientSession",
        _mock_client_session(response),
    ):
        with pytest.raises(EscribaParseError):
            asyncio.run(_service().parse_to_markdown(str(source)))


def test_parse_to_markdown_wraps_connection_errors(tmp_path):
    source = tmp_path / "doc.pdf"
    source.write_bytes(b"pdf-bytes")
    session = MagicMock()
    session.post = MagicMock(side_effect=ConnectionError("refused"))

    with patch(
        "services.escriba_parse_service.aiohttp.ClientSession",
        MagicMock(return_value=_AsyncCM(session)),
    ):
        with pytest.raises(EscribaParseError):
            asyncio.run(_service().parse_to_markdown(str(source)))


def test_is_available_caches_result():
    response = _mock_response(200)
    session_factory = _mock_client_session(response)
    service = _service()

    with patch("services.escriba_parse_service.aiohttp.ClientSession", session_factory):
        assert asyncio.run(service.is_available()) is True
        assert asyncio.run(service.is_available()) is True

    assert session_factory.call_count == 1


def test_is_available_false_on_connection_error():
    service = _service()
    with patch(
        "services.escriba_parse_service.aiohttp.ClientSession",
        MagicMock(side_effect=ConnectionError("refused")),
    ):
        assert asyncio.run(service.is_available()) is False


# ---- Integración con DocumentsLoader -----------------------------------------


def _office_loader(tmp_path, monkeypatch):
    managed_dir = tmp_path / "presenton-temp"
    managed_dir.mkdir()
    monkeypatch.setattr(TEMP_FILE_SERVICE, "base_dir", str(managed_dir))
    upload_dir = TEMP_FILE_SERVICE.create_temp_dir("upload-case")
    office_file = TEMP_FILE_SERVICE.create_temp_file("deck.pptx", b"pptx", upload_dir)
    return DocumentsLoader(file_paths=[office_file]), office_file


def test_loader_without_flag_has_no_escriba_service(monkeypatch):
    monkeypatch.delenv("ESCRIBA_ENABLED", raising=False)
    loader = DocumentsLoader(file_paths=[])
    assert loader.escriba_service is None


@patch("services.documents_loader.DocumentsLoader.load_office_document")
def test_loader_uses_escriba_when_available(mock_office, tmp_path, monkeypatch):
    loader, _ = _office_loader(tmp_path, monkeypatch)
    loader.escriba_service = MagicMock()
    loader.escriba_service.is_available = AsyncMock(return_value=True)
    loader.escriba_service.parse_to_markdown = AsyncMock(return_value="# Desde Escriba")

    asyncio.run(loader.load_documents())

    assert loader.documents == ["# Desde Escriba"]
    mock_office.assert_not_called()


@patch("services.documents_loader.DocumentsLoader.load_office_document")
def test_loader_falls_back_when_escriba_fails(mock_office, tmp_path, monkeypatch):
    mock_office.return_value = "texto local"
    loader, office_file = _office_loader(tmp_path, monkeypatch)
    loader.escriba_service = MagicMock()
    loader.escriba_service.is_available = AsyncMock(return_value=True)
    loader.escriba_service.parse_to_markdown = AsyncMock(
        side_effect=EscribaParseError("boom")
    )

    asyncio.run(loader.load_documents())

    assert loader.documents == ["texto local"]
    mock_office.assert_called_once_with(office_file)


@patch("services.documents_loader.DocumentsLoader.load_office_document")
def test_loader_skips_escriba_when_unavailable(mock_office, tmp_path, monkeypatch):
    mock_office.return_value = "texto local"
    loader, _ = _office_loader(tmp_path, monkeypatch)
    loader.escriba_service = MagicMock()
    loader.escriba_service.is_available = AsyncMock(return_value=False)
    loader.escriba_service.parse_to_markdown = AsyncMock()

    asyncio.run(loader.load_documents())

    assert loader.documents == ["texto local"]
    loader.escriba_service.parse_to_markdown.assert_not_called()


def test_loader_keeps_text_files_local(tmp_path, monkeypatch):
    managed_dir = tmp_path / "presenton-temp"
    managed_dir.mkdir()
    monkeypatch.setattr(TEMP_FILE_SERVICE, "base_dir", str(managed_dir))
    upload_dir = TEMP_FILE_SERVICE.create_temp_dir("upload-case")
    text_file = TEMP_FILE_SERVICE.create_temp_file("notes.txt", b"hola mundo", upload_dir)
    loader = DocumentsLoader(file_paths=[text_file])
    loader.escriba_service = MagicMock()
    loader.escriba_service.is_available = AsyncMock(return_value=True)
    loader.escriba_service.parse_to_markdown = AsyncMock()

    asyncio.run(loader.load_documents())

    assert loader.documents == ["hola mundo"]
    loader.escriba_service.parse_to_markdown.assert_not_called()
