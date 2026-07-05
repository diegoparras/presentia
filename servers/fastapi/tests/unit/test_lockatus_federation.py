"""Tests del cliente OIDC de Lockatus y de la sesión federada (Suite Escriba)."""

import base64
import json
import time

import pytest

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from utils import lockatus, simple_auth
from utils.lockatus import LockatusClient

ISSUER = "http://lockatus.test:8081"
CLIENT_ID = "presentia"
REDIRECT = "http://presentia.test/api/v1/auth/sso/callback"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


@pytest.fixture()
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _jwk_from_public(public_key, kid="test-kid"):
    numbers = public_key.public_numbers()
    n = numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")
    e = numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, "big")
    return {"kty": "RSA", "kid": kid, "use": "sig", "alg": "RS256",
            "n": _b64url(n), "e": _b64url(e)}


def _sign_jwt(private_key, claims, kid="test-kid"):
    header = {"alg": "RS256", "kid": kid}
    h = _b64url(json.dumps(header).encode())
    p = _b64url(json.dumps(claims).encode())
    signature = private_key.sign(
        f"{h}.{p}".encode(), padding.PKCS1v15(), hashes.SHA256()
    )
    return f"{h}.{p}.{_b64url(signature)}"


def _client_with_key(rsa_key):
    client = LockatusClient(ISSUER, CLIENT_ID, REDIRECT)
    client._jwks = [_jwk_from_public(rsa_key.public_key())]
    client._jwks_fetched_at = time.time()
    return client


# ---- authorize_url ------------------------------------------------------------

def test_authorize_url_has_pkce_and_params():
    client = LockatusClient(ISSUER, CLIENT_ID, REDIRECT)
    url = client.authorize_url("st4te", "n0nce", "ch4llenge")
    assert url.startswith(f"{ISSUER}/authorize?")
    assert "client_id=presentia" in url
    assert "code_challenge=ch4llenge" in url
    assert "code_challenge_method=S256" in url
    assert "response_type=code" in url
    assert "state=st4te" in url


# ---- verify_jwt ---------------------------------------------------------------

def test_verify_jwt_accepts_valid_token(rsa_key):
    client = _client_with_key(rsa_key)
    now = int(time.time())
    token = _sign_jwt(rsa_key, {
        "iss": ISSUER, "aud": CLIENT_ID, "email": "user@escriba.test",
        "role": "admin", "nonce": "abc", "exp": now + 600, "iat": now,
    })
    import asyncio
    claims = asyncio.run(client.verify_jwt(token, audience=CLIENT_ID, nonce="abc"))
    assert claims["email"] == "user@escriba.test"
    assert claims["role"] == "admin"


def test_verify_jwt_rejects_bad_issuer(rsa_key):
    client = _client_with_key(rsa_key)
    now = int(time.time())
    token = _sign_jwt(rsa_key, {"iss": "http://evil", "aud": CLIENT_ID, "exp": now + 600})
    import asyncio
    with pytest.raises(Exception):
        asyncio.run(client.verify_jwt(token, audience=CLIENT_ID))


def test_verify_jwt_rejects_wrong_audience(rsa_key):
    client = _client_with_key(rsa_key)
    now = int(time.time())
    token = _sign_jwt(rsa_key, {"iss": ISSUER, "aud": "otra-app", "exp": now + 600})
    import asyncio
    with pytest.raises(Exception):
        asyncio.run(client.verify_jwt(token, audience=CLIENT_ID))


def test_verify_jwt_rejects_expired(rsa_key):
    client = _client_with_key(rsa_key)
    now = int(time.time())
    token = _sign_jwt(rsa_key, {"iss": ISSUER, "aud": CLIENT_ID, "exp": now - 10})
    import asyncio
    with pytest.raises(Exception):
        asyncio.run(client.verify_jwt(token, audience=CLIENT_ID))


def test_verify_jwt_rejects_tampered_signature(rsa_key):
    client = _client_with_key(rsa_key)
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = int(time.time())
    # Firmado con OTRA clave que no está en el JWKS
    token = _sign_jwt(other_key, {"iss": ISSUER, "aud": CLIENT_ID, "exp": now + 600})
    import asyncio
    with pytest.raises(Exception):
        asyncio.run(client.verify_jwt(token, audience=CLIENT_ID))


def test_verify_jwt_rejects_wrong_nonce(rsa_key):
    client = _client_with_key(rsa_key)
    now = int(time.time())
    token = _sign_jwt(rsa_key, {"iss": ISSUER, "aud": CLIENT_ID, "nonce": "real", "exp": now + 600})
    import asyncio
    with pytest.raises(Exception):
        asyncio.run(client.verify_jwt(token, audience=CLIENT_ID, nonce="fake"))


# ---- Sesión federada ----------------------------------------------------------

def test_federated_session_roundtrip(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "s" * 40)
    token = simple_auth.create_federated_session_token(
        "user@escriba.test", name="User", role="admin"
    )
    session = simple_auth.validate_federated_session_token(token)
    assert session is not None
    assert session["username"] == "user@escriba.test"
    assert session["role"] == "admin"


def test_federated_session_rejects_wrong_secret(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "s" * 40)
    token = simple_auth.create_federated_session_token("user@escriba.test")
    monkeypatch.setenv("SESSION_SECRET", "d" * 40)
    assert simple_auth.validate_federated_session_token(token) is None


def test_status_is_configured_in_federated_mode(monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "federado")
    monkeypatch.setenv("SESSION_SECRET", "s" * 40)
    status = simple_auth.get_auth_status(None)
    assert status["configured"] is True
    assert status["authenticated"] is False
    assert status["mode"] == "federated"


def test_oidc_transaction_cookie_roundtrip(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "s" * 40)
    monkeypatch.setenv("LOCKATUS_ISSUER", ISSUER)
    monkeypatch.setenv("LOCKATUS_CLIENT_ID", CLIENT_ID)
    monkeypatch.setenv("LOCKATUS_REDIRECT_URI", REDIRECT)
    lockatus.reset_lockatus_client()
    authorize_url, tx_cookie = lockatus.build_oidc_transaction()
    assert authorize_url.startswith(f"{ISSUER}/authorize?")
    tx = lockatus.read_oidc_transaction(tx_cookie)
    assert tx is not None and "verifier" in tx and "state" in tx
    assert f"state={tx['state']}" in authorize_url
    lockatus.reset_lockatus_client()
