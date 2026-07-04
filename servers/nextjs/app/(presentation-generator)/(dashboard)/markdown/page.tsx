"use client";

/**
 * Pegar markdown → deck (modo Gamma, Suite Escriba).
 * Divide el markdown en tarjetas (--- o encabezados), respeta el texto según
 * el modo elegido y genera imágenes por tarjeta con estilo consistente.
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { getApiUrl } from "@/utils/api";

const ACCENT = "#a87f16";

const TEXT_MODES = [
  { value: "preserve", label: "Preservar", hint: "tu texto va tal cual al deck" },
  { value: "condense", label: "Condensar", hint: "resume el contenido" },
  { value: "generate", label: "Generar", hint: "reescribe y expande" },
];

const IMAGE_SOURCES = [
  { value: "", label: "Proveedor configurado" },
  { value: "pexels", label: "Pexels (stock)" },
  { value: "pixabay", label: "Pixabay (stock)" },
  { value: "dall-e-3", label: "DALL-E 3" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gemini-flash", label: "Gemini Flash" },
  { value: "comfyui", label: "ComfyUI" },
  { value: "none", label: "Sin imágenes" },
];

const inputClass =
  "w-full rounded-[11px] border border-[#EDEEEF] bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-[#cfa53a] focus:ring-2 focus:ring-[#a87f16]/20";
const labelClass = "block text-[12px] font-medium text-[#3c3c44] mb-1.5";

const MarkdownPage = () => {
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
      setError("Pegá el markdown antes de generar.");
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
        setError(payload?.detail || "La generación falló. Probá de nuevo.");
        return;
      }
      if (payload?.edit_path) {
        window.location.href = payload.edit_path;
        return;
      }
      setError("La generación terminó pero no devolvió un deck editable.");
    } catch {
      setError("No se pudo contactar al servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-10 font-inter max-w-[880px]">
      <p className="text-sm text-[#70707b] max-w-[70ch] mb-6">
        Pegá un markdown y se transforma en presentación: cada sección separada
        con tres guiones (---) o cada encabezado # / ## es una tarjeta. En modo
        Preservar, tu texto viaja tal cual al deck y la IA solo elige layouts y
        genera las imágenes.
      </p>

      <label className={labelClass} htmlFor="markdown-input">Markdown</label>
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
          <label className={labelClass} htmlFor="text-mode">Modo de texto</label>
          <select
            id="text-mode"
            value={textMode}
            onChange={(event) => setTextMode(event.target.value)}
            className={inputClass}
            disabled={isGenerating}
          >
            {TEXT_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label} — {mode.hint}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="template">Template</label>
          <input
            id="template"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className={inputClass}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="language">Idioma</label>
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
          <label className={labelClass} htmlFor="image-source">Imágenes</label>
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
          <label className={labelClass} htmlFor="image-style">Estilo de imagen</label>
          <input
            id="image-style"
            value={imageStyle}
            onChange={(event) => setImageStyle(event.target.value)}
            placeholder="p. ej. fotorrealista, line art minimalista"
            className={inputClass}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="export-as">Exportar como</label>
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
        {isGenerating ? "Generando el deck…" : "Generar presentación"}
      </button>
      {isGenerating && (
        <p className="mt-3 text-[12.5px] text-[#70707b]">
          La generación puede tardar unos minutos: outline, layouts e imágenes
          por tarjeta. Al terminar te lleva al editor.
        </p>
      )}
    </div>
  );
};

export default MarkdownPage;
