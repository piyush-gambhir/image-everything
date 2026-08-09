import { INPUT_MIME_TO_FORMAT, OUTPUT_FORMAT_TO_MIME } from "@/lib/types";

export const API_VERSION = "v1" as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
// Roughly a 64 MP still image. This keeps decoded RGBA memory bounded while
// covering modern high-resolution cameras and phones.
export const MAX_INPUT_PIXELS = 64_000_000;
export const MAX_OUTPUT_DIMENSION = 20_000;
export const MAX_BATCH_FILES = 20;
export const MAX_TRANSFORM_OPERATIONS = 20;

export const IMAGE_OPERATIONS = [
  "metadata",
  "clean",
  "compress",
  "resize",
  "convert",
  "crop",
  "rotate",
  "watermark",
  "auto-enhance",
  "transform",
  "batch",
] as const;

const CODECS = [
  {
    format: "jpeg",
    extensions: ["jpg", "jpeg"],
    mimeTypes: ["image/jpeg", "image/jpg"],
    decode: true,
    encode: true,
  },
  {
    format: "png",
    extensions: ["png"],
    mimeTypes: ["image/png"],
    decode: true,
    encode: true,
  },
  {
    format: "webp",
    extensions: ["webp"],
    mimeTypes: ["image/webp"],
    decode: true,
    encode: true,
  },
  {
    format: "avif",
    extensions: ["avif"],
    mimeTypes: ["image/avif"],
    decode: true,
    encode: true,
  },
  {
    format: "gif",
    extensions: ["gif"],
    mimeTypes: ["image/gif"],
    decode: true,
    encode: true,
  },
  {
    format: "tiff",
    extensions: ["tif", "tiff"],
    mimeTypes: ["image/tiff"],
    decode: true,
    encode: false,
  },
  {
    format: "heic",
    extensions: ["heic"],
    mimeTypes: ["image/heic"],
    decode: true,
    encode: false,
  },
  {
    format: "heif",
    extensions: ["heif"],
    mimeTypes: ["image/heif"],
    decode: true,
    encode: false,
  },
] as const;

export function getCapabilities() {
  const inputFormats = [
    ...new Set(Object.values(INPUT_MIME_TO_FORMAT).map(normalizeFormat)),
  ];
  const outputFormats = Object.keys(OUTPUT_FORMAT_TO_MIME);

  return {
    apiVersion: API_VERSION,
    canonicalBasePath: `/api/${API_VERSION}/images`,
    legacyBasePath: "/api/images",
    operations: IMAGE_OPERATIONS.map((name) => ({
      name,
      method: "POST" as const,
      path: `/api/${API_VERSION}/images/${name}`,
    })),
    formats: {
      input: inputFormats,
      output: outputFormats,
    },
    codecs: CODECS,
    limits: {
      upload: {
        maxFileBytes: MAX_UPLOAD_BYTES,
      },
      pixels: {
        maxInputPixels: MAX_INPUT_PIXELS,
        maxResizeWidth: MAX_OUTPUT_DIMENSION,
        maxResizeHeight: MAX_OUTPUT_DIMENSION,
      },
      batch: {
        maxFiles: MAX_BATCH_FILES,
        maxOperationsPerFile: MAX_TRANSFORM_OPERATIONS,
      },
    },
    auth: {
      configured: Boolean(process.env.API_KEY),
      acceptedCredentials: ["Authorization: Bearer <key>", "?api_key=<key>"],
    },
  };
}

function normalizeFormat(format: string): string {
  return format === "jpg" ? "jpeg" : format;
}
