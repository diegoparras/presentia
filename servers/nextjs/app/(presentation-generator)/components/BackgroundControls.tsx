"use client";

import React, { useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Image as ImageIcon, Loader2, Trash2, Upload, Wand2, X } from "lucide-react";
import type { RootState } from "@/store/store";
import { setSlideBackground } from "@/store/slices/presentationGeneration";
import { ImagesApi } from "../services/api/images";
import { PresentationGenerationApi } from "../services/api/presentation-generation";
import { resolveBackendAssetSource } from "@/utils/api";
import { useEditorPanel } from "./EditorPanelContext";
import type { SlideBackground } from "./styleOverrides";
import { useI18n } from "@/lib/i18n";

/**
 * Panel "Fondo": imagen de fondo por slide desde URL, archivo subido o
 * generada con IA, con alcance configurable (esta slide, algunas o todas).
 */
const BackgroundControls: React.FC<{ slideIndex: number }> = ({ slideIndex }) => {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const { setBackgroundSlide } = useEditorPanel();
  const slides: any[] = useSelector(
    (s: RootState) => (s.presentationGeneration.presentationData as any)?.slides ?? []
  );
  const current: SlideBackground | null =
    slides[slideIndex]?.content?.__background__ ?? null;

  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(current?.url ?? null);
  const [fit, setFit] = useState<"cover" | "contain">(current?.fit === "contain" ? "contain" : "cover");
  const [opacity, setOpacity] = useState<number>(current?.opacity ?? 100);
  const [busy, setBusy] = useState<null | "upload" | "ia" | "url">(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Set<number>>(() => new Set([slideIndex]));
  const fileRef = useRef<HTMLInputElement>(null);

  const slideCount = slides.length;
  const allSelected = useMemo(
    () => slideCount > 0 && scope.size === slideCount,
    [scope, slideCount]
  );

  const toggleSlide = (i: number) =>
    setScope((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // Normaliza respuestas del backend (path/file_url con host interno tipo
  // 127.0.0.1:8000) a URLs same-origin servibles por nginx — igual que
  // hace el ImageEditor con resolveBackendAssetSource.
  const resolveUrl = (res: any): string | null =>
    resolveBackendAssetSource(res) || null;

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    setError(null);
    try {
      const res = await ImagesApi.uploadImage(file);
      const u = resolveUrl(res);
      if (!u) throw new Error("sin url");
      setPreview(u);
    } catch {
      setError(t("ep.bg.errUpload"));
    } finally {
      setBusy(null);
    }
  };

  const onGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    setBusy("ia");
    setError(null);
    try {
      const res = await PresentationGenerationApi.generateImage({ prompt: p });
      const u = resolveUrl(res);
      if (!u) throw new Error("sin url");
      setPreview(u);
    } catch {
      setError(t("ep.bg.errGenerate"));
    } finally {
      setBusy(null);
    }
  };

  const onUseUrl = async () => {
    const u = url.trim();
    if (!u) return;
    setBusy("url");
    setError(null);
    try {
      // Cachear en el servidor: el export solo embebe assets locales de forma
      // confiable (las URLs externas fallan por hotlink protection).
      const res = await ImagesApi.cacheImageUrl(u);
      const local = resolveUrl(res);
      setPreview(local || u);
    } catch {
      // Si no se pudo descargar (sitio bloqueado), usar la URL cruda: se ve
      // en el editor aunque el export pueda no incluirla.
      setPreview(u);
      setError(t("ep.bg.errCache"));
    } finally {
      setBusy(null);
    }
  };

  const apply = () => {
    if (!preview || scope.size === 0) return;
    dispatch(
      setSlideBackground({
        slideIndexes: [...scope],
        background: { url: preview, fit, opacity },
      })
    );
  };

  const removeBg = () => {
    dispatch(setSlideBackground({ slideIndexes: [...scope], background: null }));
    setPreview(null);
  };

  const inputCls =
    "h-9 w-full min-w-0 rounded-md border border-neutral-200 px-2 text-xs outline-none focus:border-[#5141e5]";
  const sectionTitle = "mb-1.5 text-xs font-semibold text-neutral-500";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto text-black">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FBEDEA] text-[#e25a4e]">
          <ImageIcon className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold text-[#191919]">{t("ep.bg.title")}</span>
        <button
          onClick={() => setBackgroundSlide(null)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          title={t("ep.common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Vista previa */}
      <div
        className="relative h-28 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
        style={
          preview
            ? { backgroundImage: `url("${preview}")`, backgroundSize: fit, backgroundPosition: "center", backgroundRepeat: "no-repeat", opacity: opacity / 100 }
            : undefined
        }
      >
        {!preview && (
          <p className="flex h-full items-center justify-center text-xs text-neutral-400">
            {t("ep.bg.none")}
          </p>
        )}
      </div>

      {/* Fuente: URL */}
      <div>
        <p className={sectionTitle}>{t("ep.bg.fromLink")}</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") onUseUrl(); }}
            placeholder="https://…"
            autoComplete="off"
            spellCheck={false}
            className={inputCls}
          />
          <button
            onClick={onUseUrl}
            disabled={!url.trim() || busy !== null}
            className="h-9 shrink-0 rounded-md bg-[#5141e5]/10 px-2.5 text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/20 disabled:opacity-40"
          >
            {busy === "url" ? "…" : t("ep.common.use")}
          </button>
        </div>
      </div>

      {/* Fuente: subir */}
      <div>
        <p className={sectionTitle}>{t("ep.bg.upload")}</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
        >
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy === "upload" ? t("ep.common.uploading") : t("ep.bg.chooseFile")}
        </button>
      </div>

      {/* Fuente: IA */}
      <div>
        <p className={sectionTitle}>{t("ep.bg.generateSection")}</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") onGenerate(); }}
            placeholder={t("ep.bg.generatePh")}
            autoComplete="off"
            className={inputCls}
          />
          <button
            onClick={onGenerate}
            disabled={busy !== null || !prompt.trim()}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md bg-[#5141e5]/10 px-2.5 text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/20 disabled:opacity-40"
          >
            {busy === "ia" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {t("ep.bg.generate")}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Ajustes */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-neutral-500">{t("ep.bg.fit")}</p>
        {(["cover", "contain"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFit(f)}
            className={`rounded-md border px-2 py-1 text-[11px] ${fit === f ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
          >
            {f === "cover" ? t("ep.bg.fitCover") : t("ep.bg.fitContain")}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-neutral-500">{opacity}%</span>
      </div>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={opacity}
        onChange={(e) => setOpacity(Number(e.target.value))}
        className="w-full accent-[#e25a4e]"
        title={t("ep.bg.opacity")}
      />

      {/* Alcance */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-xs font-semibold text-neutral-500">{t("ep.bg.applyIn")}</p>
          <button
            onClick={() => setScope(new Set(Array.from({ length: slideCount }, (_, i) => i)))}
            className={`rounded px-1.5 py-0.5 text-[11px] ${allSelected ? "bg-[#e25a4e]/10 text-[#e25a4e]" : "text-neutral-500 hover:bg-neutral-100"}`}
          >
            {t("ep.bg.all")}
          </button>
          <button
            onClick={() => setScope(new Set([slideIndex]))}
            className="rounded px-1.5 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-100"
          >
            {t("ep.bg.onlyThis")}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => toggleSlide(i)}
              className={`h-7 min-w-7 rounded-md border px-1.5 text-xs font-medium ${
                scope.has(i)
                  ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}
              title={t("ep.bg.slideN", { n: i + 1 })}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-auto flex items-center gap-2 border-t border-neutral-100 pt-3">
        <button
          onClick={apply}
          disabled={!preview || scope.size === 0}
          className="h-9 flex-1 rounded-lg bg-[#e25a4e] text-sm font-semibold text-white hover:bg-[#c9473c] disabled:opacity-40"
        >
          {t("ep.bg.apply")}
        </button>
        <button
          onClick={removeBg}
          disabled={scope.size === 0}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
          title={t("ep.bg.removeTitle")}
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("ep.common.remove")}
        </button>
      </div>
    </div>
  );
};

export default BackgroundControls;
