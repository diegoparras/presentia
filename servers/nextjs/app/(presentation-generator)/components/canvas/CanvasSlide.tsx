"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { updateSlide } from "@/store/slices/presentationGeneration";
import {
  CANVAS_W,
  CANVAS_H,
  CanvasBlock,
  CanvasChartType,
  CanvasContent,
  defaultBlock,
  parseDelimited,
} from "./canvasTypes";
import CanvasChart from "./CanvasChart";
import {
  Type,
  Square,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  BarChart3,
  Sparkles,
  Video,
  Star,
  Heart,
  Check,
  Rocket,
  Zap,
  Target,
  TrendingUp,
  Award,
  Lightbulb,
  ShieldCheck,
  Users,
  Globe,
  Clock,
} from "lucide-react";

type Props = { slide: any; isEditMode: boolean; theme?: any };

// Curated icon palette for canvas icon blocks (keeps the bundle small vs. all of lucide).
const ICON_SET: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Star,
  Heart,
  Check,
  Rocket,
  Zap,
  Target,
  TrendingUp,
  Award,
  Lightbulb,
  ShieldCheck,
  Users,
  Globe,
  Clock,
};
const ICON_NAMES = Object.keys(ICON_SET);

const HANDLES = [
  { k: "nw", cx: 0, cy: 0 },
  { k: "ne", cx: 1, cy: 0 },
  { k: "sw", cx: 0, cy: 1 },
  { k: "se", cx: 1, cy: 1 },
];

