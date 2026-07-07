"""Collaboration MVP (#18): persisted comments + an in-process WebSocket room
for live presence and comment fan-out.

Everything lives inside the single FastAPI process — no external broker — so it
fits the single Docker image. The room manager keeps a set of connected sockets
per presentation; REST mutations (add/resolve/delete comment) are broadcast to
the room so open editors update live.

Full document CRDT co-editing (Yjs) is intentionally out of scope here: it needs
a persistence/merge backend and multi-client testing. This MVP delivers presence
+ comments, which is the collaboration surface users see first.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Path,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.sql.comment import CommentModel
from models.sql.presentation import PresentationModel
from models.sql.presentation_version import PresentationVersionModel
from models.sql.slide import SlideModel
from services.database import get_async_session, async_session_maker

LOGGER = logging.getLogger(__name__)

COLLAB_ROUTER = APIRouter(prefix="/collab", tags=["Collaboration"])


# --------------------------------------------------------------------------- #
# In-process room manager
# --------------------------------------------------------------------------- #
class _Room:
    def __init__(self) -> None:
        # ws -> user dict ({id, name, color})
        self.peers: dict[WebSocket, dict] = {}

    def users(self) -> list[dict]:
        return list(self.peers.values())


class RoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, _Room] = {}

    def _room(self, key: str) -> _Room:
        return self._rooms.setdefault(key, _Room())

    async def join(self, key: str, ws: WebSocket, user: dict) -> None:
        self._room(key).peers[ws] = user
        await self.broadcast(key, {"type": "presence", "users": self._room(key).users()})

    async def leave(self, key: str, ws: WebSocket) -> None:
        room = self._rooms.get(key)
        if not room:
            return
        room.peers.pop(ws, None)
        if not room.peers:
            self._rooms.pop(key, None)
        else:
            await self.broadcast(key, {"type": "presence", "users": room.users()})

    async def broadcast(self, key: str, message: dict, exclude: WebSocket | None = None) -> None:
        room = self._rooms.get(key)
        if not room:
            return
        dead: list[WebSocket] = []
        for ws in list(room.peers.keys()):
            if ws is exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001 - drop broken sockets
                dead.append(ws)
        for ws in dead:
            room.peers.pop(ws, None)


ROOMS = RoomManager()


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class CommentOut(BaseModel):
    id: uuid.UUID
    presentation: uuid.UUID
    slide_index: Optional[int]
    author: str
    body: str
    resolved: bool
    created_at: datetime


class CommentCreate(BaseModel):
    presentation_id: uuid.UUID
    slide_index: Optional[int] = None
    author: str = "Anónimo"
    body: str


def _to_out(c: CommentModel) -> CommentOut:
    return CommentOut(
        id=c.id,
        presentation=c.presentation,
        slide_index=c.slide_index,
        author=c.author,
        body=c.body,
        resolved=c.resolved,
        created_at=c.created_at,
    )


# --------------------------------------------------------------------------- #
# REST: comments
# --------------------------------------------------------------------------- #
@COLLAB_ROUTER.get("/comments/{presentation_id}", response_model=list[CommentOut])
async def list_comments(
    presentation_id: uuid.UUID = Path(...),
    sql_session: AsyncSession = Depends(get_async_session),
):
    rows = await sql_session.scalars(
        select(CommentModel)
        .where(CommentModel.presentation == presentation_id)
        .order_by(CommentModel.created_at.asc())
    )
    return [_to_out(c) for c in rows]


@COLLAB_ROUTER.post("/comments", response_model=CommentOut)
async def create_comment(
    data: Annotated[CommentCreate, Body()],
    sql_session: AsyncSession = Depends(get_async_session),
):
    presentation = await sql_session.get(PresentationModel, data.presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Empty comment")
    comment = CommentModel(
        presentation=data.presentation_id,
        slide_index=data.slide_index,
        author=(data.author or "Anónimo").strip()[:120] or "Anónimo",
        body=body[:4000],
    )
    sql_session.add(comment)
    await sql_session.commit()
    await sql_session.refresh(comment)
    out = _to_out(comment)
    await ROOMS.broadcast(
        str(data.presentation_id),
        {"type": "comment_added", "comment": out.model_dump(mode="json")},
    )
    return out


@COLLAB_ROUTER.patch("/comments/{comment_id}/resolve", response_model=CommentOut)
async def resolve_comment(
    comment_id: uuid.UUID = Path(...),
    resolved: bool = Body(True, embed=True),
    sql_session: AsyncSession = Depends(get_async_session),
):
    comment = await sql_session.get(CommentModel, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.resolved = resolved
    sql_session.add(comment)
    await sql_session.commit()
    await sql_session.refresh(comment)
    out = _to_out(comment)
    await ROOMS.broadcast(
        str(comment.presentation),
        {"type": "comment_updated", "comment": out.model_dump(mode="json")},
    )
    return out


@COLLAB_ROUTER.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: uuid.UUID = Path(...),
    sql_session: AsyncSession = Depends(get_async_session),
):
    comment = await sql_session.get(CommentModel, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    presentation_id = str(comment.presentation)
    await sql_session.delete(comment)
    await sql_session.commit()
    await ROOMS.broadcast(
        presentation_id,
        {"type": "comment_deleted", "id": str(comment_id)},
    )
    return {"ok": True}


# --------------------------------------------------------------------------- #
# REST: version history (snapshots)
# --------------------------------------------------------------------------- #
class VersionCreate(BaseModel):
    presentation_id: uuid.UUID
    label: Optional[str] = None
    author: str = "Anónimo"


class VersionMeta(BaseModel):
    id: uuid.UUID
    presentation: uuid.UUID
    label: Optional[str]
    author: str
    n_slides: int
    created_at: datetime


def _snapshot_slides(slides: list[SlideModel]) -> list[dict]:
    return [
        {
            "layout_group": s.layout_group,
            "layout": s.layout,
            "index": s.index,
            "content": s.content,
            "html_content": s.html_content,
            "speaker_note": s.speaker_note,
            "properties": s.properties,
        }
        for s in slides
    ]


@COLLAB_ROUTER.post("/versions", response_model=VersionMeta)
async def create_version(
    data: Annotated[VersionCreate, Body()],
    sql_session: AsyncSession = Depends(get_async_session),
):
    """Snapshot the current slides + title/theme of a presentation."""
    presentation = await sql_session.get(PresentationModel, data.presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    slides = list(
        await sql_session.scalars(
            select(SlideModel)
            .where(SlideModel.presentation == data.presentation_id)
            .order_by(SlideModel.index)
        )
    )
    snapshot = {
        "title": presentation.title,
        "theme": presentation.theme,
        "slides": _snapshot_slides(slides),
    }
    version = PresentationVersionModel(
        presentation=data.presentation_id,
        label=(data.label or "").strip()[:120] or None,
        author=(data.author or "Anónimo").strip()[:120] or "Anónimo",
        data=snapshot,
    )
    sql_session.add(version)
    await sql_session.commit()
    await sql_session.refresh(version)
    meta = VersionMeta(
        id=version.id,
        presentation=version.presentation,
        label=version.label,
        author=version.author,
        n_slides=len(slides),
        created_at=version.created_at,
    )
    await ROOMS.broadcast(
        str(data.presentation_id),
        {"type": "version_saved", "version": meta.model_dump(mode="json")},
    )
    return meta


@COLLAB_ROUTER.get("/versions/{presentation_id}", response_model=list[VersionMeta])
async def list_versions(
    presentation_id: uuid.UUID = Path(...),
    sql_session: AsyncSession = Depends(get_async_session),
):
    rows = list(
        await sql_session.scalars(
            select(PresentationVersionModel)
            .where(PresentationVersionModel.presentation == presentation_id)
            .order_by(PresentationVersionModel.created_at.desc())
        )
    )
    return [
        VersionMeta(
            id=v.id,
            presentation=v.presentation,
            label=v.label,
            author=v.author,
            n_slides=len((v.data or {}).get("slides", [])),
            created_at=v.created_at,
        )
        for v in rows
    ]


@COLLAB_ROUTER.post("/versions/{version_id}/restore")
async def restore_version(
    version_id: uuid.UUID = Path(...),
    sql_session: AsyncSession = Depends(get_async_session),
):
    """Rebuild the presentation's slides from a snapshot. A pre-restore snapshot is
    taken first so a restore is itself undoable."""
    version = await sql_session.get(PresentationVersionModel, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    pid = version.presentation
    presentation = await sql_session.get(PresentationModel, pid)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    # Snapshot current state before overwriting (safety net).
    current = list(
        await sql_session.scalars(
            select(SlideModel).where(SlideModel.presentation == pid).order_by(SlideModel.index)
        )
    )
    sql_session.add(
        PresentationVersionModel(
            presentation=pid,
            label="Auto (antes de restaurar)",
            author="Sistema",
            data={
                "title": presentation.title,
                "theme": presentation.theme,
                "slides": _snapshot_slides(current),
            },
        )
    )

    # Replace slides with the snapshot's.
    await sql_session.execute(delete(SlideModel).where(SlideModel.presentation == pid))
    snap = version.data or {}
    for s in snap.get("slides", []):
        sql_session.add(
            SlideModel(
                id=uuid.uuid4(),
                presentation=pid,
                layout_group=s.get("layout_group"),
                layout=s.get("layout"),
                index=s.get("index", 0),
                content=s.get("content") or {},
                html_content=s.get("html_content"),
                speaker_note=s.get("speaker_note"),
                properties=s.get("properties"),
            )
        )
    if snap.get("title") is not None:
        presentation.title = snap["title"]
    if snap.get("theme") is not None:
        presentation.theme = snap["theme"]
    sql_session.add(presentation)
    await sql_session.commit()

    await ROOMS.broadcast(
        str(pid),
        {"type": "doc_updated", "reason": "restore", "version_id": str(version_id)},
    )
    return {"ok": True, "presentation_id": str(pid)}


# --------------------------------------------------------------------------- #
# REST: notify document updated (live-sync banner for peers)
# --------------------------------------------------------------------------- #
@COLLAB_ROUTER.post("/notify-updated/{presentation_id}")
async def notify_updated(
    presentation_id: uuid.UUID = Path(...),
    author: str = Body("Alguien", embed=True),
):
    """Tell peers in the room that the deck was saved, so their editor can offer a
    non-destructive refresh instead of silently diverging."""
    await ROOMS.broadcast(
        str(presentation_id),
        {"type": "doc_updated", "reason": "save", "author": author},
    )
    return {"ok": True}


# --------------------------------------------------------------------------- #
# WebSocket: presence + live relay
# --------------------------------------------------------------------------- #
@COLLAB_ROUTER.websocket("/ws/{presentation_id}")
async def collab_ws(websocket: WebSocket, presentation_id: str):
    # Validate the presentation exists before accepting (own session; the
    # BaseHTTPMiddleware auth guard does not cover websockets).
    try:
        pid = uuid.UUID(presentation_id)
    except ValueError:
        await websocket.close(code=4004)
        return
    async with async_session_maker() as session:
        exists = await session.get(PresentationModel, pid)
    if not exists:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    q = websocket.query_params
    user = {
        "id": q.get("uid") or uuid.uuid4().hex[:8],
        "name": (q.get("name") or "Invitado")[:60],
        "color": q.get("color") or "#5141e5",
    }
    key = str(pid)
    await ROOMS.join(key, websocket, user)
    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")
            # Relay ephemeral collaboration signals to peers. Cursor/selection are
            # transient (not persisted); comments are persisted via REST and this
            # path only carries the "someone is typing/editing" style signals.
            if mtype in ("cursor", "selection", "editing", "ping"):
                msg["from"] = user
                await ROOMS.broadcast(key, msg, exclude=websocket)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        LOGGER.info("collab ws error: %s", exc)
    finally:
        await ROOMS.leave(key, websocket)
