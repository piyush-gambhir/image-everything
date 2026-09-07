import type { InputFormat } from "@image-everything/contracts";

import { DomainError } from "./errors";

const ASCII = "ascii" as const;

export function sniffImageFormat(buffer: Buffer): InputFormat {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }
  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString(ASCII);
    if (signature === "GIF87a" || signature === "GIF89a") return "gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString(ASCII) === "RIFF" &&
    buffer.subarray(8, 12).toString(ASCII) === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.length >= 4) {
    const littleEndianTiff =
      buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00;
    const bigEndianTiff =
      buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a;
    if (littleEndianTiff || bigEndianTiff) return "tiff";
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString(ASCII) === "ftyp") {
    const brands = buffer
      .subarray(8, Math.min(buffer.length, 80))
      .toString(ASCII);
    if (/avif|avis/.test(brands)) return "avif";
    if (/heic|heix|hevc|hevx/.test(brands)) return "heic";
    if (/mif1|msf1/.test(brands)) return "heif";
  }
  throw new DomainError(
    "UNSUPPORTED_MEDIA_TYPE",
    "The uploaded bytes do not match a supported image format.",
    415,
  );
}

export function isHeifFamily(format: InputFormat): boolean {
  return format === "heic" || format === "heif";
}
