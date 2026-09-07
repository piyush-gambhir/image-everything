import {
  FORMAT_EXTENSIONS,
  LIMITS,
  type AdjustOptions,
  type AlphaOptions,
  type BlurSharpenOptions,
  type CollageOptions,
  type CompressOptions,
  type CompressToSizeOptions,
  type ConvertOptions,
  type CropOptions,
  type ExtendOptions,
  type FilterOptions,
  type FrameOptions,
  type NormalizeOptions,
  type OutputFormat,
  type Pipeline,
  type PipelineStep,
  type PixelateOptions,
  type QuickEnhanceOptions,
  type ResizeOptions,
  type ResponsiveOptions,
  type RotateOptions,
  type TrimOptions,
  type WatermarkOptions,
  type ArchiveManifest,
} from "@image-everything/contracts";
import sharp, { type Sharp } from "sharp";

import { createZip, enforceAggregateOutputBytes } from "./archive";
import { DomainError, asDomainError } from "./errors";
import { applyMetadataEdits } from "./metadata";
import {
  ensureOutputFormat,
  enforceOutputDimensions,
  openStillImage,
  sourceOutputFormat,
} from "./input";
import {
  encodeImage,
  imageFilename,
  safeFilenameBase,
  type ImageExecutionResult,
  type ZipExecutionResult,
} from "./output";

type Dimensions = { width: number; height: number };
type BufferedArchiveEntry = { name: string; body: Buffer };

function appendArchiveEntry(
  entries: BufferedArchiveEntry[],
  entry: BufferedArchiveEntry,
): void {
  const nextBytes =
    entries.reduce((total, candidate) => total + candidate.body.length, 0) +
    entry.body.length;
  enforceAggregateOutputBytes(nextBytes);
  entries.push(entry);
}

function outputOptions(pipeline: Pipeline): Pipeline["output"] {
  return pipeline.output;
}

function calculateResize(
  dimensions: Dimensions,
  options: ResizeOptions,
): Dimensions {
  if (options.percent !== undefined) {
    const scale = options.percent / 100;
    const result = {
      width: Math.max(1, Math.round(dimensions.width * scale)),
      height: Math.max(1, Math.round(dimensions.height * scale)),
    };
    enforceOutputDimensions(result.width, result.height);
    return result;
  }

  const requestedWidth = options.width;
  const requestedHeight = options.height;
  let scale: number;
  if (requestedWidth !== undefined && requestedHeight !== undefined) {
    if (
      options.fit === "fill" ||
      options.fit === "cover" ||
      options.fit === "contain"
    ) {
      enforceOutputDimensions(requestedWidth, requestedHeight);
      return { width: requestedWidth, height: requestedHeight };
    }
    const widthScale = requestedWidth / dimensions.width;
    const heightScale = requestedHeight / dimensions.height;
    scale =
      options.fit === "outside"
        ? Math.max(widthScale, heightScale)
        : Math.min(widthScale, heightScale);
  } else if (requestedWidth !== undefined) {
    scale = requestedWidth / dimensions.width;
  } else {
    scale = (requestedHeight ?? dimensions.height) / dimensions.height;
  }
  if (options.withoutEnlargement) scale = Math.min(1, scale);
  if (options.withoutReduction) scale = Math.max(1, scale);
  const result = {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
  enforceOutputDimensions(result.width, result.height);
  return result;
}

function resizePipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: ResizeOptions,
): { pipeline: Sharp; dimensions: Dimensions } {
  const target = calculateResize(dimensions, options);
  const width = options.percent !== undefined ? target.width : options.width;
  const height = options.percent !== undefined ? target.height : options.height;
  return {
    pipeline: pipeline.resize({
      width,
      height,
      fit: options.fit,
      position: options.position,
      kernel: options.kernel,
      background: options.background,
      withoutEnlargement: options.withoutEnlargement,
      withoutReduction: options.withoutReduction,
    }),
    dimensions: target,
  };
}

function cropPipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: CropOptions,
): { pipeline: Sharp; dimensions: Dimensions } {
  if (options.mode === "rectangle") {
    if (
      options.left + options.width > dimensions.width ||
      options.top + options.height > dimensions.height
    ) {
      throw new DomainError(
        "INVALID_OPERATION_COMBINATION",
        "The crop rectangle lies outside the oriented image bounds.",
        422,
      );
    }
    enforceOutputDimensions(options.width, options.height);
    return {
      pipeline: pipeline.extract({
        left: options.left,
        top: options.top,
        width: options.width,
        height: options.height,
      }),
      dimensions: { width: options.width, height: options.height },
    };
  }

  const ratio = options.aspectWidth / options.aspectHeight;
  let width = dimensions.width;
  let height = Math.round(width / ratio);
  if (height > dimensions.height) {
    height = dimensions.height;
    width = Math.round(height * ratio);
  }
  enforceOutputDimensions(width, height);
  return {
    pipeline: pipeline.resize({
      width,
      height,
      fit: "cover",
      position: options.position,
      withoutEnlargement: true,
    }),
    dimensions: { width, height },
  };
}

function rotateDimensions(dimensions: Dimensions, angle: number): Dimensions {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 0 || normalized === 180) return dimensions;
  if (normalized === 90 || normalized === 270) {
    return { width: dimensions.height, height: dimensions.width };
  }
  const radians = (normalized * Math.PI) / 180;
  const width = Math.ceil(
    Math.abs(dimensions.width * Math.cos(radians)) +
      Math.abs(dimensions.height * Math.sin(radians)),
  );
  const height = Math.ceil(
    Math.abs(dimensions.width * Math.sin(radians)) +
      Math.abs(dimensions.height * Math.cos(radians)),
  );
  return { width, height };
}

function rotatePipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: RotateOptions,
): { pipeline: Sharp; dimensions: Dimensions } {
  let next = pipeline;
  if (options.angle !== 0)
    next = next.rotate(options.angle, { background: options.background });
  if (options.flipHorizontal) next = next.flop();
  if (options.flipVertical) next = next.flip();
  const resultDimensions = rotateDimensions(dimensions, options.angle);
  enforceOutputDimensions(resultDimensions.width, resultDimensions.height);
  return { pipeline: next, dimensions: resultDimensions };
}

function extendPipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: ExtendOptions,
): { pipeline: Sharp; dimensions: Dimensions } {
  const width = dimensions.width + options.left + options.right;
  const height = dimensions.height + options.top + options.bottom;
  enforceOutputDimensions(width, height);
  return {
    pipeline: pipeline.extend({
      top: options.top,
      right: options.right,
      bottom: options.bottom,
      left: options.left,
      extendWith: options.mode,
      background: options.background,
    }),
    dimensions: { width, height },
  };
}

function alphaPipeline(pipeline: Sharp, options: AlphaOptions): Sharp {
  switch (options.action) {
    case "flatten":
      return pipeline.flatten({ background: options.background });
    case "ensure":
      return pipeline.ensureAlpha(options.alpha);
    case "remove":
      return pipeline.removeAlpha();
    case "extract":
      return pipeline.ensureAlpha().extractChannel("alpha");
  }
}

function adjustPipeline(pipeline: Sharp, options: AdjustOptions): Sharp {
  let next = pipeline.modulate({
    brightness: options.brightness,
    saturation: options.saturation,
    hue: options.hue,
  });
  if (options.contrast !== 0) {
    const contrast255 = options.contrast * 255;
    const factor = (259 * (contrast255 + 255)) / (255 * (259 - contrast255));
    next = next.linear(factor, 128 * (1 - factor));
  }
  if (options.gamma !== 1) next = next.gamma(options.gamma);
  return next;
}

function normalizePipeline(pipeline: Sharp, options: NormalizeOptions): Sharp {
  return options.mode === "normalize"
    ? pipeline.normalise({ lower: options.lower, upper: options.upper })
    : pipeline.clahe({
        width: options.width,
        height: options.height,
        maxSlope: options.maxSlope,
      });
}

