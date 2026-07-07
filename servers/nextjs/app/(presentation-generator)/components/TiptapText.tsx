"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
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
} from "lucide-react";

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

const btn = (active: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
    active ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-600 hover:bg-neutral-100"
  }`;

const TiptapText: React.FC<TiptapTextProps> = ({
  content,
  onContentChange,
  className = "",
  placeholder = "Enter text...",
}) => {
  const [themeColors, setThemeColors] = useState<string[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [openMenu, setOpenMenu] = useState<null | "size" | "color" | "font">(null);
  const [uploading, setUploading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <div ref={rootRef}>
      <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2,.eot" onChange={onUploadFont} className="hidden" />

      <BubbleMenu editor={editor} className="z-50" tippyOptions={{ duration: 100, maxWidth: "none" }}>
        <div className="flex items-center gap-0.5 rounded-xl border border-neutral-200 bg-white p-1 text-black shadow-xl">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Negrita">
            <Bold className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Itálica">
            <Italic className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Subrayado">
            <UnderlinedIcon className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Tachado">
            <Strikethrough className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()} className={btn(editor.isActive("highlight"))} title="Resaltar">
            <Highlighter className="h-4 w-4" />
          </button>
          <button onClick={setLink} className={btn(editor.isActive("link"))} title="Enlace">
            <Link2 className="h-4 w-4" />
          </button>

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={btn(editor.isActive("subscript"))} title="Subíndice">
            <SubIcon className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btn(editor.isActive("superscript"))} title="Superíndice">
            <SupIcon className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title="Código">
            <Code className="h-4 w-4" />
          </button>

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          {/* Font size */}
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "size" ? null : "size")} className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Tamaño">
              {currentSize || "Auto"} <ChevronDown className="h-3 w-3" />
            </button>
            {openMenu === "size" && (
              <div className="absolute left-0 top-8 z-50 max-h-56 w-24 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button onClick={() => { editor.chain().focus().unsetFontSize().run(); setOpenMenu(null); }} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100">Auto</button>
                {FONT_SIZES.map((s) => (
                  <button key={s} onClick={() => { editor.chain().focus().setFontSize(s).run(); setOpenMenu(null); }} className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100 ${currentSize === s ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}>
                    {s.replace("px", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font family */}
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "font" ? null : "font")} className="flex h-7 max-w-[110px] items-center gap-1 truncate rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Fuente">
              <span className="truncate">{currentFont || "Fuente"}</span> <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
            {openMenu === "font" && (
              <div className="absolute left-0 top-8 z-50 max-h-64 w-48 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
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

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          {/* Color */}
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === "color" ? null : "color")} className="flex h-7 items-center gap-1 rounded-md px-1.5 hover:bg-neutral-100" title="Color de texto">
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-neutral-300 text-[11px] font-bold">A</span>
              <span className="h-1 w-4 rounded-sm" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#111827" }} />
            </button>
            {openMenu === "color" && (
              <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
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

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          <button onClick={() => editor.chain().focus().unsetAllMarks().unsetColor().unsetFontSize().unsetFontFamily().run()} className={btn(false)} title="Limpiar formato">
            <RemoveFormatting className="h-4 w-4" />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent
        editor={editor}
        className="tiptap-text-editor w-full"
        style={{ lineHeight: "inherit", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", color: "inherit", textAlign: "inherit" }}
      />
    </div>
  );
};

export default TiptapText;
