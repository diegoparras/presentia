"""
Panel de costos LLM (Suite Escriba, Fase 5): endpoints de consulta.

- GET /usage/presentations: totales por presentación (para el listado del panel)
- GET /usage/presentation/{id}: desglose por etapa y por slide
- GET /usage/summary: comparativa por proveedor y modelo

Cada consulta hace flush del buffer de eventos pendientes antes de leer, así
el panel siempre refleja las llamadas ya completadas.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.sql.llm_usage_event import LLMUsageEventModel
from models.sql.presentation import PresentationModel
from services.database import get_async_session
from services.llm_usage_service import flush_usage_events

USAGE_ROUTER = APIRouter(prefix="/usage", tags=["LLM Usage"])


def _row_totals(row) -> dict:
    return {
        "calls": row.calls or 0,
        "input_tokens": int(row.input_tokens or 0),
        "output_tokens": int(row.output_tokens or 0),
        "cost_usd": round(float(row.cost_usd), 6) if row.cost_usd is not None else None,
    }


@USAGE_ROUTER.get("/presentations")
async def usage_by_presentation(
    sql_session: AsyncSession = Depends(get_async_session),
):
    await flush_usage_events(sql_session)
    statement = (
        select(
            LLMUsageEventModel.presentation_id,
            func.count().label("calls"),
            func.sum(LLMUsageEventModel.input_tokens).label("input_tokens"),
            func.sum(LLMUsageEventModel.output_tokens).label("output_tokens"),
            func.sum(LLMUsageEventModel.cost_usd).label("cost_usd"),
            func.max(LLMUsageEventModel.created_at).label("last_used_at"),
        )
        .where(LLMUsageEventModel.presentation_id.is_not(None))
        .group_by(LLMUsageEventModel.presentation_id)
        .order_by(func.max(LLMUsageEventModel.created_at).desc())
    )
    rows = (await sql_session.execute(statement)).all()

    results = []
    for row in rows:
        title = None
        try:
            presentation = await sql_session.get(
                PresentationModel, uuid.UUID(row.presentation_id)
            )
            title = presentation.title if presentation else None
        except (ValueError, TypeError):
            pass
        results.append(
            {
                "presentation_id": row.presentation_id,
                "title": title,
                "last_used_at": row.last_used_at,
                **_row_totals(row),
            }
        )
    return {"presentations": results}


@USAGE_ROUTER.get("/presentation/{presentation_id}")
async def usage_for_presentation(
    presentation_id: uuid.UUID,
    sql_session: AsyncSession = Depends(get_async_session),
):
    await flush_usage_events(sql_session)
    key = str(presentation_id)

    totals_stmt = select(
        func.count().label("calls"),
        func.sum(LLMUsageEventModel.input_tokens).label("input_tokens"),
        func.sum(LLMUsageEventModel.output_tokens).label("output_tokens"),
        func.sum(LLMUsageEventModel.cost_usd).label("cost_usd"),
    ).where(LLMUsageEventModel.presentation_id == key)
    totals = (await sql_session.execute(totals_stmt)).one()

    def _grouped(column):
        return (
            select(
                column,
                func.count().label("calls"),
                func.sum(LLMUsageEventModel.input_tokens).label("input_tokens"),
                func.sum(LLMUsageEventModel.output_tokens).label("output_tokens"),
                func.sum(LLMUsageEventModel.cost_usd).label("cost_usd"),
            )
            .where(LLMUsageEventModel.presentation_id == key)
            .group_by(column)
            .order_by(column)
        )

    by_stage = (await sql_session.execute(_grouped(LLMUsageEventModel.stage))).all()
    by_slide = (
        await sql_session.execute(
            _grouped(LLMUsageEventModel.slide_index).where(
                LLMUsageEventModel.slide_index.is_not(None)
            )
        )
    ).all()
    by_model = (await sql_session.execute(_grouped(LLMUsageEventModel.model))).all()

    return {
        "presentation_id": key,
        "totals": _row_totals(totals),
        "by_stage": [{"stage": r.stage, **_row_totals(r)} for r in by_stage],
        "by_slide": [{"slide_index": r.slide_index, **_row_totals(r)} for r in by_slide],
        "by_model": [{"model": r.model, **_row_totals(r)} for r in by_model],
    }


@USAGE_ROUTER.get("/summary")
async def usage_summary(
    sql_session: AsyncSession = Depends(get_async_session),
):
    await flush_usage_events(sql_session)
    statement = (
        select(
            LLMUsageEventModel.provider,
            LLMUsageEventModel.model,
            func.count().label("calls"),
            func.sum(LLMUsageEventModel.input_tokens).label("input_tokens"),
            func.sum(LLMUsageEventModel.output_tokens).label("output_tokens"),
            func.sum(LLMUsageEventModel.cost_usd).label("cost_usd"),
        )
        .group_by(LLMUsageEventModel.provider, LLMUsageEventModel.model)
        .order_by(func.sum(LLMUsageEventModel.output_tokens).desc())
    )
    rows = (await sql_session.execute(statement)).all()
    return {
        "providers": [
            {"provider": r.provider, "model": r.model, **_row_totals(r)} for r in rows
        ]
    }
