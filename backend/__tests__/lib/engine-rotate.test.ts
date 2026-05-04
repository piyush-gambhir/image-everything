// @vitest-environment node
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { rotate } from "@/lib/engine";

let landscape: Buffer;

beforeAll(async () => {
  landscape = await sharp({
    create: {
      width: 100,
      height: 50,
      channels: 3,
      background: { r: 200, g: 100, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
});

describe("engine.rotate", () => {
  it("rotates 90° swapping width and height", async () => {
    const result = await rotate(landscape, { angle: 90 });
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it("rotates 180° preserves dimensions", async () => {
    const result = await rotate(landscape, { angle: 180 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it("flips horizontally without rotation", async () => {
    const half = await sharp({
      create: {
        width: 4,
        height: 1,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 2,
              height: 1,
              channels: 3,
              background: { r: 255, g: 0, b: 0 },
            },
          },
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const result = await rotate(half, { angle: 0, flipH: true });
    const { data } = await sharp(result.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeLessThan(50);
    expect(data[9]).toBeGreaterThan(200);
  });

  it("handles 0° with no flips as identity", async () => {
    const result = await rotate(landscape, { angle: 0 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });
});
