"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { Paintbrush, RotateCcw, X, ArrowUp } from "lucide-react";
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

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slideIndex: number;
  overrides?: StyleOverrides;
}

const isBoxy = (n: HTMLElement): boolean => {
  if (n.tagName === "IMG") return true;
  const cs = window.getComputedStyle(n);
  const bg = cs.backgroundColor;
  const hasBg = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
  const hasRadius = parseFloat(cs.borderRadius) > 0;
  const hasBorder =
    parseFloat(cs.borderWidth) > 0 && cs.borderStyle !== "none";
  return hasBg || hasRadius || hasBorder;
};

const StyleEditOverlay: React.FC<Props> = ({
  containerRef,
  slideIndex,
  overrides,
}) => {
  const dispatch = useDispatch();
  const [active, setActive] = useState(false);
  const [selPath, setSelPath] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const dragRef = useRef<{
    startDist: number;
    startScale: number;
    originX: number;
    originY: number;
  } | null>(null);

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

  // Recalcular el rect del elemento seleccionado mientras esté seleccionado.
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

  // Selección por click cuando el modo estilo está activo.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return;
    const anchor = getAnchor();
    if (!anchor) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !anchor.contains(target)) return;
      // No robar el click de los handles/toolbar del overlay.
      if (target.closest("[data-style-overlay]")) return;
      e.preventDefault();
      e.stopPropagation();
      // Subir hasta el bloque más cercano dentro del anchor.
      let node: HTMLElement | null = target;
      let picked: HTMLElement = target;
      while (node && node !== anchor) {
        if (isBoxy(node)) {
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
  }, [active, containerRef, getAnchor]);

  // Esc para deseleccionar / salir del modo.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selPath != null) setSelPath(null);
        else setActive(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selPath]);

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

  // Factor de escala del SlideScale (transform:scale del contenedor de la slide),
  // para convertir px de pantalla → px del lienzo base al mover.
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

  // Mover el elemento (arrastrar el cuerpo/outline) → translate. No reflowea.
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
    dragRef.current = {
      startDist,
      startScale: override.scaleX ?? 1,
      originX,
      originY,
    };
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dist = Math.hypot(ev.clientX - d.originX, ev.clientY - d.originY);
      const next = clampScale((d.startScale * dist) / d.startDist);
      patch({ scaleX: next, scaleY: next, kind: el.tagName === "IMG" ? "image" : "box" });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!containerRef) return null;

  return (
    <>
      {/* Toggle del modo estilo (esquina de la slide) */}
      <button
        type="button"
        data-style-overlay=""
        onClick={(e) => {
          e.stopPropagation();
          setActive((v) => !v);
          setSelPath(null);
        }}
        className={`absolute left-2 top-2 z-40 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors ${
          active
            ? "border-[#e25a4e] bg-[#e25a4e] text-white"
            : "border-neutral-200 bg-white/90 text-neutral-600 hover:bg-white"
        }`}
        title="Editar tamaño y color de elementos"
      >
        <Paintbrush className="h-3.5 w-3.5" />
        Estilo
      </button>

      {active &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-style-overlay=""
            style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}
          >
            {/* Outline del elemento seleccionado — arrastrable para mover */}
            <div
              data-style-overlay=""
              onPointerDown={onOutlineDown}
              style={{
                position: "fixed",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                border: "2px solid #e25a4e",
                borderRadius: 4,
                cursor: "move",
                pointerEvents: "auto",
              }}
            />
            {/* Handles en las esquinas */}
            {[
              [rect.left, rect.top],
              [rect.right, rect.top],
              [rect.left, rect.bottom],
              [rect.right, rect.bottom],
            ].map(([x, y], i) => (
              <div
                key={i}
                data-style-overlay=""
                onPointerDown={onHandleDown}
                style={{
                  position: "fixed",
                  left: x - 6,
                  top: y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "#fff",
                  border: "2px solid #e25a4e",
                  cursor: "nwse-resize",
                  pointerEvents: "auto",
                }}
              />
            ))}

            {/* Toolbar de propiedades */}
            <div
              data-style-overlay=""
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
                top: Math.max(8, rect.top - 96),
                pointerEvents: "auto",
              }}
              className="w-[288px] rounded-xl border border-neutral-200 bg-white p-2.5 text-black shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Elemento
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={selectParent} title="Seleccionar contenedor" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={reset} title="Restablecer" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelPath(null)} title="Cerrar" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Color de fondo */}
              <p className="mb-1 text-[11px] font-medium text-neutral-500">Fondo</p>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => patch({ backgroundColor: c })}
                    className="h-6 w-6 rounded-md border border-neutral-200"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-dashed border-neutral-300">
                  <span className="absolute inset-0" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }} />
                  <input type="color" onChange={(e) => patch({ backgroundColor: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                <button onClick={() => patch({ backgroundColor: undefined })} className="ml-1 text-[11px] text-neutral-500 hover:text-neutral-800">Quitar</button>
              </div>

              {/* Color de texto */}
              <p className="mb-1 text-[11px] font-medium text-neutral-500">Texto</p>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {PALETTE.slice(6).concat(["#e25a4e", "#2563eb"]).map((c) => (
                  <button
                    key={c}
                    onClick={() => patch({ textColor: c })}
                    className="h-6 w-6 rounded-md border border-neutral-200"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-dashed border-neutral-300">
                  <span className="absolute inset-0" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }} />
                  <input type="color" onChange={(e) => patch({ textColor: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
              </div>

              {/* Tamaño (escala) */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-neutral-500">Tamaño</p>
                <span className="text-[11px] text-neutral-500">
                  {Math.round((override.scaleX ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={400}
                step={5}
                value={Math.round((override.scaleX ?? 1) * 100)}
                onChange={(e) => {
                  const s = clampScale(Number(e.target.value) / 100);
                  patch({ scaleX: s, scaleY: s });
                }}
                className="w-full accent-[#e25a4e]"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default StyleEditOverlay;
