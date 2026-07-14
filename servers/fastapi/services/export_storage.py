"""Subida opcional de exports a un bucket S3-compatible (Cloudflare R2).

Invisible para el usuario y 100% opcional: se activa solo si están las cinco
variables de entorno PRESENTIA_S3_* (misma convención que Encuestum en la
Suite Escriba). Cuando está activa, los archivos exportados (PPTX/PDF/MP4)
se suben al bucket bajo el prefijo presentia/exports/ y la descarga usa una
URL prefirmada — así no ocupan espacio en el servidor y quedan preservados.
Cualquier fallo degrada con gracia a la descarga local de siempre.
"""
from __future__ import annotations

import logging
import mimetypes
import os

LOGGER = logging.getLogger(__name__)

# R2 acepta presigned de hasta 7 días.
_PRESIGNED_EXPIRY_SECONDS = 7 * 24 * 3600
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


def upload_export(local_path: str) -> str | None:
    """Sube el archivo al bucket y devuelve una URL prefirmada de descarga.

    Best-effort: ante cualquier problema loggea y devuelve None (el caller
    cae a la URL local).
    """
    cfg = _config()
    if not cfg:
        return None
    try:
        import boto3
        from botocore.config import Config

        client = boto3.client(
            "s3",
            endpoint_url=cfg["endpoint"],
            aws_access_key_id=cfg["access_key"],
            aws_secret_access_key=cfg["secret_key"],
            region_name=cfg["region"],
            config=Config(signature_version="s3v4"),
        )
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
        url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": cfg["bucket"],
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{basename}"',
            },
            ExpiresIn=_PRESIGNED_EXPIRY_SECONDS,
        )
        LOGGER.info("export subido a S3/R2: %s", key)
        return url
    except Exception as exc:  # noqa: BLE001 - la descarga local vale más
        LOGGER.warning("subida del export a S3/R2 falló (se usa URL local): %s", exc)
        return None
