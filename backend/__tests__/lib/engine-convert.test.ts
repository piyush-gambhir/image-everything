// @vitest-environment node
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { convert } from "@/lib/engine";

let png: Buffer;
let alphaPng: Buffer;

beforeAll(async () => {
  png = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 50, g: 50, b: 50 },
    },
  })
    .png()
    .toBuffer();

  alphaPng = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 200, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
});

describe("engine.convert", () => {
  it("converts png to webp", async () => {
    const result = await convert(png, { targetFormat: "webp" });
    expect(result.format).toBe("webp");
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  it("converts png to avif at custom quality", async () => {
    const result = await convert(png, { targetFormat: "avif", quality: 50 });
    expect(result.format).toBe("avif");
  });

  it("flattens alpha to background when target is jpeg", async () => {
    const result = await convert(alphaPng, {
      targetFormat: "jpeg",
      background: "#00ff00",
    });
    expect(result.format).toBe("jpeg");

    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBeFalsy();

    const { data } = await sharp(result.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeLessThan(50);
    expect(data[1]).toBeGreaterThan(200);
    expect(data[2]).toBeLessThan(50);
  });
});
