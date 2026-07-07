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
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

type SimpleChartType = "bar" | "horizontalBar" | "line" | "pie";
type SimpleChartDatum = { label: string; value: number };
type MultiLineDatum = Record<string, string | number>;

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#e56a5c",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#e56a5c",
];
const graphColor = (index: number, fallback?: string) =>
  `var(--graph-${index % 10}, ${fallback || DEFAULT_COLORS[index % DEFAULT_COLORS.length]})`;
const AXIS_COLOR = "var(--background-text, #7f8491)";
const GRID_COLOR = "var(--background-text, #E5E7EB)";
const FONT_FAMILY = "var(--heading-font-family, Poppins)";
const humanize = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

const axisProps = {
  tick: { fill: AXIS_COLOR, fontSize: 12, fontWeight: 600, fontFamily: FONT_FAMILY } as any,
  stroke: AXIS_COLOR,
  tickLine: false,
} as const;

export const ModernSimpleChart: React.FC<{
  type: SimpleChartType;
  data: SimpleChartDatum[];
  showLabels: boolean;
  className?: string;
}> = ({ type, data, showLabels, className }) => {
  const rows = Array.isArray(data) ? data : [];

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%" className={className}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            outerRadius="75%"
            isAnimationActive={false}
            labelLine={false}
            label={showLabels ? (({ percent }: any) => `${Math.round((percent || 0) * 100)}%`) : undefined}
          >
            {rows.map((_, i) => <Cell key={i} fill={graphColor(i)} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%" className={className}>
        <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip />
          <Line dataKey="value" stroke={graphColor(0)} strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false}>
            {showLabels ? <LabelList dataKey="value" position="top" /> : null}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const horizontal = type === "horizontalBar";
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 20, right: 20, bottom: 10, left: horizontal ? 20 : 0 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey="label" width={90} {...axisProps} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
          </>
        )}
        <Tooltip />
        <Bar dataKey="value" radius={horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]} isAnimationActive={false}>
          {rows.map((_, i) => <Cell key={i} fill={graphColor(i)} />)}
          {showLabels ? <LabelList dataKey="value" position={horizontal ? "right" : "top"} /> : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const ModernMultiLineChart: React.FC<{
  data: MultiLineDatum[];
  seriesKeys: string[];
  colors?: string[];
}> = ({ data, seriesKeys, colors = DEFAULT_COLORS }) => {
  const rows = Array.isArray(data) ? data : [];
  const keys = Array.isArray(seriesKeys) ? seriesKeys : [];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.25} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        <Legend wrapperStyle={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: 600 }} iconType="circle" />
        {keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={humanize(key)}
            stroke={graphColor(i, colors[i % colors.length])}
            strokeWidth={3}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
