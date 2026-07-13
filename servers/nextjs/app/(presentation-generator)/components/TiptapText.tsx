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
  Move,
} from "lucide-react";
import { getElementPath } from "./styleOverrides";
// OJO: TiptapText se monta en un React root SEPARADO (createRoot de
// TiptapTextReplacer) sin <Provider> de Redux — useDispatch() acá CRASHEA el
// componente y el texto desaparece. Usar el store singleton directamente.
import { store } from "@/store/store";
import { setStyleOverride } from "@/store/slices/presentationGeneration";
// OJO: este componente monta en un React root separado (TiptapTextReplacer):
// useI18n (Context) no funciona acá — usar el puente externo.
import { useI18nExternal } from "@/lib/i18n";

const AI_ACTIONS: { key: string; labelKey: string; needsTarget?: boolean }[] = [
  { key: "improve", labelKey: "ep.ai.improve" },
  { key: "shorten", labelKey: "ep.ai.shorten" },
  { key: "expand", labelKey: "ep.ai.expand" },
  { key: "fix", labelKey: "ep.ai.fix" },
  { key: "professional", labelKey: "ep.ai.professional" },
  { key: "casual", labelKey: "ep.ai.casual" },
  { key: "translate", labelKey: "ep.ai.translate", needsTarget: true },
];

interface TiptapTextProps {
  content: string;
  onContentChange?: (content: string) => void;
  className?: string;
  placeholder?: string;
  // Índice de la slide (lo pasa TiptapTextReplacer). Habilita "Bloque":
  // seleccionar el contenedor del texto para moverlo/redimensionarlo.
  slideIndex?: number;
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

// textStyle (color / fontFamily / fontSize) no tiene equivalente en markdown y
// tiptap-markdown lo DESCARTA al serializar: la fuente/color/tamaño aplicados
// se perdían al guardar (y por lo tanto al recargar y al exportar). Le
// enseñamos a serializarlo como <span style="..."> (html:true lo re-parsea).
export const TextStyleWithMarkdown = TextStyle.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: unknown, mark: { attrs?: Record<string, string | null> }) {
            const a = mark.attrs || {};
            const css: string[] = [];
            if (a.fontFamily) css.push(`font-family: ${a.fontFamily}`);
            if (a.fontSize) css.push(`font-size: ${a.fontSize}`);
            if (a.color) css.push(`color: ${a.color}`);
            return css.length ? `<span style="${css.join("; ")}">` : "<span>";
          },
          close: "</span>",
          mixable: true,
          expelEnclosingWhitespace: true,
        },
      },
    };
  },
});

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