function filterPipeline(pipeline: Sharp, options: FilterOptions): Sharp {
  switch (options.kind) {
    case "grayscale":
      return pipeline.grayscale();
    case "sepia":
      return pipeline.recomb([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
      ]);
    case "invert":
      return pipeline.negate({ alpha: options.alpha });
    case "threshold":
      return pipeline.threshold(options.value, {
        grayscale: options.grayscale,
      });
    case "tint":
      return pipeline.tint(options.color);
  }
}

function localFilterPipeline(
  pipeline: Sharp,
  options: BlurSharpenOptions,
): Sharp {
  switch (options.kind) {
    case "blur":
      return pipeline.blur(options.sigma);
    case "median":
      return pipeline.median(options.size);
    case "sharpen":
      return pipeline.sharpen({
        sigma: options.sigma,
        m1: options.m1,
        m2: options.m2,
        x1: options.x1,
        y2: options.y2,
        y3: options.y3,
      });
  }
}

function quickEnhancePipeline(
  pipeline: Sharp,
  options: QuickEnhanceOptions,
): Sharp {
  let next = pipeline;
  if (options.normalize) next = next.normalise();
  next = next.modulate({
    brightness: options.brightness,
    saturation: options.saturation,
    hue: options.hue,
  });
  if (options.sharpen) next = next.sharpen();
  return next;
}

function roundedMask(width: number, height: number, radius: number): Buffer {
  const safeRadius = Math.min(radius, Math.floor(Math.min(width, height) / 2));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${safeRadius}" ry="${safeRadius}" fill="#fff"/></svg>`,
  );
}

function framePipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: FrameOptions,
): { pipeline: Sharp; dimensions: Dimensions } {
  let next = pipeline;
  if (options.radius > 0) {
    const background = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}"><rect width="100%" height="100%" fill="${options.background}"/></svg>`,
    );
    next = next.ensureAlpha().composite([
      {
        input: roundedMask(dimensions.width, dimensions.height, options.radius),
        blend: "dest-in",
      },
      { input: background, blend: "dest-over" },
    ]);
  }
  if (options.border > 0) {
    next = next.extend({
      top: options.border,
      right: options.border,
      bottom: options.border,
      left: options.border,
      background: options.color,
    });
  }
  const width = dimensions.width + options.border * 2;
  const height = dimensions.height + options.border * 2;
  enforceOutputDimensions(width, height);
  return { pipeline: next, dimensions: { width, height } };
}

export function escapeWatermarkXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function anchorPosition(
  canvas: Dimensions,
  overlay: Dimensions,
  anchor: WatermarkOptions["anchor"],
  offsetX: number,
  offsetY: number,
): { left: number; top: number } {
  const horizontal = anchor.includes("left")
    ? offsetX
    : anchor.includes("right")
      ? canvas.width - overlay.width - offsetX
      : Math.round((canvas.width - overlay.width) / 2) + offsetX;
  const vertical = anchor.includes("top")
    ? offsetY
    : anchor.includes("bottom")
      ? canvas.height - overlay.height - offsetY
      : Math.round((canvas.height - overlay.height) / 2) + offsetY;
  return {
    left: Math.max(0, Math.min(canvas.width - overlay.width, horizontal)),
    top: Math.max(0, Math.min(canvas.height - overlay.height, vertical)),
  };
}

async function textWatermarkOverlay(
  dimensions: Dimensions,
  options: Extract<WatermarkOptions, { kind: "text" }>,
): Promise<{ body: Buffer; width: number; height: number }> {
  const fontSize =
    options.fontSize ??
    Math.max(
      12,
      Math.round(Math.min(dimensions.width, dimensions.height) / 18),
    );
  const width = Math.min(
    dimensions.width,
    Math.max(fontSize * 2, Math.ceil(options.text.length * fontSize * 0.65)),
  );
  const height = Math.min(dimensions.height, Math.ceil(fontSize * 1.6));
  const family =
    options.font === "serif"
      ? "serif"
      : options.font === "mono"
        ? "monospace"
        : "sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="0" y="${Math.round(fontSize * 1.15)}" font-family="${family}" font-size="${fontSize}" font-weight="600" fill="${options.color}" fill-opacity="${options.opacity}" stroke="${options.strokeColor}" paint-order="stroke fill">${escapeWatermarkXml(options.text)}</text></svg>`;
  return { body: Buffer.from(svg), width, height };
}

