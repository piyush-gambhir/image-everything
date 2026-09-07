import {
  Base64ResultSchema,
  INPUT_MIME_TO_FORMAT,
  MAX_RAW_BYTES,
  RawManifestSchema,
  ValidationResultSchema,
  type DecodeOptions,
  type EncodeOptions,
  type FromBase64Options,
  type ToBase64Options,
} from "@image-everything/contracts";
import sharp from "sharp";

import { createZip } from "./archive";
import { DomainError, asDomainError } from "./errors";
import { enforceOutputDimensions, openStillImage } from "./input";
import { encodeImage, jsonResult } from "./output";

export async function decodePixels(buffer: Buffer, options: DecodeOptions) {
  const opened = await openStillImage(buffer);
  const channels = options.channels === "rgb" ? 3 : 4;
  enforceOutputDimensions(opened.width, opened.height);
  if (opened.width * opened.height * channels > MAX_RAW_BYTES) {
    throw new DomainError(
      "OUTPUT_LIMIT_EXCEEDED",
      `Decoded pixels may not exceed ${MAX_RAW_BYTES} bytes. Resize the image before decoding.`,
      413,
    );
  }
  let image = opened.image.toColourspace("srgb");
  image = channels === 4 ? image.ensureAlpha() : image.removeAlpha();
  const { data, info } = await image
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  const manifest = RawManifestSchema.parse({
    version: 1,
    kind: "raw-pixels",
    file: "pixels.raw",
    width: info.width,
    height: info.height,
    channels: options.channels,
    depth: "uchar",
    space: "srgb",
    layout: "interleaved",
    premultiplied: false,
    stride: info.width * channels,
    bytes: data.length,
  });
  return createZip("decoded-pixels.zip", [
    { name: "pixels.raw", body: data },
    { name: "manifest.json", body: JSON.stringify(manifest, null, 2) },
  ]);
}

export async function encodePixels(
  buffer: Buffer,
  filename: string,
  options: EncodeOptions,
) {
  const channels = options.channels === "rgb" ? 3 : 4;
  const expectedBytes = options.width * options.height * channels;
  if (buffer.length !== expectedBytes) {
    throw new DomainError(
      "INVALID_OPTIONS",
      `Raw input must contain exactly ${expectedBytes} interleaved ${options.channels.toUpperCase()} bytes for the supplied dimensions.`,
      422,
    );
  }
  enforceOutputDimensions(options.width, options.height);
  return encodeImage(
    sharp(buffer, {
      raw: { width: options.width, height: options.height, channels },
    }),
    options.format,
    filename,
    options,
  );
}

export async function validateImage(buffer: Buffer) {
  const opened = await openStillImage(buffer);
  // metadata() only parses headers; stats() forces the full pixel decode so
  // truncated/corrupt image payloads cannot pass validation.
  try {
    await opened.image.stats();
  } catch (error) {
    const mapped = asDomainError(error);
    if (mapped.code === "EXECUTION_TIMEOUT") throw mapped;
    throw new DomainError(
      "CORRUPT_INPUT",
      "The image pixel payload could not be decoded completely.",
      422,
      { cause: error },
    );
  }
  return ValidationResultSchema.parse({
    valid: true,
    format: opened.format,
    width: opened.width,
    height: opened.height,
    channels: opened.metadata.channels,
    hasAlpha: opened.metadata.hasAlpha ?? false,
    bytes: buffer.length,
  });
}

export async function imageToBase64(buffer: Buffer, options: ToBase64Options) {
  const validated = await validateImage(buffer);
  const contentType = `image/${validated.format}`;
  const base64 = buffer.toString("base64");
  return jsonResult(
    Base64ResultSchema.parse({
      format: validated.format,
      contentType,
      bytes: buffer.length,
      encoding: options.dataUrl ? "data-url" : "base64",
      data: options.dataUrl ? `data:${contentType};base64,${base64}` : base64,
    }),
  );
}

export async function imageFromBase64(
  buffer: Buffer,
  filename: string,
  options: FromBase64Options,
) {
  let text = buffer.toString("utf8").trim();
  let declaredFormat: string | undefined;
  if (text.startsWith("data:")) {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(text);
    declaredFormat = match
      ? INPUT_MIME_TO_FORMAT[match[1]!.toLowerCase()]
      : undefined;
    if (!match || !declaredFormat) throw invalidBase64();
    text = text.slice(match[0].length);
  }
  // Permit whitespace-wrapped standard Base64, but reject URL-safe alphabets,
  // ignored junk, missing padding, and non-canonical padding bits.
  text = text.replace(/[\t\n\r ]/g, "");
  if (!text || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
    throw invalidBase64();
  const decoded = Buffer.from(text, "base64");
  if (decoded.toString("base64") !== text) throw invalidBase64();
  const opened = await openStillImage(decoded);
  if (declaredFormat && declaredFormat !== opened.format) {
    throw new DomainError(
      "INVALID_OPTIONS",
      "The data URL MIME type does not match the decoded image bytes.",
      422,
    );
  }
  return encodeImage(opened.image, options.format, filename, options);
}

function invalidBase64() {
  return new DomainError(
    "INVALID_OPTIONS",
    "Upload canonical standard Base64 or a supported image data URL in a UTF-8 text file.",
    422,
  );
}
