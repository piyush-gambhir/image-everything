import { EXTENSION_TOOL_IDS, EXTENSION_OPTION_SCHEMAS } from "./extensions";
import {
  DecodeOptionsSchema,
  EncodeOptionsSchema,
  ToBase64OptionsSchema,
  FromBase64OptionsSchema,
  ValidateOptionsSchema,
} from "./codecs";
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
  "decode",
  "encode",
  "to-base64",
  "from-base64",
  "validate",
  ...EXTENSION_TOOL_IDS,
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
  route("decode", "decode", "decode", "single", "zip"),
  route("encode", "encode", "encode", "single", "image"),
  route("to-base64", "to-base64", "to-base64", "single", "json"),
  route("from-base64", "from-base64", "from-base64", "single", "image"),
  route("validate", "validate", "validate", "single", "json"),
  ...EXTENSION_TOOL_IDS.map((id) =>
    route(
      id,
      id,
      id,
      id === "sprite-sheet" ? "multiple" : "single",
      ["slice", "sprite-sheet", "icon-set"].includes(id)
        ? "zip"
        : ["pixel-inspect", "fingerprint"].includes(id)
          ? "json"
          : "image",
    ),
  ),
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
  [
    "decode",
    "Decode pixels",
    "Extract RGB or RGBA pixels and a layout manifest.",
    "optimize",
    "decode",
  ],
  [
    "encode",
    "Encode pixels",
    "Encode raw RGB or RGBA bytes as an image.",
    "optimize",
    "encode",
  ],
  [
    "to-base64",
    "Image to Base64",
    "Validate and serialize an image as Base64 or a data URL.",
    "optimize",
    "to-base64",
  ],
  [
    "from-base64",
    "Base64 to image",
    "Decode Base64 or an image data URL and convert its image.",
    "optimize",
    "from-base64",
  ],
  [
    "validate",
    "Validate image",
    "Verify the complete pixel payload of a supported still image.",
    "metadata",
    "validate",
  ],
  [
    "color-space",
    "Color space",
    "Convert to sRGB, grayscale, or CMYK.",
    "color",
    "color-space",
  ],
  [
    "extract-channel",
    "Extract channel",
    "Export a red, green, blue, or alpha channel.",
    "color",
    "extract-channel",
  ],
  [
    "duotone",
    "Duotone",
    "Map luminance between two chosen colors.",
    "color",
    "duotone",
  ],
  [
    "posterize",
    "Posterize",
    "Reduce the number of intensity levels.",
    "color",
    "posterize",
  ],
  [
    "solarize",
    "Solarize",
    "Invert intensities above a threshold.",
    "color",
    "solarize",
  ],
  [
    "levels",
    "Levels",
    "Set black and white points and midtone gamma.",
    "color",
    "levels",
  ],
  [
    "color-matrix",
    "Color matrix",
    "Apply a custom 3 by 3 RGB color transform.",
    "color",
    "color-matrix",
  ],
  [
    "convolve",
    "Convolution",
    "Detect edges, emboss, sharpen, or apply a custom kernel.",
    "color",
    "convolve",
  ],
  [
    "morphology",
    "Morphology",
    "Dilate or erode color intensity while preserving alpha.",
    "color",
    "morphology",
  ],
  [
    "replace-color",
    "Replace color",
    "Replace colors within a chosen RGB distance.",
    "color",
    "replace-color",
  ],
  [
    "chroma-key",
    "Chroma key",
    "Remove a selected background color with soft edges.",
    "color",
    "chroma-key",
  ],
  [
    "noise",
    "Noise / grain",
    "Add reproducible monochrome or color grain.",
    "color",
    "noise",
  ],
  [
    "affine",
    "Affine transform",
    "Scale, shear, or reflect with a two-dimensional matrix.",
    "geometry",
    "affine",
  ],
  [
    "vignette",
    "Vignette",
    "Darken image edges with a radial falloff.",
    "color",
    "vignette",
  ],
  [
    "shadow",
    "Drop shadow",
    "Add a soft shadow behind image alpha.",
    "composition",
    "shadow",
  ],
  [
    "reflection",
    "Reflection",
    "Add a fading reflection below the image.",
    "composition",
    "reflection",
  ],
  ["tile", "Tile image", "Repeat an image in a grid.", "composition", "tile"],
  [
    "slice",
    "Slice image",
    "Split an image into tiles with exact layout coordinates.",
    "automation",
    "slice",
  ],
  [
    "sprite-sheet",
    "Sprite sheet",
    "Pack multiple images into an atlas with frame coordinates.",
    "automation",
    "sprite-sheet",
  ],
  [
    "icon-set",
    "Icon set / favicon",
    "Generate PNG sizes and a multi-resolution ICO bundle.",
    "optimize",
    "icon-set",
  ],
  [
    "pixel-inspect",
    "Pixel inspector",
    "Read exact RGBA values at an oriented pixel coordinate.",
    "metadata",
    "pixel-inspect",
  ],
  [
    "fingerprint",
    "Image fingerprint",
    "Calculate a perceptual hash and SHA-256 of the source bytes.",
    "metadata",
    "fingerprint",
  ],
  [
    "auto-orient",
    "Auto-orient",
    "Bake EXIF orientation into pixels and remove the orientation tag.",
    "geometry",
    "auto-orient",
  ],
  [
    "redact",
    "Region masking",
    "Cover, blur, or pixelate selected rectangles.",
    "geometry",
    "redact",
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
  decode: DecodeOptionsSchema,
  encode: EncodeOptionsSchema,
  "to-base64": ToBase64OptionsSchema,
  "from-base64": FromBase64OptionsSchema,
  validate: ValidateOptionsSchema,
  ...EXTENSION_OPTION_SCHEMAS,
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
