"use client";

import React, { useLayoutEffect, useRef } from "react";
import {
  StyleOverrides,
  STYLE_APPLIED_ATTR,
  resolveElementPath,
  overrideToInlineStyle,
  isMeaningfulOverride,
} from "./styleOverrides";

interface Props {
  overrides?: StyleOverrides;
  children: React.ReactNode;
}

/**
 * Aplica los overrides de estilo por elemento sobre el DOM ya renderizado del
 * template. Monta un contenedor-ancla (`data-style-root`, layout-neutral con
 * display:contents) y, tras cada render, resuelve cada path y aplica CSS inline.
 *
 * Corre en modo edición Y en modo lectura (/pdf-maker), por eso los overrides
 * aparecen también en el export (Chromium imprime el DOM; freeze lee
 * getComputedStyle/getBoundingClientRect del mismo DOM).
 */
const StyleOverrideApplier: React.FC<Props> = ({ overrides, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // Snapshot del atributo `style` original de cada elemento tocado, para poder
  // revertir con exactitud sin pisar estilos inline del template.
  const appliedRef = useRef<{ el: HTMLElement; style: string | null }[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const apply = () => {
      // Revertir lo aplicado antes.
      appliedRef.current.forEach(({ el, style }) => {
        if (style === null) el.removeAttribute("style");
        else el.setAttribute("style", style);
      });
      appliedRef.current = [];

      const map = overrides || {};
      Object.keys(map).forEach((path) => {
        const o = map[path];
        if (!isMeaningfulOverride(o)) return;
        const el = resolveElementPath(root, path);
        if (!el) return; // path no resuelve → skip silencioso (no crashea)
        appliedRef.current.push({ el, style: el.getAttribute("style") });
        const css = overrideToInlineStyle(o);
        Object.entries(css).forEach(([k, v]) => {
          (el.style as any)[k] = v;
        });
      });
      root.setAttribute(STYLE_APPLIED_ATTR, "true");
    };

    apply();

    // Re-aplicar si el template re-renderiza su subtree (solo observamos
    // childList/subtree — los cambios de atributo `style` que hacemos NO se
    // observan, así que no hay loop).
    let raf = 0;
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    obs.observe(root, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [overrides]);

  return (
    <div ref={rootRef} data-style-root="" style={{ display: "contents" }}>
      {children}
    </div>
  );
};

export default StyleOverrideApplier;
