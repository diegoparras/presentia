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
} from "recharts";

type GeneralChartType = "bar" | "line" | "area" | "pie" | "scatter";
type GeneralChartDatum = {
  name?: string;
  value?: number;
  x?: number;
  y?: number;
};

// Each data point gets its own colour, resolved from the theme's --graph-N
// custom properties (with a static fallback). Recharts renders these var()
// strings straight into SVG, so the browser resolves them for display and the
// deck can be frozen/exported without a canvas.
const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#e56a5c",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#e56a5c",
];
const graphColor = (index: number) =>
  `var(--graph-${index % 10}, ${CHART_COLORS[index % 10]})`;
const AXIS_COLOR = "var(--background-text, #7f8491)";
const FONT_FAMILY = "var(--heading-font-family, Poppins)";

const axisProps = {
  tick: { fill: AXIS_COLOR, fontSize: 12, fontWeight: 600, fontFamily: FONT_FAMILY } as any,
  stroke: AXIS_COLOR,
  tickLine: false,
} as const;

export const GeneralChart: React.FC<{
  type?: GeneralChartType;
  data: GeneralChartDatum[];
  showLegend: boolean;
  showTooltip: boolean;
}> = ({ type = "bar", data, showLegend, showTooltip }) => {
  const rows = Array.isArray(data) ? data : [];
  const legend = showLegend ? (
    <Legend wrapperStyle={{ fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: 600 }} />
  ) : null;
  const tip = showTooltip ? <Tooltip /> : null;
  const grid = <CartesianGrid stroke={AXIS_COLOR} strokeOpacity={0.25} vertical={false} />;
  const margin = { top: 20, right: 30, bottom: 0, left: 0 };

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            outerRadius="70%"
            isAnimationActive={false}
            labelLine={false}
            label={({ percent }: any) => `${Math.round((percent || 0) * 100)}%`}
          >
            {rows.map((_, i) => <Cell key={i} fill={graphColor(i)} />)}
          </Pie>
          {tip}
          {legend}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={margin}>
          <CartesianGrid stroke={AXIS_COLOR} strokeOpacity={0.25} />
          <XAxis type="number" dataKey="x" {...axisProps} />
          <YAxis type="number" dataKey="y" {...axisProps} />
          {tip}
          {legend}
          <Scatter data={rows} isAnimationActive={false}>
            {rows.map((_, i) => <Cell key={i} fill={graphColor(i)} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={margin}>
          {grid}
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          {tip}
          {legend}
          <Line dataKey="value" stroke={graphColor(0)} strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={margin}>
          {grid}
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          {tip}
          {legend}
          <Area dataKey="value" stroke={graphColor(0)} strokeWidth={3} fill={graphColor(0)} fillOpacity={0.2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // default: bar (multi-coloured)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={margin}>
        {grid}
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} />
        {tip}
        {legend}
        <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
          {rows.map((_, i) => <Cell key={i} fill={graphColor(i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