async function applyWatermark(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: WatermarkOptions,
  overlayBuffer?: Buffer,
): Promise<Sharp> {
  let overlay: { body: Buffer; width: number; height: number };
  if (options.kind === "text") {
    overlay = await textWatermarkOverlay(dimensions, options);
  } else {
    if (!overlayBuffer) {
      throw new DomainError(
        "MISSING_INPUT",
        'Image watermark requires an "overlay" multipart file.',
        400,
      );
    }
    if (overlayBuffer.length > LIMITS.maxOverlayBytes) {
      throw new DomainError(
        "OVERLAY_TOO_LARGE",
        `The overlay may not exceed ${LIMITS.maxOverlayBytes} bytes.`,
        413,
      );
    }
    const openedOverlay = await openStillImage(overlayBuffer);
    const targetWidth = Math.max(
      1,
      Math.round(dimensions.width * options.scale),
    );
    const encoded = await openedOverlay.image
      .resize({ width: targetWidth, fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer({ resolveWithObject: true });
    let body = encoded.data;
    if (options.opacity < 1) {
      body = await sharp(body)
        .composite([
          {
            input: Buffer.from([
              255,
              255,
              255,
              Math.round(options.opacity * 255),
            ]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();
    }
    overlay = { body, width: encoded.info.width, height: encoded.info.height };
  }
  const position = anchorPosition(
    dimensions,
    overlay,
    options.anchor,
    options.offsetX,
    options.offsetY,
  );
  return pipeline.composite([{ input: overlay.body, ...position }]);
}

async function materializeRaw(
  pipeline: Sharp,
): Promise<{ pipeline: Sharp; dimensions: Dimensions }> {
  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });
  enforceOutputDimensions(info.width, info.height);
  return {
    pipeline: sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) }),
    dimensions: { width: info.width, height: info.height },
  };
}

async function pixelatePipeline(
  pipeline: Sharp,
  dimensions: Dimensions,
  options: PixelateOptions,
): Promise<Sharp> {
  const width = Math.max(1, Math.ceil(dimensions.width / options.blockSize));
  const height = Math.max(1, Math.ceil(dimensions.height / options.blockSize));
  const { data, info } = await pipeline
    .resize({ width, height, fit: "fill", kernel: "nearest" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }).resize({
    width: dimensions.width,
    height: dimensions.height,
    fit: "fill",
    kernel: "nearest",
  });
}

export async function compressImage(
  buffer: Buffer,
  originalName: string,
  options: CompressOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  const format =
    options.format === "auto"
      ? await sourceOutputFormat(opened.format)
      : options.format;
  return encodeImage(opened.image, format, originalName, options);
}

export async function compressImageToSize(
  buffer: Buffer,
  originalName: string,
  options: CompressToSizeOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  await ensureOutputFormat(options.format);
  let low = options.minQuality;
  let high = options.maxQuality;
  let best: ImageExecutionResult | undefined;
  let bestQuality: number | undefined;
  const closeEnoughBytes = Math.floor(
    options.targetBytes * (1 - options.tolerancePercent / 100),
  );
  for (
    let iteration = 0;
    iteration < options.maxIterations && low <= high;
    iteration += 1
  ) {
    const quality = Math.floor((low + high) / 2);
    const candidate = await encodeImage(
      opened.image.clone(),
      options.format,
      originalName,
      {
        quality,
        background: options.background,
        metadata: options.metadata,
      },
    );
    if (candidate.bytes <= options.targetBytes) {
      best = candidate;
      bestQuality = quality;
      if (candidate.bytes >= closeEnoughBytes) break;
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }
  if (!best) {
    throw new DomainError(
      "TARGET_SIZE_UNREACHABLE",
      `The image cannot reach ${options.targetBytes} bytes at the permitted minimum quality.`,
      422,
    );
  }
  return {
    ...best,
    headers: { "x-image-output-quality": String(bestQuality) },
  };
}

export async function resizeImage(
  buffer: Buffer,
  originalName: string,
  options: ResizeOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  const resized = resizePipeline(opened.image, opened, options);
  const format = await sourceOutputFormat(opened.format);
  return encodeImage(resized.pipeline, format, originalName);
}

export async function convertImage(
  buffer: Buffer,
  originalName: string,
  options: ConvertOptions,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  return encodeImage(opened.image, options.format, originalName, options);
}

export async function responsiveImages(
  buffer: Buffer,
  options: ResponsiveOptions,
): Promise<ZipExecutionResult> {
  await openStillImage(buffer);
  const entries: Array<{ name: string; body: Buffer }> = [];
  const manifest: ArchiveManifest = {
    version: 1,
    kind: "responsive",
    items: [],
  };
  const uniqueWidths = [...new Set(options.widths)].sort((a, b) => a - b);
  const uniqueFormats = [...new Set(options.formats)];
  const actualVariants = new Set<string>();
  for (const width of uniqueWidths) {
    for (const format of uniqueFormats) {
      const opened = await openStillImage(buffer);
      calculateResize(opened, {
        width,
        fit: options.fit,
        position: "center",
        kernel: "lanczos3",
        background: options.background,
        withoutEnlargement: options.withoutEnlargement,
        withoutReduction: false,
      });
      const result = await encodeImage(
        opened.image.resize({
          width,
          fit: options.fit,
          withoutEnlargement: options.withoutEnlargement,
          background: options.background,
        }),
        format,
        `${options.filenamePrefix}-${width}`,
        { quality: options.quality, background: options.background },
      );
      const name = `${safeFilenameBase(options.filenamePrefix)}-${result.width}w.${FORMAT_EXTENSIONS[format]}`;
      const variantKey = `${result.width}:${format}`;
      if (actualVariants.has(variantKey)) continue;
      actualVariants.add(variantKey);
      appendArchiveEntry(entries, { name, body: result.body });
      manifest.items.push({
        status: "success",
        input: "file",
        output: name,
        format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      });
    }
  }
  appendArchiveEntry(entries, {
    name: "manifest.json",
    body: Buffer.from(JSON.stringify(manifest, null, 2)),
  });
  return createZip("responsive-images", entries);
}

async function directPixelOperation(
  buffer: Buffer,
  originalName: string,
  operation: (
    pipeline: Sharp,
    dimensions: Dimensions,
  ) => Promise<Sharp> | Sharp,
  forcedFormat?: OutputFormat,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  const pipeline = await operation(opened.image, opened);
  const format = forcedFormat ?? (await sourceOutputFormat(opened.format));
  return encodeImage(pipeline, format, originalName);
}

export const quickEnhanceImage = (
  buffer: Buffer,
  originalName: string,
  options: QuickEnhanceOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    quickEnhancePipeline(pipeline, options),
  );

export const cropImage = (
  buffer: Buffer,
  originalName: string,
  options: CropOptions,
) =>
  directPixelOperation(
    buffer,
    originalName,
    (pipeline, dimensions) =>
      cropPipeline(pipeline, dimensions, options).pipeline,
  );

export const rotateImage = (
  buffer: Buffer,
  originalName: string,
  options: RotateOptions,
) =>
  directPixelOperation(
    buffer,
    originalName,
    (pipeline, dimensions) =>
      rotatePipeline(pipeline, dimensions, options).pipeline,
  );

export const trimImage = (
  buffer: Buffer,
  originalName: string,
  options: TrimOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    pipeline.trim({
      background: options.background,
      threshold: options.threshold,
      lineArt: options.lineArt,
    }),
  );

export const extendImage = (
  buffer: Buffer,
  originalName: string,
  options: ExtendOptions,
) =>
  directPixelOperation(
    buffer,
    originalName,
    (pipeline, dimensions) =>
      extendPipeline(pipeline, dimensions, options).pipeline,
  );

export const alphaImage = (
  buffer: Buffer,
  originalName: string,
  options: AlphaOptions,
) =>
  directPixelOperation(
    buffer,
    originalName,
    (pipeline) => alphaPipeline(pipeline, options),
    options.action === "extract" ? "png" : undefined,
  );

export const adjustImage = (
  buffer: Buffer,
  originalName: string,
  options: AdjustOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    adjustPipeline(pipeline, options),
  );

export const normalizeImage = (
  buffer: Buffer,
  originalName: string,
  options: NormalizeOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    normalizePipeline(pipeline, options),
  );

export const filterImage = (
  buffer: Buffer,
  originalName: string,
  options: FilterOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    filterPipeline(pipeline, options),
  );

export const blurSharpenImage = (
  buffer: Buffer,
  originalName: string,
  options: BlurSharpenOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline) =>
    localFilterPipeline(pipeline, options),
  );

export const pixelateImage = (
  buffer: Buffer,
  originalName: string,
  options: PixelateOptions,
) =>
  directPixelOperation(buffer, originalName, (pipeline, dimensions) =>
    pixelatePipeline(pipeline, dimensions, options),
  );

export const frameImage = (
  buffer: Buffer,
  originalName: string,
  options: FrameOptions,
) =>
  directPixelOperation(
    buffer,
    originalName,
    (pipeline, dimensions) =>
      framePipeline(pipeline, dimensions, options).pipeline,
  );

export const watermarkImage = (
  buffer: Buffer,
  originalName: string,
  options: WatermarkOptions,
  overlay?: Buffer,
) =>
  directPixelOperation(buffer, originalName, (pipeline, dimensions) =>
    applyWatermark(pipeline, dimensions, options, overlay),
  );

export async function collageImages(
  files: readonly { buffer: Buffer; filename: string }[],
  originalName: string,
  options: CollageOptions,
): Promise<ImageExecutionResult> {
  if (files.length < 2 || files.length > LIMITS.maxCollageFiles) {
    throw new DomainError(
      files.length > LIMITS.maxCollageFiles
        ? "TOO_MANY_FILES"
        : "MISSING_INPUT",
      `Collage requires between 2 and ${LIMITS.maxCollageFiles} images.`,
      files.length > LIMITS.maxCollageFiles ? 413 : 400,
    );
  }
  const columns =
    options.layout === "vertical"
      ? 1
      : options.layout === "horizontal"
        ? files.length
        : Math.min(
            options.columns ?? Math.ceil(Math.sqrt(files.length)),
            files.length,
          );
  const rows = Math.ceil(files.length / columns);
  const width =
    options.padding * 2 +
    columns * options.cellWidth +
    (columns - 1) * options.gap;
  const height =
    options.padding * 2 + rows * options.cellHeight + (rows - 1) * options.gap;
  enforceOutputDimensions(width, height);

  const composites = await Promise.all(
    files.map(async (file, index) => {
      const opened = await openStillImage(file.buffer);
      const body = await opened.image
        .resize({
          width: options.cellWidth,
          height: options.cellHeight,
          fit: options.fit,
          background: options.background,
        })
        .png()
        .toBuffer();
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        input: body,
        left: options.padding + column * (options.cellWidth + options.gap),
        top: options.padding + row * (options.cellHeight + options.gap),
      };
    }),
  );
  const canvas = sharp({
    create: { width, height, channels: 4, background: options.background },
  }).composite(composites);
  return encodeImage(canvas, options.format, originalName, {
    quality: options.quality,
    background: options.background,
  });
}

