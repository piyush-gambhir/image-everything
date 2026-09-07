import { z } from "zod";

import { OutputFormatSchema } from "./formats";
import { LIMITS } from "./limits";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const alphaColor = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
const dimension = z.number().int().min(1).max(LIMITS.maxOutputDimension);
const coordinate = z
  .number()
  .int()
  .min(0)
  .max(LIMITS.maxOutputDimension - 1);
const output = z.object({
  format: OutputFormatSchema.default("png"),
  quality: z.number().int().min(1).max(100).default(80),
  lossless: z.boolean().default(true),
});

export const ColorSpaceOptionsSchema = output
  .extend({
    space: z.enum(["srgb", "b-w", "cmyk"]).default("srgb"),
  })
  .refine(
    (value) =>
      value.space !== "cmyk" ||
      value.format === "jpeg" ||
      value.format === "tiff",
    {
      path: ["format"],
      message: "CMYK requires JPEG or TIFF output",
    },
  );
export const ExtractChannelOptionsSchema = output.extend({
  channel: z.enum(["red", "green", "blue", "alpha"]).default("red"),
});
export const DuotoneOptionsSchema = output.extend({
  dark: color.default("#0f172a"),
  light: color.default("#fbbf24"),
  amount: z.number().min(0).max(1).default(1),
});
export const PosterizeOptionsSchema = output.extend({
  levels: z.number().int().min(2).max(32).default(4),
});
export const SolarizeOptionsSchema = output.extend({
  threshold: z.number().int().min(0).max(255).default(128),
});
export const LevelsOptionsSchema = output
  .extend({
    black: z.number().int().min(0).max(254).default(16),
    white: z.number().int().min(1).max(255).default(235),
    gamma: z.number().min(0.1).max(5).default(1),
  })
  .refine((value) => value.black < value.white, {
    path: ["white"],
    message: "White point must exceed black point",
  });
export const ColorMatrixOptionsSchema = output.extend({
  matrix: z
    .array(z.number().min(-8).max(8))
    .length(9)
    .default([0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131]),
});
export const ConvolveOptionsSchema = output.extend({
  preset: z
    .enum(["edge", "emboss", "sharpen", "box-blur", "custom"])
    .default("edge"),
  kernel: z
    .array(z.number().min(-100).max(100))
    .length(9)
    .default([0, -1, 0, -1, 5, -1, 0, -1, 0]),
  scale: z.number().min(0.01).max(1000).default(1),
  offset: z.number().min(-255).max(255).default(0),
});
export const MorphologyOptionsSchema = output.extend({
  mode: z.enum(["dilate", "erode"]).default("dilate"),
  radius: z.number().int().min(1).max(10).default(1),
});
export const ReplaceColorOptionsSchema = output.extend({
  from: color.default("#ff0000"),
  to: color.default("#0000ff"),
  tolerance: z.number().min(0).max(442).default(30),
});
export const ChromaKeyOptionsSchema = output.extend({
  color: color.default("#00ff00"),
  tolerance: z.number().min(0).max(442).default(40),
  softness: z.number().min(0).max(442).default(20),
});
export const NoiseOptionsSchema = output.extend({
  amount: z.number().min(0).max(100).default(15),
  seed: z.number().int().min(0).max(4294967295).default(1),
  monochrome: z.boolean().default(true),
});
export const AffineOptionsSchema = output
  .extend({
    a: z.number().min(-4).max(4).default(1),
    b: z.number().min(-4).max(4).default(0.2),
    c: z.number().min(-4).max(4).default(0),
    d: z.number().min(-4).max(4).default(1),
    background: alphaColor.default("#00000000"),
  })
  .refine((value) => Math.abs(value.a * value.d - value.b * value.c) >= 0.01, {
    path: ["a"],
    message:
      "Affine matrix must be invertible (absolute determinant at least 0.01)",
  });
