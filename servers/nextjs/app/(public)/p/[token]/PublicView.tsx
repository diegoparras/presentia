"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { setPresentationData } from "@/store/slices/presentationGeneration";
import SlideScale from "@/app/(presentation-generator)/components/PresentationRender";
import { useFontLoader } from "@/app/(presentation-generator)/hooks/useFontLoad";
import { normalizeBackendAssetUrls } from "@/utils/api";
import { Play, X, Loader2, AlertCircle } from "lucide-react";

const THEME_VAR_MAP: Record<string, string> = {
  primary: "--primary-color",
  background: "--background-color",
  card: "--card-color",
  stroke: "--stroke",
  primary_text: "--primary-text",
  background_text: "--background-text",
  graph_0: "--graph-0",
  graph_1: "--graph-1",
  graph_2: "--graph-2",
  graph_3: "--graph-3",
  graph_4: "--graph-4",
  graph_5: "--graph-5",
  graph_6: "--graph-6",
  graph_7: "--graph-7",
  graph_8: "--graph-8",
  graph_9: "--graph-9",
};

function applyThemeTo(el: HTMLElement | null, theme: any) {
  if (!el || !theme?.data?.colors) return;
  const colors = theme.data.colors;
  Object.entries(THEME_VAR_MAP).forEach(([key, cssVar]) => {
    if (colors[key]) el.style.setProperty(cssVar, colors[key]);
  });
  const textFont = theme.data.fonts?.textFont;
  if (textFont?.name && textFont?.url) {
    useFontLoader({ [textFont.name]: textFont.url });
    el.style.setProperty("font-family", `"${textFont.name}"`);
    el.style.setProperty("--heading-font-family", `"${textFont.name}"`);
    el.style.setProperty("--body-font-family", `"${textFont.name}"`);
  }
}

type Mode = "web" | "deck";

export default function PublicView({
  token,
  initialMode,
}: {
  token: string;
  initialMode?: Mode;
}) {
  const dispatch = useDispatch();
  const { presentationData } = useSelector(
    (s: RootState) => s.presentationGeneration
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode ?? "web");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fastapiUrl = params.get("fastapiUrl") || "";
    (async () => {
      try {
        const res = await fetch(
          `${fastapiUrl}/api/v1/ppt/presentation/public/${token}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = normalizeBackendAssetUrls(await res.json());
        dispatch(setPresentationData(data));
        if (data.fonts) useFontLoader(data.fonts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, dispatch]);

  const slides = presentationData?.slides ?? [];
  const theme = presentationData?.theme ?? null;

  // Apply the theme onto the public wrapper once slides are in.
  useEffect(() => {
    if (slides.length) applyThemeTo(document.getElementById("public-wrapper"), theme);
  }, [slides.length, theme]);

  const go = useCallback(
    (delta: number) => setCurrent((c) => Math.min(slides.length - 1, Math.max(0, c + delta))),
    [slides.length]
  );

  useEffect(() => {
    if (mode !== "deck") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") setMode("web");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, go]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-neutral-50 text-neutral-700">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-xl font-semibold">Presentación no disponible</p>
        <p className="text-sm text-neutral-500">El link puede haber expirado o no ser público.</p>
      </div>
    );
  }

  if (loading || slides.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (mode === "deck") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-2 text-white/80">
          <span className="text-sm">
            {current + 1} / {slides.length}
          </span>
          <button onClick={() => setMode("web")} aria-label="Cerrar" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div id="public-wrapper" className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-6">
          <div className="h-full w-full max-w-[1400px]">
            <SlideScale slide={slides[current]} theme={theme} isEditMode={false} isClickable={false} presentMode />
          </div>
        </div>
        <button
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="Anterior"
        >
          ‹
        </button>
        <button
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>
    );
  }

  // "web" mode: responsive vertical scroll. Each slide scales to the column
  // width (SlideScale non-fixedSize), so it stays readable from phone to desktop.
  return (
    <div id="public-wrapper" className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
        <h1 className="truncate text-base font-semibold text-neutral-800 sm:text-lg">
          {presentationData?.title || "Presentación"}
        </h1>
        <button
          onClick={() => {
            setCurrent(0);
            setMode("deck");
          }}
          className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <Play className="h-4 w-4" /> Presentar
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-3 py-6 sm:gap-10 sm:px-6 sm:py-10">
        {slides.map((slide: any, index: number) => (
          <section
            key={`${slide.type}-${index}-${slide.index}`}
            id={`slide-${slide.index}`}
            className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200"
          >
            <SlideScale slide={slide} theme={theme} isEditMode={false} isClickable={false} />
          </section>
        ))}
      </main>

      <footer className="py-8 text-center text-xs text-neutral-400">
        Hecho con Presentia
      </footer>
    </div>
  );
}
