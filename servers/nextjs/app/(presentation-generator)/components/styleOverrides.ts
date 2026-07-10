"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Overrides de estilo por elemento (tamaño y color) para slides de template.
//
// Se guardan en `slide.content.__style_overrides__` (JSON libre) como un mapa
// elementPath → ElementOverride, y se aplican como CSS inline sobre el DOM
// renderizado tanto en el editor como en /pdf-maker (export). El resize se hace
// con `transform` (scale/translate) para NO reflowear el layout del template.
// ─────────────────────────────────────────────────────────────────────────────

export interface ElementOverride {
  kind?: "box" | "image";
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number; // px
  borderStyle?: string; // "solid" | "dashed" | ...
  boxShadow?: string;
  scaleX?: number;
  scaleY?: number;
  translateX?: number; // px en espacio base 1280x720
  translateY?: number;
  rotate?: number; // grados
  opacity?: number; // 0-100
  zIndex?: number; // orden de apilado (adelante/atrás)
  objectFit?: "cover" | "contain" | "fill";
  // Alineación del contenido (pensada para bloques de texto).
  textAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  // Tamaño real en px del espacio base (reflujo, NO escala): para bloques de
  // texto, cambia el contenedor sin agrandar la tipografía.
  width?: number;
  height?: number;
}

export type StyleOverrides = Record<string, ElementOverride>;

// Fondo por slide (imagen subida / generada con IA / desde URL). Se guarda en
// `slide.content.__background__` y se aplica como un layer inyectado detrás
// del contenido del template (en editor y export).
export interface SlideBackground {
  url: string;
  fit?: "cover" | "contain";
  opacity?: number; // 0-100
}

export const STYLE_OVERRIDES_KEY = "__style_overrides__";
export const BACKGROUND_KEY = "__background__";
export const STYLE_ROOT_ATTR = "data-style-root";
export const STYLE_APPLIED_ATTR = "data-style-overrides-applied";
// Marca del layer de fondo inyectado: se EXCLUYE del indexado de elementPath
// para no correr los índices de los overrides existentes.
export const SLIDE_BG_ATTR = "data-slide-bg";

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

export const clampScale = (v: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.isFinite(v) ? v : 1));

/**
 * Camino estructural desde `root` hasta `el`: índices de hijos-elemento unidos
 * por "/". Estable entre editor y export para cajas/imágenes (Tiptap solo toca
 * hojas de texto, no reestructura estos elementos). Devuelve null si `el` no
 * cuelga de `root`.
 */
export const GRAPH_COLORS_KEY = "__graph_colors__";

// Tags no visuales que algunos templates renderizan inline (p.ej. <link> de
// fuentes) — no sirven como host de layers ni de variables por slide.
const NON_VISUAL_TAGS = new Set(["LINK", "STYLE", "SCRIPT", "META", "TITLE"]);

/** Primer hijo visual del anchor [data-style-root]: el root del template. */
export const findVisualHost = (root: Element): HTMLElement | null =>
  (Array.prototype.find.call(
    root.children,
    (c: Element) =>
      !NON_VISUAL_TAGS.has(c.tagName) && !c.hasAttribute(SLIDE_BG_ATTR)
  ) ?? null) as HTMLElement | null;

// Hijos-elemento indexables: excluye el layer de fondo inyectado para que los
// paths guardados no dependan de si la slide tiene fondo o no.
const indexableChildren = (parent: Element): Element[] =>
  Array.prototype.filter.call(
    parent.children,
    (c: Element) => !c.hasAttribute(SLIDE_BG_ATTR)
  ) as Element[];

export function getElementPath(el: Element, root: Element): string | null {
  if (el === root) return "";
  const parts: number[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    const idx = indexableChildren(parent).indexOf(node);
    if (idx < 0) return null;
    parts.unshift(idx);
    node = parent;
  }
  return node === root ? parts.join("/") : null;
}

export function resolveElementPath(
  root: Element,
  path: string
): HTMLElement | null {
  if (path === "") return root as HTMLElement;
  let node: Element | null = root;
  for (const seg of path.split("/")) {
    const idx = Number(seg);
    if (!node || Number.isNaN(idx)) return null;
    node = indexableChildren(node)[idx] ?? null;
  }
  return (node as HTMLElement) ?? null;
}

/** Convierte un override a estilos CSS inline (camelCase). */
export function overrideToInlineStyle(
  o: ElementOverride
): Record<string, string> {
  const css: Record<string, string> = {};
  if (o.backgroundColor) css.backgroundColor = o.backgroundColor;
  if (o.textColor) css.color = o.textColor;
  if (o.borderRadius != null) css.borderRadius = `${o.borderRadius}px`;
  if (o.borderWidth != null && o.borderWidth > 0) {
    css.borderWidth = `${o.borderWidth}px`;
    css.borderStyle = o.borderStyle || "solid";
    if (o.borderColor) css.borderColor = o.borderColor;
  }
  if (o.boxShadow) css.boxShadow = o.boxShadow;
  if (o.objectFit) css.objectFit = o.objectFit;
  if (o.opacity != null && o.opacity < 100) css.opacity = String(o.opacity / 100);
  if (o.zIndex != null) {
    // OJO: no forzar position acá — pisar el position de elementos ya
    // posicionados (p.ej. iconos superpuestos, absolute) los rompía. El
    // applier agrega position:relative SOLO si el elemento es static.
    css.zIndex = String(o.zIndex);
  }
  if (o.textAlign) css.textAlign = o.textAlign;
  if (o.vAlign) {
    css.display = "flex";
    css.flexDirection = "column";
    css.justifyContent =
      o.vAlign === "top" ? "flex-start" : o.vAlign === "middle" ? "center" : "flex-end";
  }
  if (o.width != null) css.width = `${o.width}px`;
  if (o.height != null) css.height = `${o.height}px`;

  const sx = o.scaleX ?? 1;
  const sy = o.scaleY ?? 1;
  const tx = o.translateX ?? 0;
  const ty = o.translateY ?? 0;
  const rot = o.rotate ?? 0;
  if (sx !== 1 || sy !== 1 || tx !== 0 || ty !== 0 || rot !== 0) {
    // Rotación alrededor del centro SIN cambiar el origin (que anclaría
    // distinto la escala): translate(50%) rotate translate(-50%) — los
    // porcentajes refieren al tamaño del propio elemento.
    const rotPart = rot !== 0 ? ` translate(50%, 50%) rotate(${rot}deg) translate(-50%, -50%)` : "";
    css.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})${rotPart}`;
    css.transformOrigin = "top left";
  }
  return css;
}

export function isMeaningfulOverride(o?: ElementOverride | null): boolean {
  if (!o) return false;
  return Object.values(o).some((v) => v !== undefined && v !== null);
}
