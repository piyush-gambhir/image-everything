import { executeEffect } from "./effects";
import { executeLayout } from "./layouts";
import { EXTENSION_TOOL_IDS } from "@image-everything/contracts";
import {
  decodePixels,
  encodePixels,
  imageToBase64,
  imageFromBase64,
  validateImage,
} from "./codecs";
import type {
  DecodeOptions,
  EncodeOptions,
  ToBase64Options,
  FromBase64Options,
} from "@image-everything/contracts";
import {
  CompareResultSchema,
  HistogramResultSchema,
  LIMITS,
  MAX_BASE64_UPLOAD_BYTES,
  MetadataResultSchema,
  PaletteResultSchema,
  StatsResultSchema,
  getRouteById,
  getToolOptionsSchema,
  type AdjustOptions,
  type AlphaOptions,
  type BatchOptions,
  type BlurSharpenOptions,
  type CollageOptions,
  type CompareOptions,
  type CompressOptions,
  type CompressToSizeOptions,
  type ConvertOptions,
  type CropOptions,
  type ExtendOptions,
  type FilterOptions,
  type FrameOptions,
  type HistogramOptions,
  type MetadataCleanOptions,
  type MetadataEditOptions,
  type MetadataOptions,
  type NormalizeOptions,
  type PaletteOptions,
  type Pipeline,
  type PixelateOptions,
  type QuickEnhanceOptions,
  type ResizeOptions,
  type ResponsiveOptions,
  type RotateOptions,
  type RouteId,
  type StatsOptions,
  type TrimOptions,
  type WatermarkOptions,
} from "@image-everything/contracts";
import { ZodError } from "zod";

import {
  compareDifference,
  compareImages,
  imageHistogram,
  imagePalette,
  imageStats,
} from "./analysis";
import { DomainError } from "./errors";
import { cleanMetadata, editMetadata, inspectMetadata } from "./metadata";
import {
  adjustImage,
  alphaImage,
  batchImages,
  blurSharpenImage,
  collageImages,
  compressImage,
  compressImageToSize,
  convertImage,
  cropImage,
  extendImage,
  filterImage,
  frameImage,
  normalizeImage,
  pixelateImage,
  processImage,
  quickEnhanceImage,
  resizeImage,
  responsiveImages,
  rotateImage,
  trimImage,
  watermarkImage,
} from "./operations";
import { jsonResult, type ExecutionResult } from "./output";

export type UploadedPart = {
  fieldName: "file" | "other" | "files" | "overlay";
  filename: string;
  contentType?: string;
  buffer: Buffer;
};

