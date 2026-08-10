import { z } from "zod";

import {
  AutoOutputFormatSchema,
  FitSchema,
  KernelSchema,
  OutputFormatSchema,
  PositionSchema,
} from "./formats";
import { LIMITS } from "./limits";

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, "Expected #RRGGBB or #RRGGBBAA");

export const QualitySchema = z.number().int().min(1).max(100);
export const AnchorSchema = z.enum([
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);

export const MetadataDispositionSchema = z.enum([
  "strip",
  "preserve",
  "privacy",
]);

export const EncoderOptionsSchema = z.object({
  format: AutoOutputFormatSchema.default("auto"),
  quality: QualitySchema.default(80),
  lossless: z.boolean().default(false),
  progressive: z.boolean().default(false),
  mozjpeg: z.boolean().default(true),
  effort: z.number().int().min(0).max(9).default(4),
  compressionLevel: z.number().int().min(0).max(9).default(9),
  chromaSubsampling: z.enum(["4:2:0", "4:4:4"]).default("4:2:0"),
  background: HexColorSchema.default("#ffffff"),
  metadata: MetadataDispositionSchema.default("strip"),
});

export const CompressOptionsSchema = EncoderOptionsSchema;

export const CompressToSizeOptionsSchema = z
  .object({
    targetBytes: z.number().int().min(1024).max(LIMITS.maxUploadBytes),
    format: z.enum(["jpeg", "webp", "avif"]).default("jpeg"),
    minQuality: QualitySchema.default(20),
    maxQuality: QualitySchema.default(95),
    tolerancePercent: z.number().min(0).max(25).default(5),
    maxIterations: z.number().int().min(1).max(12).default(8),
    background: HexColorSchema.default("#ffffff"),
    metadata: MetadataDispositionSchema.default("strip"),
  })
  .refine((value) => value.minQuality <= value.maxQuality, {
    path: ["minQuality"],
    message: "minQuality must be less than or equal to maxQuality",
  });

export const ResizeOptionsSchema = z
  .object({
    width: z
      .number()
      .int()
      .positive()
      .max(LIMITS.maxOutputDimension)
      .optional(),
    height: z
      .number()
      .int()
      .positive()
      .max(LIMITS.maxOutputDimension)
      .optional(),
    percent: z.number().positive().max(1000).optional(),
    fit: FitSchema.default("cover"),
    position: PositionSchema.default("center"),
    kernel: KernelSchema.default("lanczos3"),
    background: HexColorSchema.default("#00000000"),
    withoutEnlargement: z.boolean().default(false),
    withoutReduction: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    const hasDimensions =
      value.width !== undefined || value.height !== undefined;
    if (!hasDimensions && value.percent === undefined) {
      context.addIssue({
        code: "custom",
        message: "Provide width, height, or percent",
        path: ["width"],
      });
    }
    if (hasDimensions && value.percent !== undefined) {
      context.addIssue({
        code: "custom",
        message: "percent cannot be combined with width or height",
        path: ["percent"],
      });
    }
  });

export const ConvertOptionsSchema = z.object({
  format: OutputFormatSchema,
  quality: QualitySchema.default(80),
  lossless: z.boolean().default(false),
  progressive: z.boolean().default(false),
  effort: z.number().int().min(0).max(9).default(4),
  compressionLevel: z.number().int().min(0).max(9).default(9),
  background: HexColorSchema.default("#ffffff"),
  metadata: MetadataDispositionSchema.default("strip"),
});

export const ResponsiveOptionsSchema = z
  .object({
    widths: z
      .array(z.number().int().positive().max(LIMITS.maxOutputDimension))
      .min(1)
      .max(LIMITS.maxResponsiveVariants),
    formats: z.array(OutputFormatSchema).min(1).max(6).default(["webp"]),
    quality: QualitySchema.default(80),
    fit: FitSchema.default("inside"),
    withoutEnlargement: z.boolean().default(true),
    background: HexColorSchema.default("#ffffff"),
    filenamePrefix: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .default("image"),
  })
  .refine(
    (value) =>
      value.widths.length * value.formats.length <=
      LIMITS.maxResponsiveVariants,
    {
      message: `At most ${LIMITS.maxResponsiveVariants} responsive variants are allowed`,
    },
  );

export const QuickEnhanceOptionsSchema = z.object({
  normalize: z.boolean().default(true),
  brightness: z.number().min(0.1).max(3).default(1),
  saturation: z.number().min(0).max(3).default(1),
  hue: z.number().min(-360).max(360).default(0),
  sharpen: z.boolean().default(true),
});

const RectangleCropSchema = z.object({
  mode: z.literal("rectangle"),
  left: z.number().int().min(0),
  top: z.number().int().min(0),
  width: z.number().int().positive().max(LIMITS.maxOutputDimension),
  height: z.number().int().positive().max(LIMITS.maxOutputDimension),
});

const AspectCropSchema = z.object({
  mode: z.literal("aspect"),
  aspectWidth: z.number().positive().max(1000),
  aspectHeight: z.number().positive().max(1000),
  position: PositionSchema.default("center"),
});

export const CropOptionsSchema = z.discriminatedUnion("mode", [
  RectangleCropSchema,
  AspectCropSchema,
]);

export const RotateOptionsSchema = z.object({
  angle: z.number().min(-360).max(360).default(0),
  flipHorizontal: z.boolean().default(false),
  flipVertical: z.boolean().default(false),
  background: HexColorSchema.default("#00000000"),
});

export const TrimOptionsSchema = z.object({
  background: HexColorSchema.optional(),
  threshold: z.number().min(0).max(100).default(10),
  lineArt: z.boolean().default(false),
});

export const ExtendOptionsSchema = z
  .object({
    top: z.number().int().min(0).max(LIMITS.maxOutputDimension).default(0),
    right: z.number().int().min(0).max(LIMITS.maxOutputDimension).default(0),
    bottom: z.number().int().min(0).max(LIMITS.maxOutputDimension).default(0),
    left: z.number().int().min(0).max(LIMITS.maxOutputDimension).default(0),
    mode: z
      .enum(["background", "copy", "repeat", "mirror"])
      .default("background"),
    background: HexColorSchema.default("#00000000"),
  })
  .refine((value) => value.top + value.right + value.bottom + value.left > 0, {
    message: "At least one edge must be extended",
  });

export const AlphaOptionsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("flatten"),
    background: HexColorSchema.default("#ffffff"),
  }),
  z.object({
    action: z.literal("ensure"),
    alpha: z.number().min(0).max(1).default(1),
  }),
  z.object({ action: z.literal("remove") }),
  z.object({ action: z.literal("extract") }),
]);