export const VignetteOptionsSchema = output.extend({
  strength: z.number().min(0).max(1).default(0.65),
  radius: z.number().min(0).max(1).default(0.35),
});
export const ShadowOptionsSchema = output.extend({
  offsetX: z.number().int().min(-500).max(500).default(12),
  offsetY: z.number().int().min(-500).max(500).default(12),
  blur: z.number().min(0.3).max(100).default(8),
  opacity: z.number().min(0).max(1).default(0.5),
  color: color.default("#000000"),
});
export const ReflectionOptionsSchema = output.extend({
  height: z.number().min(0.05).max(1).default(0.5),
  gap: z.number().int().min(0).max(500).default(8),
  opacity: z.number().min(0).max(1).default(0.5),
});
export const TileOptionsSchema = output.extend({
  columns: z.number().int().min(1).max(10).default(2),
  rows: z.number().int().min(1).max(10).default(2),
  gap: z.number().int().min(0).max(500).default(0),
  background: alphaColor.default("#00000000"),
});
export const SliceOptionsSchema = z
  .object({
    columns: z.number().int().min(1).max(10).default(2),
    rows: z.number().int().min(1).max(10).default(2),
    format: z.enum(["png", "jpeg", "webp"]).default("png"),
  })
  .refine((value) => value.columns * value.rows <= 20, {
    message: "At most 20 tiles may be generated",
  });
export const SpriteSheetOptionsSchema = z.object({
  cellWidth: dimension.default(64),
  cellHeight: dimension.default(64),
  columns: z.number().int().min(1).max(20).default(4),
  gap: z.number().int().min(0).max(500).default(0),
  padding: z.number().int().min(0).max(500).default(0),
  background: alphaColor.default("#00000000"),
});
export const IconSetOptionsSchema = z
  .object({
    sizes: z
      .array(z.number().int().min(8).max(1024))
      .min(1)
      .max(10)
      .default([16, 32, 48, 64, 128, 256, 512]),
    includeIco: z.boolean().default(true),
    fit: z.enum(["cover", "contain"]).default("contain"),
    background: alphaColor.default("#00000000"),
  })
  .refine((value) => new Set(value.sizes).size === value.sizes.length, {
    path: ["sizes"],
    message: "Icon sizes must be unique",
  })
  .refine(
    (value) => !value.includeIco || value.sizes.some((size) => size <= 256),
    {
      path: ["sizes"],
      message: "ICO output needs at least one size at or below 256",
    },
  );
export const PixelInspectOptionsSchema = z.object({
  x: z
    .number()
    .int()
    .min(0)
    .max(LIMITS.maxInputPixels - 1)
    .default(0),
  y: z
    .number()
    .int()
    .min(0)
    .max(LIMITS.maxInputPixels - 1)
    .default(0),
});
export const FingerprintOptionsSchema = z.object({
  algorithm: z.enum(["average", "difference"]).default("difference"),
});
export const AutoOrientOptionsSchema = output;
export const RedactOptionsSchema = output.extend({
  regions: z
    .array(
      z.object({
        left: coordinate,
        top: coordinate,
        width: dimension,
        height: dimension,
      }),
    )
    .min(1)
    .max(20)
    .default([{ left: 0, top: 0, width: 16, height: 16 }]),
  mode: z.enum(["solid", "blur", "pixelate"]).default("solid"),
  color: color.default("#000000"),
  blur: z.number().min(0.3).max(100).default(10),
  blockSize: z.number().int().min(2).max(128).default(12),
});

export const EXTENSION_OPTION_SCHEMAS = {
  "color-space": ColorSpaceOptionsSchema,
  "extract-channel": ExtractChannelOptionsSchema,
  duotone: DuotoneOptionsSchema,
  posterize: PosterizeOptionsSchema,
  solarize: SolarizeOptionsSchema,
  levels: LevelsOptionsSchema,
  "color-matrix": ColorMatrixOptionsSchema,
  convolve: ConvolveOptionsSchema,
  morphology: MorphologyOptionsSchema,
  "replace-color": ReplaceColorOptionsSchema,
  "chroma-key": ChromaKeyOptionsSchema,
  noise: NoiseOptionsSchema,
  affine: AffineOptionsSchema,
  vignette: VignetteOptionsSchema,
  shadow: ShadowOptionsSchema,
  reflection: ReflectionOptionsSchema,
  tile: TileOptionsSchema,
  slice: SliceOptionsSchema,
  "sprite-sheet": SpriteSheetOptionsSchema,
  "icon-set": IconSetOptionsSchema,
  "pixel-inspect": PixelInspectOptionsSchema,
  fingerprint: FingerprintOptionsSchema,
  "auto-orient": AutoOrientOptionsSchema,
  redact: RedactOptionsSchema,
} as const;