function validateParts(
  routeId: RouteId,
  parts: readonly UploadedPart[],
): {
  primary: UploadedPart[];
  overlay?: UploadedPart;
} {
  const route = getRouteById(routeId);
  const allowedFields = new Set<UploadedPart["fieldName"]>(
    route.inputKind === "multiple"
      ? ["files"]
      : route.inputKind === "compare"
        ? ["file", "other"]
        : route.inputKind === "single-overlay"
          ? ["file", "overlay"]
          : ["file"],
  );
  const unexpected = parts.find((part) => !allowedFields.has(part.fieldName));
  if (unexpected) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      `Multipart field ${unexpected.fieldName} is not valid for this operation.`,
      400,
    );
  }
  const aggregateBytes = parts.reduce(
    (sum, part) => sum + part.buffer.length,
    0,
  );
  if (aggregateBytes > LIMITS.maxAggregateBytes) {
    throw new DomainError(
      "AGGREGATE_TOO_LARGE",
      `Multipart image bytes may not exceed ${LIMITS.maxAggregateBytes}.`,
      413,
    );
  }
  const overlayParts = parts.filter((part) => part.fieldName === "overlay");
  if (overlayParts.length > 1) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Only one overlay is allowed.",
      400,
    );
  }
  const overlay = overlayParts[0];
  if (overlay && overlay.buffer.length > LIMITS.maxOverlayBytes) {
    throw new DomainError(
      "OVERLAY_TOO_LARGE",
      `The overlay may not exceed ${LIMITS.maxOverlayBytes} bytes.`,
      413,
    );
  }

  const primary =
    route.inputKind === "compare"
      ? [
          ...parts.filter((part) => part.fieldName === "file"),
          ...parts.filter((part) => part.fieldName === "other"),
        ]
      : parts.filter((part) =>
          route.inputKind === "multiple"
            ? part.fieldName === "files"
            : part.fieldName === "file",
        );
  const maxPrimaryBytes =
    routeId === "from-base64" ? MAX_BASE64_UPLOAD_BYTES : LIMITS.maxUploadBytes;
  if (primary.some((part) => part.buffer.length > maxPrimaryBytes)) {
    throw new DomainError(
      "UPLOAD_TOO_LARGE",
      `One input may not exceed ${maxPrimaryBytes} bytes.`,
      413,
    );
  }
  if (primary.length > LIMITS.maxFiles) {
    throw new DomainError(
      "TOO_MANY_FILES",
      `At most ${LIMITS.maxFiles} image files are allowed.`,
      413,
    );
  }
  if (
    route.inputKind === "compare" &&
    (parts.filter((part) => part.fieldName === "file").length !== 1 ||
      parts.filter((part) => part.fieldName === "other").length !== 1)
  ) {
    throw new DomainError(
      "MISSING_INPUT",
      'Comparison requires exactly one "file" and one "other" image.',
      400,
    );
  }
  if (route.inputKind === "multiple" && primary.length === 0) {
    throw new DomainError(
      "MISSING_INPUT",
      'Provide at least one image in repeated "files" fields.',
      400,
    );
  }
  if (
    (route.inputKind === "single" || route.inputKind === "single-overlay") &&
    primary.length !== 1
  ) {
    throw new DomainError(
      "MISSING_INPUT",
      'Provide exactly one primary image in the "file" field.',
      400,
    );
  }
  return { primary, overlay };
}

function parseOptions(routeId: RouteId, value: unknown): unknown {
  const route = getRouteById(routeId);
  try {
    return getToolOptionsSchema(route.toolId).parse(value ?? {});
  } catch (error) {
    if (error instanceof ZodError) {
      throw new DomainError(
        "INVALID_OPTIONS",
        "The operation options did not match the shared contract.",
        422,
        {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          cause: error,
        },
      );
    }
    throw error;
  }
}

const EFFECT_ROUTES = new Set<RouteId>([
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
]);

