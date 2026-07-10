"use client";

import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import ReactDOM from "react-dom/client";
import TiptapText from "./TiptapText";
import { marked } from "marked";

// Marca los nodos cuyo texto crudo ya fue convertido a HTML inline en el
// pre-render; guarda el texto ORIGINAL para que las pasadas posteriores
// (Tiptap / read-only) puedan seguir encontrando su ruta en slideData.
const MD_PREVIEW_ATTR = "data-md-preview";

/**
 * Parse inline markdown synchronously when possible. `marked.parseInline`
 * returns a string unless async extensions are configured; we handle both so
 * the read-only fast path never needs to spin up a React root per node.
 */
const parseInlineMarkdown = (text: string): string => {
  try {
    const out = marked.parseInline(text) as unknown;
    return typeof out === "string" ? out : text;
  } catch {
    return text;
  }
};

interface TiptapTextReplacerProps {
  children: ReactNode;
  slideData?: any;
  slideIndex?: number;
  readOnly?: boolean;
  onContentChange?: (
    content: string,
    path: string,
    slideIndex?: number
  ) => void;
}

const TiptapTextReplacer: React.FC<TiptapTextReplacerProps> = ({
  children,
  slideData,
  slideIndex,
  readOnly = false,
  onContentChange = () => {},
}) => {

  

  const containerRef = useRef<HTMLDivElement>(null);
  const [processedElements, setProcessedElements] = useState(
    new Set<HTMLElement>()
  );
  // Track created React roots to update content when slideData changes (edit mode only)
  const rootsRef = useRef<
    Map<HTMLElement, { root: any; dataPath: string;  fallbackText: string }>
  >(new Map());
  // Read-only fast path: element -> dataPath, so we can re-render markdown in
  // place without spinning up a React root per text node.
  const readOnlyNodesRef = useRef<Map<HTMLElement, string>>(new Map());

  // Pre-render SINCRÓNICO (antes del primer paint) del markdown/HTML inline.
  // El contenido guardado puede traer marcas (`**bold**` o `<span style=...>`
  // de fuente/tamaño/color); el template lo pinta como texto plano y las
  // pasadas de abajo corren con delay (250ms lectura / 1s edición), así que
  // sin este paso el usuario ve el markup crudo durante el primer segundo
  // tras refrescar.
  const preRenderInlineMarkdown = (container: HTMLElement) => {
    const allElements = container.querySelectorAll("*");
    allElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      if (htmlElement.hasAttribute(MD_PREVIEW_ATTR)) return;
      // Hijos inyectados por un pre-render anterior.
      if (htmlElement.closest(`[${MD_PREVIEW_ATTR}]`)) return;
      if (
        htmlElement.classList.contains("tiptap-text-editor") ||
        htmlElement.closest(".tiptap-text-editor")
      )
        return;
      if (isInIgnoredElementTree(htmlElement)) return;

      // SOLO hojas puras (sin hijos elemento): ahí es donde el markup crudo
      // flashea. Un padre con texto directo + hijos NO se toca — el observer
      // corre en la ventana en que un hijo ya fue swapeado por el contenedor
      // Tiptap (aún vacío) y verlo como hoja pisaría el editor con innerHTML.
      if (htmlElement.childElementCount > 0) return;

      const trimmedText = getDirectTextContent(htmlElement).trim();
      if (!trimmedText || trimmedText.length <= 2) return;
      if (shouldSkipElement(htmlElement)) return;

      const dataPath = findDataPath(slideData, trimmedText);
      const content = dataPath.path
        ? getValueByPath(slideData, dataPath.path) ?? trimmedText
        : trimmedText;
      const parsed = parseInlineMarkdown(content);
      // Texto plano sin marcas: no hay nada que convertir.
      if (parsed === htmlElement.innerHTML) return;

      htmlElement.setAttribute(MD_PREVIEW_ATTR, trimmedText);
      htmlElement.innerHTML = parsed;
    });
  };

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    preRenderInlineMarkdown(container);
    // Los templates pueden montar contenido async (imports dinámicos, charts);
    // el observer re-convierte lo nuevo antes del siguiente frame.
    const observer = new MutationObserver(() =>
      preRenderInlineMarkdown(container)
    );
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [slideData, slideIndex, readOnly]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Read-only surfaces (thumbnails, present mode, export) only need inline
    // markdown rendered. Do it with a single innerHTML pass — no React roots.
    const applyReadOnlyMarkdown = () => {
      const allElements = container.querySelectorAll("*");
      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.hasAttribute("data-md-applied")) return;
        if (isInIgnoredElementTree(htmlElement)) return;

        const previewText = htmlElement.getAttribute(MD_PREVIEW_ATTR);
        // Hijos inyectados por el pre-render: los maneja su elemento padre.
        if (!previewText && htmlElement.closest(`[${MD_PREVIEW_ATTR}]`)) return;

        const trimmedText =
          previewText ?? getDirectTextContent(htmlElement).trim();
        if (!trimmedText || trimmedText.length <= 2) return;
        if (!previewText) {
          if (hasTextChildren(htmlElement)) return;
          if (shouldSkipElement(htmlElement)) return;
        }

        const dataPath = findDataPath(slideData, trimmedText);
        const content = dataPath.path
          ? getValueByPath(slideData, dataPath.path) ?? trimmedText
          : trimmedText;

        htmlElement.setAttribute("data-md-applied", "true");
        readOnlyNodesRef.current.set(htmlElement, dataPath.path);
        const html = parseInlineMarkdown(content);
        if (html !== htmlElement.innerHTML) htmlElement.innerHTML = html;
      });
      container.setAttribute("data-markdown-rendered", "true");
    };

    const replaceTextElements = () => {
      // Get all elements in the container
      const allElements = container.querySelectorAll("*");

      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;

        // Skip if already processed

        if (
          processedElements.has(htmlElement) ||
          htmlElement.classList.contains("tiptap-text-editor") ||
          htmlElement.closest(".tiptap-text-editor")
        ) {
          return;
        }

        // console.log("htmlElement", htmlElement);
        // Skip if element is inside an ignored element tree
        if (isInIgnoredElementTree(htmlElement)) return;

        // El pre-render pudo convertir el texto crudo a spans; el original
        // (necesario para encontrar la ruta en slideData) quedó en el atributo.
        const previewText = htmlElement.getAttribute(MD_PREVIEW_ATTR);
        // Hijos inyectados por el pre-render: los maneja su elemento padre.
        if (!previewText && htmlElement.closest(`[${MD_PREVIEW_ATTR}]`)) return;

        // Get direct text content (not from child elements)
        const trimmedText =
          previewText ?? getDirectTextContent(htmlElement).trim();

        // Check if element has meaningful text content
        if (!trimmedText || trimmedText.length <= 2) return;

        if (!previewText) {
          // Skip elements that contain other elements with text (to avoid double processing)
          if (hasTextChildren(htmlElement)) return;

          // Skip certain element types that shouldn't be editable
          if (shouldSkipElement(htmlElement)) return;
        }

        // Get all computed styles to preserve them
        const allClasses = Array.from(htmlElement.classList);
        const allStyles = htmlElement.getAttribute("style");

        const dataPath = findDataPath(slideData, trimmedText);

        // Create a container for the TiptapText
        const tiptapContainer = document.createElement("div");
        tiptapContainer.style.cssText = allStyles || "";
        tiptapContainer.className = Array.from(allClasses).join(" ");

        // Replace the element
        if(htmlElement.parentNode) {
        htmlElement.parentNode.replaceChild(tiptapContainer, htmlElement);
        // Mark as processed
        htmlElement.innerHTML = "";
        }
        setProcessedElements((prev) => new Set(prev).add(htmlElement));
        // Render TiptapText
        const root = ReactDOM.createRoot(tiptapContainer);
        const initialContent = dataPath.path
          ? getValueByPath(slideData, dataPath.path) ?? trimmedText
          : trimmedText;
        rootsRef.current.set(tiptapContainer, {
          root,
          dataPath: dataPath.path,

          fallbackText: trimmedText,
        });
        root.render(
          <TiptapText
            content={initialContent}
            slideIndex={slideIndex}
            onContentChange={(content: string) => {
              if (dataPath && onContentChange) {
                onContentChange(content, dataPath.path, slideIndex);
              }
            }}
            placeholder="Enter text..."
          />
        );
      });
    };


    // Replace text elements after a short delay to ensure DOM is ready
    const timer = setTimeout(
      readOnly ? applyReadOnlyMarkdown : replaceTextElements,
      readOnly ? 250 : 1000
    );

    return () => {
      clearTimeout(timer);
    };
  }, [slideData, slideIndex, readOnly]);

  // When slideData changes, update existing content using the stored dataPath
  useEffect(() => {
    if (readOnly) {
      if (readOnlyNodesRef.current.size === 0) return;
      readOnlyNodesRef.current.forEach((dataPath, el) => {
        if (!el.isConnected) return;
        const fallback = el.textContent?.trim() ?? "";
        const newContent = dataPath
          ? getValueByPath(slideData, dataPath) ?? fallback
          : fallback;
        el.innerHTML = parseInlineMarkdown(newContent);
      });
      return;
    }
    if (!rootsRef.current || rootsRef.current.size === 0) return;
    rootsRef.current.forEach(({ root, dataPath,  fallbackText }) => {
      const newContent = dataPath ? getValueByPath(slideData, dataPath) ?? fallbackText : fallbackText;
      root.render(
        <TiptapText
          content={newContent}
          slideIndex={slideIndex}
          onContentChange={(content: string) => {
            if (dataPath && onContentChange) {
              onContentChange(content, dataPath, slideIndex);
            }
          }}
          placeholder="Enter text..."
        />
      );
    });
  }, [slideData, slideIndex, readOnly]);
  // helper functions
    // Function to check if element is inside an ignored element tree
    const isInIgnoredElementTree = (element: HTMLElement): boolean => {
      // List of element types that should be ignored entirely with all their children
      const ignoredElementTypes = [
        "TABLE",
        "TBODY",
        "THEAD",
        "TFOOT",
        "TR",
        "TD",
        "TH", // Table elements
        "SVG",
        "G",
        "PATH",
        "CIRCLE",
        "RECT",
        "LINE", // SVG elements
        "CANVAS", // Canvas element
        "VIDEO",
        "AUDIO", // Media elements
        "IFRAME",
        "EMBED",
        "OBJECT", // Embedded content
        "SELECT",
        "OPTION",
        "OPTGROUP", // Select dropdown elements
        "PRE",
        "CODE",
        "KBD",
        "SAMP", // Preformatted/code elements
        "SCRIPT",
        "STYLE",
        "NOSCRIPT", // Script/style elements
      ];

      // List of class patterns that indicate ignored element trees
      const ignoredClassPatterns = [
        "chart",
        "graph",
        "visualization", // Chart/graph components
        "menu",
        "dropdown",
        "tooltip", // UI components
        "editor",
        "wysiwyg", // Editor components
        "calendar",
        "datepicker", // Date picker components
        "slider",
        "carousel",
        "flowchart",
        "mermaid",
        "diagram",
        "prism-code-block",
        "token",
        "language-",
      ];

      // Check if current element or any parent is in ignored list
      let currentElement: HTMLElement | null = element;
      while (currentElement) {
        // Check element type
        if (ignoredElementTypes.includes(currentElement.tagName)) {
          return true;
        }

        if (
          currentElement.matches(
            "pre, code, kbd, samp, [data-code-block], .prism-code-block"
          )
        ) {
          return true;
        }

        // Check class patterns
        const className =
          currentElement.className.length > 0
            ? currentElement.className.toLowerCase()
            : "";
        if (
          ignoredClassPatterns.some((pattern) => className.includes(pattern))
        ) {
          return true;
        }
        if (currentElement.id.includes("mermaid")) {
          return true;
        }

        // Check for specific attributes that indicate non-text content
        if (
          currentElement.hasAttribute("contenteditable") ||
          currentElement.hasAttribute("data-chart") ||
          currentElement.hasAttribute("data-visualization") ||
          currentElement.hasAttribute("data-interactive")
        ) {
          return true;
        }

        currentElement = currentElement.parentElement;
      }
      return false;
    };

    // Resolve nested values by path like "a.b[0].c"
    const getValueByPath = (obj: any, path: string): any => {
      if (!obj || !path) return undefined;
      const tokens = path
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".")
        .filter(Boolean);
      let current: any = obj;
      for (const token of tokens) {
        if (current == null) return undefined;
        current = current[token as keyof typeof current];
      }
      return current;
    };

    // Helper function to get only direct text content (not from children)
    const getDirectTextContent = (element: HTMLElement): string => {
      let text = "";
      const childNodes = Array.from(element.childNodes);
      for (const node of childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent || "";
        }
      }
      return text;
    };

    // Helper function to check if element has child elements with text
    const hasTextChildren = (element: HTMLElement): boolean => {
      const children = Array.from(element.children) as HTMLElement[];
      return children.some((child) => {
        // Un hijo pre-renderizado sigue siendo "hijo con texto" aunque su
        // texto directo haya pasado a spans internos.
        if (child.hasAttribute(MD_PREVIEW_ATTR)) return true;
        const childText = getDirectTextContent(child).trim();
        return childText.length > 1;
      });
    };

    // Helper function to determine if element should be skipped
    const shouldSkipElement = (element: HTMLElement): boolean => {
      // Skip form elements
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName)) {
        return true;
      }

      // Skip elements with certain roles or types
      if (
        element.hasAttribute("role") ||
        element.hasAttribute("aria-label") ||
        element.hasAttribute("data-testid")
      ) {
        return true;
      }

      // Skip elements that contain interactive content (simplified since we now use isInIgnoredElementTree)
      if (
        element.querySelector(
          "img, svg, button, input, textarea, select, a[href]"
        )
      ) {
        return true;
      }

      // Skip container elements (elements that primarily serve as layout containers)
      const containerClasses = [
        "grid",
        "flex",
        "space-",
        "gap-",
        "container",
        "wrapper",
      ];
      const hasContainerClass = containerClasses.some((cls) =>
        element.className.length > 0 ? element.className.includes(cls) : false
      );
      if (hasContainerClass) return true;

      // Skip very short text that might be UI elements
      const text = getDirectTextContent(element).trim();
      if (text.length < 2) return true;

      // Skip elements that look like numbers or single characters (might be icons/UI)
      // if (/^[0-9]+$/.test(text) || text.length === 1) return true;
      if (text.length <3) return true;

      return false;
    };

    // Helper function to find data path for text content
    const findDataPath = (
      data: any,
      targetText: string,
      path = ""
    ): {
      path: string;
      originalText: string;
    } => {
      if (!data || typeof data !== "object")
        return { path: "", originalText: "" };

      for (const [key, value] of Object.entries(data)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === "string" && value.trim() === targetText.trim()) {
          return { path: currentPath, originalText: value };
        }

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const result = findDataPath(
              value[i],
              targetText,
              `${currentPath}[${i}]`
            );
            if (result.path) return result;
          }
        } else if (typeof value === "object" && value !== null) {
          const result = findDataPath(value, targetText, currentPath);
          if (result.path) return result;
        }
      }
      return { path: "", originalText: "" };
    };


  return (
    <div ref={containerRef} className="tiptap-text-replacer">
      {children}
    </div>
  );
};

export default TiptapTextReplacer;
