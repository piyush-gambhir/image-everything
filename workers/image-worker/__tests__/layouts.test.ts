import { createHash } from "node:crypto";

import {
  MAX_RAW_BYTES,
  SliceManifestSchema,
  SpriteSheetManifestSchema,
  IconSetManifestSchema,
} from "@image-everything/contracts";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { executeLayout } from "../src/core/layouts";
import type {
  ExecutionResult,
  ImageExecutionResult,
  ZipExecutionResult,
} from "../src/core/output";
import { readZip } from "./zip";

const red = [255, 0, 0, 255];
const green = [0, 255, 0, 255];
const blue = [0, 0, 255, 255];
const transparent = [0, 0, 0, 0];

async function png(
  width: number,
  height: number,
  pixels: number[],
): Promise<Buffer> {
  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function solid(
  width: number,
  height: number,
  background: string,
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background } })
    .png()
    .toBuffer();
}

async function run(tool: string, buffer: Buffer, options: unknown = {}) {
  return executeLayout(tool, [{ buffer, filename: "image.png" }], options);
}

function image(
  result: ExecutionResult,
): asserts result is ImageExecutionResult {
  expect(result.kind).toBe("image");
  if (result.kind !== "image") throw new Error("Expected image");
}

function zip(result: ExecutionResult): asserts result is ZipExecutionResult {
  expect(result.kind).toBe("zip");
  if (result.kind !== "zip") throw new Error("Expected ZIP");
}

