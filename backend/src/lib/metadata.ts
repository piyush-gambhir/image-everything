import exifr from "exifr";
import sharp from "sharp";

import { categorize } from "@/lib/format-metadata";
import { decodeHeic, isHeicBuffer } from "@/lib/heic";
import type { InputFormat } from "@/lib/types";

export type CategoryTag = { label: string; value: string };

export type CategorizedMetadata = {
  camera: CategoryTag[];
  lens: CategoryTag[];
  exposure: CategoryTag[];
  image: CategoryTag[];
  location: CategoryTag[];
  other: CategoryTag[];
};

export type ImageMetadata = {
  format: InputFormat | null;
  width: number | null;
  height: number | null;
  channels: number | null;
  hasAlpha: boolean | null;
  density: number | null;
  orientation: number | null;
  size: number;
  raw: {
    ifd0?: Record<string, unknown>;
    ifd1?: Record<string, unknown>;
    exif?: Record<string, unknown>;
    iptc?: Record<string, unknown>;
    xmp?: Record<string, unknown>;
    gps?: Record<string, unknown>;
    icc?: Record<string, unknown>;
  };
  categorized: CategorizedMetadata;
};

export async function readMetadata(buffer: Buffer): Promise<ImageMetadata> {
  let format: InputFormat | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let channels: number | null = null;
  let hasAlpha: boolean | null = null;
  let density: number | null = null;
  let orientation: number | null = null;

  const heic = isHeicBuffer(buffer);

  if (heic) {
    format = "heic";
    try {
      const decoded = await decodeHeic(buffer);
      width = decoded.width;
      height = decoded.height;
      channels = 4;
      hasAlpha = true;
    } catch {
      // exifr may still surface dimensions below
    }
  } else {
    try {
      const meta = await sharp(buffer).metadata();
      format = (meta.format as InputFormat | undefined) ?? null;
      width = meta.width ?? null;
      height = meta.height ?? null;
      channels = meta.channels ?? null;
      hasAlpha = meta.hasAlpha ?? null;
      density = meta.density ?? null;
      orientation = meta.orientation ?? null;
    } catch {
      // fall through to exifr
    }
  }

  const exifrResult = await safeExifr(buffer);

  const merged: Record<string, unknown> = {
    ...(exifrResult?.ifd0 as object | undefined),
    ...(exifrResult?.ifd1 as object | undefined),
    ...(exifrResult?.tiff as object | undefined),
    ...(exifrResult?.exif as object | undefined),
    ...(exifrResult?.iptc as object | undefined),
    ...(exifrResult?.xmp as object | undefined),
    ...(exifrResult?.gps as object | undefined),
  };

  if (width === null)
    width = numberOr(merged.ImageWidth ?? merged.PixelXDimension, null);
  if (height === null) {
    height = numberOr(
      merged.ImageHeight ?? merged.ImageLength ?? merged.PixelYDimension,
      null,
    );
  }
  if (orientation === null) orientation = numberOr(merged.Orientation, null);

  const categorized = categorize(merged);

  return {
    format,
    width,
    height,
    channels,
    hasAlpha,
    density,
    orientation,
    size: buffer.length,
    raw: {
      ifd0: pickPlain(exifrResult?.ifd0),
      ifd1: pickPlain(exifrResult?.ifd1),
      exif: pickPlain(exifrResult?.exif),
      iptc: pickPlain(exifrResult?.iptc),
      xmp: pickPlain(exifrResult?.xmp),
      gps: pickPlain(exifrResult?.gps),
      icc: pickPlain(exifrResult?.icc),
    },
    categorized,
  };
}

async function safeExifr(
  buffer: Buffer,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: true,
      icc: true,
      jfif: true,
      makerNote: false,
      mergeOutput: false,
      sanitize: true,
      translateValues: true,
    });
    return (result as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

function numberOr(value: unknown, fallback: number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickPlain(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return JSON.parse(JSON.stringify(value));
}