// Etiquetas traducibles: clave de i18n por herramienta (ep.tool.<id>).
const toolLabelKey = (id: ToolId) => `ep.tool.${id}`;

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
  slideIndex,
}) => {
  const { t } = useI18nExternal();
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
  // Tamaño de fuente manual (menú Tamaño).
  const [sizeQuery, setSizeQuery] = useState("");
  // Buscador de Google Fonts por nombre (menú Fuente).
  const [fontQuery, setFontQuery] = useState("");
  const [fontLoading, setFontLoading] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  // Última selección no vacía: al enfocar el buscador, el caret se muda al
  // input y PM colapsa la selección — la restauramos al aplicar la fuente.
  const lastSelRef = useRef<{ from: number; to: number } | null>(null);
  // Debounce del guardado on-update.
  const saveTimerRef = useRef<number>(0);
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
      TextStyleWithMarkdown,
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
    // Guardado ante cada cambio (debounce): antes solo se guardaba en blur, y
    // un estilo aplicado (p.ej. una fuente) se perdía si el usuario exportaba
    // o recargaba sin desenfocar el editor.
    onUpdate: ({ editor }) => {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        const markdown = editor?.storage.markdown.getMarkdown();
        if (onContentChange) onContentChange(markdown);
      }, 800);
    },
    onBlur: ({ editor }) => {
      window.clearTimeout(saveTimerRef.current);
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
    // El panel sigue "activo" mientras el foco esté en un control del propio
    // panel (p.ej. el buscador de fuentes): al clickear un input, el caret del
    // documento se muda ahí y ProseMirror COLAPSA su selección — sin esta
    // salvedad, hasSelection caía a false y el panel se desmontaba con el
    // menú y el input adentro (bug del buscador de Google Fonts).
    const evaluate = () => {
      if (editor.isDestroyed) return false;
      const focusEnPanel = !!(
        document.activeElement &&
        (document.activeElement as HTMLElement).closest?.("[data-editor-ui]")
      );
      if (focusEnPanel) return true;
      return editor.isFocused && !editor.state.selection.empty;
    };
    let closeTimer = 0;
    const update = () => {
      const sel = editor.state.selection;
      if (!sel.empty) lastSelRef.current = { from: sel.from, to: sel.to };
      if (evaluate()) {
        window.clearTimeout(closeTimer);
        setHasSelection(true);
        return;
      }
      // Cierre diferido y re-verificado: durante el mousedown sobre un input
      // del panel hay un instante con activeElement=body (blur→focusin) que
      // daría un falso cierre si evaluáramos sincrónicamente.
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (!evaluate()) {
          setHasSelection(false);
          setFloatOffset({ x: 0, y: 0 });
        }
      }, 150);
    };
    // Si el foco pasa a un control del panel derecho (p.ej. el buscador de
    // fuentes), el editor pierde foco pero el panel debe seguir abierto.
    const onBlur = ({ event }: { event?: FocusEvent }) => {
      const next = (event?.relatedTarget as HTMLElement | null) ?? null;
      if (next && next.closest && next.closest("[data-editor-ui]")) return;
      update();
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", onBlur);
    return () => {
      window.clearTimeout(closeTimer);
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  // Cerrar el panel al clickear fuera (del panel y del texto). Necesario
  // porque el blur hacia el panel no cierra (ver onBlur arriba).
  useEffect(() => {
    if (!hasSelection || !editor) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-editor-ui]")) return;
      if (editor.view?.dom?.contains(t)) return;
      setHasSelection(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [hasSelection, editor]);

  // Registrar/limpiar el editor activo en el panel derecho según la selección.
  useEffect(() => {
    if (!editor) return;
    if (hasSelection) {
      editorPanel.setEditor(editor);
      editorPanel.setElement(null);
      editorPanel.setBackgroundSlide(null);
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
      target = window.prompt(t("ep.ai.translatePrompt"), "English") || "";
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
    const url = window.prompt(t("ep.txt.linkPrompt"), prev);
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // Path del bloque de texto (el host que TiptapTextReplacer insertó en el
  // lugar del elemento original).
  const getBlockPath = (): string | null => {
    if (slideIndex == null) return null;
    const host = rootRef.current?.parentElement as HTMLElement | null;
    const anchor = host?.closest("[data-style-root]") as HTMLElement | null;
    if (!host || !anchor) return null;
    return getElementPath(host, anchor);
  };

  // Seleccionar el contenedor del texto como elemento (mover/redimensionar).
  const selectTextBlock = () => {
    const path = getBlockPath();
    if (path == null || slideIndex == null) return;
    setHasSelection(false);
    editorPanel.setEditor(null);
    editorPanel.setElement({ slideIndex, path });
  };

  // Alineación del texto respecto a su bloque (override del bloque:
  // persiste y sale igual en el export).
  const alignBlock = (p: Record<string, string>) => {
    const path = getBlockPath();
    if (path == null || slideIndex == null) return;
    store.dispatch(setStyleOverride({ slideIndex, elementPath: path, patch: p }));
  };

  // Aplicar un tamaño de fuente tipeado a mano (en px).
  const applyCustomSize = () => {
    const n = parseInt(sizeQuery, 10);
    if (!Number.isFinite(n) || n < 6 || n > 300) return;
    // El foco estaba en el input → la selección de PM quedó colapsada.
    if (editor.state.selection.empty && lastSelRef.current) {
      editor.chain().focus().setTextSelection(lastSelRef.current).run();
    }
    editor.chain().focus().setFontSize(`${n}px`).run();
    setSizeQuery("");
    setOpenMenu(null);
  };

  // Cargar una Google Font escrita por nombre y aplicarla a la selección.
  const loadGoogleFontByName = async () => {
    const name = fontQuery.trim().replace(/\s+/g, " ");
    if (!name) return;
    setFontLoading(true);
    setFontError(null);
    try {
      const url = `https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
      const res = await fetch(url, { method: "GET", mode: "cors" });
      if (!res.ok) throw new Error("not-found");
      ensureGoogleFont(name);
      // El foco estaba en el input → la selección de PM quedó colapsada.
      // Restaurar la última selección real antes de aplicar.
      if (editor.state.selection.empty && lastSelRef.current) {
        editor.chain().focus().setTextSelection(lastSelRef.current).run();
      }
      applyFont(name, false);
      setFontQuery("");
    } catch {
      setFontError(t("ep.txt.fontNotFound", { name }));
    } finally {
      setFontLoading(false);
    }
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
              title={t("ep.txt.aiEdit")}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t("ep.tool.ai")}
            </button>
            {openMenu === "ai" && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                {AI_ACTIONS.map((a) => (
                  <button key={a.key} onClick={() => aiEdit(a.key, a.needsTarget)} className="block w-full rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-[#5141e5]/5 hover:text-[#5141e5]">
                    {t(a.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case "bold":
        return <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title={t("ep.tool.bold")}><Bold className="h-5 w-5" /></button>;
      case "italic":
        return <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title={t("ep.tool.italic")}><Italic className="h-5 w-5" /></button>;
      case "underline":
        return <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title={t("ep.tool.underline")}><UnderlinedIcon className="h-5 w-5" /></button>;
      case "strike":
        return <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title={t("ep.tool.strike")}><Strikethrough className="h-5 w-5" /></button>;
      case "highlight":
        return <button onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()} className={btn(editor.isActive("highlight"))} title={t("ep.tool.highlight")}><Highlighter className="h-5 w-5" /></button>;
      case "link":
        return <button onClick={setLink} className={btn(editor.isActive("link"))} title={t("ep.tool.link")}><Link2 className="h-5 w-5" /></button>;
      case "subscript":
        return <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={btn(editor.isActive("subscript"))} title={t("ep.tool.subscript")}><SubIcon className="h-5 w-5" /></button>;
      case "superscript":
        return <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btn(editor.isActive("superscript"))} title={t("ep.tool.superscript")}><SupIcon className="h-5 w-5" /></button>;
      case "code":
        return <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title={t("ep.tool.code")}><Code className="h-5 w-5" /></button>;
      case "size":
        return (
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "size" ? null : "size")} className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs text-neutral-700 hover:bg-neutral-100" title={t("ep.tool.size")}>
              {currentSize || t("ep.common.auto")} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openMenu === "size" && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-28 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <div className="mb-1 flex items-center gap-1 px-0.5">
                  <input
                    type="number"
                    min={6}
                    max={300}
                    value={sizeQuery}
                    onChange={(e) => setSizeQuery(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") { e.preventDefault(); applyCustomSize(); }
                    }}
                    placeholder="px"
                    className="h-7 w-full min-w-0 rounded-md border border-neutral-200 px-1.5 text-xs outline-none focus:border-[#5141e5]"
                  />
                  <button
                    onClick={applyCustomSize}
                    disabled={!sizeQuery.trim()}
                    className="h-7 shrink-0 rounded-md bg-[#5141e5]/10 px-1.5 text-[11px] font-medium text-[#5141e5] hover:bg-[#5141e5]/20 disabled:opacity-40"
                  >
                    OK
                  </button>
                </div>
                <button onClick={() => { editor.chain().focus().unsetFontSize().run(); setOpenMenu(null); }} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100">{t("ep.common.auto")}</button>
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
            <button onClick={() => setOpenMenu(openMenu === "font" ? null : "font")} className="flex h-9 max-w-[120px] items-center gap-1 truncate rounded-lg px-2.5 text-xs text-neutral-700 hover:bg-neutral-100" title={t("ep.tool.font")}>
              <span className="truncate">{currentFont || t("ep.tool.font")}</span> <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>
            {openMenu === "font" && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button onClick={() => applyFont("", false)} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100">{t("ep.txt.default")}</button>
                {customFonts.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase text-neutral-400">{t("ep.txt.myFonts")}</div>
                    {customFonts.map((f) => (
                      <button key={f.id} onMouseEnter={() => ensureCustomFont(f.name, f.url)} onClick={() => applyFont(f.name, true, f.url)} style={{ fontFamily: `'${f.name}'` }} className={`block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 ${currentFont === f.name ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                        {f.name}
                      </button>
                    ))}
                  </>
                )}
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-neutral-400">Google Fonts</div>
                <div className="px-1 pb-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={fontQuery}
                      onChange={(e) => { setFontQuery(e.target.value); setFontError(null); }}
                      onKeyDown={(e) => {
                        // Que ningún atajo global (editor, undo/redo) se coma las teclas.
                        e.stopPropagation();
                        if (e.key === "Enter") { e.preventDefault(); loadGoogleFontByName(); }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t("ep.txt.fontSearchPh")}
                      className="h-8 w-full min-w-0 rounded-md border border-neutral-200 px-2 text-xs outline-none focus:border-[#5141e5]"
                    />
                    <button
                      onClick={loadGoogleFontByName}
                      disabled={fontLoading || !fontQuery.trim()}
                      className="h-8 shrink-0 rounded-md bg-[#5141e5]/10 px-2 text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/20 disabled:opacity-40"
                    >
                      {fontLoading ? "…" : t("ep.common.use")}
                    </button>
                  </div>
                  {fontError && <p className="mt-1 px-1 text-[11px] text-red-500">{fontError}</p>}
                </div>
                {GOOGLE_FONTS.map((f) => (
                  <button key={f} onMouseEnter={() => ensureGoogleFont(f)} onClick={() => applyFont(f, false)} style={{ fontFamily: f }} className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 ${currentFont === f ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                    {f}
                  </button>
                ))}
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-1 flex w-full items-center gap-2 rounded border-t border-neutral-100 px-2 py-2 text-left text-xs font-medium text-[#5141e5] hover:bg-[#5141e5]/5">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? t("ep.common.uploading") : t("ep.txt.uploadFont")}
                </button>
              </div>
            )}
          </div>
        );
      case "color":
        return (
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "color" ? null : "color")} className="flex h-9 items-center gap-1 rounded-lg px-2 hover:bg-neutral-100" title={t("ep.txt.textColor")}>
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
                  <input type="color" onChange={(e) => applyColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" title={t("ep.txt.customColor")} />
                  <button onClick={() => { editor.chain().focus().unsetColor().run(); setOpenMenu(null); }} className="text-xs text-neutral-500 hover:text-neutral-800">{t("ep.txt.removeColor")}</button>
                </div>
              </div>
            )}
          </div>
        );
      case "clear":
        return <button onClick={() => editor.chain().focus().unsetAllMarks().unsetColor().unsetFontSize().unsetFontFamily().run()} className={btn(false)} title={t("ep.tool.clear")}><RemoveFormatting className="h-5 w-5" /></button>;
      default:
        return null;
    }
  };

  const renderConfig = () => (
    <div className="max-h-[340px] overflow-auto pr-0.5">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t("ep.txt.tools")}</span>
        <button onClick={() => updateCfg({ hidden: [], order: [...TOOL_IDS] })} className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800" title={t("ep.common.reset")}>
          <RotateCcw className="h-3 w-3" /> {t("ep.common.reset")}
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
              <span className={`flex-1 text-sm ${shown ? "text-neutral-700" : "text-neutral-400 line-through"}`}>{t(toolLabelKey(id))}</span>
              <button onClick={() => toggleTool(id)} className="text-neutral-400 hover:text-neutral-700" title={shown ? t("ep.txt.hide") : t("ep.txt.show")}>
                {shown ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 border-t border-neutral-100 px-1 pt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t("ep.txt.width")}</span>
          <span className="text-[11px] text-neutral-500">{cfg.width}px</span>
        </div>
        <input type="range" min={TOOLBAR_MIN_WIDTH} max={TOOLBAR_MAX_WIDTH} step={20} value={cfg.width} onChange={(e) => updateCfg({ width: Number(e.target.value) })} className="w-full accent-[#5141e5]" />
      </div>
      <button onClick={() => setConfigOpen(false)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-neutral-100 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200">
        <X className="h-3.5 w-3.5" /> {t("ep.common.close")}
      </button>
    </div>
  );

  const renderPanel = (mode: "float" | "pin" | "docked") => {
    const docked = mode === "docked";
    return (
    <div
      data-editor-ui=""
      // translate=no: la extensión de Google Translate reescribe nodos de texto
      // y rompe la reconciliación de React (inputs que no dejan tipear).
      translate="no"
      className={`notranslate ${docked ? "font-syne text-black" : "rounded-2xl border border-neutral-200 bg-white p-2 text-black shadow-2xl"}`}
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
            <span className="text-base font-semibold text-[#191919]">{t("ep.txt.title")}</span>
            {slideIndex != null && (
              <button
                onClick={selectTextBlock}
                className="ml-1 flex h-8 items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
                title={t("ep.txt.blockTitle")}
              >
                <Move className="h-3.5 w-3.5" /> {t("ep.txt.block")}
              </button>
            )}
          </div>
        ) : (
          <div
            onPointerDown={beginDrag(mode as "float" | "pin")}
            className="flex h-8 flex-1 cursor-grab select-none items-center gap-1.5 rounded-md px-1 text-neutral-400 hover:bg-neutral-100 active:cursor-grabbing"
            title={t("ep.txt.dragMenu")}
          >
            <GripVertical className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{t("ep.txt.format")}</span>
          </div>
        )}
        {!docked && (
          <button onClick={() => updateCfg({ pinned: !cfg.pinned })} className={btn(cfg.pinned)} title={cfg.pinned ? t("ep.txt.unpin") : t("ep.txt.pin")}>
            {cfg.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </button>
        )}
        <button onClick={() => setConfigOpen((v) => !v)} className={btn(configOpen)} title={t("ep.txt.configure")}>
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

      {/* Alineación del texto respecto a su bloque (solo en modo acoplado). */}
      {docked && !configOpen && slideIndex != null && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t("ep.txt.alignInBlock")}</p>
          <div className="flex items-center gap-1.5">
            {([["left", "ep.align.left", "⇤"], ["center", "ep.align.center", "⇹"], ["right", "ep.align.right", "⇥"]] as const).map(([v, tk, g]) => (
              <button key={v} onMouseDown={(e) => e.preventDefault()} onClick={() => alignBlock({ textAlign: v })} title={t(tk)} className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50">
                {g}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-neutral-200" />
            {([["top", "ep.align.top", "⤒"], ["middle", "ep.align.middle", "⇳"], ["bottom", "ep.align.bottom", "⤓"]] as const).map(([v, tk, g]) => (
              <button key={v} onMouseDown={(e) => e.preventDefault()} onClick={() => alignBlock({ vAlign: v })} title={t(tk)} className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50">
                {g}
              </button>
            ))}
          </div>
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