export const AdjustOptionsSchema = z.object({
  brightness: z.number().min(0.1).max(3).default(1),
  saturation: z.number().min(0).max(3).default(1),
  hue: z.number().min(-360).max(360).default(0),
  contrast: z.number().min(-1).max(1).default(0),
  gamma: z.number().min(1).max(3).default(1),
});

export const NormalizeOptionsSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("normalize"),
      lower: z.number().min(0).max(99).default(1),
      upper: z.number().min(1).max(100).default(99),
    })
    .refine((value) => value.lower < value.upper, {
      message: "lower must be less than upper",
    }),
  z.object({
    mode: z.literal("clahe"),
    width: z.number().int().min(1).max(256).default(3),
    height: z.number().int().min(1).max(256).default(3),
    maxSlope: z.number().int().min(0).max(100).default(3),
  }),
]);

export const FilterOptionsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("grayscale") }),
  z.object({ kind: z.literal("sepia") }),
  z.object({ kind: z.literal("invert"), alpha: z.boolean().default(false) }),
  z.object({
    kind: z.literal("threshold"),
    value: z.number().int().min(0).max(255).default(128),
    grayscale: z.boolean().default(true),
  }),
  z.object({ kind: z.literal("tint"), color: HexColorSchema }),
]);

export const BlurSharpenOptionsSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("blur"),
    sigma: z.number().min(0.3).max(100).default(1),
  }),
  z.object({
    kind: z.literal("sharpen"),
    sigma: z.number().min(0.000001).max(10).default(1),
    m1: z.number().min(0).max(100).optional(),
    m2: z.number().min(0).max(100).optional(),
    x1: z.number().min(0).max(1_000_000).optional(),
    y2: z.number().min(0).max(1_000_000).optional(),
    y3: z.number().min(0).max(1_000_000).optional(),
  }),
  z.object({
    kind: z.literal("median"),
    size: z.number().int().min(1).max(25).default(3),
  }),
]);

