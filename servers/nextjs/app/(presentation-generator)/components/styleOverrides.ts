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
  objectFit?: "cover" | "contain" | "fill";
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

  const sx = o.scaleX ?? 1;
  const sy = o.scaleY ?? 1;
  const tx = o.translateX ?? 0;
  const ty = o.translateY ?? 0;
  if (sx !== 1 || sy !== 1 || tx !== 0 || ty !== 0) {
    css.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    css.transformOrigin = "top left";
  }
  return css;
}

export function isMeaningfulOverride(o?: ElementOverride | null): boolean {
  if (!o) return false;
  return Object.values(o).some((v) => v !== undefined && v !== null);
}
