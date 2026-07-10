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

// ── Auto-carga de Google Fonts usadas en el contenido ───────────────────────
// El editor permite aplicar cualquier Google Font por nombre (marca inline
// font-family). Para que se vea igual en lectura, export (/pdf-maker) y
// publicación, escaneamos los font-family inline y cargamos las familias que
// falten. Si una familia no es de Google (custom/tema), el link 404 sin daño.
const GENERIC_FAMILIES = new Set([
  "inherit", "initial", "unset", "serif", "sans-serif", "monospace", "cursive",
  "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace",
]);
const requestedFamilies = new Set<string>();

const ensureGoogleFontsFromDom = (root: HTMLElement) => {
  if (typeof document === "undefined") return;
  root.querySelectorAll<HTMLElement>('[style*="font-family"]').forEach((el) => {
    const raw = el.style.fontFamily;
    if (!raw || raw.includes("var(")) return;
    const family = raw.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    if (!family || GENERIC_FAMILIES.has(family.toLowerCase())) return;
    if (requestedFamilies.has(family)) return;
    requestedFamilies.add(family);
    // Si ya hay un @font-face o link para esa familia (tema/custom), no dupl.
    const id = `tt-gfont-${family.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    // Nota: no usar document.fonts.check() acá — devuelve true para familias
    // desconocidas en Chromium y saltearía la carga.
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  });
};

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
      ensureGoogleFontsFromDom(root);
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
