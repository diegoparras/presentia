// Free-canvas block model. A "canvas:free" slide stores `content = { blocks }`,
// each block absolutely positioned in the 1280x720 base coordinate space — the
// same space the freeze/export pipeline already understands, so canvas slides
// flow to PDF/PPTX with no extra work.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const CANVAS_LAYOUT_ID = "canvas:free";

export type CanvasBlockType = "text" | "image" | "shape";

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
  return { ...base, w: 360, h: 240, src: "" };
}
