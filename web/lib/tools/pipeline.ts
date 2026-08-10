import type { ToolControl } from "./types"

export const PIPELINE_STEP_DEFINITIONS = [
  {
    op: "resize",
    label: "Resize",
    defaults: {
      width: 1600,
      fit: "inside",
      position: "center",
      kernel: "lanczos3",
      background: "#00000000",
      withoutEnlargement: true,
      withoutReduction: false,
    },
  },
  {
    op: "crop",
    label: "Crop",
    defaults: {
      mode: "rectangle",
      left: 0,
      top: 0,
      width: 800,
      height: 800,
      aspectWidth: 1,
      aspectHeight: 1,
      position: "center",
    },
  },
  {
    op: "rotate",
    label: "Rotate / flip",
    defaults: {
      angle: 90,
      flipHorizontal: false,
      flipVertical: false,
      background: "#00000000",
    },
  },
  {
    op: "trim",
    label: "Trim",
    defaults: { threshold: 10, lineArt: false },
  },
  {
    op: "extend",
    label: "Extend / pad",
    defaults: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
      mode: "background",
      background: "#00000000",
    },
  },
  {
    op: "alpha",
    label: "Background / alpha",
    defaults: { action: "flatten", background: "#ffffff", alpha: 1 },
  },
  {
    op: "adjust",
    label: "Adjust color",
    defaults: { brightness: 1, saturation: 1, hue: 0, contrast: 0, gamma: 1 },
  },
  {
    op: "normalize",
    label: "Normalize / CLAHE",
    defaults: {
      mode: "normalize",
      lower: 1,
      upper: 99,
      width: 3,
      height: 3,
      maxSlope: 3,
    },
  },
  {
    op: "filter",
    label: "Filter",
    defaults: {
      kind: "grayscale",
      alpha: false,
      value: 128,
      grayscale: true,
      color: "#6d5dfc",
    },
  },
  {
    op: "blur-sharpen",
    label: "Blur / sharpen / median",
    defaults: { kind: "blur", sigma: 2, size: 3 },
  },
  {
    op: "pixelate",
    label: "Pixelate",
    defaults: { blockSize: 12 },
  },
  {
    op: "frame",
    label: "Frame / rounded corners",
    defaults: {
      border: 24,
      color: "#ffffff",
      radius: 32,
      background: "#00000000",
    },
  },
  {
    op: "watermark-text",
    label: "Text watermark",
    defaults: {
      kind: "text",
      text: "Image Everything",
      font: "sans",
      color: "#ffffff",
      strokeColor: "#00000080",
      opacity: 0.7,
      anchor: "bottom-right",
      offsetX: 24,
      offsetY: 24,
    },
  },
  {
    op: "quick-enhance",
    label: "Quick enhance",
    defaults: {
      normalize: true,
      brightness: 1,
      saturation: 1,
      hue: 0,
      sharpen: true,
    },
  },
] as const

export type PipelineOperation = (typeof PIPELINE_STEP_DEFINITIONS)[number]["op"]

export function getPipelineControls(
  op: PipelineOperation,
  toolControls: (id: string) => readonly ToolControl[]
): readonly ToolControl[] {
  if (op === "watermark-text") {
    return toolControls("watermark").filter(
      (control) => control.path !== "kind" && control.path !== "scale"
    )
  }
  return toolControls(op)
}
