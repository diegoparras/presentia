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
import { FontSize } from "./fontSizeExtension";
import {
  Bold,
  Italic,
  Underline as UnderlinedIcon,
  Strikethrough,
  Code,
  Highlighter,
  RemoveFormatting,
  ChevronDown,
} from "lucide-react";

interface TiptapTextProps {
  content: string;
  onContentChange?: (content: string) => void;
  className?: string;
  placeholder?: string;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "64px"];

const FONT_FAMILIES = [
  { label: "Predeterminada", value: "" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Roboto", value: "Roboto" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Lora", value: "Lora" },
  { label: "Source Sans 3", value: "Source Sans 3" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Oswald", value: "Oswald" },
];

// Curated swatches; theme colors are prepended at runtime from CSS vars.
const PRESET_COLORS = [
  "#000000", "#374151", "#6B7280", "#FFFFFF",
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
  "#6366F1", "#8B5CF6", "#EC4899", "#14B8A6",
];

// Load a Google font on demand so the picked family actually renders.
const loadedFonts = new Set<string>();
function ensureFontLoaded(family: string) {
  if (!family || loadedFonts.has(family) || typeof document === "undefined") return;
  loadedFonts.add(family);
  const id = `tt-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
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
  const [openMenu, setOpenMenu] = useState<null | "size" | "color" | "font">(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      // html:true keeps inline <span style> (color/size/font) through markdown.
      Markdown.configure({ html: true, transformPastedText: true }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
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

  // Pull theme graph/primary colors from the slide wrapper for the palette.
  useEffect(() => {
    const wrapper =
      document.getElementById("presentation-slides-wrapper") ||
      rootRef.current?.closest("[style*='--primary-color']") ||
      document.documentElement;
    if (!wrapper) return;
    const cs = getComputedStyle(wrapper as Element);
    const vars = ["--primary-color", "--background-text", "--graph-0", "--graph-1", "--graph-2", "--graph-3"];
    const found = vars
      .map((v) => cs.getPropertyValue(v).trim())
      .filter((c) => c && c !== "");
    setThemeColors(Array.from(new Set(found)));
  }, [editor]);

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

  return (
    <div ref={rootRef}>
      <BubbleMenu editor={editor} className="z-50" tippyOptions={{ duration: 100, maxWidth: "none" }}>
        <div className="flex items-center gap-0.5 rounded-xl border border-neutral-200 bg-white p-1 text-black shadow-xl">
          {/* Format */}
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
          <button
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run()}
            className={btn(editor.isActive("highlight"))}
            title="Resaltar"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title="Código">
            <Code className="h-4 w-4" />
          </button>

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          {/* Font size */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "size" ? null : "size")}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100"
              title="Tamaño"
            >
              {currentSize || "Auto"} <ChevronDown className="h-3 w-3" />
            </button>
            {openMenu === "size" && (
              <div className="absolute left-0 top-8 z-50 max-h-56 w-24 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                <button
                  onClick={() => { editor.chain().focus().unsetFontSize().run(); setOpenMenu(null); }}
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100"
                >
                  Auto
                </button>
                {FONT_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { editor.chain().focus().setFontSize(s).run(); setOpenMenu(null); }}
                    className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100 ${currentSize === s ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}
                  >
                    {s.replace("px", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font family */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "font" ? null : "font")}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100"
              title="Fuente"
            >
              {currentFont || "Fuente"} <ChevronDown className="h-3 w-3" />
            </button>
            {openMenu === "font" && (
              <div className="absolute left-0 top-8 z-50 max-h-56 w-44 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.value}
                    onMouseEnter={() => ensureFontLoaded(f.value)}
                    onClick={() => {
                      ensureFontLoaded(f.value);
                      if (f.value) editor.chain().focus().setFontFamily(f.value).run();
                      else editor.chain().focus().unsetFontFamily().run();
                      setOpenMenu(null);
                    }}
                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 ${currentFont === f.value ? "bg-[#5141e5]/10 text-[#5141e5]" : ""}`}
                    style={{ fontFamily: f.value || "inherit" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          {/* Color */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "color" ? null : "color")}
              className="flex h-7 items-center gap-1 rounded-md px-1.5 hover:bg-neutral-100"
              title="Color de texto"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-neutral-300 text-[11px] font-bold">A</span>
              <span className="h-1 w-4 rounded-sm" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#111827" }} />
            </button>
            {openMenu === "color" && (
              <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
                <div className="grid grid-cols-6 gap-1">
                  {palette.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => applyColor(c)}
                      className="h-5 w-5 rounded-md border border-neutral-200"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    onChange={(e) => applyColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    title="Color personalizado"
                  />
                  <button
                    onClick={() => { editor.chain().focus().unsetColor().run(); setOpenMenu(null); }}
                    className="text-xs text-neutral-500 hover:text-neutral-800"
                  >
                    Quitar color
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-neutral-200" />

          {/* Clear */}
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().unsetColor().unsetFontSize().unsetFontFamily().run()}
            className={btn(false)}
            title="Limpiar formato"
          >
            <RemoveFormatting className="h-4 w-4" />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent
        editor={editor}
        className="tiptap-text-editor w-full"
        style={{
          lineHeight: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          fontFamily: "inherit",
          color: "inherit",
          textAlign: "inherit",
        }}
      />
    </div>
  );
};

export default TiptapText;
