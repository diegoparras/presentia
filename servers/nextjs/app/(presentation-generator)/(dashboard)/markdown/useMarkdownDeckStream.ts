"use client";

/**
 * Consume el SSE de generación de slides (stream_presentation) con estado local,
 * para el preview en vivo (modo Gamma) de la página Markdown. Reusa el mismo
 * protocolo que el editor (chunks de JSON reparados con jsonrepair + eventos
 * slide_assets), pero sin tocar el store de Redux: acá las slides viven en
 * estado local y se pintan como miniaturas a medida que llegan.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { jsonrepair } from "jsonrepair";
import { getApiUrl, normalizeBackendAssetUrls } from "@/utils/api";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

type Options = {
  presentationId: string | null;
  imageStyle?: string | null;
  imageSource?: string | null;
};

function mergeSlide(prev: any, incoming: any): any {
  // Preserva URLs de imagen/icono ya resueltas cuando el chunk las reemplaza
  // por placeholders (el mismo criterio que el editor).
  if (!prev) return incoming;
  const isPlaceholder = (u: unknown) =>
    typeof u === "string" && /placeholder/i.test(u);
  const prevImg = prev?.content?.__image_url__;
  const nextImg = incoming?.content?.__image_url__;
  if (isPlaceholder(nextImg) && !isPlaceholder(prevImg) && incoming?.content) {
    return {
      ...incoming,
      content: { ...incoming.content, __image_url__: prevImg },
    };
  }
  return incoming;
}

export function useMarkdownDeckStream({
  presentationId,
  imageStyle,
  imageSource,
}: Options) {
  const [slides, setSlides] = useState<any[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const chunksRef = useRef("");

  const close = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  useEffect(() => {
    if (!presentationId) return;

    setSlides([]);
    setError(null);
    setStatus("streaming");
    chunksRef.current = "";

    const params = new URLSearchParams();
    if (imageStyle) params.set("image_style", imageStyle);
    if (imageSource) params.set("image_source", imageSource);
    const qs = params.toString();
    const url = getApiUrl(
      `/api/v1/ppt/presentation/stream/${presentationId}${qs ? `?${qs}` : ""}`
    );

    const es = new EventSource(url);
    sourceRef.current = es;

    es.addEventListener("response", (event) => {
      let data: any;
      try {
        data = JSON.parse((event as MessageEvent).data);
      } catch {
        return;
      }

      switch (data.type) {
        case "chunk": {
          chunksRef.current += data.chunk;
          try {
            const parsed = normalizeBackendAssetUrls(
              JSON.parse(jsonrepair(chunksRef.current))
            );
            if (Array.isArray(parsed?.slides) && parsed.slides.length) {
              setSlides((prev) =>
                parsed.slides.map((s: any, i: number) => mergeSlide(prev[i], s))
              );
            }
          } catch {
            // JSON parcial todavía; se sigue acumulando
          }
          break;
        }
        case "slide_assets": {
          const idx = data.slide_index;
          if (typeof idx === "number" && idx >= 0 && data.slide) {
            const resolved = normalizeBackendAssetUrls(data.slide);
            setSlides((prev) => {
              const next = [...prev];
              next[idx] = resolved;
              return next;
            });
          }
          break;
        }
        case "complete":
        case "closing": {
          if (data.presentation?.slides) {
            setSlides(
              normalizeBackendAssetUrls(data.presentation).slides ?? []
            );
          }
          setStatus("done");
          close();
          break;
        }
        case "error": {
          setError(data.detail || "stream error");
          setStatus("error");
          close();
          break;
        }
      }
    });

    es.onerror = () => {
      // El editor reintenta; acá, si ya terminó, ignoramos; si no, marcamos error.
      setStatus((s) => (s === "done" ? s : "error"));
      close();
    };

    return () => close();
  }, [presentationId, imageStyle, imageSource, close]);

  return { slides, status, error };
}
