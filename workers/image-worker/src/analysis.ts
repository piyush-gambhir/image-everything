import {
  type CompareOptions,
  type CompareResult,
  type HistogramOptions,
  type HistogramResult,
  type PaletteOptions,
  type PaletteResult,
  type StatsOptions,
  type StatsResult,
} from "@image-everything/contracts";
import sharp from "sharp";

import { DomainError } from "./errors";
import { enforceOutputDimensions, openStillImage } from "./input";
import { encodeImage, type ImageExecutionResult } from "./output";

export async function imageStats(
  buffer: Buffer,
  options: StatsOptions,
): Promise<StatsResult> {
  const opened = await openStillImage(buffer);
  const stats = await opened.image.clone().toColourspace("srgb").stats();
  return {
    width: opened.width,
    height: opened.height,
    space: opened.metadata.space ?? "srgb",
    channels: options.includeChannels
      ? stats.channels.map((channel) => ({
          min: channel.min,
          max: channel.max,
          sum: channel.sum,
          squaresSum: channel.squaresSum,
          mean: channel.mean,
          stdev: channel.stdev,
          minX: channel.minX,
          minY: channel.minY,
          maxX: channel.maxX,
          maxY: channel.maxY,
        }))
      : [],
    isOpaque: stats.isOpaque,
    entropy: stats.entropy,
    sharpness: stats.sharpness,
    dominant: stats.dominant,
  };
}

export async function imagePalette(
  buffer: Buffer,
  options: PaletteOptions,
): Promise<PaletteResult> {
  const opened = await openStillImage(buffer);
  const { data, info } = await opened.image
    .clone()
    .toColourspace("srgb")
    .removeAlpha()
    .resize({
      width: options.sampleSize,
      height: options.sampleSize,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "nearest",
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const counts = new Map<number, number>();
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? r;
    const b = data[offset + 2] ?? r;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const pixels = info.width * info.height;
  const colors = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .slice(0, options.colors)
    .map(([key, count]) => {
      const r = (((key >> 10) & 31) << 3) + 4;
      const g = (((key >> 5) & 31) << 3) + 4;
      const b = ((key & 31) << 3) + 4;
      return {
        hex: `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`,
        rgb: [r, g, b] as [number, number, number],
        count,
        percentage: pixels === 0 ? 0 : (count / pixels) * 100,
      };
    });
  return { samplePixels: pixels, colors };
}

export async function imageHistogram(
  buffer: Buffer,
  options: HistogramOptions,
): Promise<HistogramResult> {
  const opened = await openStillImage(buffer);
  const rgba = options.mode === "rgba";
  let pipeline = opened.image.clone().toColourspace("srgb");
  pipeline = rgba ? pipeline.ensureAlpha() : pipeline.removeAlpha();
  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });
  const names =
    options.mode === "luminance"
      ? ["luminance"]
      : rgba
        ? ["red", "green", "blue", "alpha"]
        : ["red", "green", "blue"];
  const channels = Object.fromEntries(
    names.map((name) => [name, Array<number>(options.bins).fill(0)]),
  );
  const bucket = (value: number) =>
    Math.min(options.bins - 1, Math.floor((value * options.bins) / 256));

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? r;
    const b = data[offset + 2] ?? r;
    if (options.mode === "luminance") {
      const value = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      channels.luminance![bucket(value)]! += 1;
    } else {
      channels.red![bucket(r)]! += 1;
      channels.green![bucket(g)]! += 1;
      channels.blue![bucket(b)]! += 1;
      if (rgba) channels.alpha![bucket(data[offset + 3] ?? 255)]! += 1;
    }
  }
  return {
    mode: options.mode,
    bins: options.bins,
    pixels: info.width * info.height,
    channels,
  };
}

type RawComparison = {
  result: CompareResult;
  difference: Buffer;
};

async function normalizedRaw(
  buffer: Buffer,
  width: number,
  height: number,
  includeAlpha: boolean,
): Promise<{ data: Buffer; channels: number }> {
  const opened = await openStillImage(buffer);
  let pipeline = opened.image.clone().toColourspace("srgb").resize({
    width,
    height,
    fit: "fill",
    kernel: "lanczos3",
  });
  pipeline = includeAlpha ? pipeline.ensureAlpha() : pipeline.removeAlpha();
  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, channels: info.channels };
}

async function compareRaw(
  first: Buffer,
  second: Buffer,
  options: CompareOptions,
): Promise<RawComparison> {
  const [firstImage, secondImage] = await Promise.all([
    openStillImage(first),
    openStillImage(second),
  ]);
  let width = firstImage.width;
  let height = firstImage.height;
  if (
    firstImage.width !== secondImage.width ||
    firstImage.height !== secondImage.height
  ) {
    switch (options.resize) {
      case "error":
        throw new DomainError(
          "DIMENSION_MISMATCH",
          "Compared images must have equal dimensions unless a resize policy is selected.",
          422,
        );
      case "first":
        break;
      case "smallest":
        width = Math.min(firstImage.width, secondImage.width);
        height = Math.min(firstImage.height, secondImage.height);
        break;
      case "largest":
        width = Math.max(firstImage.width, secondImage.width);
        height = Math.max(firstImage.height, secondImage.height);
        break;
    }
  }
  enforceOutputDimensions(width, height);
  const [left, right] = await Promise.all([
    normalizedRaw(first, width, height, options.includeAlpha),
    normalizedRaw(second, width, height, options.includeAlpha),
  ]);
  const channels = Math.min(left.channels, right.channels);
  const pixels = width * height;
  const difference = Buffer.allocUnsafe(pixels * channels);
  let absoluteSum = 0;
  let squaresSum = 0;
  let differingPixels = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let differs = false;
    for (let channel = 0; channel < channels; channel += 1) {
      const offset = pixel * channels + channel;
      const delta = Math.abs(
        (left.data[offset] ?? 0) - (right.data[offset] ?? 0),
      );
      absoluteSum += delta;
      squaresSum += delta * delta;
      if (delta > options.threshold) differs = true;
      difference[offset] =
        channel === 3
          ? 255
          : Math.min(255, Math.round(delta * options.amplify));
    }
    if (differs) differingPixels += 1;
  }
  const samples = pixels * channels;
  return {
    result: {
      width,
      height,
      channels,
      mae: samples === 0 ? 0 : absoluteSum / samples,
      rmse: samples === 0 ? 0 : Math.sqrt(squaresSum / samples),
      differingPixels,
      differingPixelPercentage:
        pixels === 0 ? 0 : (differingPixels / pixels) * 100,
      threshold: options.threshold,
    },
    difference,
  };
}

export async function compareImages(
  first: Buffer,
  second: Buffer,
  options: CompareOptions,
): Promise<CompareResult> {
  return (await compareRaw(first, second, options)).result;
}

export async function compareDifference(
  first: Buffer,
  second: Buffer,
  options: CompareOptions,
): Promise<ImageExecutionResult> {
  const compared = await compareRaw(first, second, options);
  const pipeline = sharp(compared.difference, {
    raw: {
      width: compared.result.width,
      height: compared.result.height,
      channels: compared.result.channels as 3 | 4,
    },
  });
  return encodeImage(pipeline, "png", "difference.png", { metadata: "strip" });
}
