import type { InputFormat } from "@/lib/images/types"

export type CategoryTag = { label: string; value: string }

export type CategorizedMetadata = {
  camera: CategoryTag[]
  lens: CategoryTag[]
  exposure: CategoryTag[]
  image: CategoryTag[]
  location: CategoryTag[]
  other: CategoryTag[]
}

export type ImageMetadata = {
  format: InputFormat | null
  width: number | null
  height: number | null
  channels: number | null
  hasAlpha: boolean | null
  density: number | null
  orientation: number | null
  size: number
  raw: {
    exif?: Record<string, unknown>
    iptc?: Record<string, unknown>
    xmp?: Record<string, unknown>
    gps?: Record<string, unknown>
    icc?: Record<string, unknown>
  }
  categorized: CategorizedMetadata
}

export async function readMetadata(_buffer: Buffer): Promise<ImageMetadata> {
  throw new Error(
    "metadata.readMetadata: not implemented yet — landing in Phase 1"
  )
}
