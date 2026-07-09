"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { setStyleOverride } from "@/store/slices/presentationGeneration";
import {
  ElementOverride,
  StyleOverrides,
  clampScale,
  getElementPath,
  resolveElementPath,
} from "./styleOverrides";
import { useEditorPanel } from "./EditorPanelContext";

// Elementos cuyo click NO debe seleccionar una caja.
const BAIL_SELECTOR = [
  ".ProseMirror", "[contenteditable]", ".tiptap-text-editor", "img", "svg",
  "[data-style-overlay]", "[data-editor-ui]", "[data-tippy-root]",
  "[data-radix-popper-content-wrapper]", "[data-radix-portal]",
].join(", ");

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
  const { element, setElement, setEditor } = useEditorPanel();
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Sólo esta slide dibuja el contorno si el elemento seleccionado es suyo.
  const selPath =
    element && element.slideIndex === slideIndex ? element.path : null;
  const override: ElementOverride = (selPath && overrides?.[selPath]) || {};

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

  // Rect del elemento seleccionado (para contorno/handles).
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

  // Selección por click-target.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = getAnchor();
      if (!target || !anchor || !anchor.contains(target)) return;
      if (target.closest("[data-style-overlay]")) return;
      if (target.closest(BAIL_SELECTOR)) {
        setElement(null); // editar texto/imagen/icono → cerrar panel de elemento
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      let node: HTMLElement | null = target;
      let picked: HTMLElement = target;
      while (node && node !== anchor) {
        const cs = window.getComputedStyle(node);
        const bg = cs.backgroundColor;
        const hasBg = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
        if (hasBg || parseFloat(cs.borderRadius) > 0) {
          picked = node;
          break;
        }
        node = node.parentElement;
      }
      const path = getElementPath(picked, anchor);
      if (path != null) {
        setEditor(null);
        setElement({ slideIndex, path });
      }
    };
    container.addEventListener("click", onClick, true);
    return () => container.removeEventListener("click", onClick, true);
  }, [containerRef, getAnchor, setElement, setEditor, slideIndex]);

  // Deseleccionar al clickear fuera de la slide y del panel; o con Esc.
  useEffect(() => {
    if (selPath == null) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (containerRef.current?.contains(t)) return;
      if (t.closest("[data-style-overlay], [data-editor-ui]")) return;
      setElement(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setElement(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [selPath, containerRef, setElement]);

  const patch = (p: Partial<ElementOverride>) => {
    if (selPath == null) return;
    dispatch(setStyleOverride({ slideIndex, elementPath: selPath, patch: p }));
  };

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

  // Mover (arrastrar contorno) → translate.
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

  // Resize uniforme por handle de esquina.
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
      patch({ scaleX: next, scaleY: next, kind: el.tagName === "IMG" ? "image" : "box" });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (selPath == null || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div data-style-overlay="" style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      <div
        data-style-overlay=""
        onPointerDown={onOutlineDown}
        style={{
          position: "fixed", left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          border: "2px solid #e25a4e", borderRadius: 4, cursor: "move", pointerEvents: "auto",
        }}
      />
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
    </div>,
    document.body
  );
};

export default StyleEditOverlay;
