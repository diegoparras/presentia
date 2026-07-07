"use client";

import React, { useState } from "react";
import { MessageSquare, Check, Trash2, X, Users, History, RotateCcw, Save, RefreshCw } from "lucide-react";
import { useCollab, CollabUser } from "../../hooks/useCollab";

function Avatars({ users, self }: { users: CollabUser[]; self: string }) {
  if (!users.length) return null;
  return (
    <div className="flex -space-x-2">
      {users.slice(0, 6).map((u) => (
        <div
          key={u.id}
          title={u.id === self ? `${u.name} (vos)` : u.name}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white"
          style={{ background: u.color }}
        >
          {(u.name || "?").trim().charAt(0).toUpperCase()}
        </div>
      ))}
      {users.length > 6 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-400 text-[10px] font-semibold text-white">
          +{users.length - 6}
        </div>
      )}
    </div>
  );
}

/**
 * Collaboration surface: live presence avatars + a comments drawer.
 * `currentSlide` scopes new comments to the slide being viewed.
 */
const CollabPanel: React.FC<{
  presentationId: string | undefined;
  currentSlide?: number;
}> = ({ presentationId, currentSlide }) => {
  const {
    identity,
    users,
    comments,
    versions,
    connected,
    peerUpdate,
    addComment,
    resolveComment,
    deleteComment,
    saveVersion,
    restoreVersion,
    dismissPeerUpdate,
  } = useCollab(presentationId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const [draft, setDraft] = useState("");
  const [scopeToSlide, setScopeToSlide] = useState(true);
  const [savingVersion, setSavingVersion] = useState(false);

  const openCount = comments.filter((c) => !c.resolved).length;

  const doSaveVersion = async () => {
    const label = window.prompt("Nombre de la versión (opcional):") ?? "";
    setSavingVersion(true);
    await saveVersion(label.trim() || undefined);
    setSavingVersion(false);
  };

  const doRestore = async (id: string) => {
    if (!window.confirm("¿Restaurar esta versión? Se guarda una copia del estado actual antes de restaurar.")) return;
    const ok = await restoreVersion(id);
    if (ok) window.location.reload();
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    await addComment(body, scopeToSlide ? currentSlide ?? null : null);
    setDraft("");
  };

  return (
    <div className="flex items-center gap-3">
      {/* Presence */}
      <div className="flex items-center gap-2">
        <Avatars users={users} self={identity.id} />
        <span
          className={`hidden items-center gap-1 text-[11px] md:flex ${
            connected ? "text-emerald-600" : "text-neutral-400"
          }`}
          title={connected ? "Conectado en vivo" : "Sin conexión en vivo"}
        >
          <Users className="h-3.5 w-3.5" />
          {users.length || 1}
        </span>
      </div>

      {/* Comments toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 hover:bg-neutral-50"
        title="Comentarios"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Comentarios</span>
        {openCount > 0 && (
          <span className="ml-0.5 rounded-full bg-[#5141e5] px-1.5 text-[10px] font-semibold text-white">
            {openCount}
          </span>
        )}
      </button>

      {/* Peer-update banner */}
      {peerUpdate && (
        <div className="fixed left-1/2 top-3 z-[1100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 shadow-lg">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>
            {peerUpdate.author || "Otro usuario"} actualizó la presentación
            {peerUpdate.reason === "restore" ? " (restauró una versión)" : ""}.
          </span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-amber-600 px-2.5 py-1 font-semibold text-white hover:bg-amber-700"
          >
            Actualizar
          </button>
          <button onClick={dismissPeerUpdate} className="text-amber-500 hover:text-amber-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-sm flex-col border-l border-neutral-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-1 text-sm font-semibold">
              <button
                onClick={() => setTab("comments")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${tab === "comments" ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-500 hover:bg-neutral-100"}`}
              >
                <MessageSquare className="h-4 w-4" /> Comentarios
              </button>
              <button
                onClick={() => setTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${tab === "history" ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-500 hover:bg-neutral-100"}`}
              >
                <History className="h-4 w-4" /> Historial
              </button>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {tab === "history" ? (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {versions.length === 0 && (
                  <p className="mt-8 text-center text-xs text-neutral-400">
                    Sin versiones guardadas. Guardá una para poder volver atrás.
                  </p>
                )}
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-neutral-800">
                        {v.label || "Versión sin nombre"}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {v.author} · {v.n_slides} slides · {fmt(v.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => doRestore(v.id)}
                      title="Restaurar esta versión"
                      className="ml-2 flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-100 p-3">
                <button
                  onClick={doSaveVersion}
                  disabled={savingVersion}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5141e5] py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Guardar versión actual
                </button>
              </div>
            </>
          ) : (
          <>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {comments.length === 0 && (
              <p className="mt-8 text-center text-xs text-neutral-400">
                Sin comentarios todavía. Dejá el primero 👇
              </p>
            )}
            {comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3 text-sm ${
                  c.resolved ? "border-neutral-100 bg-neutral-50 opacity-70" : "border-neutral-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">{c.author}</span>
                  <div className="flex items-center gap-1">
                    {c.slide_index != null && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                        Slide {c.slide_index + 1}
                      </span>
                    )}
                    <button
                      onClick={() => resolveComment(c.id, !c.resolved)}
                      title={c.resolved ? "Reabrir" : "Resolver"}
                      className={`rounded p-1 ${c.resolved ? "text-emerald-600" : "text-neutral-400 hover:bg-neutral-100"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteComment(c.id)}
                      title="Borrar"
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-neutral-700">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-100 p-3">
            <label className="mb-2 flex items-center gap-2 text-[11px] text-neutral-500">
              <input
                type="checkbox"
                checked={scopeToSlide}
                onChange={(e) => setScopeToSlide(e.target.checked)}
              />
              Anclar al slide actual{currentSlide != null ? ` (${currentSlide + 1})` : ""}
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Escribí un comentario… (⌘/Ctrl+Enter para enviar)"
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-200 p-2 text-sm outline-none focus:border-[#5141e5]"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="mt-2 w-full rounded-lg bg-[#5141e5] py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Comentar
            </button>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default CollabPanel;
