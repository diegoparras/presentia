"""Browser-free export orchestrator (Fase 3).

Runs the single headless freeze pass (node freeze_driver.cjs against /pdf-maker)
and then builds the deliverable in-process without a browser: a vectorial PDF via
WeasyPrint or a native-object PPTX via python-pptx.

This is an additive, flag-gated alternative to the bundled Chromium exporter. It
is selected with the env var PRESENTIA_EXPORT_ENGINE=freeze; otherwise the
existing engine is used untouched. If node/puppeteer-core is unavailable the
caller should fall back to the default engine (export_presentation handles this).
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
import uuid
from urllib.parse import urlencode

LOGGER = logging.getLogger(__name__)

_FREEZE_DIR = os.path.join(os.path.dirname(__file__), "freeze")
_DRIVER = os.path.join(_FREEZE_DIR, "freeze_driver.cjs")


def export_engine() -> str:
    return (os.getenv("PRESENTIA_EXPORT_ENGINE") or "").strip().lower()


def is_enabled() -> bool:
    return export_engine() == "freeze"


def _node_env(cookie_header: str | None = None) -> dict[str, str]:
    env = os.environ.copy()
    # puppeteer-core lives outside the app tree; let deployments point at it.
    node_path = os.getenv("FREEZE_NODE_PATH")
    if node_path:
        env["NODE_PATH"] = node_path
    # loopback must bypass the outbound proxy for the local dev server.
    env.setdefault("HTTPS_PROXY", "")
    env.setdefault("HTTP_PROXY", "")
    # Sesión del usuario para /pdf-maker (deployments con auth): viaja por env
    # (no argv) para no filtrarse en la lista de procesos.
    if cookie_header:
        env["FREEZE_COOKIE_HEADER"] = cookie_header
    return env


def _freeze(
    presentation_id: uuid.UUID,
    out_json: str,
    base_url: str,
    fastapi_url: str,
    cookie_header: str | None = None,
) -> list[dict]:
    chrome = os.getenv("FREEZE_CHROME_PATH") or os.getenv("CHROME_PATH") or ""
    cmd = ["node", _DRIVER, str(presentation_id), out_json, base_url, fastapi_url]
    if chrome:
        cmd.append(chrome)
    LOGGER.info("freeze.start id=%s", presentation_id)
    # Capturar stdout/stderr: el driver imprime "FREEZE FAIL: <motivo>" al
    # morir, y sin esto el 500 del export llega a los logs sin causa.
    proc = subprocess.run(
        cmd,
        env=_node_env(cookie_header),
        timeout=300,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        detail = ((proc.stderr or "") + "\n" + (proc.stdout or "")).strip()
        detail = detail[-1200:] if detail else "sin salida del driver"
        LOGGER.error("freeze driver failed (rc=%s): %s", proc.returncode, detail)
        raise RuntimeError(f"freeze driver failed (rc={proc.returncode}): {detail}")
    with open(out_json, encoding="utf-8") as fh:
        return json.load(fh)


def export(
    presentation_id: uuid.UUID,
    title: str,
    export_as: str,
    out_dir: str,
    base_url: str,
    fastapi_url: str,
    cookie_header: str | None = None,
    music_path: str | None = None,
    video_options: dict | None = None,
) -> str:
    """Freeze the deck and build <title>.<ext>; return the output path."""
    from services.freeze.build_pptx import build_pptx
    from services.freeze.weasy_pdf import build_pdf

    os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        frozen_json = os.path.join(tmp, "frozen.json")
        slides = _freeze(
            presentation_id, frozen_json, base_url, fastapi_url, cookie_header
        )
        if not slides:
            raise RuntimeError("freeze produced no slides")
        if export_as in ("video", "mp4"):
            ext = "mp4"
        elif export_as == "pdf":
            ext = "pdf"
        else:
            ext = "pptx"
        out_path = os.path.join(out_dir, f"{title or presentation_id}.{ext}")
        if export_as == "pdf":
            build_pdf(slides, out_path)
        elif export_as in ("video", "mp4"):
            from services.freeze.video import build_video

            build_video(
                slides, out_path, audio_path=music_path, **(video_options or {})
            )
        else:
            build_pptx(slides, out_path)
    LOGGER.info("freeze.export done id=%s -> %s", presentation_id, out_path)
    return out_path
