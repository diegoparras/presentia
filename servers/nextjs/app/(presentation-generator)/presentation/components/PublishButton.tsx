"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notify } from "@/components/ui/sonner";
import { getApiUrl } from "@/utils/api";
import { useI18n } from "@/lib/i18n";
import type { RootState } from "@/store/store";
import { Globe, Copy, Check, Loader2, Link2, Pencil } from "lucide-react";

type PublicMode = "web" | "deck";

// Mismas reglas que el backend: minúsculas/números/guiones, 3-50, sin guion
// en los extremos.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;
const sanitizeSlugInput = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    // Quita los diacríticos que deja NFD (á→a, ñ→n) antes del filtro.
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);

/**
 * "Publicar" control: opts a presentation in/out of public sharing and surfaces
 * the shareable link. Talks to the Fase 4 endpoints
 * POST /presentation/{id}/publish|unpublish. Permite personalizar el slug de
 * la URL pública (/p/<slug>).
 */
export default function PublishButton({
  presentation_id,
}: {
  presentation_id: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<PublicMode>("web");
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);

  // Hidratar el estado publicado desde los datos ya cargados del editor (el
  // GET de la presentación incluye is_public/share_token/custom_slug).
  const presentationData = useSelector(
    (s: RootState) => (s.presentationGeneration as any)?.presentationData
  );
  useEffect(() => {
    if (!presentationData) return;
    if (presentationData.is_public && presentationData.share_token) {
      setToken(presentationData.share_token);
      setSlug(presentationData.custom_slug ?? null);
      setMode(presentationData.public_mode === "deck" ? "deck" : "web");
      setSlugDraft(presentationData.custom_slug ?? "");
    }
    // Solo al cargar: los cambios posteriores los maneja el propio popover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationData?.id]);

  const publicId = slug || token;
  const shareUrl =
    publicId && typeof window !== "undefined"
      ? `${window.location.origin}/p/${publicId}${mode === "deck" ? "?mode=deck" : ""}`
      : "";

  const publish = async (
    nextMode: PublicMode,
    nextSlug?: string
  ): Promise<boolean> => {
    try {
      const body: Record<string, unknown> = { public_mode: nextMode };
      if (nextSlug !== undefined) body.custom_slug = nextSlug;
      const res = await fetch(
        getApiUrl(`/api/v1/ppt/presentation/${presentation_id}/publish`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (res.status === 409) {
        setSlugError(t("pub.slugTaken"));
        return false;
      }
      if (res.status === 422) {
        setSlugError(t("pub.slugInvalid"));
        return false;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setToken(data.share_token);
      setSlug(data.custom_slug ?? null);
      setSlugDraft(data.custom_slug ?? "");
      setMode(data.public_mode ?? nextMode);
      setSlugError(null);
      return true;
    } catch {
      notify.error(t("pub.errPublishTitle"), t("pub.errRetry"));
      return false;
    }
  };

  const publishMode = async (nextMode: PublicMode) => {
    setLoading(true);
    await publish(nextMode);
    setLoading(false);
  };

  const saveSlug = async () => {
    const draft = slugDraft.trim();
    // Vacío = volver al token aleatorio.
    if (draft !== "" && !SLUG_RE.test(draft)) {
      setSlugError(t("pub.slugInvalid"));
      return;
    }
    setSavingSlug(true);
    const ok = await publish(mode, draft);
    setSavingSlug(false);
    if (ok) notify.success(t("pub.slugSaved"));
  };

  const unpublish = async () => {
    setLoading(true);
    try {
      await fetch(
        getApiUrl(`/api/v1/ppt/presentation/${presentation_id}/unpublish`),
        { method: "POST" }
      );
      setToken(null);
      setSlug(null);
      setSlugError(null);
    } catch {
      notify.error(t("pub.errUnpublishTitle"), t("pub.errRetry"));
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
          aria-label={t("pub.publish")}
        >
          <Globe className="w-3.5 h-3.5" /> {t("pub.publish")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-4">
        <p className="text-sm font-semibold text-[#101323]">{t("pub.title")}</p>
        <p className="mt-1 text-xs text-neutral-500">{t("pub.subtitle")}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => publishMode("web")}
            disabled={loading}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              token && mode === "web"
                ? "border-[#5141e5] bg-[#5141e5]/5"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className="block font-semibold text-[#101323]">Web</span>
            <span className="text-neutral-500">{t("pub.webDesc")}</span>
          </button>
          <button
            onClick={() => publishMode("deck")}
            disabled={loading}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              token && mode === "deck"
                ? "border-[#5141e5] bg-[#5141e5]/5"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className="block font-semibold text-[#101323]">Deck</span>
            <span className="text-neutral-500">{t("pub.deckDesc")}</span>
          </button>
        </div>

        {loading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("pub.processing")}
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
              <button onClick={copy} className="shrink-0 text-neutral-500 hover:text-[#5141e5]" aria-label={t("pub.copy")}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Slug personalizado: /p/<slug> */}
            <div className="mt-3">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                <Pencil className="h-3 w-3" /> {t("pub.slugLabel")}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 min-w-0 flex-1 items-center rounded-md border border-neutral-200 bg-white px-2">
                  <span className="shrink-0 text-xs text-neutral-400">/p/</span>
                  <input
                    value={slugDraft}
                    onChange={(e) => {
                      setSlugDraft(sanitizeSlugInput(e.target.value));
                      setSlugError(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") saveSlug();
                    }}
                    placeholder={t("pub.slugPh")}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent text-xs text-neutral-700 outline-none"
                  />
                </div>
                <button
                  onClick={saveSlug}
                  disabled={savingSlug || (slugDraft || "") === (slug || "")}
                  className="h-8 shrink-0 rounded-md bg-[#5141e5]/10 px-2.5 text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/20 disabled:opacity-40"
                >
                  {savingSlug ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    t("pub.slugSave")
                  )}
                </button>
              </div>
              {slugError && (
                <p className="mt-1 text-[11px] text-red-500">{slugError}</p>
              )}
            </div>

            <button
              onClick={unpublish}
              className="mt-3 text-xs font-medium text-red-500 hover:text-red-600"
            >
              {t("pub.unpublish")}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
