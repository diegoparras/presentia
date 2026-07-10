from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.image_prompt import ImagePrompt
from models.sql.image_asset import ImageAsset
from services.database import get_async_session
from services.image_generation_service import ImageGenerationService
from utils.asset_directory_utils import (
    filesystem_image_path_to_app_data_url,
    get_images_directory,
    normalize_slide_asset_url,
)
from utils.get_env import get_pexels_api_key_env, get_pixabay_api_key_env
from utils.image_provider import get_selected_image_provider
from enums.image_provider import ImageProvider
import os
import uuid
from utils.file_utils import get_file_name_with_random_uuid

IMAGES_ROUTER = APIRouter(prefix="/images", tags=["Images"])


def _normalize_stock_provider(provider: str | None) -> str:
    normalized_provider = (provider or "").strip().lower()
    if normalized_provider in {"pixels", "pixel", "pexel"}:
        normalized_provider = "pexels"

    if normalized_provider:
        if normalized_provider in {"pexels", "pixabay"}:
            return normalized_provider
        raise HTTPException(
            status_code=400,
            detail="provider must be either 'pexels' or 'pixabay'",
        )

    selected_provider = get_selected_image_provider()
    if selected_provider == ImageProvider.PIXABAY:
        return "pixabay"
    return "pexels"


@IMAGES_ROUTER.get("/search", response_model=List[str])
async def search_stock_images(
    query: str,
    limit: int = Query(default=12, ge=1, le=30),
    provider: str | None = Query(default=None),
    strict_api_key: bool = Query(default=False),
    x_provider_api_key: str | None = Header(default=None, alias="X-Provider-Api-Key"),
):
    normalized_provider = _normalize_stock_provider(provider)

    image_generation_service = ImageGenerationService(get_images_directory())

    if normalized_provider == "pexels":
        api_key = (x_provider_api_key or get_pexels_api_key_env() or "").strip()
        if strict_api_key and not api_key:
            raise HTTPException(status_code=401, detail="Pexels API key is required")

        # Pexels can return cached public responses for common queries.
        # Use a nonce query in strict mode to force a real auth check.
        if strict_api_key:
            validation_query = f"__presenton_auth_check_{uuid.uuid4().hex}"
            await image_generation_service.get_image_from_pexels(
                validation_query,
                api_key=api_key,
                limit=1,
            )

        images = await image_generation_service.get_image_from_pexels(
            query,
            api_key=api_key,
            limit=limit,
        )
        if isinstance(images, str):
            return [images] if images else []
        return images

    api_key = (x_provider_api_key or get_pixabay_api_key_env() or "").strip()
    if strict_api_key and not api_key:
        raise HTTPException(status_code=401, detail="Pixabay API key is required")

    images = await image_generation_service.get_image_from_pixabay(
        query,
        api_key=api_key,
        limit=limit,
    )
    if isinstance(images, str):
        return [images] if images else []
    return images


@IMAGES_ROUTER.get("/generate")
async def generate_image(
    prompt: str, sql_session: AsyncSession = Depends(get_async_session)
):
    images_directory = get_images_directory()
    image_prompt = ImagePrompt(prompt=prompt)
    image_generation_service = ImageGenerationService(images_directory)

    image = await image_generation_service.generate_image(image_prompt)
    if not isinstance(image, ImageAsset):
        return normalize_slide_asset_url(image) if isinstance(image, str) else image

    sql_session.add(image)
    await sql_session.commit()

    return filesystem_image_path_to_app_data_url(image.path)


def _image_asset_api_dict(asset: ImageAsset) -> dict:
    return {
        "id": asset.id,
        "created_at": asset.created_at,
        "is_uploaded": asset.is_uploaded,
        "path": asset.path,
        "extras": asset.extras,
        "file_url": filesystem_image_path_to_app_data_url(asset.path),
    }


@IMAGES_ROUTER.get("/generated")
async def get_generated_images(sql_session: AsyncSession = Depends(get_async_session)):
    try:
        images_result = await sql_session.scalars(
            select(ImageAsset)
            .where(ImageAsset.is_uploaded == False)
            .order_by(ImageAsset.created_at.desc())
        )
        return [_image_asset_api_dict(a) for a in images_result]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve generated images: {str(e)}"
        )


