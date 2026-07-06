"use client";

/**
 * Pegar markdown → deck (modo Gamma, Suite Escriba).
 * Editor estilo Escriba: toolbar, panel doble con vista previa en vivo por
 * tarjeta (mismo corte que el backend: --- o encabezados), drag&drop de .md.
 * Divide el markdown en tarjetas, respeta el texto según el modo elegido y
 * genera imágenes por tarjeta con estilo consistente.
 */

import React, { useMemo, useRef, useState } from "react";
import {
  Bold,
  Eye,
  EyeOff,
  FileUp,
  Heading1,
  Heading2,
  Italic,
  List,
  Loader2,
  Quote,
  SeparatorHorizontal,
} from "lucide-react";
import { marked } from "marked";
import { getApiUrl } from "@/utils/api";
import { useI18n } from "@/lib/i18n";
import { templates } from "@/app/presentation-templates";
import PageShell from "../Components/PageShell";
import { useMarkdownDeckStream } from "./useMarkdownDeckStream";
import MarkdownLivePreview from "./MarkdownLivePreview";

const ACCENT = "#e25a4e";

const TEXT_MODE_KEYS: Record<string, string> = {
  preserve: "md.mode.preserve",
  condense: "md.mode.condense",
  generate: "md.mode.generate",
};

