"use client";

import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Lock,
  LockOpen,
  RotateCcw,
  SendToBack,
  Trash2,
  X,
} from "lucide-react";
import type { RootState } from "@/store/store";
import {
  setStyleOverride,
  clearStyleOverride,
  removeSlideOverlay,
  setGraphColor,
} from "@/store/slices/presentationGeneration";
import { ElementOverride, clampScale, resolveElementPath } from "./styleOverrides";
import { useEditorPanel } from "./EditorPanelContext";

const PALETTE = [
  "#e25a4e", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#0ea5e9",
  "#111827", "#374151", "#9ca3af", "#ffffff", "#fef3c7", "#dcfce7",
];
const SHADOWS: { label: string; value: string }[] = [
  { label: "Ninguna", value: "" },
  { label: "Suave", value: "0 2px 8px rgba(0,0,0,0.12)" },
  { label: "Media", value: "0 6px 18px rgba(0,0,0,0.18)" },
  { label: "Fuerte", value: "0 14px 40px rgba(0,0,0,0.28)" },
];

const SwatchRow: React.FC<{
  label: string;
  onPick: (c: string) => void;
  onClear?: () => void;
}> = ({ label, onPick, onClear }) => (
  <div className="mb-3">
    <p className="mb-1.5 text-xs font-medium text-neutral-500">{label}</p>
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button key={c} onClick={() => onPick(c)} className="h-7 w-7 rounded-md border border-neutral-200" style={{ backgroundColor: c }} title={c} />
      ))}
      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border border-dashed border-neutral-300">
        <span className="absolute inset-0" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }} />
        <input type="color" onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      {onClear && (
        <button onClick={onClear} className="ml-1 text-xs text-neutral-500 hover:text-neutral-800">Quitar</button>
      )}
    </div>
  </div>
);

