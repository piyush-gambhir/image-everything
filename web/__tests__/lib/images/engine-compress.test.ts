// @vitest-environment node
import sharp from "sharp"
import { beforeAll, describe, expect, it } from "vitest"

import { compress } from "@/lib/images/engine"

let bigJpeg: Buffer

beforeAll(async () => {
  const noise = Buffer.alloc(800 * 600 * 3)
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919) % 256
  bigJpeg = await sharp(noise, {
    raw: { width: 800, height: 600, channels: 3 },
  })
    .jpeg({ quality: 100, mozjpeg: false })
    .toBuffer()
})

describe("engine.compress", () => {
  it("reduces size at lower quality (auto format)", async () => {
    const result = await compress(bigJpeg, {
      format: "auto",
      quality: 40,
      mozjpeg: true,
    })
    expect(result.format).toBe("jpeg")
    expect(result.size).toBeLessThan(bigJpeg.length)
  })

  it("lower quality produces a smaller file than higher quality", async () => {
    const lo = await compress(bigJpeg, {
      format: "jpeg",
      quality: 30,
      mozjpeg: true,
    })
    const hi = await compress(bigJpeg, {
      format: "jpeg",
      quality: 90,
      mozjpeg: true,
    })
    expect(lo.size).toBeLessThan(hi.size)
  })

  it("switches format when explicitly requested", async () => {
    const webp = await compress(bigJpeg, { format: "webp", quality: 70 })
    expect(webp.format).toBe("webp")
  })

  it("keeps width and height equal to input", async () => {
    const result = await compress(bigJpeg, { format: "jpeg", quality: 70 })
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })
})
