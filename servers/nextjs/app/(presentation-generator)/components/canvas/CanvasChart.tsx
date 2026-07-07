"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  Bar,
  Line,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "@/app/presentation-templates/shared/NeoChartPrimitives";
import { CanvasBlock, rowsToChartData } from "./canvasTypes";

// Theme graph colors — resolve against the deck's --graph-N CSS vars so canvas
// charts match the active theme, with sensible fallbacks (same convention the
// Neo layouts use). SVG output → flows to the freeze/PDF/PPTX pipeline.
const FALLBACK = ["#9CE0EE", "#5141e5", "#F5A623", "#7ED321", "#BD10E0", "#50E3C2", "#F8536B", "#4A90E2", "#B8E986", "#D0021B"];
const graphColor = (i: number) => `var(--graph-${i % 10}, ${FALLBACK[i % FALLBACK.length]})`;

const CanvasChart: React.FC<{ block: CanvasBlock }> = ({ block }) => {
  const { data, series } = rowsToChartData(block.rows);
  const labelKey = block.rows?.[0]?.[0]?.trim() || "name";
  const type = block.chartType || "bar";
  const legend = block.showLegend !== false;
  const grid = block.showGrid !== false;

  if (!data.length || !series.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-xs text-neutral-400">
        Sin datos — editá la tabla del gráfico
      </div>
    );
  }

  const axisTick = { fontSize: 11, fill: "var(--background-text, #64748b)" } as const;

  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          {grid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />}
          <XAxis dataKey={labelKey} tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip />
          {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} fill={graphColor(i)} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          {grid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />}
          <XAxis dataKey={labelKey} tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip />
          {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={graphColor(i)} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      ) : type === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          {grid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />}
          <XAxis dataKey={labelKey} tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip />
          {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Area key={s} type="monotone" dataKey={s} stroke={graphColor(i)} fill={graphColor(i)} fillOpacity={0.35} strokeWidth={2} />
          ))}
        </AreaChart>
      ) : (
        // pie — uses only the first series
        <PieChart>
          <Tooltip />
          {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          <Pie data={data} dataKey={series[0]} nameKey={labelKey} cx="50%" cy="50%" outerRadius="75%" label>
            {data.map((_, i) => (
              <Cell key={i} fill={graphColor(i)} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  );
};

export default CanvasChart;
