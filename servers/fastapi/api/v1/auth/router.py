from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse, RedirectResponse

from utils.simple_auth import (
    clear_session_cookie,
    create_federated_session_token,
    create_session_token,
    get_auth_status,
    get_basic_auth_credentials_from_request,
    get_session_token_from_request,
    is_auth_configured,
    set_session_cookie,
    setup_initial_credentials,
    verify_credentials,
)
from utils.get_env import get_cookie_secure_env, is_disable_auth_enabled, is_federation_enabled

API_V1_AUTH_ROUTER = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

SSO_LOGIN_PATH = "/api/v1/auth/sso/login"


class AuthCredentialsRequest(BaseModel):
    username: str = Field(min_length=3, max_length=128)
    password: str = Field(min_length=6, max_length=256)


@API_V1_AUTH_ROUTER.get("/status")
async def get_status(request: Request):
    if is_disable_auth_enabled():
        return {
            "configured": True,
            "authenticated": True,
            "username": "electron",
            "mode": "disabled",
        }
    token = get_session_token_from_request(request)
    status = get_auth_status(token)
    if is_federation_enabled():
        status["sso_login_url"] = SSO_LOGIN_PATH
    return status


@API_V1_AUTH_ROUTER.get("/verify")
async def verify_session(request: Request):
    if is_disable_auth_enabled():
        return {"authenticated": True, "username": "electron"}

    auth_status = get_auth_status(get_session_token_from_request(request))
    if not auth_status["configured"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not auth_status["authenticated"]:
        basic_credentials = get_basic_auth_credentials_from_request(request)
        if basic_credentials and verify_credentials(
            basic_credentials[0], basic_credentials[1]
        ):
            return {
                "authenticated": True,
                "username": basic_credentials[0].strip(),
            }
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "authenticated": True,
        "username": auth_status.get("username"),
    }


@API_V1_AUTH_ROUTER.post("/setup")
async def setup_credentials(body: AuthCredentialsRequest, request: Request):
    if is_auth_configured():
        raise HTTPException(status_code=409, detail="Credentials already configured")

    try:
        setup_initial_credentials(body.username, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    username = body.username.strip()
    return JSONResponse(
        {
            "configured": True,
            "authenticated": False,
            "username": username,
        }
    )


@API_V1_AUTH_ROUTER.post("/login")
async def login(body: AuthCredentialsRequest, request: Request):
    if not is_auth_configured():
        raise HTTPException(status_code=428, detail="Login setup is required")

    if not verify_credentials(body.username, body.password):
        raise HTTPException(status_code=401, detail="Unauthorized")

    username = body.username.strip()
    token = create_session_token(username)
    response = JSONResponse(
        {
            "configured": True,
            "authenticated": True,
            "username": username,
            "access_token": token,
            "token_type": "bearer",
        }
    )
    set_session_cookie(response, token, request)
    return response


@API_V1_AUTH_ROUTER.post("/logout")
async def logout(request: Request):
    response = JSONResponse({"success": True})
    clear_session_cookie(response, request)
    return response


# --------------------------------------------------------------------------
# SSO federado con Lockatus (solo activo con AUTH_MODE=federado)
# --------------------------------------------------------------------------

@API_V1_AUTH_ROUTER.get("/sso/login")
async def sso_login():
    """Inicia el Authorization Code Flow con PKCE: redirige a Lockatus."""
    if not is_federation_enabled():
        raise HTTPException(status_code=404, detail="Federation is not enabled")

    from utils.lockatus import (
        OIDC_TX_COOKIE_NAME,
        OIDC_TX_TTL_SECONDS,
        build_oidc_transaction,
    )

    authorize_url, tx_cookie = build_oidc_transaction()
    response = RedirectResponse(authorize_url, status_code=302)
    response.set_cookie(
        key=OIDC_TX_COOKIE_NAME,
        value=tx_cookie,
        max_age=OIDC_TX_TTL_SECONDS,
        httponly=True,
        secure=get_cookie_secure_env(),
        samesite="lax",
        path="/",
    )
    return response


@API_V1_AUTH_ROUTER.get("/sso/callback")
async def sso_callback(request: Request):
    """Vuelta de Lockatus: canjea el code, valida los tokens y crea la sesión."""
    if not is_federation_enabled():
        raise HTTPException(status_code=404, detail="Federation is not enabled")

    from utils.lockatus import (
        OIDC_TX_COOKIE_NAME,
        read_oidc_transaction,
        resolve_federated_identity,
    )

    error = request.query_params.get("error")
    if error:
        return RedirectResponse(f"/?reason=sso_error&error={error}", status_code=302)

    tx = read_oidc_transaction(request.cookies.get(OIDC_TX_COOKIE_NAME))
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    if not tx or not code or not state:
        return RedirectResponse("/?reason=sso_expired", status_code=302)

    try:
        identity = await resolve_federated_identity(code, tx, state)
    except HTTPException:
        return RedirectResponse("/?reason=sso_failed", status_code=302)

    token = create_federated_session_token(
        identity.email, name=identity.name, role=identity.role
    )
    response = RedirectResponse("/", status_code=302)
    set_session_cookie(response, token, request)
    response.delete_cookie(OIDC_TX_COOKIE_NAME, path="/")
    return response
