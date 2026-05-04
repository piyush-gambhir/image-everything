import sharp, { type Sharp } from "sharp"

import { decodeHeic, isHeicBuffer } from "@/lib/images/heic"
import type {
  CleanOptions,
  CompressOptions,
  ConvertOptions,
  CropOptions,
  ResizeOptions,
  RotateOptions,
  WatermarkOptions,
} from "@/lib/images/schemas"
import type { EngineResult, OutputFormat } from "@/lib/images/types"

sharp.cache(false)
sharp.concurrency(1)

export async function clean(
  buffer: Buffer,
  options: CleanOptions
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  let pipeline = sharpInstance

  const keep = options.keep ?? []
  const keepOrientation = keep.includes("orientation")
  const keepIcc = keep.includes("colorProfile")

  if (!keepOrientation) {
    pipeline = pipeline.rotate()
  }

  if (keepIcc) {
    pipeline = pipeline.keepIccProfile()
  }

  if (keepOrientation) {
    const meta = await sharp(buffer).metadata()
    if (meta.orientation) {
      pipeline = pipeline.withExif({
        IFD0: { Orientation: String(meta.orientation) },
      })
    }
  }

  const targetFormat = pickReencodeFormat(sourceFormat)
  return runEncode(pipeline, targetFormat)
}

export async function compress(
  buffer: Buffer,
  options: CompressOptions
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  const pipeline = sharpInstance.rotate()

  const target: OutputFormat =
    options.format === "auto" ? (sourceFormat ?? "jpeg") : options.format

  return runEncode(pipeline, target, {
    quality: options.quality,
    lossless: options.lossless,
    mozjpeg: options.mozjpeg,
  })
}

export async function resize(
  buffer: Buffer,
  options: ResizeOptions
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  const pipeline = sharpInstance.rotate().resize({
    width: options.width,
    height: options.height,
    fit: options.fit,
    position: options.position,
    background: options.background,
    withoutEnlargement: options.withoutEnlargement,
  })
  return runEncode(pipeline, sourceFormat ?? "jpeg")
}

export async function convert(
  buffer: Buffer,
  options: ConvertOptions
): Promise<EngineResult> {
  const { sharpInstance } = await openSharp(buffer)
  let pipeline = sharpInstance.rotate()

  if (options.targetFormat === "jpeg") {
    pipeline = pipeline.flatten({ background: options.background ?? "#ffffff" })
  }

  return runEncode(pipeline, options.targetFormat, { quality: options.quality })
}

export async function crop(
  buffer: Buffer,
  options: CropOptions
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  const baked = sharpInstance.rotate()
  const meta = await sharp(await baked.toBuffer()).metadata()
  const maxW = meta.width ?? 0
  const maxH = meta.height ?? 0
  if (
    options.left + options.width > maxW ||
    options.top + options.height > maxH
  ) {
    throw new Error(
      `Crop region (${options.left},${options.top} ${options.width}×${options.height}) is outside image bounds (${maxW}×${maxH})`
    )
  }
  const pipeline = sharpInstance.rotate().extract({
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
  })
  return runEncode(pipeline, sourceFormat ?? "jpeg")
}

export async function rotate(
  buffer: Buffer,
  options: RotateOptions
): Promise<EngineResult> {
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  let pipeline = sharpInstance.rotate()
  if (options.angle !== 0) {
    pipeline = pipeline.rotate(options.angle)
  }
  if (options.flipH) pipeline = pipeline.flop()
  if (options.flipV) pipeline = pipeline.flip()
  return runEncode(pipeline, sourceFormat ?? "jpeg")
}

export async function watermark(
  buffer: Buffer,
  options: WatermarkOptions
): Promise<EngineResult> {
  if (options.kind !== "text") {
    throw new Error("Image watermark not yet supported — text only for now")
  }
  const { sharpInstance, sourceFormat } = await openSharp(buffer)
  const baked = sharpInstance.rotate()
  const meta = await sharp(await baked.toBuffer()).metadata()
  const width = meta.width ?? 1024
  const height = meta.height ?? 768

  const fontSize = Math.max(16, Math.round(Math.min(width, height) / 18))
  const svg = renderWatermarkSvg({
    text: options.text,
    color: options.color,
    opacity: options.opacity,
    fontSize,
    width,
    height,
    position: options.position,
    padding: options.padding,
  })

  const pipeline = sharpInstance
    .rotate()
    .composite([{ input: Buffer.from(svg), gravity: "northwest" }])
  return runEncode(pipeline, sourceFormat ?? "jpeg")
}