const IMAGE_SOURCES = [
  { value: "", labelKey: "md.img.default" },
  { value: "pexels", label: "Pexels (stock)" },
  { value: "pixabay", label: "Pixabay (stock)" },
  { value: "dall-e-3", label: "DALL-E 3" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gemini_flash", label: "Gemini Flash" },
  { value: "comfyui", label: "ComfyUI" },
  { value: "none", labelKey: "md.img.none" },
] as { value: string; label?: string; labelKey?: string }[];

// Idiomas de la suite como valores legibles para el prompt del backend
const DECK_LANGUAGES = [
  "English",
  "Español",
  "Français",
  "Português",
  "Italiano",
  "中文",
  "日本語",
];

const inputClass =
  "w-full rounded-[11px] border border-[#EDEEEF] bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-[#ef8175] focus:ring-2 focus:ring-[#e25a4e]/20";
const labelClass = "block text-[12px] font-medium text-[#3c3c44] mb-1.5";
const toolClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#3c3c44] transition hover:bg-[#FBEDEA] hover:text-[#c9473c]";

// Mismo corte que el backend (markdown_deck_service): breaks → encabezados → todo junto
const BREAK_SPLIT = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m;

function splitCards(markdown: string): string[] {
  const text = markdown.trim();
  if (!text) return [];
  const byBreaks = text
    .split(BREAK_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
  if (byBreaks.length > 1) return byBreaks;

  const cards: string[] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    if (/^#{1,2}\s/.test(line) && current.join("\n").trim()) {
      cards.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.join("\n").trim()) cards.push(current.join("\n").trim());
  return cards.length ? cards : [text];
}

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
  const [showPreview, setShowPreview] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview en vivo (modo Gamma): el stream va largando las slides reales.
  const {
    slides: liveSlides,
    status: streamStatus,
    error: streamError,
  } = useMarkdownDeckStream({
    presentationId,
    imageStyle: imageStyle.trim() || null,
    imageSource: imageSource || null,
  });

  const cards = useMemo(() => splitCards(markdown), [markdown]);
  const cardsHtml = useMemo(
    () => cards.map((card) => marked.parse(card, { async: false }) as string),
    [cards]
  );

  const applyEdit = (
    transform: (value: string, start: number, end: number) => {
      value: string;
      selectionStart: number;
      selectionEnd: number;
    }
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { value, selectionStart, selectionEnd } = textarea;
    const next = transform(value, selectionStart, selectionEnd);
    setMarkdown(next.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const wrapSelection = (before: string, after: string) =>
    applyEdit((value, start, end) => {
      const selected = value.slice(start, end) || "texto";
      const nextValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      return {
        value: nextValue,
        selectionStart: start + before.length,
        selectionEnd: start + before.length + selected.length,
      };
    });

  const prefixLine = (prefix: string) =>
    applyEdit((value, start, end) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      return {
        value: nextValue,
        selectionStart: start + prefix.length,
        selectionEnd: end + prefix.length,
      };
    });

  const insertCardBreak = () =>
    applyEdit((value, start, end) => {
      const block = "\n\n---\n\n";
      const nextValue = value.slice(0, end) + block + value.slice(end);
      const cursor = end + block.length;
      return { value: nextValue, selectionStart: cursor, selectionEnd: cursor };
    });

  const loadFile = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setMarkdown(reader.result);
    };
    reader.readAsText(file);
  };

  const generate = async () => {
    if (!markdown.trim()) {
      setError(t("md.error.empty"));
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      // Prepara el deck (outline + estructura) y devuelve el id; las slides se
      // generan en el stream y se van mostrando en vivo (modo Gamma).
      const response = await fetch(
        getApiUrl("/api/v1/ppt/presentation/prepare-from-markdown"),
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
      if (!response.ok || !payload?.presentation_id) {
        setError(payload?.detail || t("md.error.failed"));
        return;
      }
      setPresentationId(payload.presentation_id);
    } catch {
      setError(t("md.error.network"));
    } finally {
      setIsGenerating(false);
    }
  };

  const resetPreview = () => {
    setPresentationId(null);
    setError(null);
  };

  const tools: {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }[] = [
    { key: "md.tool.bold", icon: Bold, action: () => wrapSelection("**", "**") },
    { key: "md.tool.italic", icon: Italic, action: () => wrapSelection("*", "*") },
    { key: "md.tool.h1", icon: Heading1, action: () => prefixLine("# ") },
    { key: "md.tool.h2", icon: Heading2, action: () => prefixLine("## ") },
    { key: "md.tool.list", icon: List, action: () => prefixLine("- ") },
    { key: "md.tool.quote", icon: Quote, action: () => prefixLine("> ") },
    { key: "md.tool.newCard", icon: SeparatorHorizontal, action: insertCardBreak },
  ];

  if (presentationId) {
    return (
      <PageShell title={t("md.title")} subtitle={t("md.intro")}>
        <div className="pb-10 font-inter max-w-[1180px]">
          <MarkdownLivePreview
            slides={liveSlides}
            status={streamStatus}
            error={streamError}
            presentationId={presentationId}
            expected={cards.length}
            onReset={resetPreview}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t("md.title")} subtitle={t("md.intro")}>
      <div className="pb-10 font-inter max-w-[1180px]">
        {/* Toolbar */}
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-[11px] border border-[#EDEEEF] bg-white px-2 py-1.5">
          {tools.map(({ key, icon: Icon, action }) => (
            <button
              key={key}
              type="button"
              className={toolClass}
              title={t(key)}
              aria-label={t(key)}
              onClick={action}
              disabled={isGenerating}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-[#EDEEEF]" aria-hidden />
          <button
            type="button"
            className={toolClass}
            title={t("md.openFile")}
            aria-label={t("md.openFile")}
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
          >
            <FileUp className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(event) => {
              loadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] tabular-nums text-[#70707b]">
              {t("md.cards", { n: cards.length })}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium text-[#3c3c44] transition hover:bg-[#FBEDEA] hover:text-[#c9473c]"
              onClick={() => setShowPreview((prev) => !prev)}
              aria-pressed={showPreview}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {t("md.preview")}
            </button>
          </div>
        </div>

        {/* Editor + vista previa */}
        <div
          className={`grid gap-3 ${showPreview ? "lg:grid-cols-2" : ""} relative`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            loadFile(event.dataTransfer.files?.[0]);
          }}
        >
          {isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[11px] border-2 border-dashed text-sm font-medium"
              style={{ borderColor: ACCENT, color: ACCENT, backgroundColor: "rgba(253,240,238,.9)" }}
            >
              {t("md.dropHint")}
            </div>
          )}
          <textarea
            ref={textareaRef}
            id="markdown-input"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder={"# Título del deck\nIntro...\n\n---\n\n## Primera sección\nContenido..."}
            rows={20}
            spellCheck={false}
            className={`${inputClass} min-h-[420px] resize-y font-mono text-[13px] leading-relaxed`}
            disabled={isGenerating}
            aria-label={t("md.label")}
          />
          {showPreview && (
            <div className="min-h-[420px] max-h-[560px] space-y-3 overflow-auto rounded-[11px] border border-[#EDEEEF] bg-[#FAFAFB] p-3">
              {cards.length === 0 && (
                <p className="p-4 text-sm text-[#70707b]">{t("md.dropHint")}</p>
              )}
              {cardsHtml.map((html, index) => (
                <div
                  key={index}
                  className="rounded-[10px] border border-[#E1E1E5] bg-white p-4 shadow-sm"
                >
                  <p
                    className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: ACCENT }}
                  >
                    {t("md.card", { n: index + 1 })}
                  </p>
                  <div
                    className="prose prose-sm max-w-none [&_h1]:text-[18px] [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:mb-1.5 [&_p]:my-1.5 [&_p]:text-[13px] [&_li]:text-[13px] [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-[#70707b] [&_code]:text-[12px] [&_code]:bg-[#F6F6F9] [&_code]:px-1 [&_code]:rounded [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opciones de generación */}
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
            <select
              id="template"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              className={inputClass}
              disabled={isGenerating}
            >
              {templates.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="language">{t("md.language")}</label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={inputClass}
              disabled={isGenerating}
            >
              <option value="">{t("md.langAuto")}</option>
              {DECK_LANGUAGES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
                  {source.labelKey ? t(source.labelKey) : source.label}
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
    </PageShell>
  );
};

export default MarkdownPage;
