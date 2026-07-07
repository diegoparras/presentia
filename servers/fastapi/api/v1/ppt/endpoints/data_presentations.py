"""
Data-grounded presentation generation (Suite Escriba, Fase 4).

One-shot endpoint: takes a CSV/TSV/JSON dataset together with the standard
presentation parameters, parses it into the canonical form and delegates to
the existing generation handler. Chart figures in the resulting deck are
validated against the dataset (see utils/chart_data_guard.py). Reference use
case: a Concilius reconciliation summary turned into a deck.
"""

import logging
import traceback
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.ppt.endpoints.presentation import (
    _build_export_cookie_header,
    check_if_api_request_is_valid,
    generate_presentation_handler,
)
from models.generate_presentation_request import GeneratePresentationRequest
from models.presentation_and_path import PresentationPathAndEditPath
from services.anonimal_service import AnonimalService, AnonimalError
from services.database import get_async_session
from services.dataset_service import DatasetError, parse_dataset_file
from services.temp_file_service import TEMP_FILE_SERVICE

LOGGER = logging.getLogger(__name__)

DATA_PRESENTATION_ROUTER = APIRouter(
    prefix="/presentation", tags=["Data Presentations"]
)


@DATA_PRESENTATION_ROUTER.post(
    "/generate-from-data", response_model=PresentationPathAndEditPath
)
async def generate_presentation_from_data(
    request_http: Request,
    file: UploadFile = File(..., description="Dataset file (CSV, TSV or JSON)"),
    content: str = Form(..., description="What the presentation is about"),
    n_slides: Optional[int] = Form(default=None),
    language: Optional[str] = Form(default=None),
    template: str = Form(
        default="Report",
        description="Template to use; Report ships chart-capable layouts",
    ),
    instructions: Optional[str] = Form(default=None),
    export_as: Literal["pptx", "pdf", "video"] = Form(default="pptx"),
    sql_session: AsyncSession = Depends(get_async_session),
):
    # 1. Persist the upload and parse it into the canonical dataset
    temp_dir = TEMP_FILE_SERVICE.create_temp_dir()
    file_bytes = await file.read()
    dataset_path = TEMP_FILE_SERVICE.create_temp_file(
        file.filename or "dataset.csv", file_bytes, temp_dir
    )
    try:
        dataset = parse_dataset_file(dataset_path)
    except DatasetError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # 2. With Anonimal active, the prompt-facing table is anonymized once here
    #    (fail-closed, same guarantee as the generation inputs). The raw rows
    #    never leave the host: they only feed the numeric validation set.
    if AnonimalService.is_enabled():
        try:
            result = await AnonimalService().anonymize(dataset["table_md"])
            dataset["table_md"] = result.text
        except AnonimalError as exc:
            LOGGER.error("[Anonimal] Dataset anonymization failed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail=(
                    "Anonymization service (Anonimal) failed while processing "
                    "the dataset. Generation was stopped."
                ),
            ) from exc

    # 3. Delegate to the standard generation flow with the dataset attached
    request = GeneratePresentationRequest(
        content=content,
        n_slides=n_slides,
        language=language,
        template=template,
        instructions=instructions,
        export_as=export_as,
        dataset=dataset,
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
