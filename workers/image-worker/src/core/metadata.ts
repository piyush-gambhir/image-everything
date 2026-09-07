import {
  LIMITS,
  type MetadataCleanOptions,
  type MetadataEditOptions,
  type MetadataOptions,
  type MetadataResult,
} from "@image-everything/contracts";
import exifr from "exifr";
import sharp, { type Sharp } from "sharp";

import { openStillImage, sourceOutputFormat } from "./input";
import { encodeImage, type ImageExecutionResult } from "./output";

type MetadataBlocks = {
  ifd0?: Record<string, unknown>;
  ifd1?: Record<string, unknown>;
  exif?: Record<string, unknown>;
  iptc?: Record<string, unknown>;
  xmp?: Record<string, unknown>;
  gps?: Record<string, unknown>;
  icc?: Record<string, unknown>;
};

const CATEGORY_FIELDS: Readonly<Record<string, readonly string[]>> = {
  camera: ["Make", "Model", "SerialNumber"],
  lens: ["LensMake", "LensModel", "LensSerialNumber", "FocalLength"],
  exposure: ["ExposureTime", "FNumber", "ISO", "ExposureBiasValue", "Flash"],
  image: [
    "DateTimeOriginal",
    "CreateDate",
    "Artist",
    "Copyright",
    "ImageDescription",
    "Software",
  ],
  location: ["latitude", "longitude", "GPSAltitude", "GPSDateStamp"],
};

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

async function parseMetadataBlocks(buffer: Buffer): Promise<MetadataBlocks> {
  try {
    const parsed = (await exifr.parse(buffer, {
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
    })) as Record<string, unknown> | undefined;
    return {
      ifd0: plainRecord(parsed?.ifd0),
      ifd1: plainRecord(parsed?.ifd1),
      exif: plainRecord(parsed?.exif),
      iptc: plainRecord(parsed?.iptc),
      xmp: plainRecord(parsed?.xmp),
      gps: plainRecord(parsed?.gps),
      icc: plainRecord(parsed?.icc),
    };
  } catch {
    return {};
  }
}

function categorized(
  blocks: MetadataBlocks,
  includeGps: boolean,
): MetadataResult["categorized"] {
  const merged = Object.assign(
    {},
    blocks.ifd0,
    blocks.ifd1,
    blocks.exif,
    blocks.iptc,
    blocks.xmp,
    includeGps ? blocks.gps : undefined,
  );
  const output: MetadataResult["categorized"] = {};
  const recognized = new Set<string>();
  for (const [category, fields] of Object.entries(CATEGORY_FIELDS)) {
    if (category === "location" && !includeGps) {
      output[category] = [];
      continue;
    }
    output[category] = fields.flatMap((field) => {
      recognized.add(field);
      const value = merged[field];
      return value === undefined || value === null
        ? []
        : [{ label: field, value: String(value) }];
    });
  }
  output.other = Object.entries(merged)
    .filter(
      ([key, value]) =>
        !recognized.has(key) && value !== undefined && value !== null,
    )
    .slice(0, 200)
    .map(([label, value]) => ({ label, value: String(value) }));
  return output;
}

export async function inspectMetadata(
  buffer: Buffer,
  options: MetadataOptions,
): Promise<MetadataResult> {
  const opened = await openStillImage(buffer);
  const blocks = await parseMetadataBlocks(buffer);
  const raw = options.includeRaw
    ? {
        exif: blocks.exif,
        iptc: blocks.iptc,
        xmp: blocks.xmp,
        gps: options.includeGps ? blocks.gps : undefined,
        icc: blocks.icc,
      }
    : {};
  return {
    format: opened.format,
    width: opened.width,
    height: opened.height,
    pages: opened.metadata.pages ?? 1,
    channels: opened.metadata.channels ?? null,
    hasAlpha: opened.metadata.hasAlpha ?? null,
    density: opened.metadata.density ?? null,
    orientation: opened.metadata.orientation ?? null,
    bytes: buffer.length,
    space: opened.metadata.space ?? null,
    isProgressive: opened.metadata.isProgressive ?? null,
    hasProfile: opened.metadata.hasProfile ?? null,
    ...raw,
    categorized: categorized(blocks, options.includeGps),
  };
}

export async function cleanMetadata(
  buffer: Buffer,
  originalName: string,
  options: MetadataCleanOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  const preserveTaggedOrientation =
    options.policy === "preserve-selected" &&
    (options.preserve.includes("orientation") ||
      options.preserve.includes("exif"));
  let pipeline = preserveTaggedOrientation
    ? sharp(buffer, {
        failOn: "warning",
        limitInputPixels: LIMITS.maxInputPixels,
        unlimited: false,
      }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) })
    : opened.image;
  if (options.policy === "privacy") {
    pipeline = pipeline.keepIccProfile();
  } else if (options.policy === "preserve-selected") {
    if (options.preserve.includes("icc")) pipeline = pipeline.keepIccProfile();
    if (options.preserve.includes("exif")) pipeline = pipeline.keepExif();
    if (options.preserve.includes("xmp")) pipeline = pipeline.keepXmp();
    if (
      options.preserve.includes("orientation") &&
      !options.preserve.includes("exif") &&
      opened.metadata.orientation !== undefined
    ) {
      pipeline = pipeline.withExif({
        IFD0: { Orientation: String(opened.metadata.orientation) },
      });
    }
  }
  const format = await sourceOutputFormat(opened.format);
  return encodeImage(pipeline, format, originalName, { metadata: "strip" });
}

export async function editMetadata(
  buffer: Buffer,
  originalName: string,
  options: MetadataEditOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  const pipeline = await applyMetadataEdits(opened.image, options);
  const format = await sourceOutputFormat(opened.format);
  return encodeImage(pipeline, format, originalName, {
    metadata: options.preserveExisting ? "preserve" : "strip",
  });
}

export async function applyMetadataEdits(
  input: Sharp,
  options: Partial<MetadataEditOptions>,
): Promise<Sharp> {
  let pipeline: Sharp;
  if (options.preserveExisting) {
    pipeline = input.keepMetadata();
  } else {
    const { data, info } = await input
      .raw()
      .toBuffer({ resolveWithObject: true });
    pipeline = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) });
  }

  const ifd0: Record<string, string> = {};
  const exif: Record<string, string> = {};
  if (options.artist !== undefined) ifd0.Artist = options.artist;
  if (options.copyright !== undefined) ifd0.Copyright = options.copyright;
  if (options.description !== undefined)
    ifd0.ImageDescription = options.description;
  if (options.software !== undefined) ifd0.Software = options.software;
  if (options.capturedAt !== undefined)
    exif.DateTimeOriginal = options.capturedAt;
  if (Object.keys(ifd0).length > 0 || Object.keys(exif).length > 0) {
    const edits: Record<string, Record<string, string>> = {};
    if (Object.keys(ifd0).length > 0) edits.IFD0 = ifd0;
    if (Object.keys(exif).length > 0) edits.IFD2 = exif;
    pipeline = options.preserveExisting
      ? pipeline.withExifMerge(edits)
      : pipeline.withExif(edits);
  }
  if (options.density !== undefined) {
    pipeline = pipeline.withMetadata({ density: options.density });
  }
  return pipeline;
}