const ElementControls: React.FC<{ slideIndex: number; path: string }> = ({
  slideIndex,
  path,
}) => {
  const dispatch = useDispatch();
  const { setElement, aspectLocked, setAspectLocked } = useEditorPanel();
  const override: ElementOverride = useSelector(
    (s: RootState) =>
      (s.presentationGeneration.presentationData as any)?.slides?.[slideIndex]
        ?.content?.__style_overrides__?.[path]
  ) || {};
  const slideContent = useSelector(
    (s: RootState) =>
      (s.presentationGeneration.presentationData as any)?.slides?.[slideIndex]
        ?.content
  );
  const chartData = slideContent?.chartData ?? slideContent?.graph;
  const graphColors: (string | null)[] = slideContent?.__graph_colors__ ?? [];

  // Resolver el elemento en el DOM (para alinear y detectar gráfico/overlay).
  const resolveEl = (): HTMLElement | null => {
    const anchor = document.querySelector(`#slide-${slideIndex} [data-style-root]`);
    return anchor ? resolveElementPath(anchor, path) : null;
  };

  // Alinear dentro de la slide: calcula el translate necesario comparando el
  // rect actual del elemento contra el rect del root visual de la slide,
  // corregido por la escala de zoom del editor.
  const align = (h: "left" | "center" | "right" | null, v: "top" | "middle" | "bottom" | null) => {
    const el = resolveEl();
    const anchor = document.querySelector(`#slide-${slideIndex} [data-style-root]`);
    const host = anchor
      ? (Array.prototype.find.call(anchor.children, (c: Element) =>
          !["LINK", "STYLE", "SCRIPT", "META", "TITLE"].includes(c.tagName) &&
          !c.hasAttribute("data-slide-bg")
        ) as HTMLElement | undefined)
      : undefined;
    if (!el || !host) return;
    const S = host.getBoundingClientRect();
    const E = el.getBoundingClientRect();
    // Zoom real del editor: rect en pantalla vs. tamaño CSS del host (1280 en
    // la app; cualquier otro en harnesses/plantillas custom).
    const k = S.width / (host.offsetWidth || 1280) || 1;
    const patch: Partial<ElementOverride> = {};
    if (h) {
      const target = h === "left" ? S.left : h === "center" ? S.left + (S.width - E.width) / 2 : S.right - E.width;
      patch.translateX = (override.translateX ?? 0) + (target - E.left) / k;
    }
    if (v) {
      const target = v === "top" ? S.top : v === "middle" ? S.top + (S.height - E.height) / 2 : S.bottom - E.height;
      patch.translateY = (override.translateY ?? 0) + (target - E.top) / k;
    }
    dispatch(setStyleOverride({ slideIndex, elementPath: path, patch }));
  };

  // ¿El elemento seleccionado contiene (o está dentro de) un gráfico?
  // Detección por DOM: cubre TODAS las familias de templates.
  const isChart = useMemo(() => {
    const el = resolveEl();
    if (!el) return false;
    return !!(
      el.querySelector?.(".recharts-wrapper, .recharts-surface") ||
      el.closest?.(".recharts-wrapper")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, path]);

  // Etiquetas para los colores: series/categorías del contenido; si el
  // template guarda los datos con otra forma, caer a la leyenda del DOM o a
  // etiquetas genéricas.
  const chartKeys: string[] = useMemo(() => {
    if (chartData) {
      if (Array.isArray(chartData.series) && chartData.series.length) return chartData.series;
      const rows = Array.isArray(chartData.data)
        ? chartData.data
        : Array.isArray(chartData)
          ? chartData
          : [];
      if (rows.length) return rows.slice(0, 8).map((r: any, i: number) => r?.name || `Color ${i + 1}`);
    }
    const el = resolveEl();
    const legend = el
      ? [...(el.querySelectorAll?.(".recharts-legend-item-text") || [])].map(
          (n: any) => n.textContent?.trim()
        ).filter(Boolean)
      : [];
    if (legend.length) return legend.slice(0, 8) as string[];
    return ["Color 1", "Color 2", "Color 3", "Color 4"];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, slideIndex, path]);

  const patch = (p: Partial<ElementOverride>) =>
    dispatch(setStyleOverride({ slideIndex, elementPath: path, patch: p }));

  // ¿Lo seleccionado es un icono superpuesto? (permite eliminarlo)
  const overlayIndex = useMemo(() => {
    const anchor = document.querySelector(
      `#slide-${slideIndex} [data-style-root]`
    );
    if (!anchor) return null;
    const el = resolveElementPath(anchor, path);
    const idx = el?.getAttribute?.("data-overlay-idx");
    return idx != null ? Number(idx) : null;
  }, [slideIndex, path]);

  return (
    <div className="flex h-full flex-col font-syne">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FBEDEA] text-[#e25a4e]">◧</span>
          <span className="text-base font-semibold text-[#191919]">
            {overlayIndex != null ? "Icono" : "Elemento"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {overlayIndex != null && (
            <button
              onClick={() => {
                dispatch(removeSlideOverlay({ slideIndex, overlayIndex }));
                dispatch(clearStyleOverride({ slideIndex, elementPath: path }));
                setElement(null);
              }}
              title="Eliminar icono"
              className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => dispatch(clearStyleOverride({ slideIndex, elementPath: path }))} title="Restablecer" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={() => setElement(null)} title="Cerrar" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 font-inter">
        <SwatchRow label="Fondo" onPick={(c) => patch({ backgroundColor: c })} onClear={() => patch({ backgroundColor: undefined })} />
        <SwatchRow label="Texto" onPick={(c) => patch({ textColor: c })} />
        <SwatchRow label="Borde" onPick={(c) => patch({ borderColor: c, borderWidth: (override.borderWidth ?? 0) > 0 ? override.borderWidth : 2, borderStyle: "solid" })} onClear={() => patch({ borderWidth: 0 })} />

        <div className="mb-3 flex items-center gap-2">
          <span className="w-16 text-xs text-neutral-500">Grosor</span>
          <input type="range" min={0} max={12} step={1} value={override.borderWidth ?? 0} onChange={(e) => patch({ borderWidth: Number(e.target.value), borderStyle: "solid", borderColor: override.borderColor || "#111827" })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-8 text-right text-xs text-neutral-500">{override.borderWidth ?? 0}</span>
        </div>

        <p className="mb-1.5 text-xs font-medium text-neutral-500">Sombra</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SHADOWS.map((s) => (
            <button key={s.label} onClick={() => patch({ boxShadow: s.value || undefined })} className={`rounded-md border px-2.5 py-1.5 text-xs ${(override.boxShadow || "") === s.value ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>{s.label}</button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="w-16 text-xs text-neutral-500">Redondeo</span>
          <input type="range" min={0} max={48} step={2} value={override.borderRadius ?? 0} onChange={(e) => patch({ borderRadius: Number(e.target.value) })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-8 text-right text-xs text-neutral-500">{override.borderRadius ?? 0}</span>
        </div>

        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">Tamaño</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAspectLocked(!aspectLocked)}
              title={aspectLocked ? "Proporción fija (clic para liberar)" : "Proporción libre (clic para fijar)"}
              className={`flex h-6 w-6 items-center justify-center rounded ${aspectLocked ? "bg-[#e25a4e]/10 text-[#e25a4e]" : "text-neutral-400 hover:bg-neutral-100"}`}
            >
              {aspectLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </button>
            <span className="text-xs text-neutral-500">{Math.round((override.scaleX ?? 1) * 100)}%</span>
          </div>
        </div>
        <input type="range" min={25} max={400} step={5} value={Math.round((override.scaleX ?? 1) * 100)} onChange={(e) => { const s = clampScale(Number(e.target.value) / 100); if (aspectLocked) patch({ scaleX: s, scaleY: s }); else patch({ scaleX: s }); }} className="mb-2 w-full accent-[#e25a4e]" />
        {!aspectLocked && (
          <div className="mb-3 flex items-center gap-2">
            <span className="w-16 text-xs text-neutral-500">Alto</span>
            <input type="range" min={25} max={400} step={5} value={Math.round((override.scaleY ?? 1) * 100)} onChange={(e) => patch({ scaleY: clampScale(Number(e.target.value) / 100) })} className="flex-1 accent-[#e25a4e]" />
            <span className="w-10 text-right text-xs text-neutral-500">{Math.round((override.scaleY ?? 1) * 100)}%</span>
          </div>
        )}

        <p className="mb-1.5 text-xs font-medium text-neutral-500">Alinear en la slide</p>
        <div className="mb-3 flex items-center gap-1.5">
          {([
            { icon: AlignStartVertical, act: () => align("left", null), t: "Izquierda" },
            { icon: AlignCenterVertical, act: () => align("center", null), t: "Centro" },
            { icon: AlignEndVertical, act: () => align("right", null), t: "Derecha" },
          ] as const).map((b, i) => (
            <button key={i} onClick={b.act} title={b.t} className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50">
              <b.icon className="h-4 w-4" />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-neutral-200" />
          {([
            { icon: AlignStartHorizontal, act: () => align(null, "top"), t: "Arriba" },
            { icon: AlignCenterHorizontal, act: () => align(null, "middle"), t: "Medio" },
            { icon: AlignEndHorizontal, act: () => align(null, "bottom"), t: "Abajo" },
          ] as const).map((b, i) => (
            <button key={i} onClick={b.act} title={b.t} className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50">
              <b.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <p className="mb-1.5 text-xs font-medium text-neutral-500">Alinear texto (en el bloque)</p>
        <div className="mb-3 flex items-center gap-1.5">
          {([["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]] as const).map(([v, t]) => (
            <button key={v} onClick={() => patch({ textAlign: override.textAlign === v ? undefined : v })} title={t} className={`h-8 rounded-md border px-2 text-xs ${override.textAlign === v ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
              {v === "left" ? "⇤" : v === "center" ? "⇹" : "⇥"}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-neutral-200" />
          {([["top", "Arriba"], ["middle", "Medio"], ["bottom", "Abajo"]] as const).map(([v, t]) => (
            <button key={v} onClick={() => patch({ vAlign: override.vAlign === v ? undefined : v })} title={t} className={`h-8 rounded-md border px-2 text-xs ${override.vAlign === v ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
              {v === "top" ? "⤒" : v === "middle" ? "⇳" : "⤓"}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="w-16 text-xs text-neutral-500">Rotación</span>
          <input type="range" min={-180} max={180} step={1} value={override.rotate ?? 0} onChange={(e) => patch({ rotate: Number(e.target.value) })} onDoubleClick={() => patch({ rotate: 0 })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-10 text-right text-xs text-neutral-500">{override.rotate ?? 0}°</span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="w-16 text-xs text-neutral-500">Opacidad</span>
          <input type="range" min={10} max={100} step={5} value={override.opacity ?? 100} onChange={(e) => patch({ opacity: Number(e.target.value) })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-10 text-right text-xs text-neutral-500">{override.opacity ?? 100}%</span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="w-16 text-xs text-neutral-500">Orden</span>
          <button onClick={() => patch({ zIndex: 50 })} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${override.zIndex === 50 ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
            <BringToFront className="h-3.5 w-3.5" /> Al frente
          </button>
          <button onClick={() => patch({ zIndex: -1 })} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${override.zIndex === -1 ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
            <SendToBack className="h-3.5 w-3.5" /> Atrás
          </button>
          {override.zIndex != null && (
            <button onClick={() => patch({ zIndex: undefined })} className="text-xs text-neutral-500 hover:text-neutral-800">Auto</button>
          )}
        </div>

        {isChart && chartKeys.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Colores del gráfico</p>
            {chartKeys.map((k, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2">
                <label className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-300">
                  <span className="absolute inset-0" style={{ backgroundColor: graphColors[i] || "transparent" }} />
                  {!graphColors[i] && (
                    <span className="absolute inset-0" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }} />
                  )}
                  <input type="color" value={graphColors[i] || "#4d4ef3"} onChange={(e) => dispatch(setGraphColor({ slideIndex, index: i, color: e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">{k}</span>
                {graphColors[i] && (
                  <button onClick={() => dispatch(setGraphColor({ slideIndex, index: i, color: null }))} className="text-[11px] text-neutral-400 hover:text-neutral-700">Auto</button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-neutral-400">Tip: arrastrá el contorno para mover (o usá las flechas del teclado; Shift = 10px), y los tiradores de esquina para redimensionar.</p>
      </div>
    </div>
  );
};

export default ElementControls;
