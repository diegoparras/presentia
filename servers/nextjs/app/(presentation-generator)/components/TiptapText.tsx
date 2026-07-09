"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEditorPanel } from "./EditorPanelContext";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { FontSize } from "./fontSizeExtension";
import ThemeApi from "../services/api/theme";
import { getApiUrl } from "@/utils/api";
import {
  Bold,
  Italic,
  Underline as UnderlinedIcon,
  Strikethrough,
  Code,
  Highlighter,
  RemoveFormatting,
  ChevronDown,
  Link2,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Upload,
  Sparkles,
  Loader2,
  GripVertical,
  Pin,
  PinOff,
  Settings2,
  RotateCcw,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

const AI_ACTIONS: { key: string; label: string; needsTarget?: boolean }[] = [
  { key: "improve", label: "Mejorar redacción" },
  { key: "shorten", label: "Acortar" },
  { key: "expand", label: "Expandir" },
  { key: "fix", label: "Corregir ortografía" },
  { key: "professional", label: "Tono profesional" },
  { key: "casual", label: "Tono casual" },
  { key: "translate", label: "Traducir a…", needsTarget: true },
];

interface TiptapTextProps {
  content: string;
  onContentChange?: (content: string) => void;
  className?: string;
  placeholder?: string;
}

interface CustomFont {
  id: string;
  name: string;
  url: string;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "64px"];

const GOOGLE_FONTS = [
  "Inter", "Poppins", "Roboto", "Montserrat", "Playfair Display",
  "Lora", "Source Sans 3", "Merriweather", "Oswald", "Raleway", "Nunito", "Work Sans",
];

const PRESET_COLORS = [
  "#000000", "#374151", "#6B7280", "#FFFFFF",
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
  "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6",
];

const googleLoaded = new Set<string>();
function ensureGoogleFont(family: string) {
  if (!family || googleLoaded.has(family) || typeof document === "undefined") return;
  googleLoaded.add(family);
  const id = `tt-gfont-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

const customLoaded = new Set<string>();
function ensureCustomFont(name: string, url: string) {
  if (!name || !url || customLoaded.has(name) || typeof document === "undefined") return;
  customLoaded.add(name);
  const id = `tt-cfont-${name.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const origin = window.location.origin;
  const full = url.startsWith("http") ? url : `${origin}${url}`;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@font-face{font-family:'${name}';src:url('${full}');font-display:swap;}`;
  document.head.appendChild(style);
}

// Botones más grandes (antes h-7 w-7)
const btn = (active: boolean) =>
  `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
    active ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-600 hover:bg-neutral-100"
  }`;

// ── Toolbar configurable ────────────────────────────────────────────────────
// Todas las herramientas disponibles, en su orden por defecto.
const TOOL_IDS = [
  "ai", "bold", "italic", "underline", "strike", "highlight", "link",
  "subscript", "superscript", "code", "size", "font", "color", "clear",
] as const;
type ToolId = (typeof TOOL_IDS)[number];

const TOOL_LABELS: Record<ToolId, string> = {
  ai: "IA", bold: "Negrita", italic: "Itálica", underline: "Subrayado",
  strike: "Tachado", highlight: "Resaltar", link: "Enlace", subscript: "Subíndice",
  superscript: "Superíndice", code: "Código", size: "Tamaño", font: "Fuente",
  color: "Color", clear: "Limpiar formato",
};

interface ToolbarCfg {
  hidden: ToolId[];
  order: ToolId[];
  pinned: boolean;
  pinPos: { x: number; y: number };
  width: number;
}

const TOOLBAR_CFG_KEY = "presentia.textToolbar.v1";
const TOOLBAR_MIN_WIDTH = 240;
const TOOLBAR_MAX_WIDTH = 460;
const DEFAULT_TOOLBAR_CFG: ToolbarCfg = {
  hidden: [],
  order: [...TOOL_IDS],
  pinned: false,
  pinPos: { x: 96, y: 140 },
  width: 300,
};

const loadToolbarCfg = (): ToolbarCfg => {
  if (typeof window === "undefined") return { ...DEFAULT_TOOLBAR_CFG };
  try {
    const raw = window.localStorage.getItem(TOOLBAR_CFG_KEY);
    if (!raw) return { ...DEFAULT_TOOLBAR_CFG };
    const parsed = JSON.parse(raw) as Partial<ToolbarCfg>;
    const known = (arr?: string[]) =>
      (arr || []).filter((id): id is ToolId => (TOOL_IDS as readonly string[]).includes(id));
    // Preservar el orden guardado y anexar herramientas nuevas al final.
    const order = known(parsed.order);
    for (const id of TOOL_IDS) if (!order.includes(id)) order.push(id);
    return {
      hidden: known(parsed.hidden),
      order,
      pinned: !!parsed.pinned,
      pinPos: parsed.pinPos && typeof parsed.pinPos.x === "number"
        ? parsed.pinPos : { ...DEFAULT_TOOLBAR_CFG.pinPos },
      width: Math.min(TOOLBAR_MAX_WIDTH, Math.max(TOOLBAR_MIN_WIDTH,
        typeof parsed.width === "number" ? parsed.width : DEFAULT_TOOLBAR_CFG.width)),
    };
  } catch {
    return { ...DEFAULT_TOOLBAR_CFG };
  }
};

const TiptapText: React.FC<TiptapTextProps> = ({
  content,
  onContentChange,
  className = "",
  placeholder = "Enter text...",
}) => {
  const [themeColors, setThemeColors] = useState<string[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [openMenu, setOpenMenu] = useState<null | "size" | "color" | "font" | "ai">(null);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editorPanel = useEditorPanel();
  // ── Config del toolbar (persistida en localStorage) ──
  const [cfg, setCfg] = useState<ToolbarCfg>(() => loadToolbarCfg());
  const [configOpen, setConfigOpen] = useState(false);
  // Si hay selección de texto activa (para mostrar el toolbar en el sidebar).
  const [hasSelection, setHasSelection] = useState(false);
  // Desplazamiento por arrastre en modo flotante (relativo a la selección).
  const [floatOffset, setFloatOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    mode: "float" | "pin";
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateCfg = (patch: Partial<ToolbarCfg>) =>
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(TOOLBAR_CFG_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: true, transformPastedText: true }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Subscript,
      Superscript,
    ],
    content: content || placeholder,
    editorProps: {
      attributes: {
        class: `outline-none focus:outline-none transition-all duration-200 ${className}`,
        "data-placeholder": placeholder,
      },
    },
    onBlur: ({ editor }) => {
      const markdown = editor?.storage.markdown.getMarkdown();
      if (onContentChange) onContentChange(markdown);
    },
    editable: true,
    immediatelyRender: false,
  });

  // Theme palette from the slide wrapper.
  useEffect(() => {
    const wrapper =
      document.getElementById("presentation-slides-wrapper") ||
      rootRef.current?.closest("[style*='--primary-color']") ||
      document.documentElement;
    if (!wrapper) return;
    const cs = getComputedStyle(wrapper as Element);
    const found = ["--primary-color", "--background-text", "--graph-0", "--graph-1", "--graph-2", "--graph-3"]
      .map((v) => cs.getPropertyValue(v).trim())
      .filter(Boolean);
    setThemeColors(Array.from(new Set(found)));
  }, [editor]);

  // Uploaded custom fonts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await ThemeApi.getUserFonts();
        const fonts: CustomFont[] = res?.fonts || res || [];
        if (cancelled || !Array.isArray(fonts)) return;
        fonts.forEach((f) => f?.name && f?.url && ensureCustomFont(f.name, f.url));
        setCustomFonts(fonts.filter((f) => f?.name && f?.url));
      } catch {
        /* fonts are optional */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!editor) return;
    const currentText = editor?.storage.markdown.getMarkdown();
    if ((content || "") !== currentText) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  // Modo anclado: mostrar el toolbar mientras haya una selección de texto activa.
  // Debe ir ANTES del early-return de abajo para no romper el orden de hooks.
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const sel = editor.state.selection;
      setHasSelection(editor.isFocused && !sel.empty);
      if (sel.empty) setFloatOffset({ x: 0, y: 0 });
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", update);
    };
  }, [editor]);

  // Registrar/limpiar el editor activo en el panel derecho según la selección.
  useEffect(() => {
    if (!editor) return;
    if (hasSelection) {
      editorPanel.setEditor(editor);
      editorPanel.setElement(null);
    } else {
      editorPanel.setEditor((prev: any) => (prev === editor ? null : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection, editor]);

  if (!editor) {
    return <div className={className}>{content || placeholder}</div>;
  }

  const currentSize = editor.getAttributes("textStyle").fontSize || "";
  const currentFont = editor.getAttributes("textStyle").fontFamily || "";
  const palette = [...themeColors, ...PRESET_COLORS];

  const applyColor = (c: string) => {
    editor.chain().focus().setColor(c).run();
    setOpenMenu(null);
  };

  const applyFont = (family: string, custom: boolean, url?: string) => {
    if (custom && url) ensureCustomFont(family, url);
    else if (!custom) ensureGoogleFont(family);
    if (family) editor.chain().focus().setFontFamily(family).run();
    else editor.chain().focus().unsetFontFamily().run();
    setOpenMenu(null);
  };

  const aiEdit = async (action: string, needsTarget?: boolean) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) return;
    let target = "";
    if (needsTarget) {
      target = window.prompt("¿A qué idioma traducir?", "English") || "";
      if (!target) return;
    }
    setOpenMenu(null);
    setAiLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/ppt/ai/edit-text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, target }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data?.text) {
        editor.chain().focus().insertContentAt({ from, to }, data.text).run();
      }
    } catch {
      /* leave selection untouched on failure */
    } finally {
      setAiLoading(false);
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL del enlace (vacío para quitar):", prev);
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const onUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { font_name, font_url } = await ThemeApi.uploadFont(file);
      ensureCustomFont(font_name, font_url);
      setCustomFonts((prev) =>
        prev.some((f) => f.name === font_name) ? prev : [...prev, { id: font_name, name: font_name, url: font_url }]
      );
      editor.chain().focus().setFontFamily(font_name).run();
    } catch {
      /* handled in ThemeApi */
    } finally {
      setUploading(false);
      setOpenMenu(null);
    }
  };

  // Arrastrar el menú completo (por el handle).
  const beginDrag = (mode: "float" | "pin") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const base = mode === "pin" ? cfg.pinPos : floatOffset;
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, baseX: base.x, baseY: base.y };
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nx = d.baseX + (ev.clientX - d.startX);
      const ny = d.baseY + (ev.clientY - d.startY);
      if (d.mode === "pin") updateCfg({ pinPos: { x: Math.max(0, nx), y: Math.max(0, ny) } });
      else setFloatOffset({ x: nx, y: ny });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const toggleTool = (id: ToolId) =>
    updateCfg({
      hidden: cfg.hidden.includes(id)
        ? cfg.hidden.filter((h) => h !== id)
        : [...cfg.hidden, id],
    });

  const reorderTool = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const order = [...cfg.order];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    updateCfg({ order });
  };

  const visibleToolIds = cfg.order.filter((id) => !cfg.hidden.includes(id));

  const renderTool = (id: ToolId): React.ReactNode => {
    switch (id) {
      case "ai":
        return (
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "ai" ? null : "ai")}
              disabled={aiLoading}
              className="flex h-9 items-center gap-1 rounded-lg bg-gradient-to-r from-[#5141e5] to-[#8b5cf6] px-2.5 text-xs font-medium text-white hover:opacity-90"
              title="Editar con IA"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} IA
            </button>
            {openMenu === "ai" && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                {AI_ACTIONS.map((a) => (
                  <button key={a.key} onClick={() => aiEdit(a.key, a.needsTarget)} className="block w-full rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-[#5141e5]/5 hover:text-[#5141e5]">
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case "bold":
        return <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Negrita"><Bold className="h-5 w-5" /></button>;
      case "italic":
        return <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Itálica"><Italic className="h-5 w-5" /></button>;
      case "underline":
        return <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Subrayado"><UnderlinedIcon className="h-5 w-5" /></button>;
      case "strike":
        return <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Tachado"><Strikethrough className="h-5 w-5" /></button>;
      case "highlight":
        return <button onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()} className={btn(editor.isActive("highlight"))} title="Resaltar"><Highlighter className="h-5 w-5" /></button>;
      case "link":
        return <button onClick={setLink} className={btn(editor.isActive("link"))} title="Enlace"><Link2 className="h-5 w-5" /></button>;
      case "subscript":
        return <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={btn(editor.isActive("subscript"))} title="Subíndice"><SubIcon className="h-5 w-5" /></button>;
      case "superscript":
        return <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btn(editor.isActive("superscript"))} title="Superíndice"><SupIcon className="h-5 w-5" /></button>;
      case "code":
        return <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title="Código"><Code className="h-5 w-5" /></button>;
      case "size":
        return (
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "size" ? null : "size")} className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs text-neutral-700 hover:bg-neutral-100" title="Tamaño">
              {currentSize || "Auto"} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openMenu === "size" && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-24 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button onClick={() => { editor.chain().focus().unsetFontSize().run(); setOpenMenu(null); }} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100">Auto</button>
                {FONT_SIZES.map((s) => (
                  <button key={s} onClick={() => { editor.chain().focus().setFontSize(s).run(); setOpenMenu(null); }} className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100 ${currentSize === s ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                    {s.replace("px", "")}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case "font":
        return (
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "font" ? null : "font")} className="flex h-9 max-w-[120px] items-center gap-1 truncate rounded-lg px-2.5 text-xs text-neutral-700 hover:bg-neutral-100" title="Fuente">
              <span className="truncate">{currentFont || "Fuente"}</span> <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>
            {openMenu === "font" && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button onClick={() => applyFont("", false)} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100">Predeterminada</button>
                {customFonts.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase text-neutral-400">Mis fuentes</div>
                    {customFonts.map((f) => (
                      <button key={f.id} onMouseEnter={() => ensureCustomFont(f.name, f.url)} onClick={() => applyFont(f.name, true, f.url)} style={{ fontFamily: `'${f.name}'` }} className={`block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 ${currentFont === f.name ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                        {f.name}
                      </button>
                    ))}
                  </>
                )}
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-neutral-400">Google Fonts</div>
                {GOOGLE_FONTS.map((f) => (
                  <button key={f} onMouseEnter={() => ensureGoogleFont(f)} onClick={() => applyFont(f, false)} style={{ fontFamily: f }} className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 ${currentFont === f ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                    {f}
                  </button>
                ))}
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-1 flex w-full items-center gap-2 rounded border-t border-neutral-100 px-2 py-2 text-left text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/5">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Subiendo…" : "Subir fuente (.ttf/.woff2)"}
                </button>
              </div>
            )}
          </div>
        );
      case "color":
        return (
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "color" ? null : "color")} className="flex h-9 items-center gap-1 rounded-lg px-2 hover:bg-neutral-100" title="Color de texto">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-neutral-300 text-xs font-bold">A</span>
              <span className="h-1.5 w-4 rounded-sm" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#111827" }} />
            </button>
            {openMenu === "color" && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
                <div className="grid grid-cols-6 gap-1">
                  {palette.map((c, i) => (
                    <button key={`${c}-${i}`} onClick={() => applyColor(c)} className="h-5 w-5 rounded-md border border-neutral-200" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" onChange={(e) => applyColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" title="Color personalizado" />
                  <button onClick={() => { editor.chain().focus().unsetColor().run(); setOpenMenu(null); }} className="text-xs text-neutral-500 hover:text-neutral-800">Quitar color</button>
                </div>
              </div>
            )}
          </div>
        );
      case "clear":
        return <button onClick={() => editor.chain().focus().unsetAllMarks().unsetColor().unsetFontSize().unsetFontFamily().run()} className={btn(false)} title="Limpiar formato"><RemoveFormatting className="h-5 w-5" /></button>;
      default:
        return null;
    }
  };

  const renderConfig = () => (
    <div className="max-h-[340px] overflow-auto pr-0.5">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Herramientas</span>
        <button onClick={() => updateCfg({ hidden: [], order: [...TOOL_IDS] })} className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800" title="Restablecer">
          <RotateCcw className="h-3 w-3" /> Restablecer
        </button>
      </div>
      <ul className="space-y-0.5">
        {cfg.order.map((id, i) => {
          const shown = !cfg.hidden.includes(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null) reorderTool(dragIndex, i); setDragIndex(null); }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 ${dragIndex === i ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-neutral-300" />
              <span className={`flex-1 text-sm ${shown ? "text-neutral-700" : "text-neutral-400 line-through"}`}>{TOOL_LABELS[id]}</span>
              <button onClick={() => toggleTool(id)} className="text-neutral-400 hover:text-neutral-700" title={shown ? "Ocultar" : "Mostrar"}>
                {shown ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 border-t border-neutral-100 px-1 pt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Ancho</span>
          <span className="text-[11px] text-neutral-500">{cfg.width}px</span>
        </div>
        <input type="range" min={TOOLBAR_MIN_WIDTH} max={TOOLBAR_MAX_WIDTH} step={20} value={cfg.width} onChange={(e) => updateCfg({ width: Number(e.target.value) })} className="w-full accent-[#5141e5]" />
      </div>
      <button onClick={() => setConfigOpen(false)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-neutral-100 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200">
        <X className="h-3.5 w-3.5" /> Cerrar
      </button>
    </div>
  );

  const renderPanel = (mode: "float" | "pin" | "docked") => {
    const docked = mode === "docked";
    return (
    <div
      data-editor-ui=""
      className={docked ? "font-syne text-black" : "rounded-2xl border border-neutral-200 bg-white p-2 text-black shadow-2xl"}
      style={docked ? undefined : { width: cfg.width }}
      onMouseDown={(e) => {
        const t = e.target as HTMLElement;
        // Mantener el foco/selección del editor al usar el toolbar, pero dejar
        // que inputs y selects reciban foco normalmente.
        if (!t.closest("input, textarea, select, [contenteditable]")) e.preventDefault();
      }}
    >
      <div className="mb-3 flex items-center gap-1">
        {docked ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FBEDEA] text-[#e25a4e] text-sm font-bold">A</span>
            <span className="text-base font-semibold text-[#191919]">Texto</span>
          </div>
        ) : (
          <div
            onPointerDown={beginDrag(mode as "float" | "pin")}
            className="flex h-8 flex-1 cursor-grab select-none items-center gap-1.5 rounded-md px-1 text-neutral-400 hover:bg-neutral-100 active:cursor-grabbing"
            title="Arrastrar menú"
          >
            <GripVertical className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Formato</span>
          </div>
        )}
        {!docked && (
          <button onClick={() => updateCfg({ pinned: !cfg.pinned })} className={btn(cfg.pinned)} title={cfg.pinned ? "Desanclar (seguir la selección)" : "Anclar en un lugar fijo"}>
            {cfg.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </button>
        )}
        <button onClick={() => setConfigOpen((v) => !v)} className={btn(configOpen)} title="Configurar menú">
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {configOpen ? (
        renderConfig()
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          {visibleToolIds.map((id) => (
            <React.Fragment key={id}>{renderTool(id)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
    );
  };

  return (
    <div ref={rootRef}>
      <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2,.eot" onChange={onUploadFont} className="hidden" />

      {/* El toolbar de formato se muestra en el panel derecho (sidebar) cuando
          hay una selección de texto activa. Sin flotantes sobre la slide. */}
      {hasSelection && editorPanel.textPanelEl &&
        createPortal(renderPanel("docked"), editorPanel.textPanelEl)}

      <EditorContent
        editor={editor}
        className="tiptap-text-editor w-full"
        style={{ lineHeight: "inherit", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", color: "inherit", textAlign: "inherit" }}
      />
    </div>
  );
};

export default TiptapText;
