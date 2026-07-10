import os
import logging
from typing import Literal
from urllib.parse import urlencode
import uuid

from pathvalidate import sanitize_filename

from models.presentation_and_path import PresentationAndPath
from utils.filename_utils import safe_export_basename
from utils.get_env import get_temp_directory_env
from services.export_task_service import EXPORT_TASK_SERVICE
from utils.runtime_limits import log_memory


LOGGER = logging.getLogger(__name__)


async def _embed_pptx_fonts(path: str) -> None:
    """Incrusta las Google Fonts usadas por el .pptx (best-effort, no fatal)."""
    import asyncio

    from utils.pptx_font_embed import embed_google_fonts_into_pptx

    try:
        count = await asyncio.to_thread(embed_google_fonts_into_pptx, path)
        if count:
            LOGGER.info("pptx export: %d familia(s) de fuentes incrustadas", count)
    except Exception as exc:  # noqa: BLE001 - el export vale más que el embed
        LOGGER.warning("pptx export: no se pudieron incrustar fuentes: %s", exc)


def _get_next_public_url() -> str:
    return (os.getenv("NEXT_PUBLIC_URL") or "").strip() or "http://127.0.0.1"


def _get_next_public_fastapi_url() -> str | None:
    value = (os.getenv("NEXT_PUBLIC_FAST_API") or "").strip()
    return value or None


def _build_presentation_export_url(
    presentation_id: uuid.UUID, cookie_header: str | None = None
) -> tuple[str, str | None]:
    params = {"id": str(presentation_id)}
    fastapi_url = _get_next_public_fastapi_url()
    if fastapi_url:
        params["fastapiUrl"] = fastapi_url
    export_url = f"{_get_next_public_url().rstrip('/')}/pdf-maker?{urlencode(params)}"
    if cookie_header:
        export_url = f"{export_url}#{urlencode({'exportCookie': cookie_header})}"
    return (
        export_url,
        fastapi_url,
    )


async def export_presentation(
    presentation_id: uuid.UUID,
    title: str,
    export_as: Literal["pptx", "pdf", "video"],
    cookie_header: str | None = None,
) -> PresentationAndPath:
    log_memory(
        LOGGER,
        "presentation.export.start",
        presentation_id=str(presentation_id),
        export_as=export_as,
    )
    export_url, fastapi_url = _build_presentation_export_url(
        presentation_id, cookie_header
    )
    name = (title or "").strip() or str(uuid.uuid4())

    # Flag-gated browser-free engine (Fase 3): freeze -> WeasyPrint PDF / native
    # PPTX. Falls back to the bundled Chromium exporter on any failure.
    from services import freeze_export_service as freeze_engine

    # Video export exists only in the freeze pipeline (PDF frames -> ffmpeg); the
    # bundled Chromium exporter has no video path, so force freeze and surface any
    # error instead of silently falling back to a format that can't produce mp4.
    is_video = export_as in ("video", "mp4")

    if freeze_engine.is_enabled() or is_video:
        try:
            import asyncio

            out_dir = os.path.join(
                get_temp_directory_env() or "/tmp", "presenton-freeze-export"
            )
            out_path = await asyncio.to_thread(
                freeze_engine.export,
                presentation_id,
                safe_export_basename(sanitize_filename(name)),
                export_as,
                out_dir,
                _get_next_public_url().rstrip("/"),
                fastapi_url or "",
            )
            if export_as == "pptx":
                await _embed_pptx_fonts(out_path)
            return PresentationAndPath(presentation_id=presentation_id, path=out_path)
        except Exception as exc:  # noqa: BLE001 - fall back to the default engine
            if is_video:
                # No bundled fallback can produce mp4 — report the real failure.
                LOGGER.error("video export failed: %s", exc)
                raise
            LOGGER.warning(
                "freeze export failed, falling back to bundled engine: %s", exc
            )

    export_result = await EXPORT_TASK_SERVICE.export_from_url(
        url=export_url,
        title=safe_export_basename(sanitize_filename(name)),
        export_as=export_as,
        fastapi_url=fastapi_url,
        cookie_header=cookie_header,
    )
    if export_as == "pptx":
        await _embed_pptx_fonts(export_result.path)
    log_memory(
        LOGGER,
        "presentation.export.finish",
        presentation_id=str(presentation_id),
        export_as=export_as,
    )
    return PresentationAndPath(
        presentation_id=presentation_id,
        path=export_result.path,
    )