@IMAGES_ROUTER.post("/upload")
async def upload_image(
    file: UploadFile = File(...), sql_session: AsyncSession = Depends(get_async_session)
):
    try:
        new_filename = get_file_name_with_random_uuid(file)
        image_path = os.path.join(
            get_images_directory(), os.path.basename(new_filename)
        )

        with open(image_path, "wb") as f:
            f.write(await file.read())

        image_asset = ImageAsset(path=image_path, is_uploaded=True)

        sql_session.add(image_asset)
        await sql_session.commit()
        # Refresh to ensure all defaults are loaded
        await sql_session.refresh(image_asset)

        return _image_asset_api_dict(image_asset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


_CACHE_MAX_BYTES = 20 * 1024 * 1024
_CACHE_EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
}


@IMAGES_ROUTER.post("/cache")
async def cache_external_image(
    payload: dict, sql_session: AsyncSession = Depends(get_async_session)
):
    """
    Descarga una imagen externa y la guarda como asset local. Los motores de
    export a PPTX/PDF embeben de forma confiable solo assets locales
    (/app_data): con URLs de internet fallan por hotlink protection o porque
    el conversor no las descarga. Cachearla al elegirla resuelve el export y
    de paso evita que el deck dependa de un sitio ajeno.
    """
    import asyncio
    import urllib.request

    url = (payload.get("url") or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="url must be http(s)")

    def _download() -> tuple[bytes, str]:
        req = urllib.request.Request(
            url,
            headers={
                # UA de navegador: muchos sitios rechazan clientes no-browser.
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
                # Preferir jpeg/png: máxima compatibilidad con los motores de
                # export (avif/webp dependen del renderer).
                "Accept": "image/jpeg,image/png;q=0.9,image/webp;q=0.8,image/*;q=0.7,*/*;q=0.5",
            },
        )
        with urllib.request.urlopen(req, timeout=25) as res:  # noqa: S310
            ctype = (res.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            data = res.read(_CACHE_MAX_BYTES + 1)
        return data, ctype

    try:
        data, ctype = await asyncio.to_thread(_download)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"No se pudo descargar la imagen: {exc}")

    if len(data) > _CACHE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (max 20MB)")
    ext = _CACHE_EXT_BY_TYPE.get(ctype)
    if not ext:
        # Algunos servers devuelven content-type generico: aceptar por magia de bytes.
        if data[:8].startswith(b"\x89PNG"):
            ext = ".png"
        elif data[:3] == b"\xff\xd8\xff":
            ext = ".jpg"
        elif data[:4] == b"RIFF" and b"WEBP" in data[:16]:
            ext = ".webp"
        else:
            raise HTTPException(status_code=422, detail=f"La URL no devolvio una imagen ({ctype or 'sin content-type'})")

    image_path = os.path.join(get_images_directory(), f"{uuid.uuid4()}{ext}")
    with open(image_path, "wb") as f:
        f.write(data)

    image_asset = ImageAsset(path=image_path, is_uploaded=True, extras={"source_url": url})
    sql_session.add(image_asset)
    await sql_session.commit()
    await sql_session.refresh(image_asset)
    return _image_asset_api_dict(image_asset)


@IMAGES_ROUTER.get("/uploaded")
async def get_uploaded_images(sql_session: AsyncSession = Depends(get_async_session)):
    try:
        images_result = await sql_session.scalars(
            select(ImageAsset)
            .where(ImageAsset.is_uploaded == True)
            .order_by(ImageAsset.created_at.desc())
        )
        return [_image_asset_api_dict(a) for a in images_result]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve uploaded images: {str(e)}"
        )


@IMAGES_ROUTER.delete("/{id}", status_code=204)
async def delete_uploaded_image_by_id(
    id: uuid.UUID, sql_session: AsyncSession = Depends(get_async_session)
):
    try:
        # Fetch the asset to get its actual file path
        image = await sql_session.get(ImageAsset, id)
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        os.remove(image.path)

        await sql_session.delete(image)
        await sql_session.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
