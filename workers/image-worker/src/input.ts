import {
  LIMITS,
  OUTPUT_FORMATS,
  type InputFormat,
  type OutputFormat,
} from "@image-everything/contracts";
import sharp, { type Metadata, type Sharp } from "sharp";

import { DomainError } from "./errors";
import { decodeHeic } from "./heic";
import { getCapabilities } from "./runtime";
import { isHeifFamily, sniffImageFormat } from "./sniff";

export type OpenedImage = {
  image: Sharp;
  metadata: Metadata;
  format: InputFormat;
  width: number;
  height: number;
};

function sharpInput(buffer: Buffer): Sharp {
  return sharp(buffer, {
    failOn: "warning",
    limitInputPixels: LIMITS.maxInputPixels,
    unlimited: false,
  }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) });
}

export async function openStillImage(buffer: Buffer): Promise<OpenedImage> {
  if (buffer.length === 0) {
    throw new DomainError("MISSING_INPUT", "The uploaded image is empty.", 400);
  }
  if (buffer.length > LIMITS.maxUploadBytes) {
    throw new DomainError(
      "UPLOAD_TOO_LARGE",
      `One image may not exceed ${LIMITS.maxUploadBytes} bytes.`,
      413,
    );
  }

  const format = sniffImageFormat(buffer);
  const capabilities = await getCapabilities();
  if (!capabilities.formats.decode.includes(format)) {
    throw new DomainError(
      "CODEC_UNAVAILABLE",
      `The running worker cannot decode ${format.toUpperCase()}.`,
      415,
    );
  }

  let image: Sharp;
  let metadata: Metadata;
  if (isHeifFamily(format)) {
    try {
      // libvips can parse HEIC container metadata even when its build cannot
      // decode the compressed pixels. Decode eagerly through the probed
      // fallback so later transforms do not fail at toBuffer().
      const decoded = await decodeHeic(buffer);
      image = sharp(decoded.data, {
        raw: {
          width: decoded.width,
          height: decoded.height,
          channels: decoded.channels,
        },
        limitInputPixels: LIMITS.maxInputPixels,
      }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) });
      metadata = await image.metadata();
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError(
        "CORRUPT_INPUT",
        "The HEIC/HEIF image could not be decoded.",
        422,
        { cause: error },
      );
    }
  } else {
    try {
      image = sharpInput(buffer);
      metadata = await image.metadata();
    } catch (error) {
      if (
        error instanceof Error &&
        /pixel limit|exceeds.*pixels?/i.test(error.message)
      ) {
        throw new DomainError(
          "INPUT_PIXELS_EXCEEDED",
          `The decoded image exceeds ${LIMITS.maxInputPixels} pixels.`,
          413,
          { cause: error },
        );
      }
      throw new DomainError(
        "CORRUPT_INPUT",
        "The uploaded bytes are not a valid supported still image.",
        422,
        { cause: error },
      );
    }
  }

  const pages = metadata.pages ?? 1;
  if (
    pages > 1 ||
    (metadata.pageHeight !== undefined &&
      metadata.height !== metadata.pageHeight)
  ) {
    throw new DomainError(
      "ANIMATED_INPUT_UNSUPPORTED",
      "Animated and multi-page images are outside the v2 still-image boundary.",
      422,
    );
  }
  const rawWidth = metadata.width ?? 0;
  const rawHeight = metadata.pageHeight ?? metadata.height ?? 0;
  if (rawWidth <= 0 || rawHeight <= 0) {
    throw new DomainError(
      "CORRUPT_INPUT",
      "The image does not contain valid dimensions.",
      422,
    );
  }
  if (rawWidth * rawHeight > LIMITS.maxInputPixels) {
    throw new DomainError(
      "INPUT_PIXELS_EXCEEDED",
      `The decoded image exceeds ${LIMITS.maxInputPixels} pixels.`,
      413,
    );
  }

  const swapsAxes =
    metadata.orientation !== undefined && metadata.orientation >= 5;
  return {
    image: image.rotate(),
    metadata,
    format,
    width: swapsAxes ? rawHeight : rawWidth,
    height: swapsAxes ? rawWidth : rawHeight,
  };
}

export async function ensureOutputFormat(format: OutputFormat): Promise<void> {
  const capabilities = await getCapabilities();
  if (!capabilities.formats.encode.includes(format)) {
    throw new DomainError(
      "CODEC_UNAVAILABLE",
      `The running worker cannot encode ${format.toUpperCase()}.`,
      415,
    );
  }
}

export async function sourceOutputFormat(
  format: InputFormat,
): Promise<OutputFormat> {
  if (!OUTPUT_FORMATS.includes(format as OutputFormat)) {
    throw new DomainError(
      "INVALID_OPERATION_COMBINATION",
      `${format.toUpperCase()} input requires an explicit encodable output format.`,
      422,
    );
  }
  const output = format as OutputFormat;
  await ensureOutputFormat(output);
  return output;
}

export function enforceOutputDimensions(width: number, height: number): void {
  if (
    width <= 0 ||
    height <= 0 ||
    width > LIMITS.maxOutputDimension ||
    height > LIMITS.maxOutputDimension ||
    width * height > LIMITS.maxOutputPixels
  ) {
    throw new DomainError(
      "OUTPUT_LIMIT_EXCEEDED",
      `Output must remain within ${LIMITS.maxOutputDimension}px per edge and ${LIMITS.maxOutputPixels} pixels.`,
      413,
    );
  }
}
