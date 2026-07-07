// Free-canvas block model. A "canvas:free" slide stores `content = { blocks }`,
// each block absolutely positioned in the 1280x720 base coordinate space — the
// same space the freeze/export pipeline already understands, so canvas slides
// flow to PDF/PPTX with no extra work.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const CANVAS_LAYOUT_ID = "canvas:free";

export type CanvasBlockType =
  | "text"
  | "image"
  | "shape"
  | "icon"
  | "table"
  | "embed"
  | "chart";

export type CanvasChartType = "bar" | "line" | "area" | "pie";

export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation?: number;

  // text
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;

  // image
  src?: string;

  // shape
  shape?: "rect" | "ellipse";
  fill?: string;
  radius?: number;

  // icon (lucide icon name, e.g. "Star")
  icon?: string;

  // table / chart share the same tabular model: rows[r][c] strings, first row is header.
  // For a chart, column 0 is the category label and columns 1..n are numeric series.
  rows?: string[][];
  headerFill?: string;

  // chart
  chartType?: CanvasChartType;
  showLegend?: boolean;
  showGrid?: boolean;

  // embed (iframe src — YouTube, Sheets, any URL)
  embedSrc?: string;
}

export interface CanvasContent {
  blocks: CanvasBlock[];
  background?: string;
}

export function isCanvasSlide(layout?: string): boolean {
  return layout === CANVAS_LAYOUT_ID;
}

let _seq = 0;
export function newBlockId(): string {
  _seq += 1;
  return `b${Date.now().toString(36)}${_seq}`;
}

export function defaultBlock(type: CanvasBlockType, z: number): CanvasBlock {
  const base = { id: newBlockId(), type, z, x: 480, y: 300, w: 320, h: 120, rotation: 0 };
  if (type === "text") {
    return { ...base, text: "Texto", color: "#111827", fontSize: 32, align: "left", bold: false };
  }
  if (type === "shape") {
    return { ...base, w: 240, h: 160, shape: "rect", fill: "#5141e5", radius: 8 };
  }
  if (type === "icon") {
    return { ...base, w: 96, h: 96, icon: "Star", color: "#5141e5" };
  }
  if (type === "table") {
    return {
      ...base,
      w: 480,
      h: 180,
      rows: [
        ["Columna 1", "Columna 2", "Columna 3"],
        ["", "", ""],
        ["", "", ""],
      ],
      color: "#111827",
      fontSize: 18,
      fill: "#ffffff",
      headerFill: "#5141e5",
    };
  }
  if (type === "embed") {
    return { ...base, w: 560, h: 315, embedSrc: "" };
  }
  if (type === "chart") {
    return {
      ...base,
      w: 520,
      h: 320,
      chartType: "bar",
      showLegend: true,
      showGrid: true,
      rows: [
        ["Categoría", "Serie 1"],
        ["Ene", "12"],
        ["Feb", "19"],
        ["Mar", "8"],
        ["Abr", "15"],
      ],
    };
  }
  return { ...base, w: 360, h: 240, src: "" };
}

// Parse the shared rows model into Recharts-ready data + the list of numeric series keys.
export function rowsToChartData(rows?: string[][]): {
  data: Array<Record<string, string | number>>;
  series: string[];
} {
  if (!rows || rows.length < 2) return { data: [], series: [] };
  const header = rows[0] || [];
  const series = header.slice(1).map((s, i) => s?.trim() || `Serie ${i + 1}`);
  const labelKey = header[0]?.trim() || "name";
  const data = rows.slice(1).map((r) => {
    const obj: Record<string, string | number> = { [labelKey]: r[0] ?? "" };
    series.forEach((s, i) => {
      const raw = (r[i + 1] ?? "").toString().replace(/[^0-9.\-]/g, "");
      const n = parseFloat(raw);
      obj[s] = Number.isFinite(n) ? n : 0;
    });
    return obj;
  });
  return { data, series };
}

// Parse pasted CSV/TSV (Google Sheets copies as TSV) into the rows model.
export function parseDelimited(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  const delim = lines.some((l) => l.includes("\t")) ? "\t" : ",";
  return lines.map((l) => l.split(delim).map((c) => c.trim()));
}
