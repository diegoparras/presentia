from typing import Any, List, Optional
from datetime import datetime
import uuid

from pydantic import BaseModel

from models.sql.slide import SlideModel


class PresentationWithSlides(BaseModel):
    id: uuid.UUID
    content: str
    n_slides: int
    language: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    tone: Optional[str] = None
    verbosity: Optional[str] = None
    slides: List[SlideModel]
    theme: Optional[dict] = None
    # Números de slide (config de deck; render en frontend).
    page_numbers: Optional[dict] = None
    # Estado de publicación: el popover Publicar se hidrata de estos campos.
    is_public: Optional[bool] = None
    share_token: Optional[str] = None
    custom_slug: Optional[str] = None
    public_mode: Optional[str] = None
    fonts: Optional[Any] = None
