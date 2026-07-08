import React from "react";
import { resolveBackendAssetUrl } from "@/utils/api";

export type RemoteSvgOptions = {
  strokeColor?: string;
  fillColor?: string;
  className?: string;
  title?: string;
  color?: string;
 
};

function isEmptyPaint(value: string | null): boolean {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "none" || normalized === "transparent";
}

/**
 * Per-icon color overrides are encoded on the icon URL as a fragment:
 *   `#c=<hex>`            → recolor the icon glyph
 *   `#b=<hex>`            → recolor the container shape (div background or the
 *                           sibling SVG shape, e.g. a hexagon)
 *   `#c=<hex>&b=<hex>`    → both (hex without the leading `#`)
 *
 * This keeps every template working with zero changes: they all forward
 * `__icon_url__` to <RemoteSvgIcon />, so parsing here recolors the icon (and
 * its shape) everywhere it is rendered — editor preview and export alike. The
 * fragment is never sent to the server on fetch, so the SVG asset still loads.
 */
export function extractIconColor(url?: string | null): {
  cleanUrl: string;
  iconColor?: string;
  bgColor?: string;
} {
  if (!url) return { cleanUrl: "" };

  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return { cleanUrl: url };

  const fragment = url.slice(hashIndex + 1);
  const iconMatch = fragment.match(/(?:^|&)c=([0-9a-fA-F]{3,8})(?:&|$)/);
  const bgMatch = fragment.match(/(?:^|&)b=([0-9a-fA-F]{3,8})(?:&|$)/);

  // Leave unrelated fragments untouched.
  if (!iconMatch && !bgMatch) return { cleanUrl: url };

  return {
    cleanUrl: url.slice(0, hashIndex),
    iconColor: iconMatch ? `#${iconMatch[1]}` : undefined,
    bgColor: bgMatch ? `#${bgMatch[1]}` : undefined,
  };
}

const TRANSPARENT_PAINTS = new Set(["rgba(0, 0, 0, 0)", "transparent", ""]);
const MAX_SHAPE_ANCESTOR_DEPTH = 3;
const MAX_SHAPE_SIZE_PX = 300;

type ShapeTarget = { property: "backgroundColor" | "fill"; elements: Element[] };

/**
 * Locate the "shape" behind an icon so it can be recolored. Two patterns cover
 * the templates: a parent element with its own background, or a sibling <svg>
 * whose paths form the shape (hexagons, badges). Deliberately conservative — it
 * returns null when nothing clearly icon-shaped is found so we never recolor an
 * unrelated element.
 */
function findShapeTarget(host: HTMLElement): ShapeTarget | null {
  // Pattern A: nearest small ancestor that paints its own background.
  let node: HTMLElement | null = host.parentElement;
  for (let depth = 0; node && depth < MAX_SHAPE_ANCESTOR_DEPTH; depth++) {
    const background = window.getComputedStyle(node).backgroundColor;
    const rect = node.getBoundingClientRect();
    if (
      !TRANSPARENT_PAINTS.has(background) &&
      rect.width <= MAX_SHAPE_SIZE_PX &&
      rect.height <= MAX_SHAPE_SIZE_PX
    ) {
      return { property: "backgroundColor", elements: [node] };
    }
    node = node.parentElement;
  }

  // Pattern B: nearest ancestor holding a sibling <svg> shape (not the icon).
  node = host.parentElement;
  for (let depth = 0; node && depth < MAX_SHAPE_ANCESTOR_DEPTH; depth++) {
    const svgs = Array.from(node.querySelectorAll("svg")).filter(
      (svg) => !host.contains(svg)
    );
    const fillShapes: Element[] = [];
    svgs.forEach((svg) => {
      svg
        .querySelectorAll("path, polygon, rect, circle, ellipse")
        .forEach((shape) => {
          if (!isEmptyPaint(shape.getAttribute("fill"))) {
            fillShapes.push(shape);
          }
        });
    });
    if (fillShapes.length > 0) {
      return { property: "fill", elements: fillShapes };
    }
    node = node.parentElement;
  }

  return null;
}

