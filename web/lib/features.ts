import {
  Crop,
  Eraser,
  Layers,
  type LucideIcon,
  Maximize2,
  Minimize2,
  Package,
  Replace,
  RotateCw,
  ScanSearch,
  Sparkles,
  Stamp,
} from "lucide-react"

export type FeatureStatus = "available" | "coming-soon"

export type FeatureCategory =
  | "inspect"
  | "transform"
  | "encode"
  | "style"
  | "pipeline"

export type Feature = {
  slug: string
  title: string
  short: string
  description: string
  icon: LucideIcon
  status: FeatureStatus
  category: FeatureCategory
  accent: string
}

export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  inspect: "Inspect",
  transform: "Transform",
  encode: "Encode",
  style: "Style",
  pipeline: "Pipelines",
}

export const CATEGORY_ORDER: FeatureCategory[] = [
  "inspect",
  "transform",
  "encode",
  "style",
  "pipeline",
]

export const FEATURES: Feature[] = [
  {
    slug: "metadata",
    title: "Read Metadata",
    short: "EXIF · IPTC · XMP · GPS",
    description:
      "Drop in a photo and see every embedded tag — camera, lens, exposure, location, color profile.",
    icon: ScanSearch,
    status: "available",
    category: "inspect",
    accent: "from-blue-500/15 to-blue-500/0",
  },
  {
    slug: "clean",
    title: "Clean Metadata",
    short: "Strip EXIF and other tags",
    description:
      "Remove EXIF, IPTC, XMP, and ICC blocks. Bake orientation into the pixels first so nothing flips.",
    icon: Eraser,
    status: "available",
    category: "inspect",
    accent: "from-blue-500/15 to-blue-500/0",
  },
  {
    slug: "resize",
    title: "Resize",
    short: "Width, height, fit",
    description:
      "Width, height, and five fit modes (cover, contain, fill, inside, outside). Aspect-ratio lock.",
    icon: Maximize2,
    status: "available",
    category: "transform",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    slug: "crop",
    title: "Crop",
    short: "Trim to a region",
    description:
      "Drag-and-drop crop with aspect-ratio presets and exact pixel inputs.",
    icon: Crop,
    status: "available",
    category: "transform",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    slug: "rotate",
    title: "Rotate / Flip",
    short: "90°, 180°, 270°, mirror",
    description:
      "Rotate in 90° increments and flip horizontally or vertically.",
    icon: RotateCw,
    status: "available",
    category: "transform",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  {
    slug: "compress",
    title: "Compress",
    short: "Quality slider, MozJPEG, WebP, AVIF",
    description:
      "Lossy or lossless. Quality slider, MozJPEG, modern WebP/AVIF. Shows the saved bytes.",
    icon: Minimize2,
    status: "available",
    category: "encode",
    accent: "from-amber-500/15 to-amber-500/0",
  },
  {
    slug: "convert",
    title: "Convert Format",
    short: "JPEG · PNG · WebP · AVIF · GIF",
    description:
      "Re-encode between common formats. Background flatten when going from alpha-aware to JPEG.",
    icon: Replace,
    status: "available",
    category: "encode",
    accent: "from-amber-500/15 to-amber-500/0",
  },
  {
    slug: "auto-enhance",
    title: "Auto-Enhance",
    short: "Normalize · modulate · sharpen",
    description:
      "Auto-orient, normalize contrast, optionally tweak brightness/saturation/hue, and sharpen.",
    icon: Sparkles,
    status: "available",
    category: "style",
    accent: "from-fuchsia-500/15 to-fuchsia-500/0",
  },
  {
    slug: "watermark",
    title: "Watermark",
    short: "Overlay text or image",
    description:
      "Overlay text or another image with position, padding, opacity, and color.",
    icon: Stamp,
    status: "available",
    category: "style",
    accent: "from-fuchsia-500/15 to-fuchsia-500/0",
  },
  {
    slug: "transform",
    title: "Pipeline",
    short: "Chain ops in one request",
    description:
      "Resize, crop, convert, compress, enhance — chain any of them in a single sharp pipeline.",
    icon: Layers,
    status: "available",
    category: "pipeline",
    accent: "from-violet-500/15 to-violet-500/0",
  },
  {
    slug: "batch",
    title: "Batch",
    short: "Process many files at once",
    description:
      "Drop a stack of files, pick an operation, and download a zip of results.",
    icon: Package,
    status: "available",
    category: "pipeline",
    accent: "from-violet-500/15 to-violet-500/0",
  },
]

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug)
}

export function featuresByCategory(): Record<FeatureCategory, Feature[]> {
  const grouped: Record<FeatureCategory, Feature[]> = {
    inspect: [],
    transform: [],
    encode: [],
    style: [],
    pipeline: [],
  }
  for (const feature of FEATURES) grouped[feature.category].push(feature)
  return grouped
}