export const PixelateOptionsSchema = z.object({
  blockSize: z.number().int().min(2).max(200).default(12),
});

const WatermarkBaseSchema = z.object({
  opacity: z.number().min(0).max(1).default(0.7),
  anchor: AnchorSchema.default("bottom-right"),
  offsetX: z.number().int().min(-20_000).max(20_000).default(24),
  offsetY: z.number().int().min(-20_000).max(20_000).default(24),
});

export const WatermarkOptionsSchema = z.discriminatedUnion("kind", [
  WatermarkBaseSchema.extend({
    kind: z.literal("text"),
    text: z.string().min(1).max(500),
    font: z.enum(["sans", "serif", "mono"]).default("sans"),
    fontSize: z.number().int().min(8).max(512).optional(),
    color: HexColorSchema.default("#ffffff"),
    strokeColor: HexColorSchema.default("#00000080"),
  }),
  WatermarkBaseSchema.extend({
    kind: z.literal("image"),
    scale: z.number().min(0.01).max(1).default(0.25),
  }),
]);

export const FrameOptionsSchema = z.object({
  border: z.number().int().min(0).max(2000).default(0),
  color: HexColorSchema.default("#ffffff"),
  radius: z.number().int().min(0).max(10_000).default(0),
  background: HexColorSchema.default("#00000000"),
});

export const CollageOptionsSchema = z.object({
  layout: z.enum(["grid", "horizontal", "vertical"]).default("grid"),
  columns: z.number().int().min(1).max(LIMITS.maxCollageFiles).optional(),
  cellWidth: z
    .number()
    .int()
    .min(1)
    .max(LIMITS.maxOutputDimension)
    .default(640),
  cellHeight: z
    .number()
    .int()
    .min(1)
    .max(LIMITS.maxOutputDimension)
    .default(480),
  fit: FitSchema.default("contain"),
  gap: z.number().int().min(0).max(1000).default(16),
  padding: z.number().int().min(0).max(2000).default(16),
  background: HexColorSchema.default("#ffffff"),
  format: OutputFormatSchema.default("jpeg"),
  quality: QualitySchema.default(85),
});

export const MetadataOptionsSchema = z.object({
  includeRaw: z.boolean().default(false),
  includeGps: z.boolean().default(true),
});

export const MetadataCleanOptionsSchema = z.object({
  policy: z
    .enum(["privacy", "strip-all", "preserve-selected"])
    .default("privacy"),
  preserve: z
    .array(z.enum(["orientation", "icc", "exif", "xmp"]))
    .max(4)
    .default([]),
});

const metadataEditFields = {
  artist: z.string().trim().max(200).optional(),
  copyright: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  software: z.string().trim().max(200).optional(),
  capturedAt: z.string().datetime({ offset: true }).optional(),
  density: z.number().int().min(1).max(100_000).optional(),
  preserveExisting: z.boolean().default(false),
};

export const MetadataEditFieldsSchema = z.object(metadataEditFields);

export const MetadataEditOptionsSchema = MetadataEditFieldsSchema.refine(
  (value) =>
    value.artist !== undefined ||
    value.copyright !== undefined ||
    value.description !== undefined ||
    value.software !== undefined ||
    value.capturedAt !== undefined ||
    value.density !== undefined,
  { message: "Provide at least one metadata field to edit" },
);

export const StatsOptionsSchema = z.object({
  includeChannels: z.boolean().default(true),
});

export const PaletteOptionsSchema = z.object({
  colors: z.number().int().min(2).max(LIMITS.maxPaletteColors).default(8),
  sampleSize: z.number().int().min(16).max(1024).default(128),
});

export const HistogramOptionsSchema = z.object({
  mode: z.enum(["rgb", "rgba", "luminance"]).default("rgb"),
  bins: z.number().int().min(2).max(LIMITS.maxHistogramBins).default(256),
});

export const CompareOptionsSchema = z.object({
  resize: z.enum(["error", "first", "smallest", "largest"]).default("error"),
  threshold: z.number().int().min(0).max(255).default(0),
  includeAlpha: z.boolean().default(true),
  amplify: z.number().min(1).max(20).default(4),
});

const stepBase = {
  id: z.string().trim().min(1).max(80).optional(),
  enabled: z.boolean().default(true),
};

