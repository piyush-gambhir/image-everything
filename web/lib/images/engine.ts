import type {
  CleanOptions,
  CompressOptions,
  ConvertOptions,
  CropOptions,
  ResizeOptions,
  RotateOptions,
  WatermarkOptions,
} from "@/lib/images/schemas"
import type { EngineResult } from "@/lib/images/types"

const NOT_YET = (op: string, phase: string) =>
  new Error(`engine.${op}: not implemented yet — landing in ${phase}`)

export async function clean(
  _buffer: Buffer,
  _options: CleanOptions
): Promise<EngineResult> {
  throw NOT_YET("clean", "Phase 2")
}

export async function compress(
  _buffer: Buffer,
  _options: CompressOptions
): Promise<EngineResult> {
  throw NOT_YET("compress", "Phase 3")
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
