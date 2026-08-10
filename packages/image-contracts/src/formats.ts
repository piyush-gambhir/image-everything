import { z } from "zod";

export const INPUT_FORMATS = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "tiff",
  "heic",
  "heif",
] as const;

export const OUTPUT_FORMATS = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "tiff",
] as const;

export const InputFormatSchema = z.enum(INPUT_FORMATS);
export const OutputFormatSchema = z.enum(OUTPUT_FORMATS);
export const AutoOutputFormatSchema = z.union([
  z.literal("auto"),
  OutputFormatSchema,
]);

export type InputFormat = z.infer<typeof InputFormatSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type AutoOutputFormat = z.infer<typeof AutoOutputFormatSchema>;

export const INPUT_MIME_TO_FORMAT: Readonly<Record<string, InputFormat>> =
  Object.freeze({
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/tiff": "tiff",
    "image/heic": "heic",
    "image/heif": "heif",
  });

export const FORMAT_TO_MIME: Readonly<Record<OutputFormat, string>> =
  Object.freeze({
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    tiff: "image/tiff",
  });

export const FORMAT_EXTENSIONS: Readonly<Record<OutputFormat, string>> =
  Object.freeze({
    jpeg: "jpg",
    png: "png",
    webp: "webp",
    avif: "avif",
    gif: "gif",
    tiff: "tiff",
  });

export const ENCODER_OPTION_APPLICABILITY = Object.freeze({
  jpeg: [
    "quality",
    "progressive",
    "mozjpeg",
    "chromaSubsampling",
    "background",
    "metadata",
  ],
  png: ["quality", "lossless", "compressionLevel", "effort", "metadata"],
  webp: ["quality", "lossless", "effort", "metadata"],
  avif: ["quality", "lossless", "effort", "metadata"],
  gif: ["quality", "effort", "metadata"],
  tiff: ["quality", "lossless", "metadata"],
} satisfies Record<OutputFormat, readonly string[]>);

export const FitSchema = z.enum([
  "cover",
  "contain",
  "fill",
  "inside",
  "outside",
]);
export const KernelSchema = z.enum([
  "nearest",
  "cubic",
  "mitchell",
  "lanczos2",
  "lanczos3",
]);
export const PositionSchema = z.enum([
  "center",
  "top",
  "right top",
  "right",
  "right bottom",
  "bottom",
  "left bottom",
  "left",
  "left top",
  "entropy",
  "attention",
]);

export type Fit = z.infer<typeof FitSchema>;
export type Kernel = z.infer<typeof KernelSchema>;
export type Position = z.infer<typeof PositionSchema>;
