const HEIC_FTYP_MARKERS = [
  "ftypheic",
  "ftypheix",
  "ftyphevc",
  "ftypmif1",
  "ftypmsf1",
]

export function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const slice = buffer.slice(4, 12).toString("ascii")
  return HEIC_FTYP_MARKERS.some((marker) => slice.startsWith(marker))
}

export async function decodeHeic(_buffer: Buffer): Promise<Buffer> {
  throw new Error("heic.decodeHeic: not implemented yet — landing in Phase 1")
}
