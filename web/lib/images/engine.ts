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

const NOT_YET = (op: string, phase: string) =>
  new Error(`engine.${op}: not implemented yet — landing in ${phase}`)

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
  _buffer: Buffer,
  _options: ResizeOptions
): Promise<EngineResult> {
  throw NOT_YET("resize", "Phase 4")
}

export async function convert(
  _buffer: Buffer,
  _options: ConvertOptions
): Promise<EngineResult> {
  throw NOT_YET("convert", "Phase 5")
}

export async function crop(
  _buffer: Buffer,
  _options: CropOptions
): Promise<EngineResult> {
  throw NOT_YET("crop", "Phase 6")
}

export async function rotate(
  _buffer: Buffer,
  _options: RotateOptions
): Promise<EngineResult> {
  throw NOT_YET("rotate", "Phase 6")
}

export async function watermark(
  _buffer: Buffer,
  _options: WatermarkOptions
): Promise<EngineResult> {
  throw NOT_YET("watermark", "Phase 6")
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
    format: (info.format as OutputFormat) ?? format,
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