export const PipelineStepSchema = z.discriminatedUnion("op", [
  z.object({
    ...stepBase,
    op: z.literal("resize"),
    options: ResizeOptionsSchema,
  }),
  z.object({ ...stepBase, op: z.literal("crop"), options: CropOptionsSchema }),
  z.object({
    ...stepBase,
    op: z.literal("rotate"),
    options: RotateOptionsSchema,
  }),
  z.object({ ...stepBase, op: z.literal("trim"), options: TrimOptionsSchema }),
  z.object({
    ...stepBase,
    op: z.literal("extend"),
    options: ExtendOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("alpha"),
    options: AlphaOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("adjust"),
    options: AdjustOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("normalize"),
    options: NormalizeOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("filter"),
    options: FilterOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("blur-sharpen"),
    options: BlurSharpenOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("pixelate"),
    options: PixelateOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("frame"),
    options: FrameOptionsSchema,
  }),
  z.object({
    ...stepBase,
    op: z.literal("watermark-text"),
    options: WatermarkOptionsSchema.and(z.object({ kind: z.literal("text") })),
  }),
  z.object({
    ...stepBase,
    op: z.literal("quick-enhance"),
    options: QuickEnhanceOptionsSchema,
  }),
]);

export const PipelineOutputSchema = EncoderOptionsSchema.extend({
  metadataEdits: MetadataEditFieldsSchema.optional(),
});

export const PipelineSchema = z.object({
  version: z.literal(1).default(1),
  steps: z.array(PipelineStepSchema).max(LIMITS.maxPipelineSteps),
  output: PipelineOutputSchema.default(() => EncoderOptionsSchema.parse({})),
});

export const ProcessOptionsSchema = PipelineSchema;

export const BatchOptionsSchema = z.object({
  pipeline: PipelineSchema,
  continueOnError: z.boolean().default(true),
  filenamePrefix: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .default("processed"),
});

export const ToolOptionsSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("compress"), options: CompressOptionsSchema }),
  z.object({
    tool: z.literal("compress-to-size"),
    options: CompressToSizeOptionsSchema,
  }),
  z.object({ tool: z.literal("resize"), options: ResizeOptionsSchema }),
  z.object({ tool: z.literal("convert"), options: ConvertOptionsSchema }),
  z.object({ tool: z.literal("responsive"), options: ResponsiveOptionsSchema }),
  z.object({
    tool: z.literal("quick-enhance"),
    options: QuickEnhanceOptionsSchema,
  }),
  z.object({ tool: z.literal("crop"), options: CropOptionsSchema }),
  z.object({ tool: z.literal("rotate"), options: RotateOptionsSchema }),
  z.object({ tool: z.literal("trim"), options: TrimOptionsSchema }),
  z.object({ tool: z.literal("extend"), options: ExtendOptionsSchema }),
  z.object({ tool: z.literal("alpha"), options: AlphaOptionsSchema }),
  z.object({ tool: z.literal("adjust"), options: AdjustOptionsSchema }),
  z.object({ tool: z.literal("normalize"), options: NormalizeOptionsSchema }),
  z.object({ tool: z.literal("filter"), options: FilterOptionsSchema }),
  z.object({
    tool: z.literal("blur-sharpen"),
    options: BlurSharpenOptionsSchema,
  }),
  z.object({ tool: z.literal("pixelate"), options: PixelateOptionsSchema }),
  z.object({ tool: z.literal("watermark"), options: WatermarkOptionsSchema }),
  z.object({ tool: z.literal("frame"), options: FrameOptionsSchema }),
  z.object({ tool: z.literal("collage"), options: CollageOptionsSchema }),
  z.object({ tool: z.literal("metadata"), options: MetadataOptionsSchema }),
  z.object({
    tool: z.literal("metadata-clean"),
    options: MetadataCleanOptionsSchema,
  }),
  z.object({
    tool: z.literal("metadata-edit"),
    options: MetadataEditOptionsSchema,
  }),
  z.object({ tool: z.literal("stats"), options: StatsOptionsSchema }),
  z.object({ tool: z.literal("palette"), options: PaletteOptionsSchema }),
  z.object({ tool: z.literal("histogram"), options: HistogramOptionsSchema }),
  z.object({ tool: z.literal("compare"), options: CompareOptionsSchema }),
  z.object({ tool: z.literal("process"), options: ProcessOptionsSchema }),
  z.object({ tool: z.literal("batch"), options: BatchOptionsSchema }),
]);

