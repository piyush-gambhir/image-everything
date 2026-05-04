export type InputFormat =
  | "jpeg"
  | "jpg"
  | "png"
  | "webp"
  | "avif"
  | "gif"
  | "tiff"
  | "heic"
  | "heif";

export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "gif";

export type FitMode = "cover" | "contain" | "fill" | "inside" | "outside";

export type EngineResult = {
  buffer: Buffer;
  format: OutputFormat;
  width: number;
  height: number;
  size: number;
};

export const INPUT_MIME_TO_FORMAT: Record<string, InputFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const OUTPUT_FORMAT_TO_MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export const ACCEPTED_INPUT_MIMES = Object.keys(INPUT_MIME_TO_FORMAT);
