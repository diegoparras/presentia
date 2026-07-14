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

export interface Version {
  id: string;
  presentation: string;
  label: string | null;
  author: string;
  n_slides: number;
  created_at: string;
}

export interface PeerUpdate {
  reason: string;
  author?: string;
  at: number;
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
  const [versions, setVersions] = useState<Version[]>([]);
  const [peerUpdate, setPeerUpdate] = useState<PeerUpdate | null>(null);
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

  const refreshVersions = useCallback(async () => {
    if (!presentationId) return;
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/collab/versions/${presentationId}`),
        { headers: getHeader() }
      );
      if (res.ok) setVersions(await res.json());
    } catch {}
  }, [presentationId]);

  // Initial load
  useEffect(() => {
    refreshComments();
    refreshVersions();
  }, [refreshComments, refreshVersions]);

  // WebSocket presence + live events
  useEffect(() => {
    if (!presentationId || typeof window === "undefined") return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    // Backoff exponencial con corte: si la infra no soporta WS (proxy sin
    // upgrade, etc.), reintentar cada 3s para siempre inunda la consola.
    // 1s→2s→4s… tope 30s, y tras MAX_FAILURES se deja de intentar hasta que
    // la pestaña vuelva a estar visible.
    let failures = 0;
    const MAX_FAILURES = 8;
    const scheduleRetry = () => {
      if (closed) return;
      failures += 1;
      if (failures > MAX_FAILURES) return; // pausa hasta visibilitychange
      const delay = Math.min(1000 * 2 ** (failures - 1), 30000);
      retry = setTimeout(connect, delay);
    };
    const onVisible = () => {
      if (closed || document.visibilityState !== "visible") return;
      // Reanudar solo si el circuito estaba cortado.
      if (failures > MAX_FAILURES) {
        failures = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl(presentationId, identity));
      } catch {
        scheduleRetry();
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        failures = 0;
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        scheduleRetry();
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
          case "version_saved":
            setVersions((prev) =>
              prev.some((v) => v.id === msg.version.id) ? prev : [msg.version, ...prev]
            );
            break;
          case "doc_updated":
            // Another client saved/restored. Don't clobber local edits — surface
            // a banner and let the user refresh explicitly.
            if (msg.from?.id !== identity.id) {
              setPeerUpdate({ reason: msg.reason || "save", author: msg.author, at: Date.now() });
            }
            break;
        }
      };
    };
    connect();

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
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

  const saveVersion = useCallback(
    async (label?: string) => {
      if (!presentationId) return;
      try {
        const res = await fetch(getApiUrl(`/api/v1/ppt/collab/versions`), {
          method: "POST",
          headers: getHeader(),
          body: JSON.stringify({
            presentation_id: presentationId,
            label: label || null,
            author: identity.name,
          }),
        });
        if (res.ok) {
          const v = await res.json();
          setVersions((prev) => (prev.some((x) => x.id === v.id) ? prev : [v, ...prev]));
        }
      } catch {}
    },
    [presentationId, identity]
  );

  const restoreVersion = useCallback(async (versionId: string) => {
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/collab/versions/${versionId}/restore`),
        { method: "POST", headers: getHeader() }
      );
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Tell peers this client just saved (so their editor offers a refresh).
  const notifyUpdated = useCallback(async () => {
    if (!presentationId) return;
    try {
      await fetch(getApiUrl(`/api/v1/ppt/collab/notify-updated/${presentationId}`), {
        method: "POST",
        headers: getHeader(),
        body: JSON.stringify({ author: identity.name }),
      });
    } catch {}
  }, [presentationId, identity]);

  const dismissPeerUpdate = useCallback(() => setPeerUpdate(null), []);

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
    versions,
    connected,
    peerUpdate,
    addComment,
    resolveComment,
    deleteComment,
    refreshComments,
    refreshVersions,
    saveVersion,
    restoreVersion,
    notifyUpdated,
    dismissPeerUpdate,
    setName,
  };
}
