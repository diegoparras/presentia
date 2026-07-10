"use client";

import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RotateCcw, Trash2, X } from "lucide-react";
import type { RootState } from "@/store/store";
import {
  setStyleOverride,
  clearStyleOverride,
  removeSlideOverlay,
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
  const { setElement } = useEditorPanel();
  const override: ElementOverride = useSelector(
    (s: RootState) =>
      (s.presentationGeneration.presentationData as any)?.slides?.[slideIndex]
        ?.content?.__style_overrides__?.[path]
  ) || {};

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
          <span className="text-xs text-neutral-500">{Math.round((override.scaleX ?? 1) * 100)}%</span>
        </div>
        <input type="range" min={25} max={400} step={5} value={Math.round((override.scaleX ?? 1) * 100)} onChange={(e) => { const s = clampScale(Number(e.target.value) / 100); patch({ scaleX: s, scaleY: s }); }} className="mb-2 w-full accent-[#e25a4e]" />
        <p className="text-[11px] text-neutral-400">Tip: arrastrá el contorno para mover, o los tiradores de esquina para redimensionar.</p>
      </div>
    </div>
  );
};

export default ElementControls;
