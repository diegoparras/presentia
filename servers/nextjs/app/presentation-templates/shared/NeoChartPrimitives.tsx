"use client";
// Real Recharts (SVG). The Neo layouts are authored in Recharts JSX and compute
// their own colors locally (graphColors/serie.color), so they render natively as
// SVG here — no Chart.js, no <canvas>. This is what lets the deck be exported
// without a headless browser rasterizing a canvas.
export {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  Bar,
  Line,
  Area,
  Pie,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
  Text,
} from "recharts";
