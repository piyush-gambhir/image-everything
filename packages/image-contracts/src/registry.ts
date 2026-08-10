import type { z } from "zod";

import {
  AdjustOptionsSchema,
  AlphaOptionsSchema,
  BatchOptionsSchema,
  BlurSharpenOptionsSchema,
  CollageOptionsSchema,
  CompareOptionsSchema,
  CompressOptionsSchema,
  CompressToSizeOptionsSchema,
  ConvertOptionsSchema,
  CropOptionsSchema,
  ExtendOptionsSchema,
  FilterOptionsSchema,
  FrameOptionsSchema,
  HistogramOptionsSchema,
  MetadataCleanOptionsSchema,
  MetadataEditOptionsSchema,
  MetadataOptionsSchema,
  NormalizeOptionsSchema,
  PaletteOptionsSchema,
  PixelateOptionsSchema,
  ProcessOptionsSchema,
  QuickEnhanceOptionsSchema,
  ResizeOptionsSchema,
  ResponsiveOptionsSchema,
  RotateOptionsSchema,
  StatsOptionsSchema,
  TrimOptionsSchema,
  WatermarkOptionsSchema,
} from "./schemas";

export const TOOL_IDS = [
  "compress",
  "compress-to-size",
  "resize",
  "convert",
  "responsive",
  "quick-enhance",
  "crop",
  "rotate",
  "trim",
  "extend",
  "alpha",
  "adjust",
  "normalize",
  "filter",
  "blur-sharpen",
  "pixelate",
  "watermark",
  "frame",
  "collage",
  "metadata",
  "metadata-clean",
  "metadata-edit",
  "stats",
  "palette",
  "histogram",
  "compare",
  "process",
  "batch",
] as const;

export const V2_TOOL_IDS = TOOL_IDS;
export type ToolId = (typeof TOOL_IDS)[number];
export type V2ToolId = ToolId;

export const ROUTE_IDS = [...TOOL_IDS, "compare-diff"] as const;
export type RouteId = (typeof ROUTE_IDS)[number];

export type InputKind = "single" | "single-overlay" | "multiple" | "compare";
export type ResultKind = "image" | "json" | "zip";

export type RouteDefinition = Readonly<{
  id: RouteId;
  toolId: ToolId;
  method: "POST";
  path: string;
  workerPath: string;
  inputKind: InputKind;
  resultKind: ResultKind;
}>;

const route = (
  id: RouteId,
  toolId: ToolId,
  suffix: string,
  inputKind: InputKind,
  resultKind: ResultKind,
): RouteDefinition => ({
  id,
  toolId,
  method: "POST",
  path: `/api/v2/images/${suffix}`,
  workerPath: `/v2/${suffix}`,
  inputKind,
  resultKind,
});

export const V2_ROUTE_REGISTRY = Object.freeze([
  route("compress", "compress", "compress", "single", "image"),
  route(
    "compress-to-size",
    "compress-to-size",
    "compress-to-size",
    "single",
    "image",
  ),
  route("resize", "resize", "resize", "single", "image"),
  route("convert", "convert", "convert", "single", "image"),
  route("responsive", "responsive", "responsive", "single", "zip"),
  route("quick-enhance", "quick-enhance", "quick-enhance", "single", "image"),
  route("crop", "crop", "crop", "single", "image"),
  route("rotate", "rotate", "rotate", "single", "image"),
  route("trim", "trim", "trim", "single", "image"),
  route("extend", "extend", "extend", "single", "image"),
  route("alpha", "alpha", "alpha", "single", "image"),
  route("adjust", "adjust", "adjust", "single", "image"),
  route("normalize", "normalize", "normalize", "single", "image"),
  route("filter", "filter", "filter", "single", "image"),
  route("blur-sharpen", "blur-sharpen", "blur-sharpen", "single", "image"),
  route("pixelate", "pixelate", "pixelate", "single", "image"),
  route("watermark", "watermark", "watermark", "single-overlay", "image"),
  route("frame", "frame", "frame", "single", "image"),
  route("collage", "collage", "collage", "multiple", "image"),
  route("metadata", "metadata", "metadata", "single", "json"),
  route(
    "metadata-clean",
    "metadata-clean",
    "metadata/clean",
    "single",
    "image",
  ),
  route("metadata-edit", "metadata-edit", "metadata/edit", "single", "image"),
  route("stats", "stats", "analyze/stats", "single", "json"),
  route("palette", "palette", "analyze/palette", "single", "json"),
  route("histogram", "histogram", "analyze/histogram", "single", "json"),
  route("compare", "compare", "analyze/compare", "compare", "json"),
  route("compare-diff", "compare", "analyze/compare/diff", "compare", "image"),
  route("process", "process", "process", "single", "image"),
  route("batch", "batch", "batch", "multiple", "zip"),
] satisfies readonly RouteDefinition[]);

