"use client";

import React from "react";
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

export type EducationChartType =
  | "bar"
  | "bar-horizontal"
  | "bar-grouped-vertical"
  | "bar-grouped-horizontal"
  | "bar-stacked-vertical"
  | "bar-stacked-horizontal"
  | "bar-clustered"
  | "bar-diverging"
  | "line"
  | "area"
  | "area-stacked"
  | "pie"
  | "donut"
  | "scatter";

export type SimpleDatum = { name: string; value: number };
export type MultiSeriesDatum = { name: string; values: Record<string, number> };
export type DivergingDatum = { name: string; positive: number; negative: number };
export type ScatterDatum = { x: number; y: number; name?: string };
export type EducationChartDatum =
  | SimpleDatum
  | MultiSeriesDatum
  | DivergingDatum
  | ScatterDatum;

// Theme-driven palette (Recharts renders the var() strings straight into SVG;
// the browser resolves them, so this works with a theme or falls back).
const DEFAULT_COLORS = [
  "var(--graph-0,#4A15A8)", "var(--graph-1,#5B45AD)", "var(--graph-2,#7E6CC0)",
  "var(--graph-3,#9F94CD)", "var(--graph-4,#6A31B8)", "var(--graph-5,#4D2A97)",
  "var(--graph-6,#8357C7)", "var(--graph-7,#A178D8)", "var(--graph-8,#C0A5E8)",
  "var(--graph-9,#DDCFF5)",
];
const color = (i: number) => DEFAULT_COLORS[i % DEFAULT_COLORS.length];
const AXIS = "var(--background-text,#7C7A83)";
const GRID = "var(--stroke,#CFCBD8)";
const FONT = "var(--body-font-family,'Times New Roman')";

const axisProps = {
  tick: { fill: AXIS, fontSize: 12, fontFamily: FONT } as any,
  stroke: AXIS,
  tickLine: false,
} as const;

const isSimple = (d: EducationChartDatum): d is SimpleDatum =>
  typeof (d as SimpleDatum).name === "string" && typeof (d as SimpleDatum).value === "number";
const isMulti = (d: EducationChartDatum): d is MultiSeriesDatum =>
  typeof (d as MultiSeriesDatum).name === "string" && typeof (d as MultiSeriesDatum).values === "object";
const isDiverging = (d: EducationChartDatum): d is DivergingDatum =>
  typeof (d as DivergingDatum).positive === "number" && typeof (d as DivergingDatum).negative === "number";
const isScatter = (d: EducationChartDatum): d is ScatterDatum =>
  typeof (d as ScatterDatum).x === "number" && typeof (d as ScatterDatum).y === "number";

const toSimpleRows = (data: EducationChartDatum[]) =>
  data.filter(isSimple).map((d) => ({ name: d.name, value: d.value }));
const toMultiRows = (data: EducationChartDatum[], series: string[]) =>
  data.filter(isMulti).map((d) => {
    const row: Record<string, string | number> = { name: d.name };
    series.forEach((s) => (row[s] = d.values?.[s] ?? 0));
    return row;
  });
const toDivergingRows = (data: EducationChartDatum[]) =>
  data.filter(isDiverging).map((d) => ({
    name: d.name,
    positive: d.positive,
    negative: -Math.abs(d.negative),
  }));
const toScatterRows = (data: EducationChartDatum[]) => {
  const s = data.filter(isScatter);
  if (s.length) return s.map((d, i) => ({ x: d.x, y: d.y, name: d.name ?? String(i + 1) }));
  return data.filter(isSimple).map((d, i) => ({ x: i + 1, y: d.value, name: d.name }));
};

const Container: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
);

