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
  const primary = images[0];
  if (!primary) {
    images.dispose();
    throw new Error("HEIC file has no primary image");
  }
  if (primary.width * primary.height > LIMITS.maxInputPixels) {
    images.dispose();
    throw new DomainError(
      "INPUT_PIXELS_EXCEEDED",
      `The decoded HEIC image exceeds ${LIMITS.maxInputPixels} pixels.`,
      413,
    );
  }
  let decoded;
  try {
    decoded = await primary.decode();
  } finally {
    images.dispose();
  }
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
}
