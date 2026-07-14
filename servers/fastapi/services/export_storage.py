"""Subida opcional de exports a un bucket S3-compatible (Cloudflare R2).

Invisible para el usuario y 100% opcional: se activa solo si están las cinco
variables de entorno PRESENTIA_S3_* (misma convención que Encuestum en la
Suite Escriba). Cuando está activa, los archivos exportados (PPTX/PDF/MP4)
se suben al bucket bajo el prefijo presentia/exports/ y la descarga se sirve
STREAMEADA por el propio backend (mismo dominio) — el navegador nunca ve el
endpoint del bucket, ni el account-id, ni el access key. Así no ocupan
espacio en el servidor y quedan preservados. Cualquier fallo degrada con
gracia a la descarga local de siempre.
"""
from __future__ import annotations

import logging
import mimetypes
import os

LOGGER = logging.getLogger(__name__)

_KEY_PREFIX = "presentia/exports"


def _config() -> dict | None:
    endpoint = (os.getenv("PRESENTIA_S3_ENDPOINT") or "").strip()
    bucket = (os.getenv("PRESENTIA_S3_BUCKET") or "").strip()
    access_key = (os.getenv("PRESENTIA_S3_ACCESS_KEY_ID") or "").strip()
    secret_key = (os.getenv("PRESENTIA_S3_SECRET_ACCESS_KEY") or "").strip()
    region = (os.getenv("PRESENTIA_S3_REGION") or "auto").strip()
    if not (endpoint and bucket and access_key and secret_key):
        return None
    return {
        "endpoint": endpoint,
        "bucket": bucket,
        "access_key": access_key,
        "secret_key": secret_key,
        "region": region,
    }


def is_configured() -> bool:
    return _config() is not None


def _client(cfg: dict):
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=cfg["endpoint"],
        aws_access_key_id=cfg["access_key"],
        aws_secret_access_key=cfg["secret_key"],
        region_name=cfg["region"],
        config=Config(signature_version="s3v4"),
    )


def upload_export(local_path: str) -> str | None:
    """Sube el archivo al bucket y devuelve el nombre de archivo subido.

    La descarga NUNCA expone el bucket: se sirve por el endpoint propio
    /export-download/{filename}, que streamea desde S3/R2.
    Best-effort: ante cualquier problema loggea y devuelve None (el caller
    cae a la URL local).
    """
    cfg = _config()
    if not cfg:
        return None
    try:
        client = _client(cfg)
        basename = os.path.basename(local_path)
        key = f"{_KEY_PREFIX}/{basename}"
        content_type = (
            mimetypes.guess_type(basename)[0] or "application/octet-stream"
        )
        client.upload_file(
            local_path,
            cfg["bucket"],
            key,
            ExtraArgs={"ContentType": content_type},
        )
        LOGGER.info("export subido a S3/R2: %s", key)
        return basename
    except Exception as exc:  # noqa: BLE001 - la descarga local vale más
        LOGGER.warning("subida del export a S3/R2 falló (se usa URL local): %s", exc)
        return None


def open_export(filename: str):
    """Abre un export del bucket para streamearlo al cliente.

    Devuelve (body_iterable, content_type, content_length) o None si no está
    configurado, el nombre es inválido o el objeto no existe. El nombre se
    restringe a un basename plano (sin separadores) para impedir traversal.
    """
    cfg = _config()
    if not cfg:
        return None
    if (
        not filename
        or "/" in filename
        or "\\" in filename
        or ".." in filename
    ):
        return None
    try:
        client = _client(cfg)
        obj = client.get_object(
            Bucket=cfg["bucket"], Key=f"{_KEY_PREFIX}/{filename}"
        )
        body = obj["Body"]
        content_type = obj.get("ContentType") or (
            mimetypes.guess_type(filename)[0] or "application/octet-stream"
        )
        length = obj.get("ContentLength")
        chunks = iter(lambda: body.read(64 * 1024), b"")
        return chunks, content_type, length
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("lectura del export desde S3/R2 falló: %s", exc)
        return None
