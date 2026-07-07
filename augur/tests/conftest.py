"""Fixtures de test: cliente con el motor 'fake' (no baja pesos de HuggingFace)."""

import os

import pytest

os.environ["AUGUR_ENGINE"] = "fake"
os.environ.setdefault("AUGUR_N_ESTIMATORS", "8")

from fastapi.testclient import TestClient  # noqa: E402

from augur.config import get_settings  # noqa: E402
from augur.main import create_app  # noqa: E402


@pytest.fixture
def client():
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
