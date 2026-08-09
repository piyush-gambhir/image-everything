import sharp, { type Sharp } from "sharp";

import { decodeHeic, isHeicBuffer } from "@/lib/heic";
import type {
  AutoEnhanceOptions,
  CleanOptions,
  CompressOptions,
  ConvertOptions,
  CropOptions,
  ResizeOptions,
  RotateOptions,
  TransformOp,
  WatermarkOptions,
} from "@/lib/schemas";
import type { EngineResult, OutputFormat } from "@/lib/types";
import { MAX_INPUT_PIXELS } from "@/shared/api-contract";

sharp.cache(false);
sharp.concurrency(1);

export async function clean(
  buffer: Buffer,
  options: CleanOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  let pipeline = sharpInstance;

  const keep = options.keep ?? [];
  const keepOrientation = keep.includes("orientation");
  const keepIcc = keep.includes("colorProfile");

  if (!keepOrientation) {
    pipeline = pipeline.rotate();
  }

  if (keepIcc) {
    pipeline = pipeline.keepIccProfile();
  }

  if (keepOrientation) {
    const meta = await sharp(buffer).metadata();
    if (meta.orientation) {
      pipeline = pipeline.withExif({
        IFD0: { Orientation: String(meta.orientation) },
      });
    }
  }

  const targetFormat = pickReencodeFormat(sourceFormat);
  return runEncode(pipeline, targetFormat);
}

export async function compress(
  buffer: Buffer,
  options: CompressOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  const pipeline = sharpInstance.rotate();

  const target: OutputFormat =
    options.format === "auto" ? (sourceFormat ?? "jpeg") : options.format;

  return runEncode(pipeline, target, {
    quality: options.quality,
    lossless: options.lossless,
    mozjpeg: options.mozjpeg,
  });
}

export async function resize(
  buffer: Buffer,
  options: ResizeOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  const pipeline = sharpInstance.rotate().resize({
    width: options.width,
    height: options.height,
    fit: options.fit,
    position: options.position,
    background: options.background,
    withoutEnlargement: options.withoutEnlargement,
  });
  return runEncode(pipeline, sourceFormat ?? "jpeg");
}

export async function convert(
  buffer: Buffer,
  options: ConvertOptions,
): Promise<EngineResult> {
  const { sharpInstance } = await openSharp(buffer);
  let pipeline = sharpInstance.rotate();

  if (options.targetFormat === "jpeg") {
    pipeline = pipeline.flatten({
      background: options.background ?? "#ffffff",
    });
  }

  return runEncode(pipeline, options.targetFormat, {
    quality: options.quality,
  });
}

export async function crop(
  buffer: Buffer,
  options: CropOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  const baked = sharpInstance.rotate();
  const meta = await sharp(await baked.toBuffer()).metadata();
  const maxW = meta.width ?? 0;
  const maxH = meta.height ?? 0;
  if (
    options.left + options.width > maxW ||
    options.top + options.height > maxH
  ) {
    throw new Error(
      `Crop region (${options.left},${options.top} ${options.width}×${options.height}) is outside image bounds (${maxW}×${maxH})`,
    );
  }
  const pipeline = sharpInstance.rotate().extract({
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
  });
  return runEncode(pipeline, sourceFormat ?? "jpeg");
}

export async function rotate(
  buffer: Buffer,
  options: RotateOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  let pipeline = sharpInstance.rotate();
  if (options.angle !== 0) {
    pipeline = pipeline.rotate(options.angle);
  }
  if (options.flipH) pipeline = pipeline.flop();
  if (options.flipV) pipeline = pipeline.flip();
  return runEncode(pipeline, sourceFormat ?? "jpeg");
}

