// @vitest-environment node
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { resize } from "@/lib/engine";

let source: Buffer;

beforeAll(async () => {
  source = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
});

describe("engine.resize", () => {
  it("resizes width and preserves aspect with fit:inside", async () => {
    const result = await resize(source, { width: 400, fit: "inside" });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("resizes to exact width and height with fit:fill", async () => {
    const result = await resize(source, {
      width: 200,
      height: 200,
      fit: "fill",
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it("crops to dimensions with fit:cover", async () => {
    const result = await resize(source, {
      width: 400,
      height: 400,
      fit: "cover",
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
  });

  it("does not enlarge when withoutEnlargement is true", async () => {
    const result = await resize(source, {
      width: 1600,
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});
