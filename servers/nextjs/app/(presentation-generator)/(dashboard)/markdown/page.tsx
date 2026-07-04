"use client";

/**
 * Pegar markdown → deck (modo Gamma, Suite Escriba).
 * Divide el markdown en tarjetas (--- o encabezados), respeta el texto según
 * el modo elegido y genera imágenes por tarjeta con estilo consistente.
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { getApiUrl } from "@/utils/api";
import { useI18n } from "@/lib/i18n";

const ACCENT = "#c2571f";

const TEXT_MODE_KEYS: Record<string, string> = {
  preserve: "md.mode.preserve",
  condense: "md.mode.condense",
  generate: "md.mode.generate",
};

const IMAGE_SOURCES = [
  { value: "", label: "Proveedor configurado" },
  { value: "pexels", label: "Pexels (stock)" },
  { value: "pixabay", label: "Pixabay (stock)" },
  { value: "dall-e-3", label: "DALL-E 3" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gemini_flash", label: "Gemini Flash" },
  { value: "comfyui", label: "ComfyUI" },
  { value: "none", label: "Sin imágenes" },
];

const inputClass =
  "w-full rounded-[11px] border border-[#EDEEEF] bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-[#dd7a42] focus:ring-2 focus:ring-[#c2571f]/20";
const labelClass = "block text-[12px] font-medium text-[#3c3c44] mb-1.5";

const MarkdownPage = () => {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState("");
  const [textMode, setTextMode] = useState("preserve");
  const [template, setTemplate] = useState("general");
  const [language, setLanguage] = useState("");
  const [imageStyle, setImageStyle] = useState("");
  const [imageSource, setImageSource] = useState("");
  const [exportAs, setExportAs] = useState<"pptx" | "pdf">("pptx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!markdown.trim()) {
      setError(t("md.error.empty"));
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch(
        getApiUrl("/api/v1/ppt/presentation/generate-from-markdown"),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markdown,
            text_mode: textMode,
            template,
            language: language.trim() || null,
            image_style: imageStyle.trim() || null,
            image_source: imageSource || null,
            export_as: exportAs,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.detail || t("md.error.failed"));
        return;
      }
      if (payload?.edit_path) {
        window.location.href = payload.edit_path;
        return;
      }
      setError(t("md.error.noDeck"));
    } catch {
      setError(t("md.error.network"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-10 font-inter max-w-[880px]">
      <p className="text-sm text-[#70707b] max-w-[70ch] mb-6">
        {t("md.intro")}
      </p>

      <label className={labelClass} htmlFor="markdown-input">{t("md.label")}</label>
      <textarea
        id="markdown-input"
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
        placeholder={"# Título del deck\nIntro...\n\n---\n\n## Primera sección\nContenido..."}
        rows={14}
        className={`${inputClass} font-mono text-[13px] leading-relaxed resize-y`}
        disabled={isGenerating}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="text-mode">{t("md.textMode")}</label>
          <select
            id="text-mode"
            value={textMode}
            onChange={(event) => setTextMode(event.target.value)}
            className={inputClass}
            disabled={isGenerating}
          >
            {Object.entries(TEXT_MODE_KEYS).map(([value, key]) => (
              <option key={value} value={value}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="template">{t("md.template")}</label>
          <input
            id="template"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className={inputClass}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="language">{t("md.language")}</label>
          <input
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="auto"
            className={inputClass}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="image-source">{t("md.images")}</label>
          <select
            id="image-source"
            value={imageSource}
            onChange={(event) => setImageSource(event.target.value)}
            className={inputClass}
            disabled={isGenerating}
          >
            {IMAGE_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="image-style">{t("md.imageStyle")}</label>
          <input
            id="image-style"
            value={imageStyle}
            onChange={(event) => setImageStyle(event.target.value)}
            placeholder={t("md.imageStyle.ph")}
            className={inputClass}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="export-as">{t("md.exportAs")}</label>
          <select
            id="export-as"
            value={exportAs}
            onChange={(event) => setExportAs(event.target.value as "pptx" | "pdf")}
            className={inputClass}
            disabled={isGenerating}
          >
            <option value="pptx">PPTX</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-[#cf222e]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={isGenerating}
        className="mt-6 inline-flex items-center gap-2 rounded-[11px] px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
        style={{ backgroundColor: ACCENT }}
      >
        {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
        {isGenerating ? t("md.generating") : t("md.generate")}
      </button>
      {isGenerating && (
        <p className="mt-3 text-[12.5px] text-[#70707b]">
          {t("md.generating.hint")}
        </p>
      )}
    </div>
  );
};

export default MarkdownPage;
