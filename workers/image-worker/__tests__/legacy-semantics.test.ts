import {
  V1_OPERATION_MAP,
  translateV1Options,
  type V1OperationId,
} from "@image-everything/contracts";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { executeRoute } from "../src/core/execute";
import type { ImageExecutionResult } from "../src/core/output";
import { getFixtures } from "./fixtures";

// Keep legacy behavioral regressions on the production worker execution path.
async function runLegacy(
  operation: V1OperationId,
  buffer: Buffer,
  options: unknown,
): Promise<ImageExecutionResult> {
  const result = await executeRoute(
    V1_OPERATION_MAP[operation].toolId,
    [{ fieldName: "file", filename: "legacy-image.png", buffer }],
    translateV1Options(operation, options),
  );
  expect(result.kind).toBe("image");
  if (result.kind !== "image") throw new Error("Expected image output");
  return result;
}

describe("legacy options executing in the isolated image engine", () => {
  it("reduces JPEG size with lower quality while keeping format and dimensions", async () => {
    const fixtures = await getFixtures();
    const low = await runLegacy("compress", fixtures.baseJpeg, { quality: 30 });
    const high = await runLegacy("compress", fixtures.baseJpeg, {
      quality: 90,
    });
    expect(low.bytes).toBeLessThan(high.bytes);
    expect(low.bytes).toBeLessThan(fixtures.baseJpeg.length);
    expect(await sharp(low.body).metadata()).toMatchObject({
      format: "jpeg",
      width: fixtures.width,
      height: fixtures.height,
    });
  });

  it("flattens transparent pixels to the requested JPEG background", async () => {
    const input = await sharp({
      create: { width: 8, height: 8, channels: 4, background: "#ff000000" },
    })
      .png()
      .toBuffer();
    const result = await runLegacy("convert", input, {
      targetFormat: "jpeg",
      background: "#00ff00",
    });
    expect((await sharp(result.body).metadata()).hasAlpha).toBe(false);
    const pixel = await sharp(result.body).raw().toBuffer();
    expect(pixel[0]).toBeLessThan(50);
    expect(pixel[1]).toBeGreaterThan(200);
    expect(pixel[2]).toBeLessThan(50);
  });

  it("rejects crop rectangles outside the decoded image bounds", async () => {
    const fixtures = await getFixtures();
    await expect(
      runLegacy("crop", fixtures.basePng, {
        left: fixtures.width - 10,
        top: 0,
        width: 20,
        height: 10,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_OPERATION_COMBINATION",
      status: 422,
    });
  });

  it.each([0, 180])(
    "preserves the dimensions when rotating %i degrees",
    async (angle) => {
      const fixtures = await getFixtures();
      const result = await runLegacy("rotate", fixtures.basePng, { angle });
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: fixtures.width,
        height: fixtures.height,
      });
    },
  );

  it("translates flipH into a pixel-correct horizontal flip", async () => {
    const input = await sharp(Buffer.from([255, 0, 0, 0, 0, 0]), {
      raw: { width: 2, height: 1, channels: 3 },
    })
      .png()
      .toBuffer();
    const result = await runLegacy("rotate", input, { angle: 0, flipH: true });
    expect(await sharp(result.body).removeAlpha().raw().toBuffer()).toEqual(
      Buffer.from([0, 0, 0, 255, 0, 0]),
    );
  });

  it("retains the pixel layout and orientation tag when explicitly preserving orientation", async () => {
    const input = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#123456" },
    })
      .withExif({ IFD0: { Orientation: "6", Make: "Private Camera" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const result = await runLegacy("clean", input, { keep: ["orientation"] });
    expect(await sharp(result.body).metadata()).toMatchObject({
      format: "jpeg",
      width: 40,
      height: 30,
      orientation: 6,
    });
  });
});
