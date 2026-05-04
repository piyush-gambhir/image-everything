// @vitest-environment node
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { clean } from "@/lib/engine";
import { readMetadata } from "@/lib/metadata";

let dirtyJpeg: Buffer;

beforeAll(async () => {
  dirtyJpeg = await sharp({
    create: {
      width: 80,
      height: 60,
      channels: 3,
      background: { r: 30, g: 60, b: 90 },
    },
  })
    .withExif({
      IFD0: {
        Make: "TestCo",
        Model: "TestCam X",
        Software: "engine-clean.test",
        Artist: "Tester",
      },
      IFD2: {
        ExposureTime: "1/100",
        FNumber: "4",
        ISO: "200",
      },
    })
    .jpeg({ quality: 90 })
    .toBuffer();
});

describe("engine.clean", () => {
  it("strips all metadata when no keep options provided", async () => {
    const before = await readMetadata(dirtyJpeg);
    expect(before.categorized.camera.length).toBeGreaterThan(0);

    const result = await clean(dirtyJpeg, { keep: [] });
    expect(result.format).toBe("jpeg");

    const after = await readMetadata(result.buffer);
    expect(after.categorized.camera).toHaveLength(0);
    expect(after.categorized.exposure).toHaveLength(0);
    expect(after.raw.exif).toBeUndefined();
  });

  it("preserves orientation tag when keep includes orientation", async () => {
    const oriented = await sharp({
      create: {
        width: 40,
        height: 30,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .withExif({ IFD0: { Orientation: "6" } })
      .jpeg()
      .toBuffer();

    const result = await clean(oriented, { keep: ["orientation"] });
    const after = await readMetadata(result.buffer);
    const orientationTag = after.categorized.image.find(
      (t) => t.label === "Orientation",
    );
    expect(orientationTag).toBeDefined();
  });

  it("returns same format as input", async () => {
    const png = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const result = await clean(png, {});
    expect(result.format).toBe("png");
  });
});