function transformSvg(svgText: string, options: RemoteSvgOptions): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return svgText;
    svgEl.style.outline = "none";
    svgEl.style.border = "none";
    svgEl.style.margin = "0";
    svgEl.style.padding = "0";
    svgEl.style.display = "inline-block";
    svgEl.style.verticalAlign = "middle";
    svgEl.style.overflow = "visible";
    svgEl.style.position = "relative";
    // Set only provided attributes to avoid clobbering inner shapes
    if (options.className) svgEl.setAttribute("class", options.className);

    // Phosphor weights are mixed: line weights use explicit stroke attributes,
    // fill icons rely on inherited fill, and duotone icons combine inherited
    // fill/opacity shapes with strokes. Avoid setting stroke on the root or
    // filled icons get an unwanted outline.
    const fillColor = options.fillColor ?? options.strokeColor ?? "currentColor";
    svgEl.setAttribute("fill", fillColor);

    // Recolor explicit fill values too. This covers duotone assets that include
    // hard-coded fills while preserving fill="none" placeholders/line paths.
    svgEl.querySelectorAll<SVGElement>("[fill]").forEach((el) => {
      if (!isEmptyPaint(el.getAttribute("fill"))) {
        el.setAttribute("fill", fillColor);
      }
    });

    if (options.strokeColor) {
      svgEl.querySelectorAll<SVGElement>("[stroke]").forEach((el) => {
        if (!isEmptyPaint(el.getAttribute("stroke"))) {
          el.setAttribute("stroke", options.strokeColor as string);
        }
      });

      const rootStroke = svgEl.getAttribute("stroke");
      if (rootStroke && !isEmptyPaint(rootStroke)) {
        svgEl.setAttribute("stroke", options.strokeColor);
      }
    }

  
      const viewBox = svgEl.getAttribute("viewBox");
      let vbX = 0, vbY = 0, vbW = 0, vbH = 0;
      if (viewBox) {
        const parts = viewBox.split(/\s+/).map((n) => Number(n));
        if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
          vbX = parts[0];
          vbY = parts[1];
          vbW = parts[2];
          vbH = parts[3];
        }
      }
      // Only consider direct child rects; safer heuristic
      const rects = Array.from(svgEl.querySelectorAll("rect")).filter((r) => r.parentNode === svgEl);
      rects.forEach((r) => {
        const xAttr = r.getAttribute("x") || "0";
        const yAttr = r.getAttribute("y") || "0";
        const wAttr = r.getAttribute("width") || "";
        const hAttr = r.getAttribute("height") || "";
        const fill = r.getAttribute("fill");

        const x = Number(xAttr);
        const y = Number(yAttr);
        const w = Number(wAttr);
        const h = Number(hAttr);

        const isExactHundredPercent = wAttr === "100%" && hAttr === "100%" && (xAttr === "0" || xAttr === "0%") && (yAttr === "0" || yAttr === "0%");
        const approximatelyCoversViewBox = (
          vbW > 0 && vbH > 0 &&
          !Number.isNaN(w) && !Number.isNaN(h) &&
          Math.abs(w - vbW) <= Math.max(1, vbW * 0.02) &&
          Math.abs(h - vbH) <= Math.max(1, vbH * 0.02) &&
          Math.abs(x - vbX) <= Math.max(1, vbW * 0.02) &&
          Math.abs(y - vbY) <= Math.max(1, vbH * 0.02)
        );
        const noFill = (fill === null || fill === "none" || fill === "transparent");

        const looksLikeFrame = noFill && (isExactHundredPercent || approximatelyCoversViewBox);
        if (looksLikeFrame) {
          r.parentElement?.removeChild(r);
        }
      });
    

    return svgEl.outerHTML;
  } catch {
    return svgText;
  }
}

// Simple in-memory LRU cache for transformed SVG markup
const SVG_CACHE_LIMIT = 15;
const svgCache: Map<string, string> = new Map();

function makeCacheKey(url: string, options: RemoteSvgOptions): string {
  return [
    url,
    `sc=${options.strokeColor || ""}`,
    `fc=${options.fillColor || ""}`,
    `cls=${options.className || ""}`,
    
  ].join("|");
}

