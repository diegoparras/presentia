"use client";

/**
 * Selector guiado de modelos (Suite Escriba).
 * A partir de las API keys configuradas muestra los modelos disponibles de
 * texto e imágenes con precio y calidad, recomienda y aplica con un click.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/utils/api";

const ACCENT = "#a87f16";

type TextModel = {
  id: string;
  provider: string;
  name: string;
  quality: number;
  description: string;
  input_price: number | null;
  output_price: number | null;
  available: boolean;
  requirement: string;
  badge: "quality" | "value" | "budget" | null;
};

type ImageModel = {
  id: string;
  name: string;
  quality: number;
  description: string;
  price_per_image: number | null;
  available: boolean;
  requirement: string;
  badge: "quality" | "value" | "budget" | null;
};

type Recommendations = {
  text: { current: { provider: string | null; model: string | null }; models: TextModel[] };
  image: { current: string | null; models: ImageModel[] };
};

const BADGES: Record<string, { label: string; solid: boolean }> = {
  quality: { label: "Mejor calidad", solid: true },
  value: { label: "Mejor precio-calidad", solid: false },
  budget: { label: "Más económico", solid: false },
};

const PROVIDER_MODEL_FIELD: Record<string, string | null> = {
  anthropic: "ANTHROPIC_MODEL",
  openai: "OPENAI_MODEL",
  google: "GOOGLE_MODEL",
  deepseek: "DEEPSEEK_MODEL",
  ollama: null,
};

const QualityDots = ({ quality }: { quality: number }) => (
  <span className="inline-flex items-center gap-[3px]" aria-label={`Calidad ${quality} de 5`}>
    {[1, 2, 3, 4, 5].map((dot) => (
      <span
        key={dot}
        className="inline-block h-[7px] w-[7px] rounded-full"
        style={{ backgroundColor: dot <= quality ? ACCENT : "#E1E1E5" }}
      />
    ))}
  </span>
);

const Badge = ({ badge }: { badge: string | null }) => {
  if (!badge || !BADGES[badge]) return null;
  const { label, solid } = BADGES[badge];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={
        solid
          ? { backgroundColor: ACCENT, color: "#fff" }
          : { border: `1px solid ${ACCENT}`, color: ACCENT }
      }
    >
      {label}
    </span>
  );
};

const ModelsPage = () => {
  const [data, setData] = useState<Recommendations | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ppt/models/recommendations"), {
        credentials: "include",
      });
      if (response.ok) setData(await response.json());
    } catch {
      setError("No se pudieron cargar los modelos.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyConfig = async (patch: Record<string, string>, key: string) => {
    setApplying(key);
    setError(null);
    try {
      const response = await fetch("/api/user-config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        setError("No se pudo aplicar la selección.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo contactar al servidor.");
    } finally {
      setApplying(null);
    }
  };

  const selectTextModel = (model: TextModel) => {
    const patch: Record<string, string> = { LLM: model.provider };
    const field = PROVIDER_MODEL_FIELD[model.provider];
    if (field && !model.id.startsWith("__")) patch[field] = model.id;
    applyConfig(patch, `text:${model.id}`);
  };

  const selectImageModel = (model: ImageModel) => {
    applyConfig({ IMAGE_PROVIDER: model.id }, `image:${model.id}`);
  };

  const isCurrentText = (model: TextModel) =>
    data?.text.current.provider === model.provider &&
    (model.id.startsWith("__") ||
      (data?.text.current.model || "").startsWith(model.id));

  const cardClass = (available: boolean, current: boolean) =>
    [
      "relative rounded-xl border bg-white p-4 text-left transition w-full",
      current ? "" : "hover:border-[#cfa53a]",
      available ? "cursor-pointer" : "opacity-55 cursor-default",
    ].join(" ");

  const cardStyle = (current: boolean) =>
    current
      ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` }
      : { borderColor: "#E1E1E5" };

  const price = (value: number | null, suffix: string) =>
    value === null ? "precio no catalogado" : value === 0 ? "Gratis" : `US$ ${value} ${suffix}`;

  return (
    <div className="pb-10 font-inter max-w-[1040px]">
      <p className="text-sm text-[#70707b] max-w-[72ch] mb-6">
        Según las API keys que cargaste en Settings, estos son los modelos
        disponibles. Elegí con un click: el cambio aplica a las próximas
        generaciones. Los modelos atenuados necesitan una credencial que
        todavía no configuraste.
      </p>

      {error && (
        <p className="mb-4 text-sm text-[#cf222e]" role="alert">{error}</p>
      )}
      {!data && !error && (
        <p className="text-sm text-[#70707b]">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando modelos…
        </p>
      )}

      {data && (
        <>
          <h3 className="mb-3 text-[15px] font-semibold text-[#16161a]">
            Modelo de texto
            <span className="ml-2 text-[12.5px] font-normal text-[#70707b]">
              genera outlines y slides
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.text.models.map((model) => {
              const current = isCurrentText(model);
              const key = `text:${model.id}`;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!model.available || applying !== null}
                  onClick={() => model.available && selectTextModel(model)}
                  className={cardClass(model.available, current)}
                  style={cardStyle(current)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[#16161a]">
                      {model.name}
                    </span>
                    {current ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: ACCENT }}>
                        <Check className="h-3.5 w-3.5" /> En uso
                      </span>
                    ) : (
                      <Badge badge={model.badge} />
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-[#70707b]">{model.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <QualityDots quality={model.quality} />
                    <span className="text-[12px] tabular-nums text-[#3c3c44]">
                      {model.input_price === 0 && model.output_price === 0
                        ? "Gratis (local)"
                        : model.input_price === null
                          ? "precio no catalogado"
                          : `US$ ${model.input_price} / ${model.output_price} por 1M`}
                    </span>
                  </div>
                  {!model.available && (
                    <p className="mt-2 text-[11.5px]" style={{ color: ACCENT }}>
                      Falta {model.requirement} —{" "}
                      <Link href="/settings" className="underline" onClick={(e) => e.stopPropagation()}>
                        configurar
                      </Link>
                    </p>
                  )}
                  {applying === key && (
                    <Loader2 className="absolute right-3 bottom-3 h-4 w-4 animate-spin" style={{ color: ACCENT }} />
                  )}
                </button>
              );
            })}
          </div>

          <h3 className="mt-10 mb-3 text-[15px] font-semibold text-[#16161a]">
            Modelo de imágenes
            <span className="ml-2 text-[12.5px] font-normal text-[#70707b]">
              genera o busca las imágenes de cada slide
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.image.models.map((model) => {
              const current = data.image.current === model.id;
              const key = `image:${model.id}`;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!model.available || applying !== null}
                  onClick={() => model.available && selectImageModel(model)}
                  className={cardClass(model.available, current)}
                  style={cardStyle(current)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[#16161a]">
                      {model.name}
                    </span>
                    {current ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: ACCENT }}>
                        <Check className="h-3.5 w-3.5" /> En uso
                      </span>
                    ) : (
                      <Badge badge={model.badge} />
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-[#70707b]">{model.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <QualityDots quality={model.quality} />
                    <span className="text-[12px] tabular-nums text-[#3c3c44]">
                      {price(model.price_per_image, "por imagen")}
                    </span>
                  </div>
                  {!model.available && (
                    <p className="mt-2 text-[11.5px]" style={{ color: ACCENT }}>
                      Falta {model.requirement} —{" "}
                      <Link href="/settings" className="underline" onClick={(e) => e.stopPropagation()}>
                        configurar
                      </Link>
                    </p>
                  )}
                  {applying === key && (
                    <Loader2 className="absolute right-3 bottom-3 h-4 w-4 animate-spin" style={{ color: ACCENT }} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-[12px] text-[#70707b] max-w-[72ch]">
            Los precios son por millón de tokens (entrada / salida) o por imagen
            generada, según el catálogo versionado del fork; los precios de
            imagen son aproximados. El panel Costos registra el gasto real de
            cada deck.
          </p>
        </>
      )}
    </div>
  );
};

export default ModelsPage;