export const ROUTE_REGISTRY = V2_ROUTE_REGISTRY;

export type ToolCategory =
  | "optimize"
  | "geometry"
  | "color"
  | "composition"
  | "metadata"
  | "automation";

export type ToolDefinition = Readonly<{
  id: ToolId;
  label: string;
  description: string;
  category: ToolCategory;
  routeId: RouteId;
  path: string;
  inputKind: InputKind;
  resultKind: ResultKind;
}>;

const definitions: ReadonlyArray<
  readonly [ToolId, string, string, ToolCategory, RouteId]
> = [
  [
    "compress",
    "Compress",
    "Optimize an image with codec-aware controls.",
    "optimize",
    "compress",
  ],
  [
    "compress-to-size",
    "Compress to size",
    "Search bounded quality settings for a byte target.",
    "optimize",
    "compress-to-size",
  ],
  [
    "resize",
    "Resize",
    "Resize by dimensions or percentage.",
    "optimize",
    "resize",
  ],
  [
    "convert",
    "Convert",
    "Encode to an explicit output format.",
    "optimize",
    "convert",
  ],
  [
    "responsive",
    "Responsive set",
    "Create multiple widths and formats in a ZIP.",
    "optimize",
    "responsive",
  ],
  [
    "quick-enhance",
    "Quick enhance",
    "Apply deterministic tonal and sharpness improvements.",
    "optimize",
    "quick-enhance",
  ],
  [
    "crop",
    "Crop",
    "Crop an exact rectangle or aspect ratio.",
    "geometry",
    "crop",
  ],
  [
    "rotate",
    "Rotate / flip",
    "Rotate by an arbitrary angle and flip axes.",
    "geometry",
    "rotate",
  ],
  ["trim", "Trim", "Remove a matching image border.", "geometry", "trim"],
  ["extend", "Extend / pad", "Extend each canvas edge.", "geometry", "extend"],
  [
    "alpha",
    "Background / alpha",
    "Flatten, add, remove, or extract alpha.",
    "geometry",
    "alpha",
  ],
  [
    "adjust",
    "Adjust color",
    "Adjust brightness, saturation, hue, contrast, and gamma.",
    "color",
    "adjust",
  ],
  [
    "normalize",
    "Normalize / CLAHE",
    "Apply global or local contrast normalization.",
    "color",
    "normalize",
  ],
  [
    "filter",
    "Filters",
    "Apply grayscale, sepia, invert, threshold, or tint.",
    "color",
    "filter",
  ],
  [
    "blur-sharpen",
    "Blur / sharpen / median",
    "Apply bounded local filtering.",
    "color",
    "blur-sharpen",
  ],
  [
    "pixelate",
    "Pixelate",
    "Create deterministic block pixelation.",
    "color",
    "pixelate",
  ],
  [
    "watermark",
    "Watermark",
    "Overlay safe text or an uploaded image.",
    "composition",
    "watermark",
  ],
  [
    "frame",
    "Frame / rounded corners",
    "Add a border and rounded mask.",
    "composition",
    "frame",
  ],
  [
    "collage",
    "Collage / contact sheet",
    "Lay out two to twenty images.",
    "composition",
    "collage",
  ],
  [
    "metadata",
    "Metadata inspector",
    "Inspect image and recognized metadata.",
    "metadata",
    "metadata",
  ],
  [
    "metadata-clean",
    "Metadata cleaner",
    "Remove private or all metadata.",
    "metadata",
    "metadata-clean",
  ],
  [
    "metadata-edit",
    "Metadata editor",
    "Write a safe metadata allowlist.",
    "metadata",
    "metadata-edit",
  ],
  [
    "stats",
    "Image statistics",
    "Report color and per-channel statistics.",
    "metadata",
    "stats",
  ],
  [
    "palette",
    "Palette",
    "Extract deterministic sampled colors.",
    "metadata",
    "palette",
  ],
  [
    "histogram",
    "Histogram",
    "Compute RGB, RGBA, or luminance bins.",
    "metadata",
    "histogram",
  ],
  [
    "compare",
    "Compare",
    "Measure difference and optionally render a diff.",
    "metadata",
    "compare",
  ],
  [
    "process",
    "Pipeline",
    "Run a validated sequence with one decode and encode.",
    "automation",
    "process",
  ],
  [
    "batch",
    "Batch",
    "Run one pipeline across multiple inputs.",
    "automation",
    "batch",
  ],
];

