"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl, buildAbsoluteApiRequestUrl } from "@/utils/api";
import { getHeader } from "../services/api/header";

export interface CollabUser {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  presentation: string;
  slide_index: number | null;
  author: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

const COLORS = [
  "#5141e5", "#e5417a", "#41b5e5", "#41e58a", "#e5a641",
  "#a641e5", "#e56b41", "#41e5d0",
];

// Stable per-browser identity for presence/comments.
function loadIdentity(): CollabUser {
  if (typeof window === "undefined") return { id: "srv", name: "Invitado", color: COLORS[0] };
  try {
    const raw = localStorage.getItem("presentia:collab:identity");
    if (raw) return JSON.parse(raw);
  } catch {}
  const id = Math.random().toString(36).slice(2, 10);
  const identity: CollabUser = {
    id,
    name: `Invitado ${id.slice(0, 3)}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  try {
    localStorage.setItem("presentia:collab:identity", JSON.stringify(identity));
  } catch {}
  return identity;
}

function wsUrl(presentationId: string, user: CollabUser): string {
  const abs = buildAbsoluteApiRequestUrl(
    `/api/v1/ppt/collab/ws/${presentationId}`
  );
  const u = new URL(abs);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.searchParams.set("uid", user.id);
  u.searchParams.set("name", user.name);
  u.searchParams.set("color", user.color);
  return u.toString();
}

export function useCollab(presentationId: string | undefined) {
  const identity = useMemo(loadIdentity, []);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const refreshComments = useCallback(async () => {
    if (!presentationId) return;
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/collab/comments/${presentationId}`),
        { headers: getHeader() }
      );
      if (res.ok) setComments(await res.json());
    } catch {}
  }, [presentationId]);

  // Initial comment load
  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  // WebSocket presence + live events
  useEffect(() => {
    if (!presentationId || typeof window === "undefined") return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl(presentationId, identity));
      } catch {
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
      ws.onmessage = (ev) => {
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        switch (msg.type) {
          case "presence":
            setUsers(Array.isArray(msg.users) ? msg.users : []);
            break;
          case "comment_added":
            setComments((prev) =>
              prev.some((c) => c.id === msg.comment.id) ? prev : [...prev, msg.comment]
            );
            break;
          case "comment_updated":
            setComments((prev) =>
              prev.map((c) => (c.id === msg.comment.id ? msg.comment : c))
            );
            break;
          case "comment_deleted":
            setComments((prev) => prev.filter((c) => c.id !== msg.id));
            break;
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [presentationId, identity]);

  const addComment = useCallback(
    async (body: string, slideIndex: number | null) => {
      if (!presentationId || !body.trim()) return;
      try {
        const res = await fetch(getApiUrl(`/api/v1/ppt/collab/comments`), {
          method: "POST",
          headers: getHeader(),
          body: JSON.stringify({
            presentation_id: presentationId,
            slide_index: slideIndex,
            author: identity.name,
            body,
          }),
        });
        // Optimistic: WS broadcast will also add it, dedup by id guards double-add.
        if (res.ok) {
          const c = await res.json();
          setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        }
      } catch {}
    },
    [presentationId, identity]
  );

  const resolveComment = useCallback(async (id: string, resolved: boolean) => {
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/collab/comments/${id}/resolve`),
        {
          method: "PATCH",
          headers: getHeader(),
          body: JSON.stringify({ resolved }),
        }
      );
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      }
    } catch {}
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/ppt/collab/comments/${id}`), {
        method: "DELETE",
        headers: getHeader(),
      });
      if (res.ok) setComments((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  }, []);

  const setName = useCallback((name: string) => {
    const next = { ...identity, name };
    try {
      localStorage.setItem("presentia:collab:identity", JSON.stringify(next));
    } catch {}
    // Reconnect with new name on next mount; cheap enough to require a refresh.
  }, [identity]);

  return {
    identity,
    users,
    comments,
    connected,
    addComment,
    resolveComment,
    deleteComment,
    refreshComments,
    setName,
  };
}
