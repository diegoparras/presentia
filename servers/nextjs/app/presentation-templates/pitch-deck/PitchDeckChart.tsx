"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type PitchChartType = "bar" | "pie" | "scatter" | "stackedBar" | "line";

export type PitchBarDatum = { label: string; value: number; value2?: number };
export type PitchPieDatum = { label: string; value: number; color: string };
export type PitchScatterDatum = { label: string; value: number };

export type PitchChartPayload = {
  chartType: PitchChartType;
  legendLabel: string;
  yAxisLabel: string;
  barData: PitchBarDatum[];
  pieData: PitchPieDatum[];
  scatterData: PitchScatterDatum[];
  lineData: PitchBarDatum[];
  stackedBarData: PitchBarDatum[];
};

type Props = { payload?: Partial<PitchChartPayload> | null };

const DEFAULT_CHART_COLORS = [
  "#dddac7", "#b8b4a3", "#a2a091", "#8d8a7d", "#cbc7b2",
  "#747168", "#e8e5d3", "#9a9789", "#c5c1ae", "#66645d",
];
const AXIS = "var(--background-text,#d8d4bf)";
const GRID = "var(--background-text,#585a61)";
const BODY_FONT = "var(--body-font-family,Inter)";

const graphColors = (index: number, fallbackColor?: string) => {
  const slot = index % 10;
  const fallback = fallbackColor || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
  return `var(--graph-${slot}, ${fallback})`;
};

const axisProps = {
  tick: { fill: AXIS, fontSize: 13, fontFamily: BODY_FONT } as any,
  stroke: AXIS,
  tickLine: false,
} as const;

const DEFAULT_CHART_PAYLOAD: PitchChartPayload = {
  chartType: "bar",
  legendLabel: "Series Label",
  yAxisLabel: "Y axis name",
  barData: [
    { label: "Mon", value: 120 }, { label: "Tue", value: 200 }, { label: "Wed", value: 150 },
    { label: "Thu", value: 80 }, { label: "Fri", value: 70 }, { label: "Sat", value: 110 },
    { label: "Sun", value: 130 },
  ],
  pieData: [
    { label: "Category A", value: 55, color: "#dddac7" },
    { label: "Category B", value: 25, color: "#b8b4a3" },
    { label: "Category C", value: 20, color: "#a2a091" },
  ],
  scatterData: [
    { label: "Mon", value: 7 }, { label: "Tue", value: 2 }, { label: "Wed", value: 92 },
    { label: "Thu", value: 15 }, { label: "Fri", value: 91 }, { label: "Sat", value: 73 },
    { label: "Sun", value: 56 },
  ],
  lineData: [
    { label: "Mon", value: 30 }, { label: "Tue", value: 48 }, { label: "Wed", value: 64 },
    { label: "Thu", value: 42 }, { label: "Fri", value: 58 }, { label: "Sat", value: 70 },
    { label: "Sun", value: 90 },
  ],
  stackedBarData: [
    { label: "Mon", value: 50, value2: 50 }, { label: "Tue", value: 80, value2: 70 },
    { label: "Wed", value: 90, value2: 90 }, { label: "Thu", value: 40, value2: 60 },
    { label: "Fri", value: 80, value2: 70 }, { label: "Sat", value: 90, value2: 90 },
    { label: "Sun", value: 70, value2: 80 },
  ],
};

function resolveChartPayload(payload?: Partial<PitchChartPayload> | null): PitchChartPayload {
  return {
    ...DEFAULT_CHART_PAYLOAD,
    ...payload,
    barData: payload?.barData?.length ? payload.barData : DEFAULT_CHART_PAYLOAD.barData,
    pieData: payload?.pieData?.length ? payload.pieData : DEFAULT_CHART_PAYLOAD.pieData,
    scatterData: payload?.scatterData?.length ? payload.scatterData : DEFAULT_CHART_PAYLOAD.scatterData,
    lineData: payload?.lineData?.length ? payload.lineData : DEFAULT_CHART_PAYLOAD.lineData,
    stackedBarData: payload?.stackedBarData?.length ? payload.stackedBarData : DEFAULT_CHART_PAYLOAD.stackedBarData,
    chartType: payload?.chartType || DEFAULT_CHART_PAYLOAD.chartType,
    legendLabel: payload?.legendLabel || DEFAULT_CHART_PAYLOAD.legendLabel,
    yAxisLabel: payload?.yAxisLabel || DEFAULT_CHART_PAYLOAD.yAxisLabel,
  };
}

// Recharts SVG renderer (replaces the former Chart.js/canvas ChartCanvas).
function ChartCanvas({ payload }: { payload: PitchChartPayload }) {
  const grid = <CartesianGrid stroke={GRID} strokeOpacity={0.4} vertical={false} />;
  const margin = { top: 16, right: 20, bottom: 4, left: 0 };
  const yLabel = payload.yAxisLabel
    ? { value: payload.yAxisLabel, angle: -90, position: "insideLeft" as const, fill: AXIS, fontFamily: BODY_FONT, fontSize: 12 }
    : undefined;

  switch (payload.chartType) {
    case "pie":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={payload.pieData} dataKey="value" nameKey="label" outerRadius="85%" isAnimationActive={false} labelLine={false}>
              {payload.pieData.map((e, i) => <Cell key={e.label} fill={graphColors(i, e.color)} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={payload.lineData} margin={margin}>
            {grid}<XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} label={yLabel} /><Tooltip />
            <Line type="monotone" dataKey="value" stroke={graphColors(0)} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
            {payload.lineData.some((d) => d.value2 != null) && (
              <Line type="monotone" dataKey="value2" stroke={graphColors(1)} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    case "scatter":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={margin}>
            {grid}
            <XAxis type="number" dataKey="x" {...axisProps} />
            <YAxis type="number" dataKey="y" {...axisProps} label={yLabel} />
            <Tooltip />
            <Scatter data={payload.scatterData.map((d, i) => ({ x: i + 1, y: d.value, label: d.label }))} isAnimationActive={false}>
              {payload.scatterData.map((d, i) => <Cell key={d.label} fill={graphColors(i)} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );
    case "stackedBar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={payload.stackedBarData} margin={margin}>
            {grid}<XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} label={yLabel} /><Tooltip />
            <Bar dataKey="value" stackId="a" fill={graphColors(0)} isAnimationActive={false} />
            <Bar dataKey="value2" stackId="a" fill={graphColors(1)} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "bar":
    default:
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={payload.barData} margin={margin}>
            {grid}<XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} label={yLabel} /><Tooltip />
            <Bar dataKey="value" fill={graphColors(0)} radius={[6, 6, 0, 0]} maxBarSize={46} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}

function Legend({ label, color = graphColors(0) }: { label: string; color?: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[10px] pt-[8px]" style={{ color: AXIS }}>
      <span className="h-[16px] w-[16px] rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[18px] leading-none">{label}</span>
    </div>
  );
}

export default function PitchDeckChart({ payload }: Props) {
  const resolvedPayload = resolveChartPayload(payload);

  if (resolvedPayload.chartType === "pie") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <ChartCanvas payload={resolvedPayload} />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-[26px] pb-[2px] pt-[8px] text-[18px] leading-none" style={{ color: AXIS }}>
          {resolvedPayload.pieData.map((entry, index) => (
            <span key={entry.label} className="flex items-center gap-[10px]">
              <span className="h-[15px] w-[15px] rounded-full" style={{ backgroundColor: graphColors(index, entry.color) }} />
              {entry.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <ChartCanvas payload={resolvedPayload} />
      </div>
      <Legend label={resolvedPayload.legendLabel} />
    </div>
  );
}
