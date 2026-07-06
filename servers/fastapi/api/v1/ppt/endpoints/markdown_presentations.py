"""
Generación de deck desde markdown, estilo Gamma (Suite Escriba).

POST /presentation/generate-from-markdown: recibe un blob de markdown, lo
divide en tarjetas (separadores ---, encabezados, o reparto parejo), aplica
el modo de texto (preserve/condense/generate) y delega en el flujo de
generación existente, que mapea las tarjetas 1:1 a slides, elige layouts y
genera las imágenes por tarjeta con estilo consistente.
"""

import logging
import traceback
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.ppt.endpoints.presentation import (
    _build_export_cookie_header,
    check_if_api_request_is_valid,
    generate_presentation_handler,
)
from models.generate_presentation_request import GeneratePresentationRequest
from models.presentation_and_path import PresentationPathAndEditPath
from services.database import get_async_session
from services.markdown_deck_service import (
    MarkdownDeckError,
    split_markdown_into_cards,
    text_mode_instructions,
)

LOGGER = logging.getLogger(__name__)

MARKDOWN_PRESENTATION_ROUTER = APIRouter(
    prefix="/presentation", tags=["Markdown Presentations"]
)


class GenerateFromMarkdownRequest(BaseModel):
    markdown: str = Field(..., description="Markdown content; --- or headings split cards")
    text_mode: Literal["preserve", "condense", "generate"] = Field(
        default="preserve",
        description="preserve keeps the text verbatim; condense summarizes; generate rewrites",
    )
    n_slides: Optional[int] = Field(
        default=None, description="Card count hint when the markdown has no structure"
    )
    template: str = Field(default="general")
    language: Optional[str] = Field(default=None)
    instructions: Optional[str] = Field(default=None)
    image_style: Optional[str] = Field(
        default=None, description="Art style applied to every generated image"
    )
    image_source: Optional[str] = Field(
        default=None, description="Image provider override, or 'none'"
    )
    export_as: Literal["pptx", "pdf"] = Field(default="pptx")


@MARKDOWN_PRESENTATION_ROUTER.post(
    "/generate-from-markdown", response_model=PresentationPathAndEditPath
)
async def generate_presentation_from_markdown(
    request_http: Request,
    body: GenerateFromMarkdownRequest,
    sql_session: AsyncSession = Depends(get_async_session),
):
    try:
        cards = split_markdown_into_cards(body.markdown, n_cards=body.n_slides)
    except MarkdownDeckError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    request = GeneratePresentationRequest(
        content=body.markdown,
        slides_markdown=cards,
        template=body.template,
        language=body.language,
        instructions=text_mode_instructions(body.text_mode, body.instructions),
        image_style=body.image_style,
        image_source=body.image_source,
        export_as=body.export_as,
    )
    try:
        (presentation_id,) = await check_if_api_request_is_valid(request, sql_session)
        return await generate_presentation_handler(
            request,
            presentation_id,
            None,
            export_cookie_header=_build_export_cookie_header(request_http),
            sql_session=sql_session,
        )
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Presentation generation failed")


class PreparedPresentationResponse(BaseModel):
    presentation_id: str
    stream_path: str


@MARKDOWN_PRESENTATION_ROUTER.post(
    "/prepare-from-markdown", response_model=PreparedPresentationResponse
)
async def prepare_presentation_from_markdown(
    request_http: Request,
    body: GenerateFromMarkdownRequest,
    sql_session: AsyncSession = Depends(get_async_session),
):
    """Prepara el deck (outline + layout + estructura) sin generar las slides y
    devuelve el id, para que el frontend abra el stream y muestre el preview en
    vivo (modo Gamma). El estilo/proveedor de imagen se guardan en la
    presentación para que el stream los use al generar cada slide."""
    try:
        cards = split_markdown_into_cards(body.markdown, n_cards=body.n_slides)
    except MarkdownDeckError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    request = GeneratePresentationRequest(
        content=body.markdown,
        slides_markdown=cards,
        template=body.template,
        language=body.language,
        instructions=text_mode_instructions(body.text_mode, body.instructions),
        image_style=body.image_style,
        image_source=body.image_source,
        export_as=body.export_as,
    )
    try:
        (presentation_id,) = await check_if_api_request_is_valid(request, sql_session)
        result = await generate_presentation_handler(
            request,
            presentation_id,
            None,
            export_cookie_header=_build_export_cookie_header(request_http),
            prepare_only=True,
            sql_session=sql_session,
        )
        pid = result["presentation_id"]
        return PreparedPresentationResponse(
            presentation_id=pid,
            stream_path=f"/presentation?id={pid}&type=standard&stream=true",
        )
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Presentation preparation failed")
