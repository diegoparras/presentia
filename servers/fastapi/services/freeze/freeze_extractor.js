// Freeze extractor (browser-injected).
//
// Flattens a rendered slide's live DOM into a self-contained, absolutely
// positioned HTML fragment plus a structured scene IR. Absolute positioning is
// the key normalization: it removes every nested-flex/grid layout dependency
// that WeasyPrint mis-renders, so the frozen HTML rasterizes identically to the
// browser without a headless Chromium in the export path. Charts stay as SVG
// (var(--graph-N) resolved to concrete colors at freeze time) and text keeps its
// computed typography, so the PDF is vectorial and the PPTX IR stays editable.
//
// Injected into the /pdf-maker page (which already renders every slide at
// 1280x720 with SVG charts and no <canvas>). `window.__freezeSlides()` returns
// one { html, scene } per `.main-slide` in document order.
(function () {
  const SLIDE_W = 1280;
  const SLIDE_H = 720;

  function px(v) {
    return Math.round(v * 100) / 100;
  }

  function isRendered(el, cs) {
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  // Resolve a var()-bearing paint value to the concrete computed color. The live
  // element already has the theme applied, so getComputedStyle returns hex/rgb.
  function computedPaint(value) {
    return value && value !== "none" ? value : null;
  }

  function hasVisibleBackground(cs) {
    const bg = cs.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return true;
    if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
    return false;
  }

  function borderCss(cs) {
    const parts = [];
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const w = parseFloat(cs["border" + side + "Width"]);
      const style = cs["border" + side + "Style"];
      if (w > 0 && style !== "none") {
        parts.push(
          `border-${side.toLowerCase()}:${px(w)}px ${style} ${cs["border" + side + "Color"]}`
        );
      }
    }
    return parts;
  }

  function radiusCss(cs) {
    const r = [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomRightRadius,
      cs.borderBottomLeftRadius,
    ];
    if (r.every((v) => v === "0px")) return null;
    return `border-radius:${r.join(" ")}`;
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isBlockLevel(disp) {
    return /(^|\s)(block|flex|grid|table|list-item)/.test(disp) && disp !== "inline-block";
  }

  // A text block is the highest ancestor whose whole subtree is one inline text
  // flow (no block-level descendant with its own text, no svg/img child). We
  // emit it as a single positioned box so inline formatting (bold spans, etc.)
  // keeps flowing instead of being split into overlapping absolute fragments.
  function isTextBlock(el) {
    if (!el.textContent || !el.textContent.replace(/\s+/g, "")) return false;
    for (const d of el.querySelectorAll("*")) {
      const tag = d.tagName.toLowerCase();
      if (tag === "svg" || tag === "img") return false;
      const cs = getComputedStyle(d);
      if (isBlockLevel(cs.display)) {
        // A nested block breaks the single-flow assumption only if it holds text.
        for (const n of d.childNodes) {
          if (n.nodeType === 3 && n.textContent.replace(/\s+/g, "")) return false;
        }
      }
    }
    return true;
  }

  // Preserve inline formatting (bold/italic/color spans) by re-emitting inline
  // children as computed-style spans; block/inline tags all collapse to spans.
  function serializeInline(el) {
    let out = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        out += escapeHtml(node.textContent);
      } else if (node.nodeType === 1) {
        if (node.tagName === "BR") {
          out += "<br/>";
          continue;
        }
        const cs = getComputedStyle(node);
        if (cs.display === "none") continue;
        const style = `color:${cs.color};font-weight:${cs.fontWeight};font-style:${cs.fontStyle}`;
        out += `<span style="${style}">${serializeInline(node)}</span>`;
      }
    }
    return out;
  }

  // Clone an SVG chart, resolving var()/currentColor fills+strokes to the
  // concrete computed colors so WeasyPrint (which can't see the theme wrapper's
  // custom properties once the tree is flattened) paints them correctly.
  function freezeSvg(svg) {
    const clone = svg.cloneNode(true);
    const liveEls = svg.querySelectorAll("*");
    const cloneEls = clone.querySelectorAll("*");
    for (let i = 0; i < liveEls.length; i++) {
      const cs = getComputedStyle(liveEls[i]);
      const c = cloneEls[i];
      if (!c) continue;
      const fill = cs.fill;
      const stroke = cs.stroke;
      if (fill && fill !== "none") c.setAttribute("fill", fill);
      if (stroke && stroke !== "none") c.setAttribute("stroke", stroke);
      if (cs.fillOpacity && cs.fillOpacity !== "1") c.setAttribute("fill-opacity", cs.fillOpacity);
      if (cs.strokeWidth) c.setAttribute("stroke-width", cs.strokeWidth);
    }
    return clone.outerHTML;
  }

  function freezeSlide(root) {
    const base = root.getBoundingClientRect();
    const OX = base.left;
    const OY = base.top;
    const boxes = [];
    const scene = { width: SLIDE_W, height: SLIDE_H, blocks: [] };

    const consumedText = new Set();
    const all = root.querySelectorAll("*");
    all.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      // SVGs are handled as a whole; skip their internals.
      if (el.closest("svg") && tag !== "svg") return;

      const cs = getComputedStyle(el);
      if (!isRendered(el, cs)) return;
      const r = el.getBoundingClientRect();
      const x = px(r.left - OX);
      const y = px(r.top - OY);
      const w = px(r.width);
      const h = px(r.height);
      if (w < 1 || h < 1) return;
      if (x > SLIDE_W || y > SLIDE_H || x + w < 0 || y + h < 0) return;

      const posBase = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;

      // Charts / vector art -> keep as SVG at its box for the PDF, and tag it so
      // the driver can capture a crisp PNG (for the PPTX, which has no SVG type).
      if (tag === "svg") {
        const fid = "fz" + scene.blocks.length + "_" + Math.round(x) + "_" + Math.round(y);
        el.setAttribute("data-freeze-id", fid);
        boxes.push(
          `<div style="${posBase};overflow:hidden">${freezeSvg(el)}</div>`
        );
        scene.blocks.push({ type: "svg", x, y, w, h, freezeId: fid });
        return;
      }

      // Images.
      if (tag === "img") {
        const src = el.currentSrc || el.src;
        boxes.push(
          `<img src="${src}" style="${posBase};object-fit:${cs.objectFit || "cover"}" />`
        );
        scene.blocks.push({ type: "image", x, y, w, h, src });
        return;
      }

      // Background / border / shadow boxes.
      const decl = [];
      if (hasVisibleBackground(cs)) {
        if (cs.backgroundImage && cs.backgroundImage !== "none") {
          decl.push(`background:${cs.backgroundImage}`);
        }
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
          decl.push(`background-color:${cs.backgroundColor}`);
        }
      }
      const borders = borderCss(cs);
      const radius = radiusCss(cs);
      const shadow = cs.boxShadow && cs.boxShadow !== "none" ? `box-shadow:${cs.boxShadow}` : null;
      if (decl.length || borders.length || radius || shadow) {
        const style = [posBase, ...decl, ...borders, radius, shadow]
          .filter(Boolean)
          .join(";");
        boxes.push(`<div style="${style}"></div>`);
        scene.blocks.push({
          type: "rect",
          x, y, w, h,
          fill: cs.backgroundColor,
          radius: parseFloat(cs.borderTopLeftRadius) || 0,
          gradient: cs.backgroundImage && cs.backgroundImage.includes("gradient"),
          shadow: !!shadow,
        });
      }

      // Text: emit once, at the highest inline-only ancestor, preserving inline
      // formatting. Descendants of an emitted block are skipped for text.
      if (!consumedText.has(el) && isTextBlock(el)) {
        for (const d of el.querySelectorAll("*")) consumedText.add(d);
        const inline = serializeInline(el);
        const style = [
          posBase,
          `color:${cs.color}`,
          `font-family:${cs.fontFamily}`,
          `font-size:${cs.fontSize}`,
          `font-weight:${cs.fontWeight}`,
          `font-style:${cs.fontStyle}`,
          `line-height:${cs.lineHeight}`,
          `letter-spacing:${cs.letterSpacing}`,
          `text-align:${cs.textAlign}`,
          `white-space:${cs.whiteSpace === "nowrap" ? "nowrap" : "normal"}`,
          `overflow:hidden`,
        ].join(";");
        boxes.push(`<div style="${style}">${inline}</div>`);
        scene.blocks.push({
          type: "text",
          x, y, w, h,
          text: el.textContent.replace(/\s+/g, " ").trim(),
          html: inline,
          fontSize: parseFloat(cs.fontSize),
          bold: parseInt(cs.fontWeight, 10) >= 600,
          color: cs.color,
          align: cs.textAlign,
          fontFamily: cs.fontFamily,
        });
      }
    });

    const rootCs = getComputedStyle(root);
    const bg = rootCs.backgroundColor && rootCs.backgroundColor !== "rgba(0, 0, 0, 0)"
      ? rootCs.backgroundColor
      : "#ffffff";
    const html =
      `<div class="frozen-slide" style="position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;` +
      `overflow:hidden;background:${bg}">${boxes.join("")}</div>`;
    return { html, scene };
  }

  window.__freezeSlides = function () {
    const slides = Array.from(document.querySelectorAll(".main-slide"));
    return slides.map((s) => freezeSlide(s));
  };
})();
