"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { setStyleOverride } from "@/store/slices/presentationGeneration";
import {
  ElementOverride,
  StyleOverrides,
  clampScale,
  findVisualHost,
  getElementPath,
  resolveElementPath,
} from "./styleOverrides";
import { useEditorPanel } from "./EditorPanelContext";

// Elementos cuyo click NO debe seleccionar una caja. Las imágenes NO están acá:
// se manejan aparte (1er click selecciona; 2do click abre el ImageEditor).
const BAIL_SELECTOR = [
  ".ProseMirror", "[contenteditable]", ".tiptap-text-editor", "svg",
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
  const { element, setElement, setEditor, setBackgroundSlide, aspectLocked } = useEditorPanel();
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Sólo esta slide dibuja el contorno si el elemento seleccionado es suyo.
  const selPath =
    element && element.slideIndex === slideIndex ? element.path : null;
  const override: ElementOverride = (selPath && overrides?.[selPath]) || {};
  // Ref vivo para handlers que corren varias veces entre renders (flechas).
  const overrideRef = useRef(override);
  overrideRef.current = override;
  // Tras un drag-desde-el-cuerpo, el navegador dispara igualmente un click:
  // este flag lo traga para no re-seleccionar/abrir editores sin querer.
  const dragJustEndedRef = useRef(false);

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
      // El click que sigue a un drag no debe seleccionar ni abrir editores.
      if (dragJustEndedRef.current) {
        dragJustEndedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = getAnchor();
      if (!target || !anchor || !anchor.contains(target)) return;
      if (target.closest("[data-style-overlay]")) return;
      // Iconos superpuestos: 1er click selecciona (mover/redimensionar);
      // si ya está seleccionado, pasa el click al IconsEditor. Va ANTES del
      // BAIL porque el target es un <svg> (que normalmente bailea).
      const ovEl = target.closest("[data-overlay-idx]") as HTMLElement | null;
      if (ovEl) {
        const ovPath = getElementPath(ovEl, anchor);
        if (ovPath == null) return;
        const yaSel =
          element && element.slideIndex === slideIndex && element.path === ovPath;
        if (yaSel) return; // pasa al IconsEditor
        e.preventDefault();
        e.stopPropagation();
        setEditor(null);
        setBackgroundSlide(null);
        setElement({ slideIndex, path: ovPath });
        return;
      }
      // Gráficos: el click cae en el <svg> de recharts (que normalmente
      // bailea) — seleccionar el contenedor del gráfico para poder editarlo
      // (colores, mover, etc.).
      const chartWrap = target.closest(".recharts-wrapper") as HTMLElement | null;
      if (chartWrap) {
        let node: HTMLElement | null = chartWrap.parentElement;
        let picked: HTMLElement = chartWrap;
        while (node && node !== anchor) {
          const cs = window.getComputedStyle(node);
          const bg = cs.backgroundColor;
          if ((bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "") || parseFloat(cs.borderRadius) > 0) {
            picked = node;
            break;
          }
          node = node.parentElement;
        }
        const chartPath = getElementPath(picked, anchor);
        if (chartPath == null) return;
        e.preventDefault();
        e.stopPropagation();
        setEditor(null);
        setBackgroundSlide(null);
        setElement({ slideIndex, path: chartPath });
        return;
      }
      if (target.closest(BAIL_SELECTOR)) {
        setElement(null); // editar texto/icono → cerrar panel de elemento
        return;
      }
      // Imágenes: 1er click las selecciona (resize/mover + panel Elemento);
      // si ya está seleccionada, dejamos pasar el click para que el handler
      // de EditableLayoutWrapper abra el ImageEditor (zoom/enfoque/reemplazo).
      const imgEl = target.closest("img") as HTMLElement | null;
      if (imgEl) {
        const imgPath = getElementPath(imgEl, anchor);
        if (imgPath == null) return;
        const yaSeleccionada =
          element && element.slideIndex === slideIndex && element.path === imgPath;
        if (yaSeleccionada) return; // pasa al ImageEditor
        e.preventDefault();
        e.stopPropagation();
        setEditor(null);
        setBackgroundSlide(null);
        setElement({ slideIndex, path: imgPath });
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
        setBackgroundSlide(null);
        setElement({ slideIndex, path });
      }
    };
    container.addEventListener("click", onClick, true);
    return () => container.removeEventListener("click", onClick, true);
  }, [containerRef, getAnchor, setElement, setEditor, slideIndex, element]);

  // Arrastre directo desde el CUERPO del elemento: seleccionar + mover en un
  // solo gesto (umbral 4px distingue drag de click; el click conserva su
  // comportamiento). El texto queda excluido (selección de texto con mouse)
  // y la slide entera no se arrastra (evita corrimientos accidentales).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resolveDraggable = (
      target: HTMLElement,
      anchor: HTMLElement
    ): HTMLElement | null => {
      if (
        target.closest(
          "[data-style-overlay], [data-editor-ui], [data-tippy-root], [data-radix-popper-content-wrapper], [data-radix-portal]"
        )
      )
        return null;
      if (target.closest(".ProseMirror, [contenteditable], .tiptap-text-editor"))
        return null;
      const ov = target.closest("[data-overlay-idx]") as HTMLElement | null;
      if (ov) return ov;
      const img = target.closest("img") as HTMLElement | null;
      if (img && anchor.contains(img)) return img;
      const chartWrap = target.closest(".recharts-wrapper") as HTMLElement | null;
      let picked: HTMLElement | null = chartWrap;
      let node: HTMLElement | null = chartWrap ? chartWrap.parentElement : target;
      while (node && node !== anchor) {
        const cs = window.getComputedStyle(node);
        const bg = cs.backgroundColor;
        if (
          (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "") ||
          parseFloat(cs.borderRadius) > 0
        ) {
          picked = node;
          break;
        }
        node = node.parentElement;
      }
      if (!picked) return null;
      if (picked === findVisualHost(anchor)) return null; // la slide entera, no
      return picked;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      const anchor = getAnchor();
      if (!target || !anchor || !anchor.contains(target)) return;
      const el = resolveDraggable(target, anchor);
      if (!el) return;
      const path = getElementPath(el, anchor);
      if (path == null) return;
      // Evitar el drag nativo de imágenes/SVG del navegador.
      if (target.closest("img, svg")) e.preventDefault();
      const k = getSlideScale(el) || 1;
      const startX = e.clientX;
      const startY = e.clientY;
      const startTx = overrides?.[path]?.translateX ?? 0;
      const startTy = overrides?.[path]?.translateY ?? 0;
      const kind = el.tagName === "IMG" ? ("image" as const) : ("box" as const);
      let dragging = false;
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 4) return;
          dragging = true;
          setEditor(null);
          setBackgroundSlide(null);
          setElement({ slideIndex, path });
        }
        ev.preventDefault();
        dispatch(
          setStyleOverride({
            slideIndex,
            elementPath: path,
            patch: { translateX: startTx + dx / k, translateY: startTy + dy / k, kind },
          })
        );
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (dragging) dragJustEndedRef.current = true;
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    container.addEventListener("pointerdown", onDown, true);
    return () => container.removeEventListener("pointerdown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, getAnchor, overrides, slideIndex, setElement, setEditor, setBackgroundSlide]);

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
      if (e.key === "Escape") {
        setElement(null);
        return;
      }
      // Mover con flechas (1px; Shift = 10px) — sin robar el tipeo de inputs.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const step = e.shiftKey ? 10 : 1;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = deltas[e.key];
      if (!d) return;
      e.preventDefault();
      const cur = overrideRef.current;
      const patchMove: Record<string, number> = {};
      if (d[0] !== 0) patchMove.translateX = (cur.translateX ?? 0) + d[0];
      if (d[1] !== 0) patchMove.translateY = (cur.translateY ?? 0) + d[1];
      dispatch(
        setStyleOverride({ slideIndex, elementPath: selPath!, patch: patchMove })
      );
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPath, containerRef, setElement, override.translateX, override.translateY, slideIndex]);

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

  // Resize por handle de esquina. Con proporción fija (candado) escala
  // uniforme; con proporción libre, X e Y se escalan por separado según el
  // movimiento en cada eje.
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = selEl();
    if (!el || !rect) return;
    const originX = rect.left;
    const originY = rect.top;
    const startDist = Math.hypot(e.clientX - originX, e.clientY - originY) || 1;
    const startDx = Math.abs(e.clientX - originX) || 1;
    const startDy = Math.abs(e.clientY - originY) || 1;
    const startScaleX = override.scaleX ?? 1;
    const startScaleY = override.scaleY ?? 1;
    const kind = el.tagName === "IMG" ? "image" : ("box" as const);
    // Bloques de texto: cambiar ancho/alto reales (el texto refluye y NO se
    // escala la tipografía). El resto: transform scale como siempre.
    const isTextBlock = !!el.querySelector(".tiptap-text-editor");
    const startW = el.offsetWidth || 1;
    const startH = el.offsetHeight || 1;
    const onMove = (ev: PointerEvent) => {
      const fDist = Math.hypot(ev.clientX - originX, ev.clientY - originY) / startDist;
      const fx = Math.abs(ev.clientX - originX) / startDx;
      const fy = Math.abs(ev.clientY - originY) / startDy;
      if (isTextBlock) {
        const wf = aspectLocked ? fDist : fx;
        const hf = aspectLocked ? fDist : fy;
        patch({
          width: Math.max(48, Math.round(startW * wf)),
          height: Math.max(28, Math.round(startH * hf)),
          kind,
        });
      } else if (aspectLocked) {
        patch({ scaleX: clampScale(startScaleX * fDist), scaleY: clampScale(startScaleY * fDist), kind });
      } else {
        patch({ scaleX: clampScale(startScaleX * fx), scaleY: clampScale(startScaleY * fy), kind });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (selPath == null || !rect || typeof document === "undefined") return null;

  // Tiras de arrastre SOLO en los bordes: el interior del elemento queda libre
  // para clicks normales (iconos, imágenes, texto). Mover = arrastrar un borde.
  const STRIP = 8;
  const strips: React.CSSProperties[] = [
    { left: rect.left - STRIP / 2, top: rect.top - STRIP / 2, width: rect.width + STRIP, height: STRIP },
    { left: rect.left - STRIP / 2, top: rect.bottom - STRIP / 2, width: rect.width + STRIP, height: STRIP },
    { left: rect.left - STRIP / 2, top: rect.top - STRIP / 2, width: STRIP, height: rect.height + STRIP },
    { left: rect.right - STRIP / 2, top: rect.top - STRIP / 2, width: STRIP, height: rect.height + STRIP },
  ];

  return createPortal(
    <div data-style-overlay="" style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      {/* Borde visual (no captura eventos). */}
      <div
        style={{
          position: "fixed", left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          border: "2px solid #e25a4e", borderRadius: 4, pointerEvents: "none",
        }}
      />
      {strips.map((s, i) => (
        <div
          key={`s${i}`}
          data-style-overlay=""
          onPointerDown={onOutlineDown}
          style={{ position: "fixed", cursor: "move", pointerEvents: "auto", ...s }}
        />
      ))}
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
