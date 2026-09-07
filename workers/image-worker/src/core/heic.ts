import heicDecode from "heic-decode";

import { LIMITS } from "@image-everything/contracts";

import { DomainError } from "./errors";

export async function decodeHeic(buffer: Buffer): Promise<{
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
}> {
  const images = await heicDecode.all({ buffer });
  try {
    if (images.length > 1) {
      throw new DomainError(
        "ANIMATED_INPUT_UNSUPPORTED",
        "HEIC containers with multiple images are outside the still-image boundary.",
        422,
      );
    }
    const primary = images[0];
    if (!primary) {
      throw new DomainError(
        "CORRUPT_INPUT",
        "HEIC file has no primary image.",
        422,
      );
    }
    if (primary.width * primary.height > LIMITS.maxInputPixels) {
      throw new DomainError(
        "INPUT_PIXELS_EXCEEDED",
        `The decoded HEIC image exceeds ${LIMITS.maxInputPixels} pixels.`,
        413,
      );
    }
    const decoded = await primary.decode();
    const view = new Uint8Array(
      decoded.data.buffer,
      decoded.data.byteOffset,
      decoded.data.byteLength,
    );
    return {
      data: Buffer.from(view),
      width: decoded.width,
      height: decoded.height,
      channels: 4,
    };
  } finally {
    images.dispose();
  }
}
