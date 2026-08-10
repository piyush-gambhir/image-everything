import { isAcceptedImageFile } from "@/hooks/use-image-upload"

export const MAX_PRIMARY_BYTES = 25 * 1024 * 1024
export const MAX_OVERLAY_BYTES = 10 * 1024 * 1024
export const MAX_AGGREGATE_BYTES = 100 * 1024 * 1024
export const MAX_FILES = 20

export function validateImageFile(
  file: File,
  { maxBytes = MAX_PRIMARY_BYTES }: { maxBytes?: number } = {}
): string | null {
  if (!isAcceptedImageFile(file)) {
    return `${file.name}: unsupported image type`
  }
  if (file.size > maxBytes) {
    return `${file.name}: exceeds ${formatBytes(maxBytes)}`
  }
  return null
}

export function validateFileCollection(
  files: readonly File[],
  {
    maximumFiles = MAX_FILES,
    maxBytes = MAX_PRIMARY_BYTES,
    maxAggregateBytes = MAX_AGGREGATE_BYTES,
  }: {
    maximumFiles?: number
    maxBytes?: number
    maxAggregateBytes?: number
  } = {}
): string | null {
  if (files.length > maximumFiles) {
    return `Choose at most ${maximumFiles} images.`
  }
  for (const file of files) {
    const issue = validateImageFile(file, { maxBytes })
    if (issue) return issue
  }
  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > maxAggregateBytes) {
    return `Combined files exceed ${formatBytes(maxAggregateBytes)}.`
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function canPreviewInBrowser(file: Pick<File, "type">): boolean {
  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ].includes(file.type)
}
