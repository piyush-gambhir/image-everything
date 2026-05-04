import heicDecode from "heic-decode"

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

export type DecodedHeic = {
  width: number
  height: number
  data: Buffer
}

export async function decodeHeic(buffer: Buffer): Promise<DecodedHeic> {
  const decoded = await heicDecode({ buffer })
  const view = new Uint8Array(
    decoded.data.buffer,
    decoded.data.byteOffset,
    decoded.data.byteLength
  )
  return {
    width: decoded.width,
    height: decoded.height,
    data: Buffer.from(view),
  }
}
