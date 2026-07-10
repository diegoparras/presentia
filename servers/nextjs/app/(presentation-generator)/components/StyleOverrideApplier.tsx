"use client";

import React, { useLayoutEffect, useRef } from "react";
import { RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";
import {
  SlideBackground,
  StyleOverrides,
  STYLE_APPLIED_ATTR,
  SLIDE_BG_ATTR,
  resolveElementPath,
  overrideToInlineStyle,
  isMeaningfulOverride,
} from "./styleOverrides";

// Icono superpuesto a la slide (agregado por el usuario). Usa __icon_url__
// para que EditableLayoutWrapper/IconsEditor lo detecten y editen (color,
// forma, reemplazo). x/y en % del slide; size en px del espacio base.
export interface SlideOverlay {
  __icon_url__: string;
  x: number;
  y: number;
  size: number;
}

interface Props {
  overrides?: StyleOverrides;
  background?: SlideBackground | null;
  overlays?: SlideOverlay[];
  children: React.ReactNode;
}

// Inyecta (o actualiza/remueve) el layer de imagen de fondo como PRIMER hijo
// del root del template: queda por encima del background-color del root pero
// detrás de todo el contenido (stacking por orden de DOM). pointer-events:none
// para no interferir con la edición. Los helpers de elementPath lo excluyen
// del indexado (SLIDE_BG_ATTR).
// Tags no visuales que algunos templates renderizan inline (p.ej. <link> de
// fuentes) — no sirven como host del layer de fondo.
const NON_VISUAL_TAGS = new Set(["LINK", "STYLE", "SCRIPT", "META", "TITLE"]);

const applyBackgroundLayer = (
  root: HTMLElement,
  background?: SlideBackground | null
) => {
  const host = (Array.prototype.find.call(
    root.children,
    (c: Element) => !NON_VISUAL_TAGS.has(c.tagName)
  ) ?? null) as HTMLElement | null;
  if (!host) return;
  let layer = host.querySelector(`:scope > [${SLIDE_BG_ATTR}]`) as HTMLElement | null;
  if (!background || !background.url) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.setAttribute(SLIDE_BG_ATTR, "");
    host.prepend(layer);
  }
  if (window.getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    backgroundImage: `url("${background.url}")`,
    backgroundSize: background.fit || "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    opacity: String((background.opacity ?? 100) / 100),
    pointerEvents: "none",
  });
};

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
const StyleOverrideApplier: React.FC<Props> = ({ overrides, background, overlays, children }) => {
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
      applyBackgroundLayer(root, background);
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
  }, [overrides, background]);

  return (
    <div ref={rootRef} data-style-root="" style={{ display: "contents" }}>
      {children}
      {Array.isArray(overlays) && overlays.length > 0 && (
        // Iconos superpuestos: layer React (mismo DOM en editor y export). Va
        // AL FINAL para no correr los paths existentes; los iconos sí son
        // indexables (se mueven/redimensionan con el sistema de elementos).
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}>
          {overlays.map((o, i) => (
            <span
              key={i}
              data-overlay-idx={i}
              style={{
                position: "absolute",
                left: `${o.x}%`,
                top: `${o.y}%`,
                width: o.size,
                height: o.size,
                pointerEvents: "auto",
              }}
            >
              <RemoteSvgIcon url={o.__icon_url__} strokeColor="currentColor" className="h-full w-full" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StyleOverrideApplier;
