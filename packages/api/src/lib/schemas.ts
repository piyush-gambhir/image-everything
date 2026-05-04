import { z } from "zod";

export const cleanOptionsSchema = z.object({
  keep: z.array(z.enum(["orientation", "colorProfile"])).optional(),
});

export const compressOptionsSchema = z.object({
  format: z.enum(["auto", "jpeg", "png", "webp", "avif"]).default("auto"),
  quality: z.number().int().min(1).max(100).default(80),
  lossless: z.boolean().optional(),
  mozjpeg: z.boolean().optional(),
});

export const resizeOptionsSchema = z
  .object({
    width: z.number().int().positive().max(20000).optional(),
    height: z.number().int().positive().max(20000).optional(),
    fit: z
      .enum(["cover", "contain", "fill", "inside", "outside"])
      .default("cover"),
    position: z.string().optional(),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "background must be a #RRGGBB hex color")
      .optional(),
    withoutEnlargement: z.boolean().optional(),
  })
  .refine((d) => d.width !== undefined || d.height !== undefined, {
    message: "At least one of width or height must be provided",
  });

export const convertOptionsSchema = z.object({
  targetFormat: z.enum(["jpeg", "png", "webp", "avif", "gif"]),
  quality: z.number().int().min(1).max(100).optional(),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "background must be a #RRGGBB hex color")
    .optional(),
});

export const cropOptionsSchema = z.object({
  left: z.number().int().min(0),
  top: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const rotateOptionsSchema = z.object({
  angle: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
});

export const watermarkOptionsSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().min(1).max(200),
    font: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#ffffff"),
    opacity: z.number().min(0).max(1).default(0.7),
    position: z
      .enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"])
      .default("bottom-right"),
    padding: z.number().int().min(0).default(24),
  }),
  z.object({
    kind: z.literal("image"),
    opacity: z.number().min(0).max(1).default(0.7),
    position: z
      .enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"])
      .default("bottom-right"),
    padding: z.number().int().min(0).default(24),
  }),
]);

export const autoEnhanceOptionsSchema = z.object({
  normalize: z.boolean().default(true),
  brightness: z.number().min(0.1).max(3).optional(),
  saturation: z.number().min(0).max(3).optional(),
  hue: z.number().min(-360).max(360).optional(),
  sharpen: z.boolean().optional(),
});

export const transformOptionsSchema = z.object({
  ops: z
    .array(
      z.discriminatedUnion("op", [
        z.object({
          op: z.literal("clean"),
          options: cleanOptionsSchema.optional(),
        }),
        z.object({ op: z.literal("compress"), options: compressOptionsSchema }),
        z.object({ op: z.literal("resize"), options: resizeOptionsSchema }),
        z.object({ op: z.literal("convert"), options: convertOptionsSchema }),
        z.object({ op: z.literal("crop"), options: cropOptionsSchema }),
        z.object({ op: z.literal("rotate"), options: rotateOptionsSchema }),
        z.object({
          op: z.literal("autoEnhance"),
          options: autoEnhanceOptionsSchema.optional(),
        }),
      ]),
    )
    .min(1)
    .max(20),
});

export type CleanOptions = z.infer<typeof cleanOptionsSchema>;
export type CompressOptions = z.infer<typeof compressOptionsSchema>;
export type ResizeOptions = z.infer<typeof resizeOptionsSchema>;
export type ConvertOptions = z.infer<typeof convertOptionsSchema>;
export type CropOptions = z.infer<typeof cropOptionsSchema>;
export type RotateOptions = z.infer<typeof rotateOptionsSchema>;
export type WatermarkOptions = z.infer<typeof watermarkOptionsSchema>;
export type AutoEnhanceOptions = z.infer<typeof autoEnhanceOptionsSchema>;
export type TransformOptions = z.infer<typeof transformOptionsSchema>;
export type TransformOp = TransformOptions["ops"][number];
