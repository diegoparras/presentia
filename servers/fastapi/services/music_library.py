"""Biblioteca persistente de pistas de audio (música de fondo de los videos).

Mismo criterio que los exports: si están las variables PRESENTIA_S3_*, las
pistas viven en el bucket bajo presentia/music/ (privado, nunca expuesto al
navegador); si no, en <APP_DATA_DIRECTORY>/music en el disco del servidor.
Los nombres almacenados llevan un prefijo aleatorio corto para evitar
colisiones, conservando el nombre original legible.
"""
from __future__ import annotations

import logging
import mimetypes
import os
import re
import tempfile
import uuid

from services import export_storage
from utils.get_env import get_app_data_directory_env

LOGGER = logging.getLogger(__name__)

_KEY_PREFIX = "presentia/music"
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._ -]+")

AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".oga", ".flac"}
AUDIO_MAX_BYTES = 30 * 1024 * 1024


def _local_dir() -> str:
    base = get_app_data_directory_env() or "/app_data"
    d = os.path.join(base, "music")
    os.makedirs(d, exist_ok=True)
    return d


def is_valid_name(name: str) -> bool:
    """Nombre plano de la biblioteca (sin separadores: anti-traversal)."""
    return bool(name) and "/" not in name and "\\" not in name and ".." not in name


def _sanitize(filename: str) -> str:
    base = os.path.basename(filename or "audio")
    base = _SAFE_NAME_RE.sub("-", base).strip("-. ") or "audio"
    return base[-80:]


def save(content: bytes, filename: str) -> str:
    """Guarda la pista en el backend activo y devuelve su nombre de biblioteca."""
    name = f"{uuid.uuid4().hex[:8]}-{_sanitize(filename)}"
    cfg = export_storage._config()
    if cfg:
        client = export_storage._client(cfg)
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        client.put_object(
            Bucket=cfg["bucket"],
            Key=f"{_KEY_PREFIX}/{name}",
            Body=content,
            ContentType=content_type,
        )
    else:
        with open(os.path.join(_local_dir(), name), "wb") as f:
            f.write(content)
    LOGGER.info("pista de audio guardada: %s", name)
    return name


def list_names() -> list[str]:
    cfg = export_storage._config()
    if cfg:
        client = export_storage._client(cfg)
        names: list[str] = []
        token = None
        while True:
            kwargs = {"Bucket": cfg["bucket"], "Prefix": f"{_KEY_PREFIX}/"}
            if token:
                kwargs["ContinuationToken"] = token
            resp = client.list_objects_v2(**kwargs)
            for obj in resp.get("Contents", []):
                base = obj["Key"].rsplit("/", 1)[-1]
                if base:
                    names.append(base)
            if not resp.get("IsTruncated"):
                break
            token = resp.get("NextContinuationToken")
        return sorted(names)
    return sorted(
        f
        for f in os.listdir(_local_dir())
        if not f.startswith(".")
        and os.path.splitext(f)[1].lower() in AUDIO_EXTENSIONS
    )


def list_entries() -> list[dict]:
    """Como list_names pero con metadatos: [{name, size, modified}]."""
    from datetime import datetime, timezone

    cfg = export_storage._config()
    if cfg:
        client = export_storage._client(cfg)
        entries: list[dict] = []
        token = None
        while True:
            kwargs = {"Bucket": cfg["bucket"], "Prefix": f"{_KEY_PREFIX}/"}
            if token:
                kwargs["ContinuationToken"] = token
            resp = client.list_objects_v2(**kwargs)
            for obj in resp.get("Contents", []):
                base = obj["Key"].rsplit("/", 1)[-1]
                if not base:
                    continue
                modified = obj.get("LastModified")
                entries.append(
                    {
                        "name": base,
                        "size": obj.get("Size"),
                        "modified": modified.isoformat() if modified else None,
                    }
                )
            if not resp.get("IsTruncated"):
                break
            token = resp.get("NextContinuationToken")
        return sorted(entries, key=lambda e: e["name"])
    d = _local_dir()
    entries = []
    for f in sorted(os.listdir(d)):
        if f.startswith(".") or os.path.splitext(f)[1].lower() not in AUDIO_EXTENSIONS:
            continue
        try:
            st = os.stat(os.path.join(d, f))
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
    return entries


def open_track(name: str):
    """Abre una pista para streamearla: (chunks, content_type, length) o None."""
    if not is_valid_name(name):
        return None
    try:
        cfg = export_storage._config()
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        if cfg:
            client = export_storage._client(cfg)
            obj = client.get_object(Bucket=cfg["bucket"], Key=f"{_KEY_PREFIX}/{name}")
            body = obj["Body"]
            chunks = iter(lambda: body.read(64 * 1024), b"")
            return chunks, obj.get("ContentType") or content_type, obj.get("ContentLength")
        path = os.path.join(_local_dir(), name)
        if not os.path.isfile(path):
            return None
        f = open(path, "rb")
        chunks = iter(lambda: f.read(64 * 1024), b"")
        return chunks, content_type, os.path.getsize(path)
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("no se pudo abrir la pista %s: %s", name, exc)
        return None


def delete(name: str) -> bool:
    if not is_valid_name(name):
        return False
    cfg = export_storage._config()
    if cfg:
        client = export_storage._client(cfg)
        client.delete_object(Bucket=cfg["bucket"], Key=f"{_KEY_PREFIX}/{name}")
        return True
    path = os.path.join(_local_dir(), name)
    if os.path.isfile(path):
        os.remove(path)
        return True
    return False


def local_copy(name: str) -> str | None:
    """Devuelve un path local de la pista (descarga desde S3 si hace falta).

    Best-effort: None si el nombre es inválido, no existe o la descarga falla
    (el video sale mudo en vez de fallar).
    """
    if not is_valid_name(name):
        return None
    try:
        cfg = export_storage._config()
        if cfg:
            client = export_storage._client(cfg)
            suffix = os.path.splitext(name)[1] or ".mp3"
            fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="music-")
            os.close(fd)
            client.download_file(cfg["bucket"], f"{_KEY_PREFIX}/{name}", tmp_path)
            return tmp_path
        path = os.path.join(_local_dir(), name)
        return path if os.path.isfile(path) else None
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("no se pudo obtener la pista %s: %s", name, exc)
        return None
