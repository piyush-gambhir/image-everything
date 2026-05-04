import {
  Crop,
  Eraser,
  type LucideIcon,
  Maximize2,
  Minimize2,
  Replace,
  RotateCw,
  ScanSearch,
  Stamp,
} from "lucide-react"

export type FeatureStatus = "available" | "coming-soon"

export type Feature = {
  slug: string
  title: string
  short: string
  description: string
  icon: LucideIcon
  status: FeatureStatus
}

export const FEATURES: Feature[] = [
  {
    slug: "metadata",
    title: "Read Metadata",
    short: "Inspect EXIF, IPTC, XMP, GPS",
    description:
      "Drop in a photo and see every embedded tag — camera, lens, exposure, location, color profile.",
    icon: ScanSearch,
    status: "available",
  },
  {
    slug: "clean",
    title: "Clean Metadata",
    short: "Strip EXIF and other tags",
    description:
      "Remove EXIF, IPTC, XMP, and ICC blocks. Optionally bake orientation into the pixels first so nothing flips.",
    icon: Eraser,
    status: "available",
  },
  {
    slug: "compress",
    title: "Compress",
    short: "Reduce file size with quality control",
    description:
      "Lossy or lossless. Quality slider, MozJPEG, modern WebP/AVIF. Shows the saved bytes.",
    icon: Minimize2,
    status: "available",
  },
  {
    slug: "resize",
    title: "Resize",
    short: "Change dimensions, pick a fit",
    description:
      "Width, height, and five fit modes (cover, contain, fill, inside, outside). Aspect-ratio lock.",
    icon: Maximize2,
    status: "available",
  },
  {
    slug: "convert",
    title: "Convert Format",
    short: "JPEG · PNG · WebP · AVIF · GIF",
    description:
      "Re-encode between common formats. Background flatten when going from alpha-aware to JPEG.",
    icon: Replace,
    status: "available",
  },
  {
    slug: "crop",
    title: "Crop",
    short: "Trim to a region or aspect",
    description:
      "Drag-and-drop crop with aspect-ratio presets and exact pixel inputs.",
    icon: Crop,
    status: "available",
  },
  {
    slug: "rotate",
    title: "Rotate / Flip",
    short: "90°, 180°, 270°, mirror",
    description:
      "Rotate in 90° increments and flip horizontally or vertically.",
    icon: RotateCw,
    status: "available",
  },
  {
    slug: "watermark",
    title: "Watermark",
    short: "Overlay text or image",
    description:
      "Overlay text with position, padding, opacity, and color. Image overlay coming later.",
    icon: Stamp,
    status: "available",
  },
]

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug)
}
