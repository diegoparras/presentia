"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/sonner";
import { getApiUrl } from "@/utils/api";
import { Globe, Copy, Check, Loader2, Link2 } from "lucide-react";

type PublicMode = "web" | "deck";

/**
 * "Publicar" control: opts a presentation in/out of public sharing and surfaces
 * the shareable link. Talks to the Fase 4 endpoints
 * POST /presentation/{id}/publish|unpublish.
 */
export default function PublishButton({
  presentation_id,
}: {
  presentation_id: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<PublicMode>("web");
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/p/${token}${mode === "deck" ? "?mode=deck" : ""}`
      : "";

  const publish = async (nextMode: PublicMode) => {
    setLoading(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/presentation/${presentation_id}/publish`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_mode: nextMode }),
        }
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setToken(data.share_token);
      setMode(data.public_mode ?? nextMode);
    } catch {
      notify.error("No se pudo publicar", "Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const unpublish = async () => {
    setLoading(true);
    try {
      await fetch(
        getApiUrl(`/api/v1/ppt/presentation/${presentation_id}/unpublish`),
        { method: "POST" }
      );
      setToken(null);
    } catch {
      notify.error("No se pudo despublicar", "Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-[7px] px-[16px] py-[10px] rounded-[53px] text-sm font-semibold text-[#101323] border border-[#EDECEC] bg-white hover:bg-[#F6F6F9]"
          aria-label="Publicar"
        >
          <Globe className="w-3.5 h-3.5" /> Publicar
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-4">
        <p className="text-sm font-semibold text-[#101323]">Compartir públicamente</p>
        <p className="mt-1 text-xs text-neutral-500">
          Cualquiera con el link podrá ver esta presentación, sin cuenta.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => publish("web")}
            disabled={loading}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              token && mode === "web"
                ? "border-[#5141e5] bg-[#5141e5]/5"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className="block font-semibold text-[#101323]">Web</span>
            <span className="text-neutral-500">Scroll responsive</span>
          </button>
          <button
            onClick={() => publish("deck")}
            disabled={loading}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              token && mode === "deck"
                ? "border-[#5141e5] bg-[#5141e5]/5"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className="block font-semibold text-[#101323]">Deck</span>
            <span className="text-neutral-500">Presentación 16:9</span>
          </button>
        </div>

        {loading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando…
          </div>
        )}

        {token && !loading && (
          <>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 bg-transparent text-xs text-neutral-700 outline-none"
              />
              <button onClick={copy} className="shrink-0 text-neutral-500 hover:text-[#5141e5]" aria-label="Copiar">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={unpublish}
              className="mt-3 text-xs font-medium text-red-500 hover:text-red-600"
            >
              Dejar de compartir
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
