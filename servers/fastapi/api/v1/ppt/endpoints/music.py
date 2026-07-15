"""Biblioteca de música de fondo para los exports a video.

Persistente e invisible en cuanto al almacenamiento: disco del servidor o
bucket S3/R2 según PRESENTIA_S3_* (ver services.music_library).
"""
import asyncio
import os
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from services import music_library

MUSIC_ROUTER = APIRouter(prefix="/music", tags=["Music"])


@MUSIC_ROUTER.get("/file/{name}")
async def download_music(name: str):
    """Descarga una pista con el dominio propio (streamea desde S3 o disco)."""
    from urllib.parse import quote

    if not music_library.is_valid_name(name):
        raise HTTPException(400, "Nombre de pista inválido")
    opened = await asyncio.to_thread(music_library.open_track, name)
    if not opened:
        raise HTTPException(404, "Pista no encontrada")
    chunks, content_type, length = opened
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}"}
    if length:
        headers["Content-Length"] = str(length)
    return StreamingResponse(chunks, media_type=content_type, headers=headers)


@MUSIC_ROUTER.get("", response_model=List[str])
async def list_music():
    try:
        return await asyncio.to_thread(music_library.list_names)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"No se pudo listar la biblioteca de música: {exc}")


@MUSIC_ROUTER.post("/upload")
async def upload_music(file: UploadFile = File(...)):
    name = file.filename or ""
    ext = os.path.splitext(name)[1].lower()
    if ext not in music_library.AUDIO_EXTENSIONS:
        raise HTTPException(
            400,
            f"Formato de audio no soportado ({ext or 'sin extensión'}). "
            f"Aceptados: {', '.join(sorted(music_library.AUDIO_EXTENSIONS))}",
        )
    content = await file.read()
    if len(content) > music_library.AUDIO_MAX_BYTES:
        raise HTTPException(400, "El audio no puede superar los 30MB")
    try:
        stored = await asyncio.to_thread(music_library.save, content, name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"No se pudo guardar la pista: {exc}")
    return {"name": stored}


@MUSIC_ROUTER.delete("/{name}", status_code=204)
async def delete_music(name: str):
    if not music_library.is_valid_name(name):
        raise HTTPException(400, "Nombre de pista inválido")
    try:
        deleted = await asyncio.to_thread(music_library.delete, name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"No se pudo borrar la pista: {exc}")
    if not deleted:
        raise HTTPException(404, "Pista no encontrada")
