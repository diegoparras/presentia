"use client";

import React, { useLayoutEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";
import {
  SlideBackground,
  StyleOverrides,
  STYLE_APPLIED_ATTR,
  SLIDE_BG_ATTR,
  PAGE_NUMBER_ATTR,
  findVisualHost,
  resolveElementPath,
  overrideToInlineStyle,
  isMeaningfulOverride,
} from "./styleOverrides";

// Config de números de slide (a nivel deck; presentation.page_numbers).
export interface PageNumbersConfig {
  enabled?: boolean;
  format?: string; // plantilla con {n} y {total}
  position?:
    | "bottom-left" | "bottom-center" | "bottom-right"
    | "top-left" | "top-center" | "top-right";
  style?: "minimal" | "pill" | "circle";
  size?: "s" | "m" | "l";
  color?: string | null; // null/"" = automático
  opacity?: number; // 10..100
  skip_first?: boolean;
  start_at?: number;
}

const PAGE_NUM_FONT_SIZE: Record<string, string> = { s: "12px", m: "15px", l: "20px" };

// Inyecta (o actualiza/remueve) el número de slide como ÚLTIMO hijo del host
// visual: mismo DOM en edición, exports y vista pública. Excluido del
// indexado de paths (PAGE_NUMBER_ATTR) y sin eventos de puntero.
const applyPageNumberLayer = (
  root: HTMLElement,
  cfg: PageNumbersConfig | null | undefined,
  slideIndex: number,
  total: number
) => {
  const host = findVisualHost(root);
  if (!host) return;
  let layer = host.querySelector(
    `:scope > [${PAGE_NUMBER_ATTR}]`
  ) as HTMLElement | null;

  const startAt = cfg?.start_at ?? 1;
  const skipFirst = !!cfg?.skip_first;
  const n = slideIndex + startAt - (skipFirst ? 1 : 0);
  const shown = !!cfg?.enabled && !(skipFirst && slideIndex === 0) && n >= 1;
  if (!shown) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.setAttribute(PAGE_NUMBER_ATTR, "");
    host.appendChild(layer);
  }
  if (window.getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }

  const totalShown = total - (skipFirst ? 1 : 0) + (startAt - 1);
  const text = (cfg?.format || "{n}")
    .split("{n}").join(String(n))
    .split("{total}").join(String(totalShown));
  if (layer.textContent !== text) layer.textContent = text;

  const position = cfg?.position || "bottom-right";
  const style = cfg?.style || "minimal";
  const fontSize = PAGE_NUM_FONT_SIZE[cfg?.size || "m"] || "15px";
  const custom = (cfg?.color || "").trim();

  const css: Record<string, string> = {
    position: "absolute",
    pointerEvents: "none",
    zIndex: "60",
    fontSize,
    lineHeight: "1",
    fontFamily: "inherit",
    fontWeight: "600",
    letterSpacing: "0.02em",
    opacity: String((cfg?.opacity ?? 100) / 100),
    top: "", bottom: "", left: "", right: "", transform: "",
    background: "", color: "", padding: "", borderRadius: "",
    width: "", height: "", display: "", alignItems: "", justifyContent: "",
  };
  const inset = "18px";
  if (position.startsWith("top")) css.top = inset;
  else css.bottom = inset;
  if (position.endsWith("left")) css.left = inset;
  else if (position.endsWith("right")) css.right = inset;
  else { css.left = "50%"; css.transform = "translateX(-50%)"; }

  if (style === "minimal") {
    css.color = custom || "rgba(120,120,120,0.95)";
  } else {
    css.background = custom || "rgba(0,0,0,0.45)";
    css.color = "#ffffff";
    if (style === "pill") {
      css.padding = "0.4em 0.85em";
      css.borderRadius = "999px";
    } else {
      css.width = "2.3em";
      css.height = "2.3em";
      css.borderRadius = "50%";
      css.display = "flex";
      css.alignItems = "center";
      css.justifyContent = "center";
    }
  }
  Object.assign(layer.style, css);
};

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
  // Colores del gráfico elegidos por el usuario, por índice de serie/categoría.
  // Se aplican como variables --graph-N en el root de la slide: funcionan con
  // TODAS las familias de templates (todas colorean con var(--graph-N, ...)).
  graphColors?: (string | null)[];
  // Índice de la slide (para el número de slide; config a nivel deck en redux).
  slideIndex?: number;
  children: React.ReactNode;
}

