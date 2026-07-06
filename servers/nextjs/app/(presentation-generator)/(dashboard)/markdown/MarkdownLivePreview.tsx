"use client";

/**
 * Preview en vivo (modo Gamma) del deck que se está generando desde markdown.
 * Muestra las slides REALES en miniatura (SlideScale) a medida que el stream
 * las va largando, con estado y accesos al editor. No sale de la página.
 */

import React from "react";
import { CheckCircle2, ExternalLink, Loader2, Plus } from "lucide-react";
import SlideScale from "@/app/(presentation-generator)/components/PresentationRender";
import { useI18n } from "@/lib/i18n";
import type { StreamStatus } from "./useMarkdownDeckStream";

const ACCENT = "#e25a4e";

const MarkdownLivePreview = ({
  slides,
  status,
  error,
  presentationId,
  expected,
  onReset,
}: {
  slides: any[];
  status: StreamStatus;
  error: string | null;
  presentationId: string;
  expected: number;
  onReset: () => void;
}) => {
  const { t } = useI18n();
  const done = status === "done";
  const failed = status === "error";
  // Mientras llegan, completamos con esqueletos hasta la cantidad esperada.
  const placeholders = Math.max(0, expected - slides.length);
  const editorHref = `/presentation?id=${presentationId}&type=standard`;

  return (
    <div className="font-inter">
      {/* Barra de estado */}
      <div className="sticky top-[76px] z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#EDEEEF] bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          {done ? (
            <CheckCircle2 className="h-5 w-5" style={{ color: "#15803d" }} />
          ) : failed ? (
            <span className="text-[#cf222e]">●</span>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          )}
          <span className="text-sm font-medium text-[#16161a]">
            {failed
              ? t("md.live.failed")
              : done
                ? t("md.live.done", { n: slides.length })
                : t("md.live.generating", { done: slides.length, total: expected })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#EDEEEF] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3c3c44] transition hover:bg-[#F6F6F9]"
          >
            <Plus className="h-4 w-4" /> {t("md.live.new")}
          </button>
          <a
            href={editorHref}
            className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold text-white transition"
            style={{ backgroundColor: ACCENT }}
          >
            <ExternalLink className="h-4 w-4" /> {t("md.live.openEditor")}
          </a>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#cf222e]" role="alert">
          {t("md.live.failed")}
        </p>
      )}

      {/* Grilla de miniaturas reales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((slide, index) => (
          <a
            key={index}
            href={editorHref}
            className="group block overflow-hidden rounded-[12px] border border-[#E1E1E5] bg-white transition hover:border-[#ef8175] hover:shadow-md"
          >
            <div className="pointer-events-none aspect-[16/9] w-full overflow-hidden bg-[#FAFAFB]">
              <SlideScale slide={slide} isEditMode={false} isClickable={false} />
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span
                className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: ACCENT }}
              >
                {t("md.card", { n: index + 1 })}
              </span>
            </div>
          </a>
        ))}

        {Array.from({ length: placeholders }).map((_, i) => (
          <div
            key={`ph-${i}`}
            className="overflow-hidden rounded-[12px] border border-dashed border-[#E1E1E5] bg-white"
          >
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-[#FAFAFB]">
              <Loader2 className="h-5 w-5 animate-spin text-[#C9C7C4]" />
            </div>
            <div className="px-3 py-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#C9C7C4]">
                {t("md.card", { n: slides.length + i + 1 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkdownLivePreview;
