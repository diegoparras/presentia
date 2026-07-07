"use client";

import React from "react";
import * as z from "zod";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
} from "recharts";

export const simpleDataSchema = z.object({
  name: z.string().meta({ description: "Data point name" }),
  value: z.number().meta({ description: "Data point value" }),
});

export const multiSeriesDataSchema = z.object({
  name: z.string().meta({ description: "Category name" }),
  values: z.any().meta({
    description:
      "Key-value pairs for each series (object with series names as keys and numbers as values)",
  }),
});

export const divergingDataSchema = z.object({
  name: z.string().meta({ description: "Category name" }),
  positive: z.number().meta({ description: "Positive value" }),
  negative: z.number().meta({ description: "Negative value" }),
});

export const scatterDataSchema = z.object({
  x: z.number().meta({ description: "X coordinate" }),
  y: z.number().meta({ description: "Y coordinate" }),
});

/** Two series over categorical labels (line stats slide). */
export const dualLinePointSchema = z.object({
  label: z.string().meta({ description: "Chart axis label" }),
  valueA: z.number().meta({ description: "First series value" }),
  valueB: z.number().meta({ description: "Second series value" }),
});
export const SimpleDataPointSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const MultiSeriesDataPointSchema = z.object({
  name: z.string(),
  values: z.any(),
});

export const DivergingDataPointSchema = z.object({
  name: z.string(),
  positive: z.number(),
  negative: z.number(),
});

export const ScatterDataPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  name: z.string().optional(),
});


export const flexibleChartTypeSchema = z.enum([
  "bar",
  "bar-horizontal",
  "bar-grouped-vertical",
  "bar-grouped-horizontal",
  "bar-stacked-vertical",
  "bar-stacked-horizontal",
  "bar-clustered",
  "bar-diverging",
  "line",
  "line-dual",
  "area",
  "area-stacked",
  "pie",
  "donut",
  "scatter",
]);

export const flexibleChartDataSchema = z.object({
  type: flexibleChartTypeSchema.default("bar"),
  data: z.union([
    z.array(simpleDataSchema),
    z.array(multiSeriesDataSchema),
    z.array(divergingDataSchema),
    z.array(scatterDataSchema),
    z.array(dualLinePointSchema),
  ]),
  series: z.array(z.string()).optional().meta({ description: "Series names for grouped/stacked charts" }),
  divergingLabels: z.tuple([z.string(), z.string()]).optional(),
});

export type FlexibleChartData = z.infer<typeof flexibleChartDataSchema>;

export function deriveSeriesNames(data: any[], explicit: string[]): string[] {
  if (explicit.length > 0) return explicit;
  const first = data[0];
  if (!first) return [];
  if (first.values != null && typeof first.values === "object" && !Array.isArray(first.values)) {
    return Object.keys(first.values);
  }
  if (typeof first.value === "number") return ["value"];
  return [];
}

export function transformMultiSeriesData(data: any[], series: string[]) {
  return data.map((item) => {
    const result: Record<string, any> = { name: item.name };
    series.forEach((s) => {
      if (item.values != null && typeof item.values === "object" && s in item.values) {
        result[s] = Number(item.values[s]) || 0;
      } else if (s === "value" && typeof item.value === "number") {
        result[s] = item.value;
      } else if (typeof item[s] === "number") {
        result[s] = item[s];
      } else {
        result[s] = Number(item.values?.[s]) || 0;
      }
    });
    return result;
  });
}

export function transformDivergingData(data: any[]) {
  return data.map((item) => {
    if (typeof item.positive === "number" && typeof item.negative === "number") {
      return {
        name: item.name,
        positive: item.positive,
        negative: -Math.abs(item.negative),
      };
    }
    const v = Number(item.value);
    if (!Number.isNaN(v)) {
      return {
        name: item.name,
        positive: Math.max(0, v),
        negative: v < 0 ? v : 0,
      };
    }
    return { name: item.name, positive: 0, negative: 0 };
  });
}

export function normalizeScatterPoints(data: any[]) {
  return data.map((item, i) => {
    if (typeof item.x === "number" && typeof item.y === "number") {
      return { ...item, x: item.x, y: item.y };
    }
    if (typeof item.value === "number") {
      return { ...item, x: typeof item.x === "number" ? item.x : i + 1, y: item.value };
    }
    return { ...item, x: i + 1, y: 0 };
  });
}

/** Line-stats style rows: categorical `label` + two metrics (not a single `value` series). */
function dataIsDualLineShape(data: any[]): boolean {
  const row = data[0];
  return (
    !!row &&
    typeof row === "object" &&
    typeof row.label === "string" &&
    typeof row.valueA === "number" &&
    typeof row.valueB === "number" &&
    typeof row.value !== "number"
  );
}

const MULTI_SERIES_CHART_TYPES: FlexibleChartData["type"][] = [
  "bar-grouped-vertical",
  "bar-grouped-horizontal",
  "bar-stacked-vertical",
  "bar-stacked-horizontal",
  "bar-clustered",
  "area-stacked",
];