async function pixels(buffer: Buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function at(data: Buffer, width: number, x: number, y: number): number[] {
  const offset = (y * width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
}

describe("layout, export, and inspection tools", () => {
  it("bakes EXIF orientation into dimensions and pixels without retaining the tag", async () => {
    const input = await sharp(
      await png(3, 2, [...red, ...green, ...blue, ...blue, ...red, ...green]),
    )
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();
    const result = await run("auto-orient", input);
    image(result);
    expect([result.width, result.height]).toEqual([2, 3]);
    expect((await sharp(result.body).metadata()).orientation).toBeUndefined();
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 2, 0, 0)).toEqual(blue);
    expect(at(decoded.data, 2, 1, 0)).toEqual(red);
    expect(at(decoded.data, 2, 0, 2)).toEqual(green);
    expect(at(decoded.data, 2, 1, 2)).toEqual(blue);
  });

  it("applies an identity affine matrix without altering decoded pixels", async () => {
    const input = await png(2, 2, [...red, ...green, ...blue, ...red]);
    const result = await run("affine", input, { a: 1, b: 0, c: 0, d: 1 });
    image(result);
    expect([result.width, result.height]).toEqual([2, 2]);
    expect((await pixels(result.body)).data).toEqual(
      (await pixels(input)).data,
    );
  });

  it.each([
    [{ a: -1, b: 0, c: 0, d: 1 }, [green, red, red, blue]],
    [{ a: 1, b: 0, c: 0, d: -1 }, [blue, red, red, green]],
    [{ a: 0, b: -1, c: 1, d: 0 }, [blue, red, red, green]],
  ])(
    "affine matrix %j reflects pixel centers without dropping edge pixels",
    async (matrix, expected) => {
      const input = await png(2, 2, [...red, ...green, ...blue, ...red]);
      const result = await run("affine", input, matrix);
      image(result);
      expect((await pixels(result.body)).data).toEqual(
        Buffer.from(expected.flat()),
      );
    },
  );

  it("rejects degenerate affine transforms and projected oversized output", async () => {
    const input = await solid(2, 2, "red");
    await expect(
      run("affine", input, { a: 1, b: 1, c: 1, d: 1 }),
    ).rejects.toThrow(/invertible/);
    await expect(
      run("affine", await solid(6000, 1, "red"), { a: 4, b: 0, c: 0, d: 1 }),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
  });

  it("rejects affine scaling that rounds a dimension to zero", async () => {
    const input = await solid(1, 1, "red");
    await expect(
      run("affine", input, { a: 0.1, b: 0, c: 0, d: 0.1 }),
    ).rejects.toMatchObject({
      code: "INVALID_OPTIONS",
      message: expect.stringContaining("one pixel"),
    });
  });

  it("darkens vignette corners while preserving the center and alpha", async () => {
    const result = await run("vignette", await solid(3, 3, "#c8c8c880"), {
      strength: 1,
      radius: 0,
    });
    image(result);
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 3, 0, 0)).toEqual([0, 0, 0, 128]);
    expect(at(decoded.data, 3, 1, 1)).toEqual([200, 200, 200, 128]);
    expect(at(decoded.data, 3, 1, 0)[0]).toBeGreaterThan(0);
  });

  it("honors a vignette radius covering the whole image", async () => {
    const input = await png(2, 2, [...red, ...green, ...blue, ...red]);
    const result = await run("vignette", input, { strength: 1, radius: 1 });
    image(result);
    expect((await pixels(result.body)).data).toEqual(
      (await pixels(input)).data,
    );
  });

  it("adds a displaced alpha-derived shadow without obscuring the original", async () => {
    const result = await run("shadow", await solid(1, 1, "red"), {
      offsetX: 2,
      offsetY: 0,
      blur: 0.3,
      opacity: 0.5,
    });
    image(result);
    expect([result.width, result.height]).toEqual([4, 3]);
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 4, 0, 1)).toEqual(red);
    expect(at(decoded.data, 4, 2, 1).slice(0, 3)).toEqual([0, 0, 0]);
    expect(at(decoded.data, 4, 2, 1)[3]).toBeGreaterThan(0);
    expect(at(decoded.data, 4, 2, 1)[3]).toBeLessThan(200);
  });

  it("reflects the bottom edge vertically with a transparent gap and fading alpha", async () => {
    const result = await run(
      "reflection",
      await png(1, 2, [...red, ...green]),
      { height: 1, gap: 1, opacity: 1 },
    );
    image(result);
    expect([result.width, result.height]).toEqual([1, 5]);
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 1, 0, 0)).toEqual(red);
    expect(at(decoded.data, 1, 0, 1)).toEqual(green);
    expect(at(decoded.data, 1, 0, 2)).toEqual(transparent);
    expect(at(decoded.data, 1, 0, 3)).toEqual(green);
    expect(at(decoded.data, 1, 0, 4)).toEqual([255, 0, 0, 128]);
  });

  it("repeats the image into an exact grid with colored gutters", async () => {
    const result = await run("tile", await png(2, 1, [...red, ...green]), {
      columns: 2,
      rows: 2,
      gap: 1,
      background: "#0000ff",
    });
    image(result);
    expect([result.width, result.height]).toEqual([5, 3]);
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 5, 0, 0)).toEqual(red);
    expect(at(decoded.data, 5, 3, 2)).toEqual(red);
    expect(at(decoded.data, 5, 4, 2)).toEqual(green);
    expect(at(decoded.data, 5, 2, 0)).toEqual(blue);
    expect(at(decoded.data, 5, 0, 1)).toEqual(blue);
  });

  it("slices odd dimensions without losing, duplicating, or reordering pixels", async () => {
    const original = Buffer.from(
      Array.from({ length: 15 }, (_, index) => [
        index * 13,
        255 - index * 11,
        index * 3,
        255,
      ]).flat(),
    );
    const input = await png(5, 3, [...original]);
    const result = await run("slice", input, { columns: 2, rows: 2 });
    zip(result);
    const entries = readZip(result.body);
    const manifest = SliceManifestSchema.parse(
      JSON.parse(entries.get("manifest.json")!.toString()),
    );
    expect([manifest.width, manifest.height]).toEqual([5, 3]);
    expect(manifest.tiles).toHaveLength(4);
    const reconstructed = Buffer.alloc(original.length);
    for (const tile of manifest.tiles) {
      const decoded = await pixels(entries.get(tile.file)!);
      expect([decoded.info.width, decoded.info.height]).toEqual([
        tile.width,
        tile.height,
      ]);
      for (let y = 0; y < tile.height; y += 1)
        decoded.data.copy(
          reconstructed,
          ((tile.top + y) * 5 + tile.left) * 4,
          y * tile.width * 4,
          (y + 1) * tile.width * 4,
        );
    }
    expect(reconstructed).toEqual(original);
  });

  it("rejects empty slices and requests with too many tiles", async () => {
    const input = await solid(2, 2, "red");
    await expect(
      run("slice", input, { columns: 3, rows: 1 }),
    ).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
    await expect(run("slice", input, { columns: 5, rows: 5 })).rejects.toThrow(
      /20 tiles/,
    );
  });

  it("builds a sprite PNG with padding and coordinates matching its manifest", async () => {
    const result = await executeLayout(
      "sprite-sheet",
      [
        { buffer: await solid(2, 2, "red"), filename: "../red.png" },
        { buffer: await solid(2, 2, "blue"), filename: "blue.png" },
      ],
      { cellWidth: 2, cellHeight: 2, columns: 2, gap: 1, padding: 1 },
    );
    zip(result);
    const entries = readZip(result.body);
    const manifest = SpriteSheetManifestSchema.parse(
      JSON.parse(entries.get("manifest.json")!.toString()),
    );
    expect(manifest).toMatchObject({
      image: "sprite-sheet.png",
      width: 7,
      height: 4,
      columns: 2,
      rows: 1,
      sprites: [
        { source: "red", left: 1, top: 1 },
        { source: "blue", left: 4, top: 1 },
      ],
    });
    const decoded = await pixels(entries.get("sprite-sheet.png")!);
    expect(at(decoded.data, 7, 1, 1)).toEqual(red);
    expect(at(decoded.data, 7, 4, 1)).toEqual(blue);
    expect(at(decoded.data, 7, 0, 0)).toEqual(transparent);
    expect(at(decoded.data, 7, 3, 1)).toEqual(transparent);
  });

  it("exports PNG icons and a valid ICO directory referencing each embedded PNG", async () => {
    const result = await run("icon-set", await solid(2, 2, "red"), {
      sizes: [8, 16, 256, 512],
    });
    zip(result);
    const entries = readZip(result.body);
    const manifest = IconSetManifestSchema.parse(
      JSON.parse(entries.get("manifest.json")!.toString()),
    );
    expect(manifest.ico).toBe("favicon.ico");
    expect(manifest.icons).toHaveLength(4);
    const ico = entries.get("favicon.ico")!;
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    for (const [index, size] of [8, 16, 256].entries()) {
      const directory = 6 + index * 16;
      expect(ico[directory]).toBe(size === 256 ? 0 : size);
      expect(ico[directory + 1]).toBe(size === 256 ? 0 : size);
      expect(ico.readUInt16LE(directory + 6)).toBe(32);
      const bytes = ico.readUInt32LE(directory + 8);
      const offset = ico.readUInt32LE(directory + 12);
      expect(ico.subarray(offset, offset + bytes)).toEqual(
        entries.get(`icon-${size}.png`),
      );
    }
    for (const size of [8, 16, 256, 512])
      expect(
        await sharp(entries.get(`icon-${size}.png`)).metadata(),
      ).toMatchObject({ width: size, height: size, format: "png" });
  });

  it.each(["srgb", "b-w", "cmyk"])(
    "encodes %s sources as 32-bit RGBA PNGs inside ICO",
    async (space) => {
      const input = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "red" },
      })
        .toColourspace(space)
        .tiff()
        .toBuffer();
      const result = await run("icon-set", input, { sizes: [16] });
      zip(result);
      const entries = readZip(result.body);
      expect(await sharp(entries.get("icon-16.png")).metadata()).toMatchObject({
        space: "srgb",
        channels: 4,
        hasAlpha: true,
      });
    },
  );

  it("supports PNG-only icon bundles", async () => {
    const result = await run("icon-set", await solid(1, 1, "red"), {
      sizes: [512],
      includeIco: false,
    });
    zip(result);
    const entries = readZip(result.body);
    expect(entries.has("favicon.ico")).toBe(false);
    expect(entries.has("icon-512.png")).toBe(true);
    await expect(
      run("icon-set", await solid(1, 1, "red"), { sizes: [512] }),
    ).rejects.toThrow(/ICO output/);
  });

  it("reads exact RGBA samples and rejects points outside the image", async () => {
    const input = await png(2, 1, [...red, 7, 15, 23, 128]);
    expect(await run("pixel-inspect", input, { x: 1, y: 0 })).toMatchObject({
      kind: "json",
      body: {
        x: 1,
        y: 0,
        width: 2,
        height: 1,
        rgba: [7, 15, 23, 128],
        hex: "#070f1780",
      },
    });
    await expect(run("pixel-inspect", input, { x: 2 })).rejects.toMatchObject({
      code: "INVALID_OPTIONS",
    });
  });

  it("calculates stable 64-bit hashes and an exact source-byte SHA256", async () => {
    const input = await solid(8, 8, "#808080");
    expect(
      await run("fingerprint", input, { algorithm: "average" }),
    ).toMatchObject({
      kind: "json",
      body: {
        algorithm: "average",
        hash: "ffffffffffffffff",
        sha256: createHash("sha256").update(input).digest("hex"),
        width: 8,
        height: 8,
      },
    });
    expect(
      await run("fingerprint", input, { algorithm: "difference" }),
    ).toMatchObject({ kind: "json", body: { hash: "0000000000000000" } });
    const gradient = await png(
      9,
      8,
      Array.from({ length: 72 }, (_, index) => [
        255 - (index % 9) * 25,
        255 - (index % 9) * 25,
        255 - (index % 9) * 25,
        255,
      ]).flat(),
    );
    expect(await run("fingerprint", gradient)).toMatchObject({
      kind: "json",
      body: { hash: "ffffffffffffffff" },
    });
  });

  it("replaces only the selected redaction rectangle with opaque pixels", async () => {
    const input = await solid(4, 3, "#ff000080");
    const result = await run("redact", input, {
      regions: [{ left: 1, top: 1, width: 2, height: 1 }],
      color: "#0000ff",
    });
    image(result);
    const decoded = await pixels(result.body);
    expect(at(decoded.data, 4, 1, 1)).toEqual(blue);
    expect(at(decoded.data, 4, 2, 1)).toEqual(blue);
    expect(at(decoded.data, 4, 0, 1)).toEqual([255, 0, 0, 128]);
    expect(at(decoded.data, 4, 1, 0)).toEqual([255, 0, 0, 128]);
    await expect(
      run("redact", input, {
        regions: [{ left: 3, top: 0, width: 2, height: 2 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_OPTIONS" });
  });

  it.each(["blur", "pixelate"])(
    "%s redactions alter the patch and preserve pixels outside it",
    async (mode) => {
      const input = await png(4, 2, [
        ...red,
        ...green,
        ...blue,
        ...red,
        ...red,
        ...blue,
        ...green,
        ...red,
      ]);
      const result = await run("redact", input, {
        mode,
        regions: [{ left: 1, top: 0, width: 2, height: 2 }],
        blockSize: 2,
        blur: 1,
      });
      image(result);
      const decoded = await pixels(result.body);
      expect(at(decoded.data, 4, 0, 0)).toEqual(red);
      expect(at(decoded.data, 4, 3, 1)).toEqual(red);
      expect(at(decoded.data, 4, 1, 0)).not.toEqual(green);
    },
  );

  it("inspects wide inputs without imposing image-output edge limits", async () => {
    const wide = await solid(20001, 1, "red");
    expect(await run("pixel-inspect", wide, { x: 20000, y: 0 })).toMatchObject({
      kind: "json",
      body: { width: 20001, height: 1, rgba: red },
    });
    expect(await run("fingerprint", wide)).toMatchObject({
      kind: "json",
      body: { width: 20001, height: 1, hash: "0000000000000000" },
    });
  });

  it("enforces raw working memory and output growth before pixel allocation", async () => {
    const wide = await solid(
      400,
      Math.floor(MAX_RAW_BYTES / 4 / 400) + 1,
      "red",
    );
    await expect(run("vignette", wide)).rejects.toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
      message: expect.stringContaining("decoded RGBA bytes"),
    });
    await expect(
      run("tile", await solid(3000, 1, "red"), { columns: 10, rows: 1 }),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
    await expect(
      executeLayout(
        "sprite-sheet",
        [{ buffer: await solid(1, 1, "red"), filename: "a.png" }],
        { cellWidth: 20000, padding: 1 },
      ),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED" });
  });
});
