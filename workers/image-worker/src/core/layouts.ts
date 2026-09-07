import { createHash } from "node:crypto";

import {
  LIMITS,
  MAX_RAW_BYTES,
  AffineOptionsSchema,
  VignetteOptionsSchema,
  ShadowOptionsSchema,
  ReflectionOptionsSchema,
  TileOptionsSchema,
  SliceOptionsSchema,
  SpriteSheetOptionsSchema,
  IconSetOptionsSchema,
  PixelInspectOptionsSchema,
  FingerprintOptionsSchema,
  AutoOrientOptionsSchema,
  RedactOptionsSchema,
  PixelInspectResultSchema,
  FingerprintResultSchema,
  SliceManifestSchema,
  SpriteSheetManifestSchema,
  IconSetManifestSchema,
  type OutputFormat,
} from "@image-everything/contracts";
import type { z } from "zod";
import sharp, { type OverlayOptions, type Sharp } from "sharp";

import {
  createZip,
  enforceAggregateOutputBytes,
  type ArchiveEntry,
} from "./archive";
import { DomainError } from "./errors";
import {
  enforceOutputDimensions,
  openStillImage,
  type OpenedImage,
} from "./input";
import {
  encodeImage,
  jsonResult,
  safeFilenameBase,
  type ExecutionResult,
} from "./output";

type FileInput = { buffer: Buffer; filename: string };
type CommonOptions = {
  format: OutputFormat;
  quality?: number;
  lossless?: boolean;
  background?: string;
};
type Region = { left: number; top: number; width: number; height: number };

// Bound every raw RGBA working buffer before decoding or allocating it.

function preflightRaw(width: number, height: number): void {
  enforceOutputDimensions(width, height);
  if (width * height * 4 > MAX_RAW_BYTES) {
    throw new DomainError(
      "OUTPUT_LIMIT_EXCEEDED",
      `This pixel effect supports at most ${MAX_RAW_BYTES} decoded RGBA bytes.`,
      413,
    );
  }
}

function invalid(message: string): never {
  throw new DomainError("INVALID_OPTIONS", message, 422);
}

function rawImage(data: Buffer, width: number, height: number): Sharp {
  return sharp(data, {
    raw: { width, height, channels: 4 },
    limitInputPixels: LIMITS.maxInputPixels,
  }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) });
}

async function rgba(opened: OpenedImage): Promise<Buffer> {
  preflightRaw(opened.width, opened.height);
  return opened.image
    .clone()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function canvas(
  width: number,
  height: number,
  background = "#00000000",
): Sharp {
  enforceOutputDimensions(width, height);
  return sharp({ create: { width, height, channels: 4, background } }).timeout({
    seconds: Math.ceil(LIMITS.deadlineMs / 1000),
  });
}

async function colorBytes(color: string): Promise<Buffer> {
  return canvas(1, 1, color).raw().toBuffer();
}

function output(pipeline: Sharp, file: FileInput, options: CommonOptions) {
  return encodeImage(pipeline, options.format, file.filename, options);
}

function validateRegion(region: Region, width: number, height: number): void {
  if (
    region.left < 0 ||
    region.top < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.left + region.width > width ||
    region.top + region.height > height
  ) {
    invalid("Every region must fit entirely inside the oriented image.");
  }
}

async function fingerprint(
  opened: OpenedImage,
  file: FileInput,
  algorithm: "average" | "difference",
) {
  const width = algorithm === "difference" ? 9 : 8;
  const pixels = await opened.image
    .clone()
    .flatten({ background: "#ffffff" })
    .greyscale()
    .resize(width, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  let hash = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const offset = y * width + x;
      const bit =
        algorithm === "difference"
          ? pixels[offset]! > pixels[offset + 1]!
          : pixels[offset]! >= average;
      hash = (hash << 1n) | (bit ? 1n : 0n);
    }
  }
  return jsonResult(
    FingerprintResultSchema.parse({
      algorithm,
      hash: hash.toString(16).padStart(16, "0"),
      sha256: createHash("sha256").update(file.buffer).digest("hex"),
      width: opened.width,
      height: opened.height,
    }),
  );
}