export async function watermark(
  buffer: Buffer,
  options: WatermarkOptions,
  overlayBuffer?: Buffer,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  const baked = sharpInstance.rotate();
  const meta = await sharp(await baked.toBuffer()).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 768;

  let overlayInput: Buffer;
  if (options.kind === "text") {
    const fontSize = Math.max(16, Math.round(Math.min(width, height) / 18));
    overlayInput = Buffer.from(
      renderWatermarkSvg({
        text: options.text,
        color: options.color,
        opacity: options.opacity,
        fontSize,
        width,
        height,
        position: options.position,
        padding: options.padding,
      }),
    );
  } else {
    if (!overlayBuffer) {
      throw new Error('Image watermark requires an "overlay" file');
    }
    const targetWidth = Math.max(40, Math.round(width / 4));
    overlayInput = await prepareImageOverlay(
      overlayBuffer,
      targetWidth,
      options.opacity,
    );
  }

  const gravity =
    options.kind === "text" ? "northwest" : gravityFor(options.position);
  const composite =
    options.kind === "text"
      ? [{ input: overlayInput, gravity }]
      : [
          {
            input: overlayInput,
            top:
              gravity === "center"
                ? undefined
                : positionToTop(
                    options.position,
                    options.padding,
                    height,
                    await sharp(overlayInput).metadata(),
                  ),
            left:
              gravity === "center"
                ? undefined
                : positionToLeft(
                    options.position,
                    options.padding,
                    width,
                    await sharp(overlayInput).metadata(),
                  ),
            gravity: gravity === "center" ? "center" : undefined,
          } as sharp.OverlayOptions,
        ];

  const pipeline = sharpInstance.rotate().composite(composite);
  return runEncode(pipeline, sourceFormat ?? "jpeg");
}

async function prepareImageOverlay(
  overlay: Buffer,
  targetWidth: number,
  opacity: number,
): Promise<Buffer> {
  const resized = await sharp(overlay)
    .resize({ width: targetWidth, withoutEnlargement: true, fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();
  if (opacity >= 1) return resized;
  return sharp(resized)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

export async function autoEnhance(
  buffer: Buffer,
  options: AutoEnhanceOptions,
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  let pipeline = sharpInstance.rotate();
  pipeline = applyAutoEnhance(pipeline, options);
  return runEncode(pipeline, sourceFormat ?? "jpeg");
}

function applyAutoEnhance(pipeline: Sharp, options: AutoEnhanceOptions): Sharp {
  let next = pipeline;
  if (options.normalize !== false) next = next.normalize();
  const modulateOptions: {
    brightness?: number;
    saturation?: number;
    hue?: number;
  } = {};
  if (options.brightness !== undefined)
    modulateOptions.brightness = options.brightness;
  if (options.saturation !== undefined)
    modulateOptions.saturation = options.saturation;
  if (options.hue !== undefined) modulateOptions.hue = options.hue;
  if (Object.keys(modulateOptions).length > 0) {
    next = next.modulate(modulateOptions);
  }
  if (options.sharpen) next = next.sharpen();
  return next;
}

export async function transform(
  buffer: Buffer,
  ops: TransformOp[],
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer);
  let pipeline = sharpInstance.rotate();
  let outputFormat: OutputFormat = sourceFormat ?? "jpeg";
  let encodeOptions: {
    quality?: number;
    lossless?: boolean;
    mozjpeg?: boolean;
  } = {};

  for (const step of ops) {
    switch (step.op) {
      case "resize":
        pipeline = pipeline.resize({
          width: step.options.width,
          height: step.options.height,
          fit: step.options.fit,
          position: step.options.position,
          background: step.options.background,
          withoutEnlargement: step.options.withoutEnlargement,
        });
        break;
      case "rotate":
        if (step.options.angle !== 0)
          pipeline = pipeline.rotate(step.options.angle);
        if (step.options.flipH) pipeline = pipeline.flop();
        if (step.options.flipV) pipeline = pipeline.flip();
        break;
      case "crop":
        pipeline = pipeline.extract({
          left: step.options.left,
          top: step.options.top,
          width: step.options.width,
          height: step.options.height,
        });
        break;
      case "convert":
        outputFormat = step.options.targetFormat;
        encodeOptions = { quality: step.options.quality };
        if (outputFormat === "jpeg") {
          pipeline = pipeline.flatten({
            background: step.options.background ?? "#ffffff",
          });
        }
        break;
      case "compress":
        outputFormat =
          step.options.format === "auto" ? outputFormat : step.options.format;
        encodeOptions = {
          quality: step.options.quality,
          lossless: step.options.lossless,
          mozjpeg: step.options.mozjpeg,
        };
        break;
      case "autoEnhance":
        pipeline = applyAutoEnhance(
          pipeline,
          step.options ?? { normalize: true },
        );
        break;
      case "clean":
        // clean is implicit — single-pipeline transform never re-attaches metadata
        break;
    }
  }

  return runEncode(pipeline, outputFormat, encodeOptions);
}

function gravityFor(
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center",
): string {
  switch (position) {
    case "top-left":
      return "northwest";
    case "top-right":
      return "northeast";
    case "bottom-left":
      return "southwest";
    case "bottom-right":
      return "southeast";
    case "center":
    default:
      return "center";
  }
}

function positionToTop(
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center",
  padding: number,
  imgHeight: number,
  overlayMeta: { height?: number },
): number | undefined {
  const oh = overlayMeta.height ?? 0;
  if (position.startsWith("top")) return padding;
  if (position.startsWith("bottom")) return imgHeight - oh - padding;
  return undefined;
}

function positionToLeft(
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center",
  padding: number,
  imgWidth: number,
  overlayMeta: { width?: number },
): number | undefined {
  const ow = overlayMeta.width ?? 0;
  if (position.endsWith("left")) return padding;
  if (position.endsWith("right")) return imgWidth - ow - padding;
  return undefined;
}

function renderWatermarkSvg(opts: {
  text: string;
  color: string;
  opacity: number;
  fontSize: number;
  width: number;
  height: number;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
  padding: number;
}): string {
  const safeText = escapeXml(opts.text);
  let x: number;
  let y: number;
  let anchor: "start" | "middle" | "end";
  switch (opts.position) {
    case "top-left":
      x = opts.padding;
      y = opts.padding + opts.fontSize;
      anchor = "start";
      break;
    case "top-right":
      x = opts.width - opts.padding;
      y = opts.padding + opts.fontSize;
      anchor = "end";
      break;
    case "bottom-left":
      x = opts.padding;
      y = opts.height - opts.padding;
      anchor = "start";
      break;
    case "bottom-right":
      x = opts.width - opts.padding;
      y = opts.height - opts.padding;
      anchor = "end";
      break;
    case "center":
    default:
      x = opts.width / 2;
      y = opts.height / 2;
      anchor = "middle";
      break;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}">
  <text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${opts.fontSize}" fill="${opts.color}" fill-opacity="${opts.opacity}" text-anchor="${anchor}" stroke="black" stroke-width="${Math.max(1, Math.round(opts.fontSize / 24))}" stroke-opacity="${opts.opacity * 0.4}" paint-order="stroke fill" font-weight="600">${safeText}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function openSharp(
  buffer: Buffer,
): Promise<{ sharpInstance: Sharp; sourceFormat: OutputFormat | null }> {
  if (isHeicBuffer(buffer)) {
    const decoded = await decodeHeic(buffer);
    if (decoded.width * decoded.height > MAX_INPUT_PIXELS) {
      throw new Error(
        `Image exceeds the ${MAX_INPUT_PIXELS} pixel input limit`,
      );
    }
    const instance = sharp(decoded.data, {
      raw: { width: decoded.width, height: decoded.height, channels: 4 },
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    return { sharpInstance: instance, sourceFormat: null };
  }
  const instance = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });
  const meta = await instance.metadata();
  const detected = sharpFormatToOutput(meta.format);
  return {
    sharpInstance: sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }),
    sourceFormat: detected,
  };
}

