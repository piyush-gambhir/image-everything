// @vitest-environment node
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { crop } from "@/lib/engine";

let big: Buffer;

beforeAll(async () => {
  big = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 80, g: 80, b: 80 },
    },
  })
    .jpeg()
    .toBuffer();
});

describe("engine.crop", () => {
  it("extracts the requested region", async () => {
    const result = await crop(big, {
      left: 10,
      top: 20,
      width: 50,
      height: 40,
    });
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
  });

  it("rejects regions outside image bounds", async () => {
    await expect(
      crop(big, { left: 150, top: 0, width: 100, height: 50 }),
    ).rejects.toThrow(/outside image bounds/);
  });
});