export const EXTENSION_TOOL_IDS = [
  "color-space",
  "extract-channel",
  "duotone",
  "posterize",
  "solarize",
  "levels",
  "color-matrix",
  "convolve",
  "morphology",
  "replace-color",
  "chroma-key",
  "noise",
  "affine",
  "vignette",
  "shadow",
  "reflection",
  "tile",
  "slice",
  "sprite-sheet",
  "icon-set",
  "pixel-inspect",
  "fingerprint",
  "auto-orient",
  "redact",
] as const;
export type ExtensionToolId = (typeof EXTENSION_TOOL_IDS)[number];
export const PixelInspectResultSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgba: z.tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
  ]),
  hex: z.string().regex(/^#[0-9a-f]{8}$/),
});
export const FingerprintResultSchema = z.object({
  algorithm: z.enum(["average", "difference"]),
  hash: z.string().regex(/^[0-9a-f]{16}$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const assetFile = z.string().regex(/^[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/);
export const SliceManifestSchema = z.object({
  version: z.literal(1),
  kind: z.literal("slice"),
  width: dimension,
  height: dimension,
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  tiles: z
    .array(
      z.object({
        file: assetFile,
        row: coordinate,
        column: coordinate,
        left: coordinate,
        top: coordinate,
        width: dimension,
        height: dimension,
      }),
    )
    .min(1)
    .max(20),
});
export const SpriteSheetManifestSchema = z.object({
  version: z.literal(1),
  kind: z.literal("sprite-sheet"),
  image: z.literal("sprite-sheet.png"),
  width: dimension,
  height: dimension,
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  sprites: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        source: z.string(),
        left: coordinate,
        top: coordinate,
        width: dimension,
        height: dimension,
      }),
    )
    .min(1)
    .max(20),
});
export const IconSetManifestSchema = z.object({
  version: z.literal(1),
  kind: z.literal("icon-set"),
  icons: z
    .array(z.object({ file: assetFile, width: dimension, height: dimension }))
    .min(1)
    .max(10),
  ico: z.literal("favicon.ico").optional(),
});

export type ExtensionOptions<T extends ExtensionToolId> = z.infer<
  (typeof EXTENSION_OPTION_SCHEMAS)[T]
>;

// These tools are standalone operations; pipeline terminal options keep their
// existing contract and do not silently accept unsupported effect steps.
export const ExtensionToolOptionsSchema = z.union([
  z.object({
    tool: z.literal("color-space"),
    options: ColorSpaceOptionsSchema,
  }),
  z.object({
    tool: z.literal("extract-channel"),
    options: ExtractChannelOptionsSchema,
  }),
  z.object({ tool: z.literal("duotone"), options: DuotoneOptionsSchema }),
  z.object({ tool: z.literal("posterize"), options: PosterizeOptionsSchema }),
  z.object({ tool: z.literal("solarize"), options: SolarizeOptionsSchema }),
  z.object({ tool: z.literal("levels"), options: LevelsOptionsSchema }),
  z.object({
    tool: z.literal("color-matrix"),
    options: ColorMatrixOptionsSchema,
  }),
  z.object({ tool: z.literal("convolve"), options: ConvolveOptionsSchema }),
  z.object({ tool: z.literal("morphology"), options: MorphologyOptionsSchema }),
  z.object({
    tool: z.literal("replace-color"),
    options: ReplaceColorOptionsSchema,
  }),
  z.object({ tool: z.literal("chroma-key"), options: ChromaKeyOptionsSchema }),
  z.object({ tool: z.literal("noise"), options: NoiseOptionsSchema }),
  z.object({ tool: z.literal("affine"), options: AffineOptionsSchema }),
  z.object({ tool: z.literal("vignette"), options: VignetteOptionsSchema }),
  z.object({ tool: z.literal("shadow"), options: ShadowOptionsSchema }),
  z.object({ tool: z.literal("reflection"), options: ReflectionOptionsSchema }),
  z.object({ tool: z.literal("tile"), options: TileOptionsSchema }),
  z.object({ tool: z.literal("slice"), options: SliceOptionsSchema }),
  z.object({
    tool: z.literal("sprite-sheet"),
    options: SpriteSheetOptionsSchema,
  }),
  z.object({ tool: z.literal("icon-set"), options: IconSetOptionsSchema }),
  z.object({
    tool: z.literal("pixel-inspect"),
    options: PixelInspectOptionsSchema,
  }),
  z.object({
    tool: z.literal("fingerprint"),
    options: FingerprintOptionsSchema,
  }),
  z.object({
    tool: z.literal("auto-orient"),
    options: AutoOrientOptionsSchema,
  }),
  z.object({ tool: z.literal("redact"), options: RedactOptionsSchema }),
]);
