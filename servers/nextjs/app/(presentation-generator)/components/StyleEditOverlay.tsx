"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { RotateCcw, X, ArrowUp } from "lucide-react";
import {
  setStyleOverride,
  clearStyleOverride,
} from "@/store/slices/presentationGeneration";
import {
  ElementOverride,
  StyleOverrides,
  clampScale,
  getElementPath,
  resolveElementPath,
} from "./styleOverrides";

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

// Elementos cuyo click NO debe seleccionar una caja: los maneja su propio editor.
const BAIL_SELECTOR =
  ".ProseMirror, [contenteditable], .tiptap-text-editor, img, svg, [data-style-overlay]";

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slideIndex: number;
  overrides?: StyleOverrides;
}

const StyleEditOverlay: React.FC<Props> = ({
  containerRef,
  slideIndex,
  overrides,
}) => {
  const dispatch = useDispatch();
  const [selPath, setSelPath] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const getAnchor = useCallback(
    () =>
      (containerRef.current?.querySelector(
        "[data-style-root]"
      ) as HTMLElement | null) ?? null,
    [containerRef]
  );

  const selEl = useCallback((): HTMLElement | null => {
    const anchor = getAnchor();
    if (!anchor || selPath == null) return null;
    return resolveElementPath(anchor, selPath);
  }, [getAnchor, selPath]);

  const override: ElementOverride = (selPath && overrides?.[selPath]) || {};

  // Rect del elemento seleccionado (para outline/handles/toolbar).
  useEffect(() => {
    if (selPath == null) {
      setRect(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = selEl();
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selPath, selEl]);

  // Selección por click-target: texto/imagen/icono → sus propios editores (y
  // cerramos el panel); caja → seleccionamos para darle estilo.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = getAnchor();
      if (!target || !anchor || !anchor.contains(target)) return;
      if (target.closest("[data-style-overlay]")) return;

      // Editando texto/imagen/icono → dejar que su editor actúe y cerrar panel.
      if (target.closest(BAIL_SELECTOR)) {
        setSelPath(null);
        return;
      }

      // Es una caja → seleccionar para estilo.
      e.preventDefault();
      e.stopPropagation();
      let node: HTMLElement | null = target;
      let picked: HTMLElement = target;
      while (node && node !== anchor) {
        const cs = window.getComputedStyle(node);
        const bg = cs.backgroundColor;
        const hasBg =
          bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
        if (hasBg || parseFloat(cs.borderRadius) > 0) {
          picked = node;
          break;
        }
        node = node.parentElement;
      }
      const path = getElementPath(picked, anchor);
      if (path != null) setSelPath(path);
    };

    container.addEventListener("click", onClick, true);
    return () => container.removeEventListener("click", onClick, true);
  }, [containerRef, getAnchor]);

  // Deseleccionar al clickear fuera de la slide, o con Esc.
  useEffect(() => {
    if (selPath == null) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (containerRef.current?.contains(t)) return;
      if (t.closest("[data-style-overlay]")) return;
      setSelPath(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelPath(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [selPath, containerRef]);

  const patch = (p: Partial<ElementOverride>) => {
    if (selPath == null) return;
    dispatch(setStyleOverride({ slideIndex, elementPath: selPath, patch: p }));
  };

  const reset = () => {
    if (selPath == null) return;
    dispatch(clearStyleOverride({ slideIndex, elementPath: selPath }));
  };

  const selectParent = () => {
    const anchor = getAnchor();
    const el = selEl();
    const parent = el?.parentElement;
    if (anchor && parent && anchor.contains(parent) && parent !== anchor) {
      const p = getElementPath(parent, anchor);
      if (p != null) setSelPath(p);
    }
  };

  // Factor de escala del SlideScale (transform:scale) para convertir px de
  // pantalla → px del lienzo base al mover.
  const getSlideScale = (el: HTMLElement): number => {
    let n: HTMLElement | null = el.parentElement;
    while (n) {
      const t = window.getComputedStyle(n).transform;
      if (t && t !== "none") {
        try {
          return new DOMMatrix(t).a || 1;
        } catch {
          return 1;
        }
      }
      n = n.parentElement;
    }
    return 1;
  };

  // Mover (arrastrar el contorno) → translate. No reflowea.
  const onOutlineDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = selEl();
    if (!el) return;
    const k = getSlideScale(el) || 1;
    const startTx = override.translateX ?? 0;
    const startTy = override.translateY ?? 0;
    const sx = e.clientX;
    const sy = e.clientY;
    const onMove = (ev: PointerEvent) => {
      patch({
        translateX: startTx + (ev.clientX - sx) / k,
        translateY: startTy + (ev.clientY - sy) / k,
        kind: el.tagName === "IMG" ? "image" : "box",
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Resize uniforme por handle de esquina (transform-origin top-left → no reflow).
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = selEl();
    if (!el || !rect) return;
    const originX = rect.left;
    const originY = rect.top;
    const startDist = Math.hypot(e.clientX - originX, e.clientY - originY) || 1;
    const startScale = override.scaleX ?? 1;
    const onMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - originX, ev.clientY - originY);
      const next = clampScale((startScale * dist) / startDist);
      patch({
        scaleX: next,
        scaleY: next,
        kind: el.tagName === "IMG" ? "image" : "box",
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const swatchRow = (
    label: string,
    onPick: (c: string) => void,
    onClear?: () => void,
    colors: string[] = PALETTE
  ) => (
    <>
      <p className="mb-1 text-[11px] font-medium text-neutral-500">{label}</p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="h-6 w-6 rounded-md border border-neutral-200"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-dashed border-neutral-300">
          <span className="absolute inset-0" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }} />
          <input type="color" onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {onClear && (
          <button onClick={onClear} className="ml-1 text-[11px] text-neutral-500 hover:text-neutral-800">Quitar</button>
        )}
      </div>
    </>
  );

  if (!containerRef || selPath == null || !rect) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div data-style-overlay="" style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      {/* Contorno — arrastrable para mover */}
      <div
        data-style-overlay=""
        onPointerDown={onOutlineDown}
        style={{
          position: "fixed", left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          border: "2px solid #e25a4e", borderRadius: 4, cursor: "move", pointerEvents: "auto",
        }}
      />
      {/* Handles de esquina (resize) */}
      {[[rect.left, rect.top], [rect.right, rect.top], [rect.left, rect.bottom], [rect.right, rect.bottom]].map(([x, y], i) => (
        <div
          key={i}
          data-style-overlay=""
          onPointerDown={onHandleDown}
          style={{
            position: "fixed", left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: 3,
            background: "#fff", border: "2px solid #e25a4e", cursor: "nwse-resize", pointerEvents: "auto",
          }}
        />
      ))}

      {/* Panel de propiedades */}
      <div
        data-style-overlay=""
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
          top: Math.max(8, rect.top - 96),
          pointerEvents: "auto",
        }}
        className="max-h-[80vh] w-[288px] overflow-auto rounded-xl border border-neutral-200 bg-white p-2.5 text-black shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Elemento</span>
          <div className="flex items-center gap-1">
            <button onClick={selectParent} title="Seleccionar contenedor" className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><ArrowUp className="h-4 w-4" /></button>
            <button onClick={reset} title="Restablecer" className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={() => setSelPath(null)} title="Cerrar" className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {swatchRow("Fondo", (c) => patch({ backgroundColor: c }), () => patch({ backgroundColor: undefined }))}
        {swatchRow("Texto", (c) => patch({ textColor: c }))}

        {/* Borde */}
        {swatchRow("Borde", (c) => patch({ borderColor: c, borderWidth: (override.borderWidth ?? 0) > 0 ? override.borderWidth : 2, borderStyle: "solid" }), () => patch({ borderWidth: 0 }))}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] text-neutral-500">Grosor</span>
          <input type="range" min={0} max={12} step={1} value={override.borderWidth ?? 0} onChange={(e) => patch({ borderWidth: Number(e.target.value), borderStyle: "solid", borderColor: override.borderColor || "#111827" })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-6 text-right text-[11px] text-neutral-500">{override.borderWidth ?? 0}</span>
        </div>

        {/* Sombra */}
        <p className="mb-1 text-[11px] font-medium text-neutral-500">Sombra</p>
        <div className="mb-2 flex flex-wrap gap-1">
          {SHADOWS.map((s) => (
            <button
              key={s.label}
              onClick={() => patch({ boxShadow: s.value || undefined })}
              className={`rounded-md border px-2 py-1 text-[11px] ${(override.boxShadow || "") === s.value ? "border-[#e25a4e] bg-[#e25a4e]/10 text-[#e25a4e]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Radio de esquina */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] text-neutral-500">Redondeo</span>
          <input type="range" min={0} max={48} step={2} value={override.borderRadius ?? 0} onChange={(e) => patch({ borderRadius: Number(e.target.value) })} className="flex-1 accent-[#e25a4e]" />
          <span className="w-6 text-right text-[11px] text-neutral-500">{override.borderRadius ?? 0}</span>
        </div>

        {/* Tamaño */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-neutral-500">Tamaño</p>
          <span className="text-[11px] text-neutral-500">{Math.round((override.scaleX ?? 1) * 100)}%</span>
        </div>
        <input type="range" min={25} max={400} step={5} value={Math.round((override.scaleX ?? 1) * 100)} onChange={(e) => { const s = clampScale(Number(e.target.value) / 100); patch({ scaleX: s, scaleY: s }); }} className="w-full accent-[#e25a4e]" />
      </div>
    </div>,
    document.body
  );
};

export default StyleEditOverlay;