function cacheGet(key: string): string | undefined {
  const value = svgCache.get(key);
  if (value !== undefined) {
    // refresh LRU order
    svgCache.delete(key);
    svgCache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: string) {
  if (svgCache.has(key)) svgCache.delete(key);
  svgCache.set(key, value);
  if (svgCache.size > SVG_CACHE_LIMIT) {
    const oldestKey = svgCache.keys().next().value as string | undefined;
    if (oldestKey !== undefined) svgCache.delete(oldestKey);
  }
}

export function useRemoteSvgIcon(url?: string, options: RemoteSvgOptions = {}) {
  const [svgMarkup, setSvgMarkup] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const resolvedUrl = React.useMemo(
    () => resolveBackendAssetUrl(url),
    [url]
  );

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!resolvedUrl) {
        // build simple fallback svg
        const stroke = options.strokeColor || "currentColor";
        const fill = options.fillColor ?? "none";
        const cls = options.className ? ` class=\"${options.className}\"` : "";
        setSvgMarkup(`<svg${cls} xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' stroke='${stroke}' fill='${fill}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10' fill='currentColor' opacity='0.12'></circle><path d='M8 12l3 3 5-6' fill='none'></path></svg>`);
        return;
      }
      // non-svg extensions fallback
      if (/\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(resolvedUrl)) {
        const stroke = options.strokeColor || "currentColor";
        const fill = options.fillColor ?? "none";
        const cls = options.className ? ` class=\"${options.className}\"` : "";
        setSvgMarkup(`<svg${cls} xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' stroke='${stroke}' fill='${fill}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10' fill='currentColor' opacity='0.12'></circle><path d='M8 12l3 3 5-6' fill='none'></path></svg>`);
        return;
      }

      // Cache lookup
      const cacheKey = makeCacheKey(resolvedUrl, options);
      const cached = cacheGet(cacheKey);
      if (cached) {
        setSvgMarkup(cached);
        setError(null);
        return;
      }
      try {
       
        const res = await fetch(resolvedUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct && !ct.includes("svg")) {
          throw new Error(`Non-SVG content: ${ct}`);
        }
        const text = await res.text();
        if (cancelled) return;
        const transformed = transformSvg(text, options);
        cacheSet(cacheKey, transformed);
        setSvgMarkup(transformed);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load SVG");
        const stroke = options.strokeColor || "currentColor";
        const fill = options.fillColor ?? "none";
        const cls = options.className ? ` class=\"${options.className}\"` : "";
        setSvgMarkup(`<svg${cls} xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' stroke='${stroke}' fill='${fill}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10' fill='currentColor' opacity='0.12'></circle><path d='M8 12l3 3 5-6' fill='none'></path></svg>`);
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("RemoteSvgIcon fetch error", e);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, options.strokeColor, options.fillColor, options.className]);

  return { svgMarkup, error };
}

export const RemoteSvgIcon: React.FC<{
  url?: string;
  strokeColor?: string;
  fillColor?: string;
  className?: string;
  title?: string;
  color?: string;
}> = ({ url, strokeColor, fillColor, className, title, color }) => {
  const { cleanUrl, iconColor, bgColor } = extractIconColor(url);
  // The color override (if any) wins over the template-provided colors so a
  // user recolor takes effect for both line and fill icon weights.
  const effectiveStrokeColor = iconColor ?? strokeColor;
  const effectiveFillColor = iconColor ?? fillColor;
  const effectiveColor = iconColor ?? color;

  // data-path keeps the color fragment so EditableLayoutWrapper can still match
  // this element against the stored __icon_url__; the SVG itself is fetched from
  // the clean URL.
  const dataPath = resolveBackendAssetUrl(url);
  const fetchUrl = resolveBackendAssetUrl(cleanUrl);
  const { svgMarkup } = useRemoteSvgIcon(fetchUrl, {
    strokeColor: effectiveStrokeColor,
    fillColor: effectiveFillColor,
    className,
    title,
    color: effectiveColor,
  });

  const hostRef = React.useRef<HTMLSpanElement>(null);
  // Snapshot of each recolored element's original inline `style` attribute so
  // the override can be reverted exactly when the color changes or is cleared.
  // Snapshotting the whole attribute (rather than a single property) survives
  // shorthand/longhand quirks — e.g. templates using `background: var(--…)`.
  const appliedRef = React.useRef<{ element: Element; style: string | null }[]>(
    []
  );

  React.useEffect(() => {
    const host = hostRef.current;
    // Revert any previously applied shape color first.
    appliedRef.current.forEach(({ element, style }) => {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    });
    appliedRef.current = [];

    if (!host || !bgColor || !svgMarkup) return;

    const target = findShapeTarget(host);
    if (!target) return;

    appliedRef.current = target.elements.map((element) => ({
      element,
      style: element.getAttribute("style"),
    }));
    target.elements.forEach((element) => {
      (element as unknown as { style: CSSStyleDeclaration }).style[
        target.property
      ] = bgColor;
    });
  }, [bgColor, svgMarkup]);

  if (!svgMarkup) return null;
  return (
    <span
      ref={hostRef}
      data-path={dataPath}
      role={title ? "img" : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
      style={{ display: "inline-block", color: effectiveColor }}
    />
  );
};