const applyGraphColors = (root: HTMLElement, graphColors?: (string | null)[]) => {
  const host = findVisualHost(root);
  if (!host) return;
  for (let i = 0; i < 10; i++) {
    const c = graphColors?.[i];
    if (c) host.style.setProperty(`--graph-${i}`, c);
    else host.style.removeProperty(`--graph-${i}`);
  }
};

// Inyecta (o actualiza/remueve) el layer de imagen de fondo como PRIMER hijo
// del root del template: queda por encima del background-color del root pero
// detrás de todo el contenido (stacking por orden de DOM). pointer-events:none
// para no interferir con la edición. Los helpers de elementPath lo excluyen
// del indexado (SLIDE_BG_ATTR).
const applyBackgroundLayer = (
  root: HTMLElement,
  background?: SlideBackground | null
) => {
  const host = findVisualHost(root);
  if (!host) return;
  let layer = host.querySelector(`:scope > [${SLIDE_BG_ATTR}]`) as HTMLElement | null;
  if (!background || !background.url) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.setAttribute(SLIDE_BG_ATTR, "");
    // <img> real (no CSS background-image): los motores de export a PPTX solo
    // capturan elementos <img> — un background-image se pierde en el .pptx.
    layer.appendChild(document.createElement("img"));
    host.prepend(layer);
  }
  if (window.getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    // Bajo el contenido y bajo los elementos con orden "Atrás" (z=-1), pero
    // por encima del background-color del root (los z negativos pintan sobre
    // el fondo del contexto).
    zIndex: "-2",
  });
  const img = layer.querySelector("img") as HTMLImageElement | null;
  if (img) {
    if (img.getAttribute("src") !== background.url) {
      img.setAttribute("src", background.url);
    }
    img.setAttribute("alt", "");
    Object.assign(img.style, {
      width: "100%",
      height: "100%",
      objectFit: background.fit || "cover",
      objectPosition: "center",
      opacity: String((background.opacity ?? 100) / 100),
      pointerEvents: "none",
    });
  }
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
const StyleOverrideApplier: React.FC<Props> = ({ overrides, background, overlays, graphColors, slideIndex, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // Números de slide: config del deck + total (redux está poblado en el
  // editor, /pdf-maker y la vista pública).
  const pageNumbers = useSelector(
    (s: RootState) =>
      (s.presentationGeneration.presentationData as any)?.page_numbers as
        | PageNumbersConfig
        | null
        | undefined
  );
  const totalSlides = useSelector(
    (s: RootState) =>
      ((s.presentationGeneration.presentationData as any)?.slides?.length ?? 0) as number
  );
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
        // z-index necesita elemento posicionado: solo agregar relative si es
        // static (NO pisar absolute/fixed — rompía los iconos superpuestos).
        if (css.zIndex && window.getComputedStyle(el).position === "static") {
          el.style.position = "relative";
        }
        Object.entries(css).forEach(([k, v]) => {
          (el.style as any)[k] = v;
        });
      });
      applyBackgroundLayer(root, background);
      applyGraphColors(root, graphColors);
      if (typeof slideIndex === "number") {
        applyPageNumberLayer(root, pageNumbers, slideIndex, totalSlides);
      }
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
  }, [overrides, background, graphColors, pageNumbers, slideIndex, totalSlides]);

  return (
    <div ref={rootRef} data-style-root="" style={{ display: "contents" }}>
      {children}
      {Array.isArray(overlays) && overlays.length > 0 && (
        // Iconos superpuestos: layer React (mismo DOM en editor y export). Va
        // AL FINAL para no correr los paths existentes; los iconos sí son
        // indexables (se mueven/redimensionan con el sistema de elementos).
        // SIN z-index propio: si lo tuviera crearía un stacking context y el
        // orden (Al frente/Atrás) de cada icono no competiría con el contenido.
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
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