function pickReencodeFormat(sourceFormat: OutputFormat | null): OutputFormat {
  return sourceFormat ?? "jpeg";
}

export function applyEncoder(
  pipeline: Sharp,
  format: OutputFormat,
  options: EncodeOptions = {},
): Sharp {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({
        quality: options.quality ?? 92,
        mozjpeg: options.mozjpeg ?? true,
      });
    case "png":
      return pipeline.png({
        compressionLevel: 9,
        effort: 7,
        ...(options.lossless ? { palette: false } : {}),
      });
    case "webp":
      return pipeline.webp({
        quality: options.quality ?? 90,
        lossless: options.lossless ?? false,
        effort: 4,
      });
    case "avif":
      return pipeline.avif({
        quality: options.quality ?? 70,
        lossless: options.lossless ?? false,
        effort: 4,
      });
    case "gif":
      return pipeline.gif();
    default:
      return pipeline.jpeg({ quality: options.quality ?? 92, mozjpeg: true });
  }
}

export async function runEncode(
  pipeline: Sharp,
  format: OutputFormat,
  options: EncodeOptions = {},
): Promise<EngineResult> {
  const encoded = applyEncoder(pipeline, format, options);
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    format,
    width: info.width,
    height: info.height,
    size: info.size,
  };
}

type EncodeOptions = {
  quality?: number;
  lossless?: boolean;
  mozjpeg?: boolean;
};

function sharpFormatToOutput(format: string | undefined): OutputFormat | null {
  if (!format) return null;
  if (format === "jpeg" || format === "jpg") return "jpeg";
  if (
    format === "png" ||
    format === "webp" ||
    format === "avif" ||
    format === "gif"
  ) {
    return format;
  }
  return null;
}
