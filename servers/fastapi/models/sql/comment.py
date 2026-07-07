from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class CommentModel(SQLModel, table=True):
    """A collaboration comment on a presentation (optionally pinned to a slide).

    Part of the collaboration MVP (#18): comments are persisted here and pushed
    live to peers over the in-process WebSocket room. Deleting a presentation
    cascades to its comments.
    """

    __tablename__ = "comments"

    id: uuid.UUID = Field(primary_key=True, default_factory=uuid.uuid4)
    presentation: uuid.UUID = Field(
        sa_column=Column(
            ForeignKey("presentations.id", ondelete="CASCADE"), index=True, nullable=False
        )
    )
    # Slide the comment is attached to (0-based). Null = deck-level comment.
    slide_index: Optional[int] = Field(sa_column=Column(Integer, nullable=True), default=None)
    author: str = Field(sa_column=Column(String, nullable=False, server_default="Anónimo"))
    body: str = Field(sa_column=Column(String, nullable=False))
    resolved: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="0"), default=False
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        ),
    )
