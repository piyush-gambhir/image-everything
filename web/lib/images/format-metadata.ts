import type { CategorizedMetadata, CategoryTag } from "@/lib/images/metadata"

type ExifLike = Record<string, unknown>

const CAMERA_TAGS = ["Make", "Model", "BodySerialNumber", "CameraOwnerName"]

const LENS_TAGS = [
  "LensMake",
  "LensModel",
  "LensSerialNumber",
  "LensInfo",
  "LensSpecification",
]

const EXPOSURE_TAGS = [
  "ExposureTime",
  "FNumber",
  "ApertureValue",
  "ISO",
  "PhotographicSensitivity",
  "FocalLength",
  "FocalLengthIn35mmFormat",
  "ExposureBiasValue",
  "MeteringMode",
  "Flash",
  "WhiteBalance",
  "ExposureProgram",
  "ExposureMode",
  "SceneCaptureType",
  "DigitalZoomRatio",
]

const IMAGE_TAGS = [
  "ImageWidth",
  "ImageHeight",
  "ImageLength",
  "PixelXDimension",
  "PixelYDimension",
  "Orientation",
  "ColorSpace",
  "BitsPerSample",
  "Compression",
  "Software",
  "DateTimeOriginal",
  "DateTimeDigitized",
  "CreateDate",
  "ModifyDate",
  "XResolution",
  "YResolution",
  "ResolutionUnit",
  "YCbCrPositioning",
  "Artist",
  "Copyright",
]

const LOCATION_TAGS = [
  "latitude",
  "longitude",
  "GPSLatitude",
  "GPSLongitude",
  "GPSLatitudeRef",
  "GPSLongitudeRef",
  "GPSAltitude",
  "GPSAltitudeRef",
  "GPSDateStamp",
  "GPSTimeStamp",
  "GPSImgDirection",
  "GPSImgDirectionRef",
  "GPSDestBearing",
  "GPSDestBearingRef",
  "GPSSpeed",
  "GPSSpeedRef",
]

const NOISE_TAGS = new Set([
  "thumbnail",
  "ExifTool",
  "GPSVersionID",
  "ComponentsConfiguration",
  "FlashpixVersion",
  "ExifVersion",
  "InteropOffset",
  "ExifOffset",
  "GPSInfo",
])

const FORMATTERS: Record<string, (value: unknown) => string> = {
  ExposureTime: (v) => formatExposureTime(toNumber(v)),
  FNumber: (v) => `f/${formatDecimal(toNumber(v))}`,
  ApertureValue: (v) => `f/${formatDecimal(Math.pow(Math.SQRT2, toNumber(v)))}`,
  ISO: (v) => `ISO ${toNumber(v)}`,
  PhotographicSensitivity: (v) => `ISO ${toNumber(v)}`,
  FocalLength: (v) => `${formatDecimal(toNumber(v))} mm`,
  FocalLengthIn35mmFormat: (v) => `${toNumber(v)} mm (35 mm equivalent)`,
  ExposureBiasValue: (v) => formatExposureBias(toNumber(v)),
  GPSAltitude: (v) => `${formatDecimal(toNumber(v), 1)} m`,
  GPSLatitude: (v) => formatGpsCoord(v),
  GPSLongitude: (v) => formatGpsCoord(v),
  latitude: (v) => `${formatDecimal(toNumber(v), 6)}°`,
  longitude: (v) => `${formatDecimal(toNumber(v), 6)}°`,
}

export function categorize(merged: ExifLike): CategorizedMetadata {
  const used = new Set<string>()

  const collect = (tags: string[]): CategoryTag[] => {
    const out: CategoryTag[] = []
    for (const tag of tags) {
      if (!(tag in merged)) continue
      const value = merged[tag]
      if (value === null || value === undefined || value === "") continue
      used.add(tag)
      const formatted = formatValue(tag, value)
      if (formatted) out.push({ label: humanize(tag), value: formatted })
    }
    return out
  }

  const camera = collect(CAMERA_TAGS)
  const lens = collect(LENS_TAGS)
  const exposure = collect(EXPOSURE_TAGS)
  const image = collect(IMAGE_TAGS)
  const location = collect(LOCATION_TAGS)

  const other: CategoryTag[] = []
  for (const [key, value] of Object.entries(merged)) {
    if (used.has(key) || NOISE_TAGS.has(key)) continue
    if (value === null || value === undefined || value === "") continue
    const formatted = formatValue(key, value)
    if (!formatted) continue
    other.push({ label: humanize(key), value: formatted })
  }
  other.sort((a, b) => a.label.localeCompare(b.label))

  return { camera, lens, exposure, image, location, other }
}

function formatValue(key: string, value: unknown): string {
  const fmt = FORMATTERS[key]
  if (fmt) {
    try {
      const result = fmt(value)
      if (result) return result
    } catch {
      // fall through to default
    }
  }
  return defaultFormat(value)
}

function defaultFormat(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date)
    return value
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, " UTC")
  if (Array.isArray(value)) return value.map((v) => defaultFormat(v)).join(", ")
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return "[object]"
    }
  }
  return String(value)
}

function formatExposureTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ""
  if (seconds >= 1) return `${formatDecimal(seconds, 1)} s`
  const denom = Math.round(1 / seconds)
  return `1/${denom} s`
}

function formatExposureBias(ev: number): string {
  if (!Number.isFinite(ev)) return ""
  if (ev === 0) return "0 EV"
  const sign = ev > 0 ? "+" : ""
  return `${sign}${formatDecimal(ev, 2)} EV`
}

function formatDecimal(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return String(value)
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(decimals).replace(/\.?0+$/, "")
}

function formatGpsCoord(value: unknown): string {
  if (typeof value === "number") return `${formatDecimal(value, 6)}°`
  if (Array.isArray(value)) {
    const [d, m, s] = value.map(toNumber)
    if ([d, m, s].every(Number.isFinite)) {
      return `${d}° ${m}' ${formatDecimal(s, 2)}"`
    }
  }
  return defaultFormat(value)
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (Array.isArray(value) && value.length > 0) return toNumber(value[0])
  return Number.NaN
}

function humanize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}
