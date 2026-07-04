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
import { useI18n } from "@/lib/i18n";
import PageShell from "../Components/PageShell";

const ACCENT = "#e25a4e";

type TextModel = {
  id: string;
  provider: string;
  name: string;
  quality: number;
  description: string;
  input_price: number | null;
  output_price: number | null;
  available: boolean;
  via: "direct" | "openrouter" | null;
  openrouter_id: string | null;
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

const BADGES: Record<string, { key: string; solid: boolean }> = {
  quality: { key: "badge.quality", solid: true },
  value: { key: "badge.value", solid: false },
  budget: { key: "badge.budget", solid: false },
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
  const { t } = useI18n();
  if (!badge || !BADGES[badge]) return null;
  const { key, solid } = BADGES[badge];
  const label = t(key);
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
  const { t } = useI18n();
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
      setError(t("models.error.load"));
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
        setError(t("models.error.apply"));
        return;
      }
      await load();
    } catch {
      setError(t("md.error.network"));
    } finally {
      setApplying(null);
    }
  };

  const selectTextModel = (model: TextModel) => {
    if (model.via === "openrouter" && model.openrouter_id) {
      applyConfig(
        { LLM: "openrouter", OPENROUTER_MODEL: model.openrouter_id },
        `text:${model.id}`
      );
      return;
    }
    const patch: Record<string, string> = { LLM: model.provider };
    const field = PROVIDER_MODEL_FIELD[model.provider];
    if (field && !model.id.startsWith("__")) patch[field] = model.id;
    applyConfig(patch, `text:${model.id}`);
  };

  const selectImageModel = (model: ImageModel) => {
    applyConfig({ IMAGE_PROVIDER: model.id }, `image:${model.id}`);
  };

  const isCurrentText = (model: TextModel) => {
    const current = data?.text.current;
    if (!current) return false;
    if (current.provider === "openrouter") {
      const currentModel = (current.model || "").toLowerCase();
      const stripped = currentModel.split("/").pop()?.split(":")[0] || "";
      return (
        currentModel === (model.openrouter_id || "").toLowerCase() ||
        stripped === model.id.toLowerCase()
      );
    }
    return (
      current.provider === model.provider &&
      (model.id.startsWith("__") || (current.model || "").startsWith(model.id))
    );
  };

  const cardClass = (available: boolean, current: boolean) =>
    [
      "relative rounded-xl border bg-white p-4 text-left transition w-full",
      current ? "" : "hover:border-[#ef8175]",
      available ? "cursor-pointer" : "opacity-55 cursor-default",
    ].join(" ");

  const cardStyle = (current: boolean) =>
    current
      ? { borderColor: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT}` }
      : { borderColor: "#E1E1E5" };

  const price = (value: number | null, suffix: string) =>
    value === null ? t("models.noPrice") : value === 0 ? t("models.free") : `US$ ${value} ${suffix}`;

  return (
    <PageShell title={t("models.title")} subtitle={t("models.intro")}>
      <div className="pb-10 font-inter max-w-[1040px]">
      {error && (
        <p className="mb-4 text-sm text-[#cf222e]" role="alert">{error}</p>
      )}
      {!data && !error && (
        <p className="text-sm text-[#70707b]">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t("models.loading")}
        </p>
      )}

      {data && (
        <>
          <h3 className="mb-3 text-[15px] font-semibold text-[#16161a]">
            {t("models.text")}
            <span className="ml-2 text-[12.5px] font-normal text-[#70707b]">
              {t("models.text.hint")}
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
                        <Check className="h-3.5 w-3.5" /> {t("models.inUse")}
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
                        ? t("models.freeLocal")
                        : model.input_price === null
                          ? t("models.noPrice")
                          : `US$ ${model.input_price} / ${model.output_price} ${t("models.perMillion")}`}
                    </span>
                  </div>
                  {!model.available && (
                    <p className="mt-2 text-[11.5px]" style={{ color: ACCENT }}>
                      {t("models.missing", { requirement: model.requirement })} —{" "}
                      <Link href="/settings" className="underline" onClick={(e) => e.stopPropagation()}>
                        {t("models.configure")}
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
            {t("models.image")}
            <span className="ml-2 text-[12.5px] font-normal text-[#70707b]">
              {t("models.image.hint")}
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
                        <Check className="h-3.5 w-3.5" /> {t("models.inUse")}
                      </span>
                    ) : (
                      <Badge badge={model.badge} />
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-[#70707b]">{model.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <QualityDots quality={model.quality} />
                    <span className="text-[12px] tabular-nums text-[#3c3c44]">
                      {price(model.price_per_image, t("models.perImage"))}
                    </span>
                  </div>
                  {!model.available && (
                    <p className="mt-2 text-[11.5px]" style={{ color: ACCENT }}>
                      {t("models.missing", { requirement: model.requirement })} —{" "}
                      <Link href="/settings" className="underline" onClick={(e) => e.stopPropagation()}>
                        {t("models.configure")}
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
            {t("models.footnote")}
          </p>
        </>
      )}
      </div>
    </PageShell>
  );
};

export default ModelsPage;
