import { z } from "zod";

import { InputFormatSchema, OutputFormatSchema } from "./formats";
import { ProblemSchema } from "./protocol";

const NullableFiniteSchema = z.number().finite().nullable();

export const MetadataCategoryItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const MetadataResultSchema = z.object({
  format: InputFormatSchema.nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  pages: z.number().int().positive(),
  channels: z.number().int().positive().nullable(),
  hasAlpha: z.boolean().nullable(),
  density: NullableFiniteSchema,
  orientation: z.number().int().nullable(),
  bytes: z.number().int().nonnegative(),
  space: z.string().nullable(),
  isProgressive: z.boolean().nullable(),
  hasProfile: z.boolean().nullable(),
  exif: z.record(z.string(), z.unknown()).optional(),
  iptc: z.record(z.string(), z.unknown()).optional(),
  xmp: z.record(z.string(), z.unknown()).optional(),
  gps: z.record(z.string(), z.unknown()).optional(),
  icc: z.record(z.string(), z.unknown()).optional(),
  categorized: z.record(z.string(), z.array(MetadataCategoryItemSchema)),
});

export const ChannelStatsSchema = z.object({
  min: z.number(),
  max: z.number(),
  sum: z.number(),
  squaresSum: z.number(),
  mean: z.number(),
  stdev: z.number(),
  minX: z.number().int(),
  minY: z.number().int(),
  maxX: z.number().int(),
  maxY: z.number().int(),
});

export const StatsResultSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  space: z.string(),
  channels: z.array(ChannelStatsSchema),
  isOpaque: z.boolean(),
  entropy: z.number(),
  sharpness: z.number(),
  dominant: z.object({ r: z.number(), g: z.number(), b: z.number() }),
});

export const PaletteColorSchema = z.object({
  hex: z.string(),
  rgb: z.tuple([z.number(), z.number(), z.number()]),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const PaletteResultSchema = z.object({
  samplePixels: z.number().int().nonnegative(),
  colors: z.array(PaletteColorSchema),
});

export const HistogramResultSchema = z.object({
  mode: z.enum(["rgb", "rgba", "luminance"]),
  bins: z.number().int().positive(),
  pixels: z.number().int().nonnegative(),
  channels: z.record(z.string(), z.array(z.number().int().nonnegative())),
});

export const CompareResultSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  channels: z.number().int().positive(),
  mae: z.number().nonnegative(),
  rmse: z.number().nonnegative(),
  differingPixels: z.number().int().nonnegative(),
  differingPixelPercentage: z.number().min(0).max(100),
  threshold: z.number().int().min(0).max(255),
});

export const ArchiveManifestItemSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    input: z.string(),
    output: z.string(),
    format: OutputFormatSchema,
    bytes: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    status: z.literal("error"),
    input: z.string(),
    problem: ProblemSchema,
  }),
]);

export const ArchiveManifestSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["batch", "responsive"]),
  items: z.array(ArchiveManifestItemSchema),
});

export type MetadataResult = z.infer<typeof MetadataResultSchema>;
export type StatsResult = z.infer<typeof StatsResultSchema>;
export type PaletteResult = z.infer<typeof PaletteResultSchema>;
export type HistogramResult = z.infer<typeof HistogramResultSchema>;
export type CompareResult = z.infer<typeof CompareResultSchema>;
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>;
