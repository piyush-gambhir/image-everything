import { z } from "zod";

const MEBIBYTE = 1024 * 1024;

export const LIMITS = Object.freeze({
  maxUploadBytes: 25 * MEBIBYTE,
  maxPrimaryUploadBytes: 25 * MEBIBYTE,
  maxAggregateBytes: 100 * MEBIBYTE,
  maxOverlayBytes: 10 * MEBIBYTE,
  maxInputPixels: 64_000_000,
  maxOutputPixels: 64_000_000,
  maxAggregateOutputBytes: 100 * MEBIBYTE,
  maxOutputDimension: 20_000,
  maxFiles: 20,
  maxBatchFiles: 20,
  maxCollageFiles: 20,
  maxPipelineSteps: 20,
  maxResponsiveVariants: 20,
  maxPaletteColors: 32,
  maxHistogramBins: 256,
  deadlineMs: 30_000,
  synchronousDeadlineMs: 30_000,
} as const);

export const LimitsSchema = z.object({
  maxUploadBytes: z.number().int().positive(),
  maxPrimaryUploadBytes: z.number().int().positive(),
  maxAggregateBytes: z.number().int().positive(),
  maxOverlayBytes: z.number().int().positive(),
  maxInputPixels: z.number().int().positive(),
  maxOutputPixels: z.number().int().positive(),
  maxAggregateOutputBytes: z.number().int().positive(),
  maxOutputDimension: z.number().int().positive(),
  maxFiles: z.number().int().positive(),
  maxBatchFiles: z.number().int().positive(),
  maxCollageFiles: z.number().int().positive(),
  maxPipelineSteps: z.number().int().positive(),
  maxResponsiveVariants: z.number().int().positive(),
  maxPaletteColors: z.number().int().positive(),
  maxHistogramBins: z.number().int().positive(),
  deadlineMs: z.number().int().positive(),
  synchronousDeadlineMs: z.number().int().positive(),
});

export type Limits = z.infer<typeof LimitsSchema>;
