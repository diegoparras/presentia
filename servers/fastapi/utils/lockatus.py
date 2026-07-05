"""
Cliente OIDC de Lockatus — federación de identidad de la Suite Escriba.

Presentia se federa con Lockatus (el hub de SSO de la suite) usando el
Authorization Code Flow con PKCE (S256), como cliente público (sin secret).
Los tokens se firman con RS256 y se validan offline contra el JWKS del hub.

Este módulo es el cliente: arma la URL de authorize, canjea el code por
tokens y valida los JWT. La sesión resultante se emite reusando la cookie de
sesión propia de Presentia (ver utils/simple_auth.py), así el resto de la app
no distingue entre login local y federado.

Solo se activa con AUTH_MODE=federado; en modo local (default, el de Presenton
vanilla) nada de esto corre.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any, Optional
from urllib.parse import urlencode

import aiohttp
from fastapi import HTTPException

from utils.get_env import (
    get_cookie_secure_env,
    get_lockatus_client_id_env,
    get_lockatus_issuer_env,
    get_lockatus_redirect_uri_env,
    get_session_secret_env,
    is_federation_enabled,
)
from utils.oauth.pkce import generate_pkce

JWKS_CACHE_TTL_SECONDS = 3600
OIDC_TX_COOKIE_NAME = "presenton_oidc_tx"
OIDC_TX_TTL_SECONDS = 600


def _b64url_decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


@dataclass(frozen=True)
class FederatedIdentity:
    """Usuario resuelto por Lockatus tras validar los tokens."""

    email: str
    name: Optional[str]
    role: Optional[str]
    subject: Optional[str]


class LockatusClient:
    """Cliente OIDC contra un issuer de Lockatus.

    El JWKS se cachea en memoria por instancia; el issuer, client_id y
    redirect_uri vienen de las env vars de federación.
    """

    def __init__(self, issuer: str, client_id: str, redirect_uri: str):
        self.issuer = issuer.rstrip("/")
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self._jwks: list[dict] = []
        self._jwks_fetched_at: float = 0.0

    # ---- Front-channel: URL de authorize ---------------------------------
    def authorize_url(self, state: str, nonce: str, challenge: str) -> str:
        query = urlencode(
            {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": "openid email",
                "state": state,
                "nonce": nonce,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{self.issuer}/authorize?{query}"

    # ---- Back-channel: canje del code por tokens -------------------------
    async def exchange(self, code: str, verifier: str) -> dict[str, Any]:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15)
        ) as session:
            async with session.post(
                f"{self.issuer}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "client_id": self.client_id,
                    "code_verifier": verifier,
                },
            ) as response:
                if response.status >= 400:
                    detail = (await response.text())[:300]
                    raise HTTPException(
                        status_code=502,
                        detail=f"Lockatus token exchange failed: {detail}",
                    )
                payload = await response.json(content_type=None)
        if not isinstance(payload, dict) or "id_token" not in payload:
            raise HTTPException(status_code=502, detail="Lockatus returned no id_token")
        return payload

    # ---- JWKS (cacheado) -------------------------------------------------
    async def _keys(self) -> list[dict]:
        now = time.time()
        if self._jwks and (now - self._jwks_fetched_at) < JWKS_CACHE_TTL_SECONDS:
            return self._jwks
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15)
        ) as session:
            async with session.get(f"{self.issuer}/jwks.json") as response:
                if response.status >= 400:
                    raise HTTPException(
                        status_code=502, detail="Could not fetch Lockatus JWKS"
                    )
                data = await response.json(content_type=None)
        keys = data.get("keys", []) if isinstance(data, dict) else []
        self._jwks = keys
        self._jwks_fetched_at = now
        return keys

    # ---- Validación de un JWT RS256 --------------------------------------
    async def verify_jwt(
        self,
        token: str,
        *,
        audience: Optional[str] = None,
        nonce: Optional[str] = None,
    ) -> dict[str, Any]:
        # Import perezoso: cryptography solo se necesita cuando se federa.
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding, rsa

        try:
            header_b64, payload_b64, signature_b64 = token.split(".")
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Malformed token") from exc

        header = json.loads(_b64url_decode(header_b64))
        keys = await self._keys()
        kid = header.get("kid")
        jwk = next(
            (k for k in keys if k.get("kid") == kid),
            keys[0] if keys else None,
        )
        if not jwk:
            raise HTTPException(status_code=401, detail="No matching JWKS key")

        modulus = int.from_bytes(_b64url_decode(jwk["n"]), "big")
        exponent = int.from_bytes(_b64url_decode(jwk["e"]), "big")
        public_key = rsa.RSAPublicNumbers(exponent, modulus).public_key()

        try:
            public_key.verify(
                _b64url_decode(signature_b64),
                f"{header_b64}.{payload_b64}".encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid token signature") from exc

        claims = json.loads(_b64url_decode(payload_b64))

        if claims.get("iss") != self.issuer:
            raise HTTPException(status_code=401, detail="Invalid token issuer")

        audiences = claims.get("aud")
        audiences = audiences if isinstance(audiences, list) else [audiences]
        if audience and audience not in audiences:
            raise HTTPException(status_code=401, detail="Invalid token audience")

        expires_at = claims.get("exp")
        if isinstance(expires_at, (int, float)) and expires_at < time.time():
            raise HTTPException(status_code=401, detail="Token expired")

        if nonce is not None and claims.get("nonce") != nonce:
            raise HTTPException(status_code=401, detail="Invalid token nonce")

        return claims


# --------------------------------------------------------------------------
# Instancia y config
# --------------------------------------------------------------------------

_client: Optional[LockatusClient] = None


def get_lockatus_client() -> LockatusClient:
    """Devuelve el cliente Lockatus configurado, o corta con 400 si el modo
    federado está mal configurado."""
    global _client
    if _client is not None:
        return _client

    issuer = (get_lockatus_issuer_env() or "").strip()
    client_id = (get_lockatus_client_id_env() or "").strip()
    redirect_uri = (get_lockatus_redirect_uri_env() or "").strip()
    if not (issuer and client_id and redirect_uri):
        raise HTTPException(
            status_code=400,
            detail=(
                "Federation is misconfigured: set LOCKATUS_ISSUER, "
                "LOCKATUS_CLIENT_ID and LOCKATUS_REDIRECT_URI."
            ),
        )
    _client = LockatusClient(issuer, client_id, redirect_uri)
    return _client


def reset_lockatus_client() -> None:
    """Limpia la instancia cacheada (para tests)."""
    global _client
    _client = None


def _federation_secret() -> str:
    secret = (get_session_secret_env() or "").strip()
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="Federation requires SESSION_SECRET to sign sessions.",
        )
    return secret


# ---- Cookie de transacción OIDC (verifier/state/nonce, firmada) ----------

def _sign(payload: dict) -> str:
    secret = _federation_secret()
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256)
    return f"{body}.{_b64url_encode(signature.digest())}"


def _unsign(value: Optional[str]) -> Optional[dict]:
    if not value or "." not in value:
        return None
    secret = _federation_secret()
    body, _, signature = value.rpartition(".")
    expected = hmac.new(
        secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256
    ).digest()
    try:
        if not hmac.compare_digest(_b64url_decode(signature), expected):
            return None
        payload = json.loads(_b64url_decode(body))
    except Exception:
        return None
    expires_at = payload.get("exp")
    if isinstance(expires_at, (int, float)) and expires_at < time.time():
        return None
    return payload


def build_oidc_transaction() -> tuple[str, str]:
    """Genera PKCE + state + nonce, devuelve (authorize_url, tx_cookie)."""
    client = get_lockatus_client()
    verifier, challenge = generate_pkce()
    state = _b64url_encode(hashlib.sha256(verifier.encode()).digest())[:24]
    nonce = _b64url_encode(hashlib.sha256((verifier + "n").encode()).digest())[:24]
    tx_cookie = _sign(
        {
            "verifier": verifier,
            "state": state,
            "nonce": nonce,
            "exp": time.time() + OIDC_TX_TTL_SECONDS,
        }
    )
    return client.authorize_url(state, nonce, challenge), tx_cookie


def read_oidc_transaction(cookie_value: Optional[str]) -> Optional[dict]:
    return _unsign(cookie_value)


async def resolve_federated_identity(
    code: str, tx: dict, returned_state: str
) -> FederatedIdentity:
    """Canjea el code y valida los tokens; devuelve el usuario federado."""
    if not code or returned_state != tx.get("state"):
        raise HTTPException(status_code=400, detail="Invalid OIDC state")

    client = get_lockatus_client()
    tokens = await client.exchange(code, tx["verifier"])
    id_claims = await client.verify_jwt(
        tokens["id_token"], audience=client.client_id, nonce=tx.get("nonce")
    )
    access_claims: dict[str, Any] = {}
    if tokens.get("access_token"):
        access_claims = await client.verify_jwt(
            tokens["access_token"], audience=client.client_id
        )

    email = id_claims.get("email") or access_claims.get("email") or id_claims.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Lockatus token has no identity")

    return FederatedIdentity(
        email=str(email),
        name=id_claims.get("name"),
        role=access_claims.get("role") or id_claims.get("role"),
        subject=id_claims.get("sub"),
    )


__all__ = [
    "FederatedIdentity",
    "LockatusClient",
    "OIDC_TX_COOKIE_NAME",
    "OIDC_TX_TTL_SECONDS",
    "build_oidc_transaction",
    "get_lockatus_client",
    "is_federation_enabled",
    "read_oidc_transaction",
    "reset_lockatus_client",
    "resolve_federated_identity",
]