async function applyPipelineStep(
  pipeline: Sharp,
  dimensions: Dimensions,
  step: PipelineStep,
): Promise<{
  pipeline: Sharp;
  dimensions: Dimensions;
  forcedFormat?: OutputFormat;
}> {
  switch (step.op) {
    case "resize": {
      const resized = resizePipeline(pipeline, dimensions, step.options);
      return materializeRaw(resized.pipeline);
    }
    case "crop":
      return cropPipeline(pipeline, dimensions, step.options);
    case "rotate":
      return rotatePipeline(pipeline, dimensions, step.options);
    case "trim": {
      const trimmed = pipeline.trim({
        background: step.options.background,
        threshold: step.options.threshold,
        lineArt: step.options.lineArt,
      });
      return materializeRaw(trimmed);
    }
    case "extend":
      return extendPipeline(pipeline, dimensions, step.options);
    case "alpha":
      return {
        pipeline: alphaPipeline(pipeline, step.options),
        dimensions,
        forcedFormat: step.options.action === "extract" ? "png" : undefined,
      };
    case "adjust":
      return { pipeline: adjustPipeline(pipeline, step.options), dimensions };
    case "normalize":
      return {
        pipeline: normalizePipeline(pipeline, step.options),
        dimensions,
      };
    case "filter":
      return { pipeline: filterPipeline(pipeline, step.options), dimensions };
    case "blur-sharpen":
      return {
        pipeline: localFilterPipeline(pipeline, step.options),
        dimensions,
      };
    case "pixelate":
      return {
        pipeline: await pixelatePipeline(pipeline, dimensions, step.options),
        dimensions,
      };
    case "frame":
      return framePipeline(pipeline, dimensions, step.options);
    case "watermark-text":
      return {
        pipeline: await applyWatermark(pipeline, dimensions, step.options),
        dimensions,
      };
    case "quick-enhance":
      return {
        pipeline: quickEnhancePipeline(pipeline, step.options),
        dimensions,
      };
  }
}

