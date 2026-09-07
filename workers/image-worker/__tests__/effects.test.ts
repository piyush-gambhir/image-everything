import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { executeEffect } from "../src/core/effects";
import { executeLayout } from "../src/core/layouts";
import { ANIMATED_GIF } from "./fixtures";

async function png(pixels: number[], width = pixels.length / 4) {
  return sharp(Buffer.from(pixels), {
    raw: { width, height: pixels.length / 4 / width, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function pixels(buffer: Buffer): Promise<number[]> {
  return Array.from(
    await sharp(buffer).toColourspace("srgb").ensureAlpha().raw().toBuffer(),
  );
}

const effectIds = [
  "color-space",
  "extract-channel",
  "duotone",
  "posterize",
  "solarize",
  "levels",
  "color-matrix",
  "convolve",
  "morphology",
  "replace-color",
  "chroma-key",
  "noise",
];

describe("color and pixel effects", () => {
  it.each(["srgb", "b-w", "cmyk"])(
    "encodes a real %s colour space",
    async (space) => {
      const result = await executeEffect(
        "color-space",
        await png([245, 20, 10, 255, 20, 245, 10, 255]),
        "input.png",
        { space, format: space === "cmyk" ? "tiff" : "png" },
      );
      expect(await sharp(result.body).metadata()).toMatchObject({
        space,
        width: 2,
        height: 1,
      });
    },
  );

  it("encodes CMYK JPEG and rejects incompatible CMYK PNG", async () => {
    const input = await png([245, 20, 10, 255]);
    const result = await executeEffect("color-space", input, "input.png", {
      space: "cmyk",
      format: "jpeg",
    });
    expect(await sharp(result.body).metadata()).toMatchObject({
      space: "cmyk",
      format: "jpeg",
    });
    await expect(
      executeEffect("color-space", input, "input.png", {
        space: "cmyk",
        format: "png",
      }),
    ).rejects.toThrow("CMYK requires JPEG or TIFF output");
  });

  it.each([
    ["red", 30],
    ["green", 80],
    ["blue", 200],
    ["alpha", 103],
  ])("extracts %s as an opaque grayscale mask", async (channel, expected) => {
    const result = await executeEffect(
      "extract-channel",
      await png([30, 80, 200, 103]),
      "input.png",
      { channel },
    );
    expect(await pixels(result.body)).toEqual([
      expected,
      expected,
      expected,
      255,
    ]);
  });

  it("extracts an opaque alpha mask when the input has no alpha", async () => {
    const input = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    const result = await executeEffect("extract-channel", input, "input.png", {
      channel: "alpha",
    });
    expect(await pixels(result.body)).toEqual([255, 255, 255, 255]);
  });

  it.each([false, true])(
    "extracts the inspected sRGB values from CMYK with embedded profile=%s",
    async (profile) => {
      const input = await png([150, 80, 30, 100, 10, 220, 100, 200]);
      let cmyk = sharp(input).toColourspace("cmyk");
      if (profile) cmyk = cmyk.withIccProfile("cmyk");
      const buffer = await cmyk.tiff({ compression: "lzw" }).toBuffer();
      const canonical = await sharp(buffer)
        .toColourspace("srgb")
        .ensureAlpha()
        .raw()
        .toBuffer();
      const inspected = await executeLayout(
        "pixel-inspect",
        [{ buffer, filename: "cmyk.tiff" }],
        { x: 0, y: 0 },
      );
      expect(inspected).toMatchObject({
        kind: "json",
        body: { rgba: [...canonical.subarray(0, 4)] },
      });
      for (const [index, channel] of [
        "red",
        "green",
        "blue",
        "alpha",
      ].entries()) {
        const result = await executeEffect(
          "extract-channel",
          buffer,
          "cmyk.tiff",
          { channel },
        );
        const decoded = await pixels(result.body);
        expect(decoded).toEqual([
          canonical[index],
          canonical[index],
          canonical[index],
          255,
          canonical[index + 4],
          canonical[index + 4],
          canonical[index + 4],
          255,
        ]);
      }
    },
  );

  it("maps duotone endpoints and applies the requested strength", async () => {
    const input = await png([0, 0, 0, 130, 255, 255, 255, 201]);
    const options = { dark: "#ff0000", light: "#0000ff" };
    const result = await executeEffect("duotone", input, "input.png", options);
    expect(await pixels(result.body)).toEqual([255, 0, 0, 130, 0, 0, 255, 201]);
    const unchanged = await executeEffect("duotone", input, "input.png", {
      ...options,
      amount: 0,
    });
    expect(await pixels(unchanged.body)).toEqual(await pixels(input));
    const halfway = await executeEffect("duotone", input, "input.png", {
      ...options,
      amount: 0.5,
    });
    expect(await pixels(halfway.body)).toEqual([
      128, 0, 0, 130, 128, 128, 255, 201,
    ]);
  });

  it("clips levels and applies midtone gamma without altering alpha", async () => {
    const clipped = await executeEffect(
      "levels",
      await png([10, 16, 235, 110]),
      "input.png",
      { black: 16, white: 235, gamma: 1 },
    );
    expect(await pixels(clipped.body)).toEqual([0, 0, 255, 110]);
    const gamma = await executeEffect(
      "levels",
      await png([0, 64, 255, 110]),
      "input.png",
      { black: 0, white: 255, gamma: 2 },
    );
    expect(await pixels(gamma.body)).toEqual([0, 128, 255, 110]);
  });

  it("uses the RGB matrix in row-major order and clamps transformed values", async () => {
    const input = await png([10, 20, 30, 87]);
    const swapped = await executeEffect("color-matrix", input, "input.png", {
      matrix: [0, 0, 1, 0, 1, 0, 1, 0, 0],
    });
    expect(await pixels(swapped.body)).toEqual([30, 20, 10, 87]);
    const clamped = await executeEffect("color-matrix", input, "input.png", {
      matrix: [-1, 0, 0, 0, 8, 8, 0, 0, 0],
    });
    expect(await pixels(clamped.body)).toEqual([0, 255, 0, 87]);
  });

  it("supports custom convolution scale and offset while preserving alpha", async () => {
    const result = await executeEffect(
      "convolve",
      await png([100, 150, 200, 73]),
      "input.png",
      {
        preset: "custom",
        kernel: [0, 0, 0, 0, 2, 0, 0, 0, 0],
        scale: 4,
        offset: 10,
      },
    );
    expect(await pixels(result.body)).toEqual([60, 85, 110, 73]);
  });

  it.each(["edge", "emboss", "sharpen", "box-blur"])(
    "supports the %s convolution preset and preserves alpha",
    async (preset) => {
      const inputPixels = Array.from({ length: 36 }, (_, index) =>
        index % 4 === 3 ? index * 3 : index >= 16 && index < 19 ? 180 : 0,
      );
      const result = await executeEffect(
        "convolve",
        await png(inputPixels, 3),
        "input.png",
        { preset },
      );
      const output = await pixels(result.body);
      expect(output.filter((_, index) => index % 4 === 3)).toEqual(
        inputPixels.filter((_, index) => index % 4 === 3),
      );
      if (preset === "box-blur") {
        expect(output.slice(16, 19)).toEqual([20, 20, 20]);
      }
      expect(result).toMatchObject({ width: 3, height: 3 });
    },
  );

  it.each(["dilate", "erode"])(
    "performs %s as a square RGB max/min filter, preserving alpha",
    async (mode) => {
      const inputPixels = Array.from({ length: 100 }, (_, index) => {
        if (index % 4 === 3) return index;
        const isCenter = Math.floor(index / 4) === 12;
        return mode === "dilate" ? (isCenter ? 230 : 10) : isCenter ? 10 : 230;
      });
      const result = await executeEffect(
        "morphology",
        await png(inputPixels, 5),
        "input.png",
        { mode, radius: 1 },
      );
      const output = await pixels(result.body);
      for (let pixel = 0; pixel < 25; pixel += 1) {
        const x = pixel % 5;
        const y = Math.floor(pixel / 5);
        const inside = x >= 1 && x <= 3 && y >= 1 && y <= 3;
        const expected =
          mode === "dilate" ? (inside ? 230 : 10) : inside ? 10 : 230;
        expect(output.slice(pixel * 4, pixel * 4 + 3)).toEqual([
          expected,
          expected,
          expected,
        ]);
        expect(output[pixel * 4 + 3]).toBe(inputPixels[pixel * 4 + 3]);
      }
    },
  );

  it("handles a morphology radius larger than a one-dimensional image", async () => {
    const result = await executeEffect(
      "morphology",
      await png([10, 50, 30, 33, 40, 20, 60, 44]),
      "input.png",
      { mode: "dilate", radius: 10 },
    );
    expect(await pixels(result.body)).toEqual([40, 50, 60, 33, 40, 50, 60, 44]);
  });

  it("replaces colors at the tolerance boundary and preserves unmatched pixels", async () => {
    const result = await executeEffect(
      "replace-color",
      await png([255, 0, 0, 101, 250, 0, 0, 102, 244, 0, 0, 103]),
      "input.png",
      { from: "#ff0000", to: "#0000ff", tolerance: 5 },
    );
    expect(await pixels(result.body)).toEqual([
      0, 0, 255, 101, 0, 0, 255, 102, 244, 0, 0, 103,
    ]);
  });

  it("chroma keys exact matches and multiplies existing alpha through the soft transition", async () => {
    const result = await executeEffect(
      "chroma-key",
      await png([0, 255, 0, 200, 0, 245, 0, 200, 0, 234, 0, 200]),
      "input.png",
      { color: "#00ff00", tolerance: 0, softness: 20 },
    );
    expect(await pixels(result.body)).toEqual([
      0, 255, 0, 0, 0, 245, 0, 100, 0, 234, 0, 200,
    ]);
    const hard = await executeEffect(
      "chroma-key",
      await png([0, 254, 0, 120, 0, 253, 0, 130]),
      "input.png",
      { color: "#00ff00", tolerance: 1, softness: 0 },
    );
    expect(await pixels(hard.body)).toEqual([0, 254, 0, 0, 0, 253, 0, 130]);
  });

  it.each([
    ["posterize", { levels: 1 }],
    ["levels", { black: 200, white: 150 }],
    ["color-matrix", { matrix: [1, 2, 3] }],
    ["convolve", { scale: 0 }],
    ["morphology", { radius: 11 }],
    ["duotone", { dark: "#00000000" }],
    ["noise", { seed: -1 }],
  ])(
    "rejects invalid %s options before decoding input",
    async (tool, options) => {
      await expect(
        executeEffect(String(tool), Buffer.alloc(0), "empty.png", options),
      ).rejects.toMatchObject({ name: "ZodError" });
    },
  );

  it("honors format choices and lossless output", async () => {
    const input = await png([10, 20, 30, 140]);
    for (const format of ["png", "webp", "tiff"]) {
      const result = await executeEffect("noise", input, "input.png", {
        format,
        amount: 0,
        lossless: true,
      });
      expect(result.format).toBe(format);
      expect(await sharp(result.body).metadata()).toMatchObject({ format });
      expect(await pixels(result.body)).toEqual(await pixels(input));
    }
  });

  it("normalizes CMYK with alpha before applying RGB effects", async () => {
    const source = await sharp({
      create: { width: 2, height: 1, channels: 4, background: "#ff000080" },
    })
      .toColourspace("cmyk")
      .tiff({ compression: "lzw" })
      .toBuffer();
    expect(await sharp(source).metadata()).toMatchObject({ channels: 5 });
    const identity = await executeEffect("noise", source, "input.tiff", {
      amount: 0,
    });
    expect(await pixels(identity.body)).toEqual(await pixels(source));
    const alpha = await executeEffect("extract-channel", source, "input.tiff", {
      channel: "alpha",
    });
    expect(await pixels(alpha.body)).toEqual([
      128, 128, 128, 255, 128, 128, 128, 255,
    ]);
  });

  it("applies EXIF orientation before interpreting pixel positions", async () => {
    const source = await sharp(
      await png(
        [
          10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
          130, 140, 150, 255, 160, 170, 180, 255,
        ],
        2,
      ),
    )
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();
    const result = await executeEffect("noise", source, "oriented.png", {
      amount: 0,
    });
    expect(result).toMatchObject({ width: 3, height: 2 });
    expect(await sharp(result.body).metadata()).not.toHaveProperty(
      "orientation",
    );
    expect(await pixels(result.body)).toEqual(
      Array.from(
        await sharp(source)
          .rotate()
          .toColourspace("srgb")
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
    );
  });

  it("enforces the output edge limit before native effect encoding", async () => {
    const source = await sharp({
      create: { width: 20_001, height: 1, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(
      executeEffect("color-space", source, "wide.png", {}),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
  });

  it("preserves zero noise as an identity and allows independent color noise", async () => {
    const input = await png([100, 100, 100, 39]);
    const identity = await executeEffect("noise", input, "input.png", {
      amount: 0,
    });
    expect(await pixels(identity.body)).toEqual([100, 100, 100, 39]);
    const colored = await executeEffect("noise", input, "input.png", {
      monochrome: false,
      seed: 0,
      amount: 100,
    });
    const output = await pixels(colored.body);
    expect(new Set(output.slice(0, 3)).size).toBeGreaterThan(1);
    expect(output[3]).toBe(39);
  });

  it.each(effectIds)("rejects animation for %s", async (toolId) => {
    await expect(
      executeEffect(toolId, ANIMATED_GIF, "animated.gif", {}),
    ).rejects.toMatchObject({ code: "ANIMATED_INPUT_UNSUPPORTED" });
  });

  it.each(["posterize", "duotone", "morphology", "noise"])(
    "preflights decoded allocations for %s",
    async (toolId) => {
      const oversized = await sharp({
        create: {
          width: 3000,
          height: 3000,
          channels: 4,
          background: "white",
        },
      })
        .png()
        .toBuffer();
      await expect(
        executeEffect(toolId, oversized, "large.png", {}),
      ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
    },
  );

  it("rejects an unknown effect", async () => {
    await expect(
      executeEffect("unsupported", await png([1, 2, 3, 255]), "in.png", {}),
    ).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
  });

  it("quantizes RGB while preserving alpha", async () => {
    const result = await executeEffect(
      "posterize",
      await png([0, 100, 255, 61, 127, 128, 200, 202]),
      "input.png",
      { levels: 2 },
    );
    expect(await pixels(result.body)).toEqual([
      0, 0, 255, 61, 0, 255, 255, 202,
    ]);
    expect(result).toMatchObject({
      format: "png",
      width: 2,
      height: 1,
      filename: "input.png",
    });
  });

  it("solarizes only values at or above the threshold", async () => {
    const result = await executeEffect(
      "solarize",
      await png([127, 128, 255, 63]),
      "input.png",
      { threshold: 128 },
    );
    expect(await pixels(result.body)).toEqual([127, 127, 0, 63]);
  });

  it("adds reproducible bounded noise without changing transparency", async () => {
    const input = await png(
      Array.from({ length: 200 }, (_, index) => (index % 4 === 3 ? 125 : 128)),
    );
    const run = (seed: number) =>
      executeEffect("noise", input, "input.png", {
        amount: 20,
        seed,
        monochrome: true,
      });
    const a = await pixels((await run(12)).body);
    expect(a).toEqual(await pixels((await run(12)).body));
    expect(a).not.toEqual(await pixels((await run(13)).body));
    for (let index = 0; index < a.length; index += 4) {
      expect(a[index]).toBeGreaterThanOrEqual(108);
      expect(a[index]).toBeLessThanOrEqual(148);
      expect(a[index + 1]).toBe(a[index]);
      expect(a[index + 2]).toBe(a[index]);
      expect(a[index + 3]).toBe(125);
    }
  });
});