function createIco(icons: readonly { size: number; body: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + icons.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icons.length, 4);
  let offset = header.length;
  for (const [index, icon] of icons.entries()) {
    const entry = 6 + index * 16;
    header[entry] = icon.size === 256 ? 0 : icon.size;
    header[entry + 1] = icon.size === 256 ? 0 : icon.size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(icon.body.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += icon.body.length;
  }
  enforceAggregateOutputBytes(offset);
  return Buffer.concat([header, ...icons.map((icon) => icon.body)]);
}

async function spriteSheet(
  files: readonly FileInput[],
  options: z.infer<typeof SpriteSheetOptionsSchema>,
) {
  const columns = Math.min(options.columns, files.length);
  const rows = Math.ceil(files.length / columns);
  const width =
    options.padding * 2 +
    columns * options.cellWidth +
    (columns - 1) * options.gap;
  const height =
    options.padding * 2 + rows * options.cellHeight + (rows - 1) * options.gap;
  enforceOutputDimensions(width, height);
  const composites: OverlayOptions[] = [];
  const sprites = [];
  let totalBytes = 0;
  for (const [index, file] of files.entries()) {
    const opened = await openStillImage(file.buffer);
    const left =
      options.padding + (index % columns) * (options.cellWidth + options.gap);
    const top =
      options.padding +
      Math.floor(index / columns) * (options.cellHeight + options.gap);
    const resized = await opened.image
      .resize(options.cellWidth, options.cellHeight, {
        fit: "contain",
        background: options.background ?? "#00000000",
      })
      .png()
      .toBuffer();
    totalBytes += resized.length;
    enforceAggregateOutputBytes(totalBytes);
    composites.push({ input: resized, left, top });
    sprites.push({
      index,
      source: safeFilenameBase(file.filename),
      left,
      top,
      width: options.cellWidth,
      height: options.cellHeight,
    });
  }
  const sheet = await encodeImage(
    canvas(width, height, options.background).composite(composites),
    "png",
    "sprite-sheet",
    options,
  );
  return createZip("sprite-sheet", [
    { name: sheet.filename, body: sheet.body },
    {
      name: "manifest.json",
      body: JSON.stringify(
        SpriteSheetManifestSchema.parse({
          version: 1,
          kind: "sprite-sheet",
          image: sheet.filename,
          width,
          height,
          columns,
          rows,
          sprites,
        }),
        null,
        2,
      ),
    },
  ]);
}

/** Called only after the shared route option schema has parsed the request. */
export async function executeLayout(
  toolId: string,
  files: readonly FileInput[],
  rawOptions: unknown,
): Promise<ExecutionResult> {
  if (files.length === 0)
    throw new DomainError("MISSING_INPUT", "Provide an image.", 400);
  if (files.length > LIMITS.maxFiles)
    throw new DomainError(
      "TOO_MANY_FILES",
      `At most ${LIMITS.maxFiles} files are allowed.`,
      413,
    );
  const file = files[0]!;
  if (toolId === "sprite-sheet") {
    return spriteSheet(files, SpriteSheetOptionsSchema.parse(rawOptions));
  }
  const opened = await openStillImage(file.buffer);
  switch (toolId) {
    case "auto-orient":
      enforceOutputDimensions(opened.width, opened.height);
      return output(
        opened.image,
        file,
        AutoOrientOptionsSchema.parse(rawOptions),
      );
    case "affine": {
      const opts = AffineOptionsSchema.parse(rawOptions);
      // libvips rounds transformed bounding-box extents to the nearest pixel.
      const width = Math.round(
        Math.abs(opts.a) * opened.width + Math.abs(opts.b) * opened.height,
      );
      const height = Math.round(
        Math.abs(opts.c) * opened.width + Math.abs(opts.d) * opened.height,
      );
      if (width < 1 || height < 1)
        invalid(
          "The affine transform must retain at least one pixel on each edge.",
        );
      enforceOutputDimensions(width, height);
      return output(
        opened.image.affine([opts.a, opts.b, opts.c, opts.d], {
          background: opts.background,
          // Transform pixel centers, avoiding a one-pixel blank edge when
          // reflecting an axis or using a negative rotation coefficient.
          idx: 0.5,
          idy: 0.5,
          odx: -0.5,
          ody: -0.5,
        }),
        file,
        opts,
      );
    }
    case "vignette": {
      const opts = VignetteOptionsSchema.parse(rawOptions);
      const pixels = await rgba(opened);
      for (let y = 0; y < opened.height; y += 1) {
        for (let x = 0; x < opened.width; x += 1) {
          const dx = opened.width === 1 ? 0 : (2 * x) / (opened.width - 1) - 1;
          const dy =
            opened.height === 1 ? 0 : (2 * y) / (opened.height - 1) - 1;
          const distance = Math.sqrt((dx * dx + dy * dy) / 2);
          const falloff =
            opts.radius === 1
              ? 0
              : Math.max(0, (distance - opts.radius) / (1 - opts.radius));
          const factor = 1 - opts.strength * Math.min(1, falloff * falloff);
          const offset = (y * opened.width + x) * 4;
          for (let channel = 0; channel < 3; channel += 1)
            pixels[offset + channel] = Math.round(
              pixels[offset + channel]! * factor,
            );
        }
      }
      return output(rawImage(pixels, opened.width, opened.height), file, opts);
    }
    case "shadow": {
      const opts = ShadowOptionsSchema.parse(rawOptions);
      const margin = Math.ceil(opts.blur * 3);
      const left = Math.max(0, margin - opts.offsetX);
      const top = Math.max(0, margin - opts.offsetY);
      const width = opened.width + left + Math.max(0, margin + opts.offsetX);
      const height = opened.height + top + Math.max(0, margin + opts.offsetY);
      preflightRaw(width, height);
      const pixels = await rgba(opened);
      const color = await colorBytes(opts.color);
      const mask = Buffer.alloc(width * height * 4);
      for (let y = 0; y < opened.height; y += 1) {
        for (let x = 0; x < opened.width; x += 1) {
          const source = (y * opened.width + x) * 4;
          const target =
            ((y + top + opts.offsetY) * width + x + left + opts.offsetX) * 4;
          mask[target] = color[0]!;
          mask[target + 1] = color[1]!;
          mask[target + 2] = color[2]!;
          mask[target + 3] = Math.round(
            (pixels[source + 3]! * opts.opacity * color[3]!) / 255,
          );
        }
      }
      let shadow = rawImage(mask, width, height);
      if (opts.blur > 0) shadow = shadow.blur(opts.blur);
      const shadowBuffer = await shadow.png().toBuffer();
      return output(
        canvas(width, height).composite([
          { input: shadowBuffer },
          {
            input: pixels,
            raw: { width: opened.width, height: opened.height, channels: 4 },
            left,
            top,
          },
        ]),
        file,
        opts,
      );
    }
    case "reflection": {
      const opts = ReflectionOptionsSchema.parse(rawOptions);
      const reflectionHeight = Math.max(
        1,
        Math.round(opened.height * opts.height),
      );
      const height = opened.height + opts.gap + reflectionHeight;
      preflightRaw(opened.width, height);
      const pixels = await rgba(opened);
      const reflected = Buffer.alloc(opened.width * reflectionHeight * 4);
      for (let y = 0; y < reflectionHeight; y += 1) {
        const sourceY = opened.height - 1 - y;
        for (let x = 0; x < opened.width; x += 1) {
          const source = (sourceY * opened.width + x) * 4;
          const target = (y * opened.width + x) * 4;
          pixels.copy(reflected, target, source, source + 3);
          reflected[target + 3] = Math.round(
            pixels[source + 3]! * opts.opacity * (1 - y / reflectionHeight),
          );
        }
      }
      return output(
        canvas(opened.width, height).composite([
          {
            input: pixels,
            raw: { width: opened.width, height: opened.height, channels: 4 },
            left: 0,
            top: 0,
          },
          {
            input: reflected,
            raw: { width: opened.width, height: reflectionHeight, channels: 4 },
            left: 0,
            top: opened.height + opts.gap,
          },
        ]),
        file,
        opts,
      );
    }
    case "tile": {
      const opts = TileOptionsSchema.parse(rawOptions);
      const width = opened.width * opts.columns + opts.gap * (opts.columns - 1);
      const height = opened.height * opts.rows + opts.gap * (opts.rows - 1);
      enforceOutputDimensions(width, height);
      const input = await opened.image.png().toBuffer();
      const overlays: OverlayOptions[] = [];
      for (let y = 0; y < opts.rows; y += 1)
        for (let x = 0; x < opts.columns; x += 1)
          overlays.push({
            input,
            left: x * (opened.width + opts.gap),
            top: y * (opened.height + opts.gap),
          });
      return output(
        canvas(width, height, opts.background).composite(overlays),
        file,
        opts,
      );
    }
    case "slice": {
      const opts = SliceOptionsSchema.parse(rawOptions);
      enforceOutputDimensions(opened.width, opened.height);
      if (opts.columns > opened.width || opts.rows > opened.height)
        invalid("Slice rows and columns may not exceed image dimensions.");
      const entries: ArchiveEntry[] = [];
      const tiles = [];
      let totalBytes = 0;
      for (let row = 0; row < opts.rows; row += 1) {
        for (let column = 0; column < opts.columns; column += 1) {
          const left = Math.floor((column * opened.width) / opts.columns);
          const top = Math.floor((row * opened.height) / opts.rows);
          const width =
            Math.floor(((column + 1) * opened.width) / opts.columns) - left;
          const height =
            Math.floor(((row + 1) * opened.height) / opts.rows) - top;
          const tile = await encodeImage(
            opened.image.clone().extract({ left, top, width, height }),
            opts.format,
            `tile-${row + 1}-${column + 1}`,
            opts,
          );
          totalBytes += tile.bytes;
          enforceAggregateOutputBytes(totalBytes);
          entries.push({ name: tile.filename, body: tile.body });
          tiles.push({
            file: tile.filename,
            row,
            column,
            left,
            top,
            width,
            height,
          });
        }
      }
      entries.push({
        name: "manifest.json",
        body: JSON.stringify(
          SliceManifestSchema.parse({
            version: 1,
            kind: "slice",
            width: opened.width,
            height: opened.height,
            columns: opts.columns,
            rows: opts.rows,
            tiles,
          }),
          null,
          2,
        ),
      });
      return createZip(`${safeFilenameBase(file.filename)}-slices`, entries);
    }
    case "icon-set": {
      const opts = IconSetOptionsSchema.parse(rawOptions);
      if (
        opts.sizes.reduce((sum, size) => sum + size * size, 0) >
        LIMITS.maxOutputPixels
      )
        throw new DomainError(
          "OUTPUT_LIMIT_EXCEEDED",
          "Combined icon dimensions exceed the output pixel limit.",
          413,
        );
      const entries: ArchiveEntry[] = [];
      const icons = [];
      const icoImages: { size: number; body: Buffer }[] = [];
      let totalBytes = 0;
      for (const size of opts.sizes) {
        enforceOutputDimensions(size, size);
        const icon = await encodeImage(
          opened.image
            .clone()
            // PNG-compressed ICO frames must contain 32-bit RGBA pixels.
            .toColourspace("srgb")
            .ensureAlpha()
            .resize(size, size, { fit: opts.fit, background: opts.background }),
          "png",
          `icon-${size}`,
        );
        totalBytes += icon.bytes;
        enforceAggregateOutputBytes(totalBytes);
        entries.push({ name: icon.filename, body: icon.body });
        icons.push({ file: icon.filename, width: size, height: size });
        if (opts.includeIco && size <= 256)
          icoImages.push({ size, body: icon.body });
      }
      if (opts.includeIco)
        entries.push({ name: "favicon.ico", body: createIco(icoImages) });
      entries.push({
        name: "manifest.json",
        body: JSON.stringify(
          IconSetManifestSchema.parse({
            version: 1,
            kind: "icon-set",
            icons,
            ...(opts.includeIco ? { ico: "favicon.ico" } : {}),
          }),
          null,
          2,
        ),
      });
      return createZip(`${safeFilenameBase(file.filename)}-icons`, entries);
    }
    case "pixel-inspect": {
      const point = PixelInspectOptionsSchema.parse(rawOptions);
      if (point.x >= opened.width || point.y >= opened.height)
        invalid("The sample point must lie inside the oriented image.");
      const bytes = await opened.image
        .clone()
        .toColourspace("srgb")
        .ensureAlpha()
        .extract({ left: point.x, top: point.y, width: 1, height: 1 })
        .raw()
        .toBuffer();
      return jsonResult(
        PixelInspectResultSchema.parse({
          ...point,
          width: opened.width,
          height: opened.height,
          rgba: [...bytes],
          hex: `#${bytes.toString("hex")}`,
        }),
      );
    }
    case "fingerprint":
      return fingerprint(
        opened,
        file,
        FingerprintOptionsSchema.parse(rawOptions).algorithm,
      );
    case "redact": {
      const opts = RedactOptionsSchema.parse(rawOptions);
      for (const region of opts.regions)
        validateRegion(region, opened.width, opened.height);
      const pixels = await rgba(opened);
      const color = await colorBytes(opts.color);
      for (const region of opts.regions) {
        let replacement: Buffer;
        if (opts.mode === "solid") {
          // Solid redactions are opaque so content cannot be recovered from alpha.
          color[3] = 255;
          replacement = Buffer.alloc(region.width * region.height * 4);
          for (let offset = 0; offset < replacement.length; offset += 4)
            color.copy(replacement, offset);
        } else {
          let patch = rawImage(pixels, opened.width, opened.height).extract(
            region,
          );
          if (opts.mode === "blur") patch = patch.blur(opts.blur);
          else {
            const small = await patch
              .resize(
                Math.max(1, Math.ceil(region.width / opts.blockSize)),
                Math.max(1, Math.ceil(region.height / opts.blockSize)),
                { fit: "fill" },
              )
              .raw()
              .toBuffer({ resolveWithObject: true });
            patch = rawImage(
              small.data,
              small.info.width,
              small.info.height,
            ).resize(region.width, region.height, {
              fit: "fill",
              kernel: "nearest",
            });
          }
          replacement = await patch.raw().toBuffer();
        }
        for (let y = 0; y < region.height; y += 1)
          replacement.copy(
            pixels,
            ((region.top + y) * opened.width + region.left) * 4,
            y * region.width * 4,
            (y + 1) * region.width * 4,
          );
      }
      return output(rawImage(pixels, opened.width, opened.height), file, opts);
    }
    default:
      invalid(`Unknown layout operation: ${toolId}.`);
  }
}