export async function processImage(
  buffer: Buffer,
  originalName: string,
  options: Pipeline,
): Promise<ImageExecutionResult> {
  const opened = await openStillImage(buffer);
  let pipeline = opened.image;
  let dimensions: Dimensions = opened;
  let forcedFormat: OutputFormat | undefined;
  for (const step of options.steps) {
    if (!step.enabled) continue;
    const result = await applyPipelineStep(pipeline, dimensions, step);
    pipeline = result.pipeline;
    dimensions = result.dimensions;
    forcedFormat = result.forcedFormat ?? forcedFormat;
  }
  const terminal = outputOptions(options);
  if (terminal.metadataEdits !== undefined) {
    pipeline = await applyMetadataEdits(pipeline, terminal.metadataEdits);
  }
  const format =
    terminal.format === "auto"
      ? (forcedFormat ?? (await sourceOutputFormat(opened.format)))
      : terminal.format;
  return encodeImage(pipeline, format, originalName, terminal);
}

export async function batchImages(
  files: readonly { buffer: Buffer; filename: string }[],
  options: {
    pipeline: Pipeline;
    continueOnError: boolean;
    filenamePrefix: string;
  },
): Promise<ZipExecutionResult> {
  if (files.length < 1 || files.length > LIMITS.maxBatchFiles) {
    throw new DomainError(
      files.length > LIMITS.maxBatchFiles ? "TOO_MANY_FILES" : "MISSING_INPUT",
      `Batch requires between 1 and ${LIMITS.maxBatchFiles} images.`,
      files.length > LIMITS.maxBatchFiles ? 413 : 400,
    );
  }
  const entries: Array<{ name: string; body: Buffer }> = [];
  const manifest: ArchiveManifest = { version: 1, kind: "batch", items: [] };
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    try {
      const result = await processImage(
        file.buffer,
        file.filename,
        options.pipeline,
      );
      const name = `${safeFilenameBase(options.filenamePrefix)}-${index + 1}-${imageFilename(file.filename, result.format)}`;
      appendArchiveEntry(entries, { name, body: result.body });
      manifest.items.push({
        status: "success",
        input: file.filename,
        output: name,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      const domainError = asDomainError(error);
      manifest.items.push({
        status: "error",
        input: file.filename,
        problem: domainError.toProblem(),
      });
      if (!options.continueOnError) throw domainError;
    }
  }
  appendArchiveEntry(entries, {
    name: "manifest.json",
    body: Buffer.from(JSON.stringify(manifest, null, 2)),
  });
  return createZip("batch", entries);
}
