from typing import Annotated

from fastapi import APIRouter, Body, HTTPException

from utils.llm_calls.edit_text import edit_text_with_ai

AI_ROUTER = APIRouter(prefix="/ai", tags=["AI"])


@AI_ROUTER.post("/edit-text")
async def edit_text(
    text: Annotated[str, Body()],
    action: Annotated[str, Body()],
    target: Annotated[str, Body()] = "",
):
    """Apply an AI edit action to a selected piece of text and return the result."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        edited = await edit_text_with_ai(text.strip(), action, target)
        return {"text": edited}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))