function renderWatermarkSvg(opts: {
  text: string
  color: string
  opacity: number
  fontSize: number
  width: number
  height: number
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  padding: number
}): string {
  const safeText = escapeXml(opts.text)
  let x: number
  let y: number
  let anchor: "start" | "middle" | "end"
  switch (opts.position) {
    case "top-left":
      x = opts.padding
      y = opts.padding + opts.fontSize
      anchor = "start"
      break
    case "top-right":
      x = opts.width - opts.padding
      y = opts.padding + opts.fontSize
      anchor = "end"
      break
    case "bottom-left":
      x = opts.padding
      y = opts.height - opts.padding
      anchor = "start"
      break
    case "bottom-right":
      x = opts.width - opts.padding
      y = opts.height - opts.padding
      anchor = "end"
      break
    case "center":
    default:
      x = opts.width / 2
      y = opts.height / 2
      anchor = "middle"
      break
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}">
  <text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${opts.fontSize}" fill="${opts.color}" fill-opacity="${opts.opacity}" text-anchor="${anchor}" stroke="black" stroke-width="${Math.max(1, Math.round(opts.fontSize / 24))}" stroke-opacity="${opts.opacity * 0.4}" paint-order="stroke fill" font-weight="600">${safeText}</text>
</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function openSharp(
  buffer: Buffer
): Promise<{ sharpInstance: Sharp; sourceFormat: OutputFormat | null }> {
  if (isHeicBuffer(buffer)) {
    const decoded = await decodeHeic(buffer)
    const instance = sharp(decoded.data, {
      raw: { width: decoded.width, height: decoded.height, channels: 4 },
    })
    return { sharpInstance: instance, sourceFormat: null }
  }
  const instance = sharp(buffer)
  const meta = await instance.metadata()
  const detected = sharpFormatToOutput(meta.format)
  return { sharpInstance: sharp(buffer), sourceFormat: detected }
}

function pickReencodeFormat(sourceFormat: OutputFormat | null): OutputFormat {
  return sourceFormat ?? "jpeg"
}

export function applyEncoder(
  pipeline: Sharp,
  format: OutputFormat,
  options: EncodeOptions = {}
): Sharp {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({
        quality: options.quality ?? 92,
        mozjpeg: options.mozjpeg ?? true,
      })
    case "png":
      return pipeline.png({
        compressionLevel: 9,
        effort: 7,
        ...(options.lossless ? { palette: false } : {}),
      })
    case "webp":
      return pipeline.webp({
        quality: options.quality ?? 90,
        lossless: options.lossless ?? false,
        effort: 4,
      })
    case "avif":
      return pipeline.avif({
        quality: options.quality ?? 70,
        lossless: options.lossless ?? false,
        effort: 4,
      })
    case "gif":
      return pipeline.gif()
    default:
      return pipeline.jpeg({ quality: options.quality ?? 92, mozjpeg: true })
  }
}

export async function runEncode(
  pipeline: Sharp,
  format: OutputFormat,
  options: EncodeOptions = {}
): Promise<EngineResult> {
  const encoded = applyEncoder(pipeline, format, options)
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true })
  return {
    buffer: data,
    format,
    width: info.width,
    height: info.height,
    size: info.size,
  }
}

type EncodeOptions = {
  quality?: number
  lossless?: boolean
  mozjpeg?: boolean
}

function sharpFormatToOutput(format: string | undefined): OutputFormat | null {
  if (!format) return null
  if (format === "jpeg" || format === "jpg") return "jpeg"
  if (
    format === "png" ||
    format === "webp" ||
    format === "avif" ||
    format === "gif"
  ) {
    return format
  }
  return null
}