// Normalize common share URLs into embeddable iframe URLs.
function toEmbedUrl(raw: string): string {
  const url = raw.trim();
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

function readBlocks(slide: any): CanvasBlock[] {
  const c = (slide?.content || {}) as CanvasContent;
  return Array.isArray(c.blocks) ? c.blocks : [];
}

const CanvasSlide: React.FC<Props> = ({ slide, isEditMode }) => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [blocks, setBlocks] = useState<CanvasBlock[]>(() => readBlocks(slide));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragRef = useRef<any>(null);

  useEffect(() => {
    setBlocks(readBlocks(slide));
  }, [slide?.id, slide?.index]);

  const background = (slide?.content?.background as string) || "var(--background-color,#ffffff)";

  // px on screen -> canvas units (accounts for the SlideScale transform).
  const scale = () => {
    const el = canvasRef.current;
    if (!el) return 1;
    return (el.getBoundingClientRect().width || CANVAS_W) / CANVAS_W;
  };

  const commit = useCallback(
    (next: CanvasBlock[]) => {
      setBlocks(next);
      const index = slide?.index ?? 0;
      dispatch(updateSlide({ index, slide: { ...slide, content: { ...(slide.content || {}), blocks: next } } }));
    },
    [dispatch, slide]
  );

  const patch = (id: string, p: Partial<CanvasBlock>, persist = false) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, ...p } : b));
    if (persist) commit(next);
    else setBlocks(next);
  };

  const addBlock = (type: CanvasBlock["type"]) => {
    const z = (blocks.reduce((m, b) => Math.max(m, b.z), 0) || 0) + 1;
    let block = defaultBlock(type, z);
    if (type === "image") {
      const url = window.prompt("URL de la imagen:") || "";
      if (!url) return;
      block = { ...block, src: url };
    }
    if (type === "embed") {
      const url = window.prompt("URL a insertar (YouTube, Google Sheets, web…):") || "";
      if (!url) return;
      block = { ...block, embedSrc: toEmbedUrl(url) };
    }
    commit([...blocks, block]);
    setSelectedId(block.id);
  };

  const cycleIcon = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    const i = ICON_NAMES.indexOf(b.icon || "Star");
    patch(id, { icon: ICON_NAMES[(i + 1) % ICON_NAMES.length] }, true);
  };

  const tableAddRow = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || !b.rows) return;
    const cols = b.rows[0]?.length || 1;
    patch(id, { rows: [...b.rows, Array(cols).fill("")] }, true);
  };

  const tableAddCol = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || !b.rows) return;
    patch(id, { rows: b.rows.map((r) => [...r, ""]) }, true);
  };

  const setChartType = (id: string, chartType: CanvasChartType) => {
    patch(id, { chartType }, true);
  };

  // Import CSV / paste from Sheets (TSV) into a chart or table block's rows.
  const importData = (id: string) => {
    const text = window.prompt("Pegá datos CSV o desde Google Sheets (una fila por línea):") || "";
    if (!text.trim()) return;
    const rows = parseDelimited(text);
    if (rows.length) patch(id, { rows }, true);
  };

  const removeBlock = (id: string) => {
    commit(blocks.filter((b) => b.id !== id));
    setSelectedId(null);
  };

  const restack = (id: string, dir: 1 | -1) => {
    const sorted = [...blocks].sort((a, b) => a.z - b.z);
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const zi = sorted[i].z, zj = sorted[j].z;
    commit(blocks.map((b) => (b.id === sorted[i].id ? { ...b, z: zj } : b.id === sorted[j].id ? { ...b, z: zi } : b)));
  };

  // Drag / resize via pointer events on window.
  useEffect(() => {
    if (!isEditMode) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const s = scale();
      const dx = (e.clientX - d.startX) / s;
      const dy = (e.clientY - d.startY) / s;
      if (d.mode === "move") {
        patch(d.id, { x: Math.round(d.b.x + dx), y: Math.round(d.b.y + dy) });
      } else {
        let { x, y, w, h } = d.b;
        if (d.handle.includes("e")) w = Math.max(24, d.b.w + dx);
        if (d.handle.includes("s")) h = Math.max(24, d.b.h + dy);
        if (d.handle.includes("w")) { w = Math.max(24, d.b.w - dx); x = d.b.x + dx; }
        if (d.handle.includes("n")) { h = Math.max(24, d.b.h - dy); y = d.b.y + dy; }
        patch(d.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      }
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        commit(blocks);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isEditMode, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, b: CanvasBlock, mode: "move" | "resize", handle = "") => {
    if (!isEditMode || editingId === b.id) return;
    e.stopPropagation();
    setSelectedId(b.id);
    dragRef.current = { id: b.id, b: { ...b }, mode, handle, startX: e.clientX, startY: e.clientY };
  };

  // Shared editable grid — used by table blocks and by the chart data editor.
  const renderGrid = (b: CanvasBlock, editable: boolean) => {
    const rows = b.rows && b.rows.length ? b.rows : [[""]];
    return (
      <table
        className="h-full w-full border-collapse"
        style={{ fontSize: b.fontSize || 18, color: b.color || "#111827", fontFamily: b.fontFamily || "var(--body-font-family,inherit)" }}
      >
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isHeader = ri === 0;
                return (
                  <td
                    key={ci}
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      if (!editable) return;
                      const next = rows.map((r) => [...r]);
                      next[ri][ci] = e.currentTarget.innerText;
                      patch(b.id, { rows: next }, true);
                    }}
                    style={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      padding: "4px 8px",
                      background: isHeader ? (b.headerFill || "#5141e5") : (b.fill || "#ffffff"),
                      color: isHeader ? "#ffffff" : (b.color || "#111827"),
                      fontWeight: isHeader ? 700 : 400,
                      outline: "none",
                      verticalAlign: "middle",
                    }}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderBlockInner = (b: CanvasBlock) => {
    if (b.type === "image") {
      return b.src ? (
        <img src={b.src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400">imagen</div>
      );
    }
    if (b.type === "shape") {
      return (
        <div
          className="h-full w-full"
          style={{ background: b.fill || "#5141e5", borderRadius: b.shape === "ellipse" ? "50%" : (b.radius ?? 8) }}
        />
      );
    }
    if (b.type === "icon") {
      const Ico = ICON_SET[b.icon || "Star"] || Star;
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Ico className="h-full w-full" style={{ color: b.color || "#5141e5" }} />
        </div>
      );
    }
    if (b.type === "table") {
      return renderGrid(b, isEditMode && editingId === b.id);
    }
    if (b.type === "chart") {
      // While editing, show the data grid; otherwise render the live SVG chart.
      if (isEditMode && editingId === b.id) {
        return <div className="h-full w-full overflow-auto bg-white/95 p-1">{renderGrid(b, true)}</div>;
      }
      return (
        <div className="relative h-full w-full">
          <CanvasChart block={b} />
          {/* Overlay so the block drags cleanly instead of Recharts capturing the pointer. */}
          {isEditMode && <div className="absolute inset-0" style={{ cursor: "move" }} />}
        </div>
      );
    }
    if (b.type === "embed") {
      if (!b.embedSrc) {
        return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400">embed</div>;
      }
      return (
        <div className="relative h-full w-full">
          <iframe
            src={b.embedSrc}
            className="h-full w-full"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
          {/* In edit mode, a transparent overlay lets the block be selected/dragged instead of the iframe eating the pointer. */}
          {isEditMode && <div className="absolute inset-0" style={{ cursor: "move" }} />}
        </div>
      );
    }
    // text
    const style: React.CSSProperties = {
      color: b.color || "var(--background-text,#111827)",
      fontSize: b.fontSize || 32,
      fontWeight: b.bold ? 700 : 400,
      textAlign: b.align || "left",
      fontFamily: b.fontFamily || "var(--body-font-family,inherit)",
      width: "100%",
      height: "100%",
      outline: "none",
      overflow: "hidden",
    };
    if (isEditMode && editingId === b.id) {
      return (
        <div
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={(e) => {
            patch(b.id, { text: e.currentTarget.innerText }, true);
            setEditingId(null);
          }}
          ref={(el) => { el?.focus(); }}
        >
          {b.text}
        </div>
      );
    }
    return <div style={style}>{b.text}</div>;
  };

  const selected = blocks.find((b) => b.id === selectedId) || null;

  return (
    <div className="relative h-[720px] w-[1280px] overflow-hidden" style={{ background }}>
      {/* Editing toolbar */}
      {isEditMode && (
        <div className="absolute left-3 top-3 z-[60] flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
          <button onClick={() => addBlock("text")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Texto"><Type className="h-4 w-4" /> Texto</button>
          <button onClick={() => addBlock("shape")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Forma"><Square className="h-4 w-4" /> Forma</button>
          <button onClick={() => addBlock("image")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Imagen"><ImageIcon className="h-4 w-4" /> Imagen</button>
          <button onClick={() => addBlock("icon")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Ícono"><Sparkles className="h-4 w-4" /> Ícono</button>
          <button onClick={() => addBlock("table")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Tabla"><TableIcon className="h-4 w-4" /> Tabla</button>
          <button onClick={() => addBlock("chart")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Gráfico"><BarChart3 className="h-4 w-4" /> Gráfico</button>
          <button onClick={() => addBlock("embed")} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Embed (video/web)"><Video className="h-4 w-4" /> Embed</button>
          {selected && (
            <>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              {selected.type === "icon" && (
                <button onClick={() => cycleIcon(selected.id)} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Cambiar ícono"><Sparkles className="h-4 w-4" /> {selected.icon || "Star"}</button>
              )}
              {selected.type === "table" && (
                <>
                  <button onClick={() => setEditingId(editingId === selected.id ? null : selected.id)} className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs ${editingId === selected.id ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-700 hover:bg-neutral-100"}`} title="Editar celdas"><Type className="h-4 w-4" /> {editingId === selected.id ? "Listo" : "Editar"}</button>
                  <button onClick={() => tableAddRow(selected.id)} className="flex h-8 items-center justify-center rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Agregar fila">+ Fila</button>
                  <button onClick={() => tableAddCol(selected.id)} className="flex h-8 items-center justify-center rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Agregar columna">+ Col</button>
                </>
              )}
              {selected.type === "chart" && (
                <>
                  {(["bar", "line", "area", "pie"] as CanvasChartType[]).map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setChartType(selected.id, ct)}
                      className={`flex h-8 items-center justify-center rounded-md px-2 text-xs ${(selected.chartType || "bar") === ct ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-700 hover:bg-neutral-100"}`}
                      title={ct}
                    >
                      {ct === "bar" ? "Barras" : ct === "line" ? "Línea" : ct === "area" ? "Área" : "Torta"}
                    </button>
                  ))}
                  <span className="mx-1 h-5 w-px bg-neutral-200" />
                  <button onClick={() => setEditingId(editingId === selected.id ? null : selected.id)} className={`flex h-8 items-center gap-1 rounded-md px-2 text-xs ${editingId === selected.id ? "bg-[#5141e5]/10 text-[#5141e5]" : "text-neutral-700 hover:bg-neutral-100"}`} title="Editar datos"><TableIcon className="h-4 w-4" /> {editingId === selected.id ? "Ver gráfico" : "Datos"}</button>
                  {editingId === selected.id && (
                    <>
                      <button onClick={() => tableAddRow(selected.id)} className="flex h-8 items-center justify-center rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Agregar fila">+ Fila</button>
                      <button onClick={() => tableAddCol(selected.id)} className="flex h-8 items-center justify-center rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Agregar serie">+ Serie</button>
                    </>
                  )}
                  <button onClick={() => importData(selected.id)} className="flex h-8 items-center justify-center rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-100" title="Importar CSV / pegar de Sheets">CSV</button>
                </>
              )}
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button onClick={() => restack(selected.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100" title="Traer al frente"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => restack(selected.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100" title="Enviar al fondo"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => removeBlock(selected.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50" title="Borrar"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      )}

      {/* Canvas surface */}
      <div ref={canvasRef} className="absolute inset-0" onPointerDown={() => isEditMode && setSelectedId(null)}>
        {[...blocks].sort((a, b) => a.z - b.z).map((b) => (
          <div
            key={b.id}
            onPointerDown={(e) => startDrag(e, b, "move")}
            onDoubleClick={(e) => { if (isEditMode && b.type === "text") { e.stopPropagation(); setEditingId(b.id); } }}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
              cursor: isEditMode ? (editingId === b.id ? "text" : "move") : "default",
              outline: isEditMode && selectedId === b.id ? "2px solid #5141e5" : "none",
            }}
          >
            {renderBlockInner(b)}
            {isEditMode && selectedId === b.id && editingId !== b.id &&
              HANDLES.map((h) => (
                <div
                  key={h.k}
                  onPointerDown={(e) => startDrag(e, b, "resize", h.k)}
                  style={{
                    position: "absolute",
                    left: h.cx ? "100%" : 0,
                    top: h.cy ? "100%" : 0,
                    width: 12,
                    height: 12,
                    marginLeft: -6,
                    marginTop: -6,
                    background: "#fff",
                    border: "2px solid #5141e5",
                    borderRadius: 3,
                    cursor: `${h.k}-resize`,
                  }}
                />
              ))}
          </div>
        ))}
      </div>

      {isEditMode && blocks.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Canvas vacío — agregá bloques desde la barra
        </div>
      )}
    </div>
  );
};

export default CanvasSlide;