export type CompressOptions = z.infer<typeof CompressOptionsSchema>;
export type CompressToSizeOptions = z.infer<typeof CompressToSizeOptionsSchema>;
export type ResizeOptions = z.infer<typeof ResizeOptionsSchema>;
export type ConvertOptions = z.infer<typeof ConvertOptionsSchema>;
export type ResponsiveOptions = z.infer<typeof ResponsiveOptionsSchema>;
export type QuickEnhanceOptions = z.infer<typeof QuickEnhanceOptionsSchema>;
export type CropOptions = z.infer<typeof CropOptionsSchema>;
export type RotateOptions = z.infer<typeof RotateOptionsSchema>;
export type TrimOptions = z.infer<typeof TrimOptionsSchema>;
export type ExtendOptions = z.infer<typeof ExtendOptionsSchema>;
export type AlphaOptions = z.infer<typeof AlphaOptionsSchema>;
export type AdjustOptions = z.infer<typeof AdjustOptionsSchema>;
export type NormalizeOptions = z.infer<typeof NormalizeOptionsSchema>;
export type FilterOptions = z.infer<typeof FilterOptionsSchema>;
export type BlurSharpenOptions = z.infer<typeof BlurSharpenOptionsSchema>;
export type PixelateOptions = z.infer<typeof PixelateOptionsSchema>;
export type WatermarkOptions = z.infer<typeof WatermarkOptionsSchema>;
export type FrameOptions = z.infer<typeof FrameOptionsSchema>;
export type CollageOptions = z.infer<typeof CollageOptionsSchema>;
export type MetadataOptions = z.infer<typeof MetadataOptionsSchema>;
export type MetadataCleanOptions = z.infer<typeof MetadataCleanOptionsSchema>;
export type MetadataEditOptions = z.infer<typeof MetadataEditOptionsSchema>;
export type StatsOptions = z.infer<typeof StatsOptionsSchema>;
export type PaletteOptions = z.infer<typeof PaletteOptionsSchema>;
export type HistogramOptions = z.infer<typeof HistogramOptionsSchema>;
export type CompareOptions = z.infer<typeof CompareOptionsSchema>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
export type ProcessOptions = z.infer<typeof ProcessOptionsSchema>;
export type BatchOptions = z.infer<typeof BatchOptionsSchema>;
export type ToolOptions = z.infer<typeof ToolOptionsSchema>;

// Lowercase aliases ease migration from the v1 backend naming convention.
export const compressOptionsSchema = CompressOptionsSchema;
export const compressToSizeOptionsSchema = CompressToSizeOptionsSchema;
export const resizeOptionsSchema = ResizeOptionsSchema;
export const convertOptionsSchema = ConvertOptionsSchema;
export const responsiveOptionsSchema = ResponsiveOptionsSchema;
export const quickEnhanceOptionsSchema = QuickEnhanceOptionsSchema;
export const cropOptionsSchema = CropOptionsSchema;
export const rotateOptionsSchema = RotateOptionsSchema;
export const trimOptionsSchema = TrimOptionsSchema;
export const extendOptionsSchema = ExtendOptionsSchema;
export const alphaOptionsSchema = AlphaOptionsSchema;
export const adjustOptionsSchema = AdjustOptionsSchema;
export const normalizeOptionsSchema = NormalizeOptionsSchema;
export const filterOptionsSchema = FilterOptionsSchema;
export const blurSharpenOptionsSchema = BlurSharpenOptionsSchema;
export const pixelateOptionsSchema = PixelateOptionsSchema;
export const watermarkOptionsSchema = WatermarkOptionsSchema;
export const frameOptionsSchema = FrameOptionsSchema;
export const collageOptionsSchema = CollageOptionsSchema;
export const metadataOptionsSchema = MetadataOptionsSchema;
export const metadataCleanOptionsSchema = MetadataCleanOptionsSchema;
export const metadataEditOptionsSchema = MetadataEditOptionsSchema;
export const statsOptionsSchema = StatsOptionsSchema;
export const paletteOptionsSchema = PaletteOptionsSchema;
export const histogramOptionsSchema = HistogramOptionsSchema;
export const compareOptionsSchema = CompareOptionsSchema;
export const pipelineSchema = PipelineSchema;
export const processOptionsSchema = ProcessOptionsSchema;
export const batchOptionsSchema = BatchOptionsSchema;
