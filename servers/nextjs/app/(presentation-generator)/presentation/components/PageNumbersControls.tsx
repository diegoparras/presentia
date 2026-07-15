"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { setPageNumbers } from "@/store/slices/presentationGeneration";
import type { PageNumbersConfig } from "../../components/StyleOverrideApplier";
import { useI18n } from "@/lib/i18n";
import { Hash } from "lucide-react";

const DEFAULTS: PageNumbersConfig = {
  enabled: false,
  format: "{n}",
  position: "bottom-right",
  style: "minimal",
  size: "m",
  color: null,
  opacity: 100,
  skip_first: true,
  start_at: 1,
};

const FORMAT_PRESETS = ["{n}", "{n} / {total}", "0{n}", "— {n} —"];

/**
 * Config de números de slide (deck-level). Vive en presentation.page_numbers,
 * se renderiza vía StyleOverrideApplier (edición, exports y vista pública) y
 * persiste con el autosave existente.
 */
const PageNumbersControls: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const cfg: PageNumbersConfig = {
    ...DEFAULTS,
    ...(useSelector(
      (s: RootState) => (s.presentationGeneration.presentationData as any)?.page_numbers
    ) || {}),
  };
  const patch = (p: Partial<PageNumbersConfig>) =>
    dispatch(setPageNumbers({ ...cfg, ...p }));

  const chip = (active: boolean) =>
    `rounded-md border px-2 py-1 text-[11px] ${
      active
        ? "border-[#5141e5] bg-[#5141e5]/10 text-[#5141e5]"
        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
    }`;

  return (
    <div className="mt-3 min-w-[290px] border-t border-neutral-100 pt-3" data-editor-ui="">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-[#191919]">
          <Hash className="h-3.5 w-3.5 text-[#5141e5]" /> {t("pn.title")}
        </span>
        <input
          type="checkbox"
          checked={!!cfg.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="h-4 w-4 accent-[#5141e5]"
        />
      </label>

      {cfg.enabled && (
        <div className="mt-2.5 space-y-2.5">
          {/* Formato */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-500">{t("pn.format")}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {FORMAT_PRESETS.map((f) => (
                <button key={f} onClick={() => patch({ format: f })} className={chip(cfg.format === f)}>
                  {f.split("{n}").join("1").split("{total}").join("9")}
                </button>
              ))}
            </div>
            <input
              value={cfg.format || ""}
              onChange={(e) => patch({ format: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="{n} / {total}"
              spellCheck={false}
              className="mt-1.5 h-7 w-full rounded-md border border-neutral-200 px-2 text-xs outline-none focus:border-[#5141e5]"
            />
            <p className="mt-0.5 text-[10px] text-neutral-400">{t("pn.formatHint")}</p>
          </div>

          {/* Posición */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-500">{t("pn.position")}</p>
            <div className="grid w-fit grid-cols-3 gap-1">
              {([
                "top-left", "top-center", "top-right",
                "bottom-left", "bottom-center", "bottom-right",
              ] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => patch({ position: p })}
                  title={`${t(p.startsWith("top") ? "ep.align.top" : "ep.align.bottom")} · ${t(
                    p.endsWith("left") ? "ep.align.left" : p.endsWith("right") ? "ep.align.right" : "ep.align.center"
                  )}`}
                  className={`h-6 w-9 rounded border ${
                    cfg.position === p
                      ? "border-[#5141e5] bg-[#5141e5]/10"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className={`block h-1.5 w-1.5 rounded-full ${
                      cfg.position === p ? "bg-[#5141e5]" : "bg-neutral-300"
                    } ${p.endsWith("left") ? "ml-1" : p.endsWith("right") ? "ml-auto mr-1" : "mx-auto"} ${
                      p.startsWith("top") ? "mt-1" : "mt-2.5"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Estilo + tamaño */}
          <div className="flex items-center gap-3">
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">{t("pn.style")}</p>
              <div className="flex gap-1.5">
                <button onClick={() => patch({ style: "minimal" })} className={chip(cfg.style === "minimal")}>{t("pn.style.minimal")}</button>
                <button onClick={() => patch({ style: "pill" })} className={chip(cfg.style === "pill")}>{t("pn.style.pill")}</button>
                <button onClick={() => patch({ style: "circle" })} className={chip(cfg.style === "circle")}>{t("pn.style.circle")}</button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">{t("ep.el.size")}</p>
              <div className="flex gap-1.5">
                {(["s", "m", "l"] as const).map((s) => (
                  <button key={s} onClick={() => patch({ size: s })} className={chip(cfg.size === s)}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-neutral-500">{t("ep.tool.color")}</p>
            <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-neutral-300">
              <span
                className="absolute inset-0"
                style={
                  cfg.color
                    ? { backgroundColor: cfg.color }
                    : { background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }
                }
              />
              <input
                type="color"
                value={cfg.color || "#5141e5"}
                onChange={(e) => patch({ color: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            {cfg.color && (
              <button onClick={() => patch({ color: null })} className="text-[11px] text-neutral-500 hover:text-neutral-800">
                {t("ep.common.auto")}
              </button>
            )}
          </div>

          {/* Portada */}
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-neutral-600">
            <input
              type="checkbox"
              checked={!!cfg.skip_first}
              onChange={(e) => patch({ skip_first: e.target.checked })}
              className="accent-[#5141e5]"
            />
            {t("pn.skipFirst")}
          </label>
        </div>
      )}
    </div>
  );
};

export default PageNumbersControls;