export const TOOL_REGISTRY: readonly ToolDefinition[] = Object.freeze(
  definitions.map(([id, label, description, category, routeId]) => {
    const routeDefinition = V2_ROUTE_REGISTRY.find(
      (candidate) => candidate.id === routeId,
    );
    if (!routeDefinition) throw new Error(`Missing route for ${id}`);
    return {
      id,
      label,
      description,
      category,
      routeId,
      path: routeDefinition.path,
      inputKind: routeDefinition.inputKind,
      resultKind: routeDefinition.resultKind,
    };
  }),
);

export const TOOL_OPTION_SCHEMAS: Readonly<Record<ToolId, z.ZodType>> = {
  compress: CompressOptionsSchema,
  "compress-to-size": CompressToSizeOptionsSchema,
  resize: ResizeOptionsSchema,
  convert: ConvertOptionsSchema,
  responsive: ResponsiveOptionsSchema,
  "quick-enhance": QuickEnhanceOptionsSchema,
  crop: CropOptionsSchema,
  rotate: RotateOptionsSchema,
  trim: TrimOptionsSchema,
  extend: ExtendOptionsSchema,
  alpha: AlphaOptionsSchema,
  adjust: AdjustOptionsSchema,
  normalize: NormalizeOptionsSchema,
  filter: FilterOptionsSchema,
  "blur-sharpen": BlurSharpenOptionsSchema,
  pixelate: PixelateOptionsSchema,
  watermark: WatermarkOptionsSchema,
  frame: FrameOptionsSchema,
  collage: CollageOptionsSchema,
  metadata: MetadataOptionsSchema,
  "metadata-clean": MetadataCleanOptionsSchema,
  "metadata-edit": MetadataEditOptionsSchema,
  stats: StatsOptionsSchema,
  palette: PaletteOptionsSchema,
  histogram: HistogramOptionsSchema,
  compare: CompareOptionsSchema,
  process: ProcessOptionsSchema,
  batch: BatchOptionsSchema,
};

export const OPERATION_SCHEMAS = TOOL_OPTION_SCHEMAS;

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export function getToolOptionsSchema(toolId: ToolId): z.ZodType {
  return TOOL_OPTION_SCHEMAS[toolId];
}

export function getRouteById(routeId: RouteId): RouteDefinition {
  const definition = V2_ROUTE_REGISTRY.find(
    (candidate) => candidate.id === routeId,
  );
  if (!definition) throw new Error(`Unknown route: ${routeId}`);
  return definition;
}

export function getRouteByWorkerPath(
  path: string,
): RouteDefinition | undefined {
  return V2_ROUTE_REGISTRY.find((candidate) => candidate.workerPath === path);
}
