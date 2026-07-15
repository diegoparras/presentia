"""Librería personalizada: los archivos del usuario agrupados por tipo.

Junta en una sola vista los exports (videos MP4 y documentos PDF/PPTX, en
S3/R2 o disco según PRESENTIA_S3_*), las imágenes subidas por el usuario
(ImageAsset con is_uploaded=True) y la biblioteca de música. Todas las URLs
de descarga son del propio dominio: nunca se expone el bucket.
"""
import asyncio
import os
from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.sql.image_asset import ImageAsset
from services import export_storage, music_library
from services.database import get_async_session
from utils.asset_directory_utils import (
    filesystem_image_path_to_app_data_url,
    get_exports_directory,
)

LIBRARY_ROUTER = APIRouter(prefix="/library", tags=["Library"])

_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".mkv"}


def _is_plain_name(name: str) -> bool:
    return bool(name) and "/" not in name and "\\" not in name and ".." not in name


def _list_export_entries() -> tuple[list[dict], bool]:
    """Devuelve (entradas, via_s3). En modo S3 el disco local no persiste exports."""
    s3_entries = export_storage.list_exports()
    if s3_entries is not None:
        return s3_entries, True
    exports_dir = get_exports_directory()
    entries: list[dict] = []
    for f in os.listdir(exports_dir):
        path = os.path.join(exports_dir, f)
        if f.startswith(".") or not os.path.isfile(path):
            continue
        try:
            st = os.stat(path)
        except OSError:
            continue
        entries.append(
            {
                "name": f,
                "size": st.st_size,
                "modified": datetime.fromtimestamp(
                    st.st_mtime, tz=timezone.utc
                ).isoformat(),
            }
        )
    return entries, False


def _newest_first(entries: list[dict]) -> list[dict]:
    return sorted(entries, key=lambda e: e.get("modified") or "", reverse=True)


@LIBRARY_ROUTER.get("")
async def get_library(sql_session: AsyncSession = Depends(get_async_session)):
    exports, via_s3 = await asyncio.to_thread(_list_export_entries)
    videos: list[dict] = []
    documents: list[dict] = []
    for entry in exports:
        ext = os.path.splitext(entry["name"])[1].lower()
        # Rutas relativas siempre: el cliente las resuelve contra su propio
        # origen (resolveBackendAssetSource) y nunca ve hosts internos.
        encoded = quote(entry["name"])
        url = (
            f"/api/v1/ppt/presentation/export-download/{encoded}"
            if via_s3
            else f"/app_data/exports/{encoded}"
        )
        item = {**entry, "url": url}
        (videos if ext in _VIDEO_EXTS else documents).append(item)

    audio_entries = await asyncio.to_thread(music_library.list_entries)
    audio = [
        {**entry, "url": f"/api/v1/ppt/music/file/{quote(entry['name'])}"}
        for entry in audio_entries
    ]

    images_result = await sql_session.scalars(
        select(ImageAsset)
        .where(ImageAsset.is_uploaded == True)  # noqa: E712
        .order_by(ImageAsset.created_at.desc())
    )
    images: list[dict] = []
    for asset in images_result:
        try:
            size = os.path.getsize(asset.path)
        except OSError:
            size = None
        images.append(
            {
                "id": str(asset.id),
                "name": os.path.basename(asset.path or ""),
                "size": size,
                "modified": asset.created_at.isoformat() if asset.created_at else None,
                "url": filesystem_image_path_to_app_data_url(asset.path),
            }
        )

    return {
        "videos": _newest_first(videos),
        "documents": _newest_first(documents),
        "images": images,
        "audio": _newest_first(audio),
    }


@LIBRARY_ROUTER.delete("/export/{name}", status_code=204)
async def delete_export_file(name: str):
    """Borra un export (video o documento) del bucket y/o del disco local."""
    if not _is_plain_name(name):
        raise HTTPException(400, "Nombre de archivo inválido")
    deleted = False
    if export_storage.is_configured():
        deleted = await asyncio.to_thread(export_storage.delete_export, name)
    local_path = os.path.join(get_exports_directory(), name)
    if os.path.isfile(local_path):
        try:
            os.remove(local_path)
            deleted = True
        except OSError as exc:
            raise HTTPException(500, f"No se pudo borrar el archivo: {exc}")
    if not deleted:
        raise HTTPException(404, "Archivo no encontrado")
