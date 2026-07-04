import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class LLMUsageEventModel(SQLModel, table=True):
    """Un evento por llamada al LLM: tokens, proveedor, modelo y costo estimado.
    Atribución por presentación, etapa (outline/structure/slide/...) y slide.
    Suite Escriba, Fase 5 (panel de costos)."""

    __tablename__ = "llm_usage_events"

    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        ),
    )
    presentation_id: Optional[str] = Field(sa_column=Column(String, index=True), default=None)
    stage: Optional[str] = Field(sa_column=Column(String), default=None)
    slide_index: Optional[int] = Field(sa_column=Column(Integer), default=None)
    provider: Optional[str] = Field(sa_column=Column(String), default=None)
    model: Optional[str] = Field(sa_column=Column(String), default=None)
    input_tokens: int = Field(sa_column=Column(Integer, nullable=False), default=0)
    output_tokens: int = Field(sa_column=Column(Integer, nullable=False), default=0)
    cost_usd: Optional[float] = Field(sa_column=Column(Float), default=None)
