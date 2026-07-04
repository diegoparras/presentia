"use client";

/**
 * Panel de costos LLM (Suite Escriba, Fase 5).
 * Costo total por deck, desglose por etapa/slide/modelo y comparativa por
 * proveedor. Sigue el contrato de diseño de la suite: acento ámbar, sin glow.
 */

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getApiUrl } from "@/utils/api";

const ACCENT = "#a87f16";

type Totals = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | null;
};

type PresentationUsage = Totals & {
  presentation_id: string;
  title: string | null;
  last_used_at: string | null;
};

type UsageDetail = {
  totals: Totals;
  by_stage: (Totals & { stage: string | null })[];
  by_slide: (Totals & { slide_index: number | null })[];
  by_model: (Totals & { model: string | null })[];
};

type ProviderUsage = Totals & { provider: string | null; model: string | null };

const formatTokens = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(2)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : String(value);

const formatCost = (value: number | null) =>
  value === null || value === undefined ? "—" : `US$ ${value.toFixed(4)}`;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(getApiUrl(path), { credentials: "include" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const CostsPage = () => {
  const [presentations, setPresentations] = useState<PresentationUsage[]>([]);
  const [providers, setProviders] = useState<ProviderUsage[]>([]);
  const [details, setDetails] = useState<Record<string, UsageDetail>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [byPresentation, summary] = await Promise.all([
        fetchJson<{ presentations: PresentationUsage[] }>("/api/v1/ppt/usage/presentations"),
        fetchJson<{ providers: ProviderUsage[] }>("/api/v1/ppt/usage/summary"),
      ]);
      setPresentations(byPresentation?.presentations ?? []);
      setProviders(summary?.providers ?? []);
      setLoading(false);
    })();
  }, []);

  const toggle = async (presentationId: string) => {
    if (expanded === presentationId) {
      setExpanded(null);
      return;
    }
    setExpanded(presentationId);
    if (!details[presentationId]) {
      const detail = await fetchJson<UsageDetail>(
        `/api/v1/ppt/usage/presentation/${presentationId}`
      );
      if (detail) setDetails((prev) => ({ ...prev, [presentationId]: detail }));
    }
  };

  const headerCell = "px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.07em] text-[#70707b] font-medium";
  const cell = "px-4 py-2.5 text-[13px] text-[#16161a] tabular-nums";

  return (
    <div className="pb-10 font-inter">
      <p className="text-sm text-[#70707b] max-w-[70ch] mb-6">
        Tokens y costo estimado de cada llamada al modelo, atribuidos por
        presentación, etapa y slide. Los modelos sin precio en el catálogo
        muestran solo tokens; los proveedores locales cuestan cero.
      </p>

      <div className="rounded-xl border border-[#E1E1E5] bg-white overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="border-b border-[#E1E1E5] bg-[#FAFAFB]">
            <tr>
              <th className={headerCell}>Presentación</th>
              <th className={headerCell}>Llamadas</th>
              <th className={headerCell}>Tokens entrada</th>
              <th className={headerCell}>Tokens salida</th>
              <th className={headerCell}>Costo estimado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className={cell} colSpan={5}>Cargando…</td>
              </tr>
            )}
            {!loading && presentations.length === 0 && (
              <tr>
                <td className={cell} colSpan={5}>
                  Todavía no hay métricas. Generá una presentación y volvé a esta vista.
                </td>
              </tr>
            )}
            {presentations.map((p) => (
              <React.Fragment key={p.presentation_id}>
                <tr
                  className="border-b border-[#EDEEEF] cursor-pointer hover:bg-[#FAFAFB]"
                  onClick={() => toggle(p.presentation_id)}
                >
                  <td className={cell}>
                    <span className="flex items-center gap-2">
                      {expanded === p.presentation_id ? (
                        <ChevronDown className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      {p.title || p.presentation_id.slice(0, 8)}
                    </span>
                  </td>
                  <td className={cell}>{p.calls}</td>
                  <td className={cell}>{formatTokens(p.input_tokens)}</td>
                  <td className={cell}>{formatTokens(p.output_tokens)}</td>
                  <td className={cell} style={{ color: ACCENT, fontWeight: 600 }}>
                    {formatCost(p.cost_usd)}
                  </td>
                </tr>
                {expanded === p.presentation_id && (
                  <tr className="border-b border-[#EDEEEF] bg-[#FAFAFB]">
                    <td colSpan={5} className="px-6 py-4">
                      {!details[p.presentation_id] ? (
                        <span className="text-[13px] text-[#70707b]">Cargando desglose…</span>
                      ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          <UsageBreakdown
                            title="Por etapa"
                            rows={details[p.presentation_id].by_stage.map((r) => ({
                              label: r.stage || "other",
                              ...r,
                            }))}
                          />
                          <UsageBreakdown
                            title="Por slide"
                            rows={details[p.presentation_id].by_slide.map((r) => ({
                              label: `Slide ${(r.slide_index ?? 0) + 1}`,
                              ...r,
                            }))}
                          />
                          <UsageBreakdown
                            title="Por modelo"
                            rows={details[p.presentation_id].by_model.map((r) => ({
                              label: r.model || "desconocido",
                              ...r,
                            }))}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-10 mb-3 text-[15px] font-semibold text-[#16161a]">
        Comparativa por proveedor
      </h3>
      <div className="rounded-xl border border-[#E1E1E5] bg-white overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="border-b border-[#E1E1E5] bg-[#FAFAFB]">
            <tr>
              <th className={headerCell}>Proveedor</th>
              <th className={headerCell}>Modelo</th>
              <th className={headerCell}>Llamadas</th>
              <th className={headerCell}>Tokens entrada</th>
              <th className={headerCell}>Tokens salida</th>
              <th className={headerCell}>Costo estimado</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && (
              <tr>
                <td className={cell} colSpan={6}>Sin datos todavía.</td>
              </tr>
            )}
            {providers.map((row, index) => (
              <tr key={index} className="border-b border-[#EDEEEF] last:border-b-0">
                <td className={cell}>{row.provider || "—"}</td>
                <td className={cell}>{row.model || "—"}</td>
                <td className={cell}>{row.calls}</td>
                <td className={cell}>{formatTokens(row.input_tokens)}</td>
                <td className={cell}>{formatTokens(row.output_tokens)}</td>
                <td className={cell} style={{ color: ACCENT, fontWeight: 600 }}>
                  {formatCost(row.cost_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsageBreakdown = ({
  title,
  rows,
}: {
  title: string;
  rows: (Totals & { label: string })[];
}) => (
  <div>
    <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[#70707b]">
      {title}
    </h4>
    <ul className="space-y-1">
      {rows.length === 0 && <li className="text-[13px] text-[#70707b]">Sin datos.</li>}
      {rows.map((row, index) => (
        <li key={index} className="flex justify-between gap-4 text-[13px] tabular-nums">
          <span className="text-[#16161a]">{row.label}</span>
          <span className="text-[#70707b]">
            {formatTokens(row.input_tokens)} → {formatTokens(row.output_tokens)}
            <span className="ml-2 font-medium" style={{ color: ACCENT }}>
              {formatCost(row.cost_usd)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default CostsPage;