export async function executeRoute(
  routeId: RouteId,
  parts: readonly UploadedPart[],
  rawOptions: unknown,
): Promise<ExecutionResult> {
  const { primary, overlay } = validateParts(routeId, parts);
  const options = parseOptions(routeId, rawOptions);
  const first = primary[0];
  const files = primary.map((part) => ({
    buffer: part.buffer,
    filename: part.filename,
  }));

  if ((EXTENSION_TOOL_IDS as readonly string[]).includes(routeId)) {
    if (EFFECT_ROUTES.has(routeId)) {
      return executeEffect(routeId, first!.buffer, first!.filename, options);
    }
    return executeLayout(routeId, files, options);
  }

  switch (routeId) {
    case "decode":
      return decodePixels(first!.buffer, options as DecodeOptions);
    case "encode":
      return encodePixels(
        first!.buffer,
        first!.filename,
        options as EncodeOptions,
      );
    case "to-base64":
      return imageToBase64(first!.buffer, options as ToBase64Options);
    case "from-base64":
      return imageFromBase64(
        first!.buffer,
        first!.filename,
        options as FromBase64Options,
      );
    case "validate":
      return jsonResult(await validateImage(first!.buffer));
    case "compress":
      return compressImage(
        first!.buffer,
        first!.filename,
        options as CompressOptions,
      );
    case "compress-to-size":
      return compressImageToSize(
        first!.buffer,
        first!.filename,
        options as CompressToSizeOptions,
      );
    case "resize":
      return resizeImage(
        first!.buffer,
        first!.filename,
        options as ResizeOptions,
      );
    case "convert":
      return convertImage(
        first!.buffer,
        first!.filename,
        options as ConvertOptions,
      );
    case "responsive":
      return responsiveImages(first!.buffer, options as ResponsiveOptions);
    case "quick-enhance":
      return quickEnhanceImage(
        first!.buffer,
        first!.filename,
        options as QuickEnhanceOptions,
      );
    case "crop":
      return cropImage(first!.buffer, first!.filename, options as CropOptions);
    case "rotate":
      return rotateImage(
        first!.buffer,
        first!.filename,
        options as RotateOptions,
      );
    case "trim":
      return trimImage(first!.buffer, first!.filename, options as TrimOptions);
    case "extend":
      return extendImage(
        first!.buffer,
        first!.filename,
        options as ExtendOptions,
      );
    case "alpha":
      return alphaImage(
        first!.buffer,
        first!.filename,
        options as AlphaOptions,
      );
    case "adjust":
      return adjustImage(
        first!.buffer,
        first!.filename,
        options as AdjustOptions,
      );
    case "normalize":
      return normalizeImage(
        first!.buffer,
        first!.filename,
        options as NormalizeOptions,
      );
    case "filter":
      return filterImage(
        first!.buffer,
        first!.filename,
        options as FilterOptions,
      );
    case "blur-sharpen":
      return blurSharpenImage(
        first!.buffer,
        first!.filename,
        options as BlurSharpenOptions,
      );
    case "pixelate":
      return pixelateImage(
        first!.buffer,
        first!.filename,
        options as PixelateOptions,
      );
    case "watermark":
      if ((options as WatermarkOptions).kind === "text" && overlay) {
        throw new DomainError(
          "INVALID_OPERATION_COMBINATION",
          "A text watermark must not include an image overlay file.",
          422,
        );
      }
      return watermarkImage(
        first!.buffer,
        first!.filename,
        options as WatermarkOptions,
        overlay?.buffer,
      );
    case "frame":
      return frameImage(
        first!.buffer,
        first!.filename,
        options as FrameOptions,
      );
    case "collage":
      return collageImages(files, "collage", options as CollageOptions);
    case "metadata":
      return jsonResult(
        MetadataResultSchema.parse(
          await inspectMetadata(first!.buffer, options as MetadataOptions),
        ),
      );
    case "metadata-clean":
      return cleanMetadata(
        first!.buffer,
        first!.filename,
        options as MetadataCleanOptions,
      );
    case "metadata-edit":
      return editMetadata(
        first!.buffer,
        first!.filename,
        options as MetadataEditOptions,
      );
    case "stats":
      return jsonResult(
        StatsResultSchema.parse(
          await imageStats(first!.buffer, options as StatsOptions),
        ),
      );
    case "palette":
      return jsonResult(
        PaletteResultSchema.parse(
          await imagePalette(first!.buffer, options as PaletteOptions),
        ),
      );
    case "histogram":
      return jsonResult(
        HistogramResultSchema.parse(
          await imageHistogram(first!.buffer, options as HistogramOptions),
        ),
      );
    case "compare":
      return jsonResult(
        CompareResultSchema.parse(
          await compareImages(
            primary[0]!.buffer,
            primary[1]!.buffer,
            options as CompareOptions,
          ),
        ),
      );
    case "compare-diff":
      return compareDifference(
        primary[0]!.buffer,
        primary[1]!.buffer,
        options as CompareOptions,
      );
    case "process":
      return processImage(first!.buffer, first!.filename, options as Pipeline);
    case "batch":
      return batchImages(files, options as BatchOptions);
  }
  throw new DomainError("INVALID_OPTIONS", "Unknown image operation.", 422);
}
