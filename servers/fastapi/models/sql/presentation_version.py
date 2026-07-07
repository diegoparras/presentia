from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlmodel import Field, JSON, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class PresentationVersionModel(SQLModel, table=True):
    """A saved snapshot of a presentation's slides + meta (version history, #18).

    `data` holds the full slide list and title/theme at snapshot time, so a
    restore can rebuild the deck exactly. Deleting a presentation cascades.
    """

    __tablename__ = "presentation_versions"

    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    presentation: uuid.UUID = Field(
        sa_column=Column(
            ForeignKey("presentations.id", ondelete="CASCADE"), index=True, nullable=False
        )
    )
    label: Optional[str] = Field(sa_column=Column(String, nullable=True), default=None)
    author: str = Field(sa_column=Column(String, nullable=False, server_default="Anónimo"))
    data: dict = Field(sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        ),
    )
