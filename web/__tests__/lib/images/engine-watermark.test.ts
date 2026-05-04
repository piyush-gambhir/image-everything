// @vitest-environment node
import sharp from "sharp"
import { beforeAll, describe, expect, it } from "vitest"

import { watermark } from "@/lib/images/engine"

let source: Buffer

beforeAll(async () => {
  source = await sharp({
    create: {
      width: 400,
      height: 200,
      channels: 3,
      background: { r: 50, g: 50, b: 50 },
    },
  })
    .jpeg()
    .toBuffer()
})

describe("engine.watermark", () => {
  it("produces an image with the same dimensions as input", async () => {
    const result = await watermark(source, {
      kind: "text",
      text: "hello",
      color: "#ffffff",
      opacity: 0.7,
      position: "bottom-right",
      padding: 20,
    })
    expect(result.width).toBe(400)
    expect(result.height).toBe(200)
  })

  it("changes pixels in the corner where the watermark lands", async () => {
    const result = await watermark(source, {
      kind: "text",
      text: "WATERMARK",
      color: "#ffffff",
      opacity: 1,
      position: "top-left",
      padding: 10,
    })
    const baselineRaw = await sharp(source).raw().toBuffer()
    const resultRaw = await sharp(result.buffer).raw().toBuffer()
    let differences = 0
    for (let i = 0; i < Math.min(baselineRaw.length, resultRaw.length); i++) {
      if (Math.abs(baselineRaw[i] - resultRaw[i]) > 8) differences++
    }
    expect(differences).toBeGreaterThan(50)
  })

  it("rejects image kind for now", async () => {
    await expect(
      watermark(source, {
        kind: "image",
        opacity: 0.7,
        position: "center",
        padding: 20,
      })
    ).rejects.toThrow(/Image watermark/)
  })
})