/**
 * Aligns `data`/`series` with `chartType`. Line-stats slides often keep `{ label, valueA, valueB }`
 * while bar/line/pie/etc. expect `name`/`value` or `values` + series keys.
 */
export function normalizeFlexibleChartData(
  chartType: FlexibleChartData["type"],
  data: any[],
  seriesIn: string[],
): { data: any[]; series: string[] } {
  const series = seriesIn ?? [];
  const rows = data ?? [];

  if (chartType === "line-dual") {
    if (dataIsDualLineShape(rows)) return { data: rows, series };
    return {
      data: rows.map((r, i) => ({
        label: r.label ?? r.name ?? `P${i + 1}`,
        valueA: typeof r.valueA === "number" ? r.valueA : typeof r.value === "number" ? r.value : 0,
        valueB: typeof r.valueB === "number" ? r.valueB : typeof r.value === "number" ? r.value : 0,
      })),
      series,
    };
  }

  if (!dataIsDualLineShape(rows)) {
    return { data: rows, series };
  }

  const dual = rows as Array<{ label: string; valueA: number; valueB: number }>;

  if (MULTI_SERIES_CHART_TYPES.includes(chartType)) {
    const keys = series.length >= 2 ? [series[0], series[1]] : ["A", "B"];
    const mapped = dual.map((r) => ({
      name: r.label,
      values: { [keys[0]]: r.valueA, [keys[1]]: r.valueB },
    }));
    return { data: mapped, series: keys };
  }

  if (chartType === "bar-diverging") {
    const mapped = dual.map((r) => ({
      name: r.label,
      positive: Math.max(0, r.valueA),
      negative: Math.max(0, r.valueB),
    }));
    return { data: mapped, series };
  }

  const mapped = dual.map((r) => ({
    name: r.label,
    value: r.valueA + r.valueB,
  }));
  return { data: mapped, series };
}

// ---- Recharts SVG renderer (replaces the former Chart.js/canvas one) ----

// Per-index fallbacks so multi-series charts stay distinguishable before a theme
// applies its --graph-N custom properties (Recharts renders the var() strings
// straight into the SVG, so the browser resolves the theme at paint time).
const REPORT_FALLBACK_PALETTE = [
  "#4d4ef3", "#157CFF", "#00b8d9", "#36b37e", "#ffab00",
  "#ff5630", "#6554c0", "#9fb6ff", "#00c7e6", "#79f2c0",
];
const graphVar = (index: number, fallback: string) =>
  `var(--graph-${index % 10}, ${index === 0 ? fallback : REPORT_FALLBACK_PALETTE[index % REPORT_FALLBACK_PALETTE.length]})`;
const AXIS_TEXT = "var(--background-text,#232223)";
const GRID_COLOR = "var(--stroke,#9CA3AF)";
const FONT = "var(--body-font-family,'Source Sans 3')";

type FlexibleReportChartProps = {
  chartType: FlexibleChartData["type"];
  data: any[];
  series?: string[];
  colorFallback?: string;
  dualLineColors?: [string, string];
  density?: "default" | "compact";
};