const EducationChartPrimitives: React.FC<{
  chartData: EducationChartDatum[];
  chartType: EducationChartType;
  series: string[];
  showLegend: boolean;
  showTooltip?: boolean;
  divergingLabels?: [string, string];
}> = ({ chartData, chartType, series, showLegend, showTooltip = true, divergingLabels = ["", ""] }) => {
  const data = Array.isArray(chartData) ? chartData : [];
  const keys = Array.isArray(series) ? series : [];
  const tip = showTooltip ? <Tooltip /> : null;
  const legend = showLegend ? (
    <Legend wrapperStyle={{ fontFamily: FONT, fontSize: 12 }} iconType="circle" />
  ) : null;
  const grid = <CartesianGrid stroke={GRID} strokeOpacity={0.5} vertical={false} />;
  const margin = { top: 20, right: 24, bottom: 4, left: 0 };

  switch (chartType) {
    case "bar":
    case "bar-horizontal": {
      const rows = toSimpleRows(data);
      const horizontal = chartType === "bar-horizontal";
      return (
        <Container>
          <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={margin}>
            <CartesianGrid stroke={GRID} strokeOpacity={0.5} vertical={horizontal} horizontal={!horizontal} />
            {horizontal
              ? (<><XAxis type="number" {...axisProps} /><YAxis type="category" dataKey="name" width={90} {...axisProps} /></>)
              : (<><XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} /></>)}
            {tip}
            <Bar dataKey="value" radius={horizontal ? [0, 10, 10, 0] : [18, 18, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
              <LabelList dataKey="value" position={horizontal ? "right" : "top"} style={{ fill: AXIS, fontFamily: FONT, fontSize: 11 }} />
            </Bar>
          </BarChart>
        </Container>
      );
    }
    case "bar-grouped-vertical":
    case "bar-grouped-horizontal":
    case "bar-clustered":
    case "bar-stacked-vertical":
    case "bar-stacked-horizontal": {
      const rows = toMultiRows(data, keys);
      const horizontal = chartType.endsWith("horizontal");
      const stacked = chartType.startsWith("bar-stacked");
      return (
        <Container>
          <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={margin}>
            <CartesianGrid stroke={GRID} strokeOpacity={0.5} vertical={horizontal} horizontal={!horizontal} />
            {horizontal
              ? (<><XAxis type="number" {...axisProps} /><YAxis type="category" dataKey="name" width={90} {...axisProps} /></>)
              : (<><XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} /></>)}
            {tip}{legend}
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={color(i)} stackId={stacked ? "a" : undefined}
                   radius={stacked ? 0 : (horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0])} isAnimationActive={false} />
            ))}
          </BarChart>
        </Container>
      );
    }
    case "bar-diverging": {
      const rows = toDivergingRows(data);
      return (
        <Container>
          <BarChart data={rows} layout="vertical" stackOffset="sign" margin={margin}>
            <CartesianGrid stroke={GRID} strokeOpacity={0.5} horizontal={false} />
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey="name" width={90} {...axisProps} />
            {tip}{legend}
            <ReferenceLine x={0} stroke={AXIS} />
            <Bar dataKey="negative" name={divergingLabels[1] || "Negative"} fill={color(4)} stackId="a" radius={[6, 0, 0, 6]} isAnimationActive={false} />
            <Bar dataKey="positive" name={divergingLabels[0] || "Positive"} fill={color(0)} stackId="a" radius={[0, 6, 6, 0]} isAnimationActive={false} />
          </BarChart>
        </Container>
      );
    }
    case "line": {
      const rows = keys.length ? toMultiRows(data, keys) : toSimpleRows(data);
      return (
        <Container>
          <LineChart data={rows} margin={margin}>
            {grid}<XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} />{tip}{legend}
            {keys.length
              ? keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={color(i)} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />)
              : <Line type="monotone" dataKey="value" stroke={color(0)} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />}
          </LineChart>
        </Container>
      );
    }
    case "area":
    case "area-stacked": {
      const stacked = chartType === "area-stacked";
      const rows = keys.length ? toMultiRows(data, keys) : toSimpleRows(data);
      return (
        <Container>
          <AreaChart data={rows} margin={margin}>
            {grid}<XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} />{tip}{legend}
            {keys.length
              ? keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stackId={stacked ? "a" : undefined} stroke={color(i)} fill={color(i)} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />)
              : <Area type="monotone" dataKey="value" stroke={color(0)} fill={color(0)} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />}
          </AreaChart>
        </Container>
      );
    }
    case "pie":
    case "donut": {
      const rows = toSimpleRows(data);
      return (
        <Container>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" outerRadius="80%"
                 innerRadius={chartType === "donut" ? "55%" : 0} isAnimationActive={false}
                 labelLine={false} label={({ percent }: any) => `${Math.round((percent || 0) * 100)}%`}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
            </Pie>
            {tip}{legend}
          </PieChart>
        </Container>
      );
    }
    case "scatter": {
      const rows = toScatterRows(data);
      return (
        <Container>
          <ScatterChart margin={margin}>
            {grid}
            <XAxis type="number" dataKey="x" {...axisProps} />
            <YAxis type="number" dataKey="y" {...axisProps} />
            {tip}
            <Scatter data={rows} isAnimationActive={false}>
              {rows.map((_, i) => <Cell key={i} fill={color(i)} />)}
            </Scatter>
          </ScatterChart>
        </Container>
      );
    }
    default:
      return null;
  }
};

export default EducationChartPrimitives;