export function FlexibleReportChart({
  chartType,
  data: chartData,
  series = [],
  colorFallback = "#157CFF",
  dualLineColors = ["var(--graph-0,#9fb6ff)", "var(--graph-1,#4d4ef3)"],
  density = "default",
}: FlexibleReportChartProps) {
  const compact = density === "compact";
  const color = (i: number) => graphVar(i, colorFallback);
  const axisProps = {
    tick: { fill: AXIS_TEXT, fontSize: compact ? 9 : 12, fontFamily: FONT } as any,
    stroke: AXIS_TEXT,
    tickLine: false,
  };
  const margin = compact
    ? { top: 10, right: 12, bottom: 2, left: 0 }
    : { top: 20, right: 24, bottom: 4, left: 0 };
  const radius = compact ? 4 : 8;
  const grid = <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.4} vertical={false} />;
  const tip = <Tooltip />;

  const { data, series: normSeries } = normalizeFlexibleChartData(chartType, chartData ?? [], series ?? []);
  const seriesNames = deriveSeriesNames(data, normSeries);
  const legend = <Legend wrapperStyle={{ fontFamily: FONT, fontSize: compact ? 10 : 12 }} iconType="circle" />;

  const Wrap: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  );

  switch (chartType) {
    case "bar":
    case "bar-horizontal": {
      const rows = transformMultiSeriesData(data, ["value"]);
      const horizontal = chartType === "bar-horizontal";
      // Recharts only detects the category scale when XAxis/YAxis are DIRECT
      // children of the chart (not wrapped in a Fragment), so keep them inline.
      return (
        <Wrap>
          <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={margin}>
            <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.4} vertical={horizontal} horizontal={!horizontal} />
            <XAxis {...(horizontal ? { type: "number" } : { dataKey: "name" })} {...axisProps} />
            <YAxis {...(horizontal ? { type: "category" as const, dataKey: "name", width: compact ? 60 : 90 } : {})} {...axisProps} />
            {tip}
            <Bar dataKey="value" radius={horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0]} maxBarSize={compact ? 20 : 40} isAnimationActive={false}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
              {!compact && <LabelList dataKey="value" position={horizontal ? "right" : "top"} style={{ fill: AXIS_TEXT, fontFamily: FONT, fontSize: 11 }} />}
            </Bar>
          </BarChart>
        </Wrap>
      );
    }
    case "bar-grouped-vertical":
    case "bar-grouped-horizontal":
    case "bar-clustered":
    case "bar-stacked-vertical":
    case "bar-stacked-horizontal": {
      const rows = transformMultiSeriesData(data, seriesNames);
      const horizontal = chartType.endsWith("horizontal");
      const stacked = chartType.startsWith("bar-stacked");
      return (
        <Wrap>
          <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={margin}>
            <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.4} vertical={horizontal} horizontal={!horizontal} />
            <XAxis {...(horizontal ? { type: "number" } : { dataKey: "name" })} {...axisProps} />
            <YAxis {...(horizontal ? { type: "category" as const, dataKey: "name", width: compact ? 60 : 90 } : {})} {...axisProps} />
            {tip}{legend}
            {seriesNames.map((k, i) => (
              <Bar key={k} dataKey={k} fill={color(i)} stackId={stacked ? "a" : undefined}
                   radius={stacked ? 0 : (horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0])} isAnimationActive={false} />
            ))}
          </BarChart>
        </Wrap>
      );
    }
    case "bar-diverging": {
      const rows = transformDivergingData(data);
      return (
        <Wrap>
          <BarChart data={rows} layout="vertical" stackOffset="sign" margin={margin}>
            <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.4} horizontal={false} />
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey="name" width={compact ? 60 : 90} {...axisProps} />
            {tip}
            <ReferenceLine x={0} stroke={AXIS_TEXT} />
            <Bar dataKey="negative" fill={color(4)} stackId="a" radius={[radius, 0, 0, radius]} isAnimationActive={false} />
            <Bar dataKey="positive" fill={color(0)} stackId="a" radius={[0, radius, radius, 0]} isAnimationActive={false} />
          </BarChart>
        </Wrap>
      );
    }
    case "line-dual": {
      return (
        <Wrap>
          <LineChart data={data} margin={margin}>
            {grid}<XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} />{tip}{legend}
            <Line type="monotone" dataKey="valueA" stroke={dualLineColors[0]} strokeWidth={compact ? 2 : 3} dot={{ r: compact ? 2 : 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="valueB" stroke={dualLineColors[1]} strokeWidth={compact ? 2 : 3} dot={{ r: compact ? 2 : 3 }} isAnimationActive={false} />
          </LineChart>
        </Wrap>
      );
    }
    case "line": {
      const rows = transformMultiSeriesData(data, seriesNames.length ? seriesNames : ["value"]);
      const keys = seriesNames.length ? seriesNames : ["value"];
      return (
        <Wrap>
          <LineChart data={rows} margin={margin}>
            {grid}<XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} />{tip}{keys.length > 1 && legend}
            {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={color(i)} strokeWidth={compact ? 2 : 3} dot={{ r: compact ? 2 : 3 }} isAnimationActive={false} />)}
          </LineChart>
        </Wrap>
      );
    }
    case "area":
    case "area-stacked": {
      const stacked = chartType === "area-stacked";
      const keys = seriesNames.length ? seriesNames : ["value"];
      const rows = transformMultiSeriesData(data, keys);
      return (
        <Wrap>
          <AreaChart data={rows} margin={margin}>
            {grid}<XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} />{tip}{keys.length > 1 && legend}
            {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stackId={stacked ? "a" : undefined} stroke={color(i)} fill={color(i)} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />)}
          </AreaChart>
        </Wrap>
      );
    }
    case "pie":
    case "donut": {
      const rows = transformMultiSeriesData(data, ["value"]);
      return (
        <Wrap>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" outerRadius="82%"
                 innerRadius={chartType === "donut" ? "58%" : 0} isAnimationActive={false}
                 labelLine={false} label={({ percent }: any) => `${Math.round((percent || 0) * 100)}%`}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
            </Pie>
            {tip}{legend}
          </PieChart>
        </Wrap>
      );
    }
    case "scatter": {
      const rows = normalizeScatterPoints(data);
      return (
        <Wrap>
          <ScatterChart margin={margin}>
            {grid}
            <XAxis type="number" dataKey="x" {...axisProps} />
            <YAxis type="number" dataKey="y" {...axisProps} />
            {tip}
            <Scatter data={rows} isAnimationActive={false}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
            </Scatter>
          </ScatterChart>
        </Wrap>
      );
    }
    default:
      return null;
  }
}
