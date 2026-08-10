import { V2_ROUTE_REGISTRY, type RouteId } from "@image-everything/contracts";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { DomainError } from "../src/errors";
import { executeRoute, type UploadedPart } from "../src/execute";
import { openStillImage } from "../src/input";
import type {
  ExecutionResult,
  ImageExecutionResult,
  ZipExecutionResult,
} from "../src/output";
import { sniffImageFormat } from "../src/sniff";
import {
  ANIMATED_GIF,
  MULTIPAGE_TIFF,
  getFixtures,
  type WorkerFixtures,
} from "./fixtures";

const file = (
  buffer: Buffer,
  filename = "fixture.png",
  fieldName: UploadedPart["fieldName"] = "file",
  contentType = "image/png",
): UploadedPart => ({ fieldName, filename, contentType, buffer });

function expectImage(
  result: ExecutionResult,
): asserts result is ImageExecutionResult {
  expect(result.kind).toBe("image");
  if (result.kind !== "image") throw new Error("Expected image result");
  expect(result.body.length).toBeGreaterThan(0);
}

function expectZip(
  result: ExecutionResult,
): asserts result is ZipExecutionResult {
  expect(result.kind).toBe("zip");
  if (result.kind !== "zip") throw new Error("Expected ZIP result");
  expect(result.body.subarray(0, 2).toString("ascii")).toBe("PK");
  expect(result.body.includes(Buffer.from("manifest.json"))).toBe(true);
}

type RouteCase = {
  id: RouteId;
  options: unknown | ((fixtures: WorkerFixtures) => unknown);
  parts: (fixtures: WorkerFixtures) => UploadedPart[];
  assert: (
    result: ExecutionResult,
    fixtures: WorkerFixtures,
    options: unknown,
  ) => Promise<void> | void;
};

const singlePng = (fixtures: WorkerFixtures) => [file(fixtures.basePng)];

const cases: RouteCase[] = [
  {
    id: "compress",
    options: { format: "jpeg", quality: 35, progressive: true },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(result.format).toBe("jpeg");
      expect((await sharp(result.body).metadata()).format).toBe("jpeg");
    },
  },
  {
    id: "compress-to-size",
    options: (fixtures) => ({
      targetBytes: Math.max(1024, Math.floor(fixtures.baseJpeg.length * 0.9)),
      format: "jpeg",
      minQuality: 1,
      maxQuality: 90,
      tolerancePercent: 25,
      maxIterations: 10,
    }),
    parts: (fixtures) => [
      file(fixtures.baseJpeg, "fixture.jpg", "file", "image/jpeg"),
    ],
    assert: (result, _fixtures, options) => {
      expectImage(result);
      const target = (options as { targetBytes: number }).targetBytes;
      expect(result.bytes).toBeLessThanOrEqual(target);
      expect(
        Number(result.headers?.["x-image-output-quality"]),
      ).toBeGreaterThan(0);
    },
  },
  {
    id: "resize",
    options: { width: 60, fit: "inside" },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 60,
        height: 40,
      });
    },
  },
  {
    id: "convert",
    options: { format: "png", lossless: true },
    parts: (fixtures) => [
      file(fixtures.baseJpeg, "fixture.jpg", "file", "image/jpeg"),
    ],
    assert: async (result) => {
      expectImage(result);
      expect(result.format).toBe("png");
      expect((await sharp(result.body).metadata()).format).toBe("png");
    },
  },
  {
    id: "responsive",
    options: {
      widths: [60, 240, 480],
      formats: ["png"],
      withoutEnlargement: true,
      filenamePrefix: "responsive",
    },
    parts: singlePng,
    assert: (result) => {
      expectZip(result);
      expect(result.entries).toBe(3); // 60w, deduplicated 120w, manifest
      expect(result.body.includes(Buffer.from("responsive-60w.png"))).toBe(
        true,
      );
      expect(result.body.includes(Buffer.from("responsive-120w.png"))).toBe(
        true,
      );
    },
  },
  {
    id: "quick-enhance",
    options: {
      normalize: true,
      brightness: 0.8,
      saturation: 1.2,
      sharpen: true,
    },
    parts: singlePng,
    assert: (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
    },
  },
  {
    id: "crop",
    options: { mode: "rectangle", left: 10, top: 5, width: 40, height: 30 },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 40,
        height: 30,
      });
    },
  },
  {
    id: "rotate",
    options: { angle: 90, flipHorizontal: true },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 80,
        height: 120,
      });
    },
  },
  {
    id: "trim",
    options: { background: "#ffffff", threshold: 10 },
    parts: (fixtures) => [file(fixtures.trimPng, "border.png")],
    assert: async (result) => {
      expectImage(result);
      const metadata = await sharp(result.body).metadata();
      expect(metadata.width).toBeLessThan(80);
      expect(metadata.height).toBeLessThan(60);
    },
  },
  {
    id: "extend",
    options: { top: 2, right: 3, bottom: 4, left: 5, background: "#ff0000" },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 128,
        height: 86,
      });
    },
  },
  {
    id: "alpha",
    options: { action: "extract" },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(result.format).toBe("png");
      expect((await sharp(result.body).metadata()).channels).toBe(1);
    },
  },
  {
    id: "adjust",
    options: {
      brightness: 0.7,
      saturation: 1.4,
      hue: 20,
      contrast: 0.2,
      gamma: 1.2,
    },
    parts: singlePng,
    assert: (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
    },
  },
  {
    id: "normalize",
    options: { mode: "normalize", lower: 2, upper: 98 },
    parts: singlePng,
    assert: (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
    },
  },
  {
    id: "filter",
    options: { kind: "grayscale" },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      const { data, info } = await sharp(result.body)
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.channels >= 3) {
        for (
          let offset = 0;
          offset < Math.min(data.length, 200);
          offset += info.channels
        ) {
          expect(data[offset]).toBe(data[offset + 1]);
          expect(data[offset + 1]).toBe(data[offset + 2]);
        }
      } else {
        expect(info.channels).toBeLessThanOrEqual(2);
      }
    },
  },
  {
    id: "blur-sharpen",
    options: { kind: "blur", sigma: 2 },
    parts: singlePng,
    assert: (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
    },
  },
  {
    id: "pixelate",
    options: { blockSize: 12 },
    parts: singlePng,
    assert: async (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 120,
        height: 80,
      });
    },
  },
  {
    id: "watermark",
    options: {
      kind: "text",
      text: "Image Everything",
      opacity: 0.6,
      anchor: "bottom-right",
    },
    parts: singlePng,
    assert: (result, fixtures) => {
      expectImage(result);
      expect(result.body.equals(fixtures.basePng)).toBe(false);
    },
  },
  {
    id: "frame",
    options: { border: 4, color: "#00ff00", radius: 12, background: "#ff0000" },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 128,
        height: 88,
      });
      const pixel = await sharp(result.body)
        .extract({ left: 4, top: 4, width: 1, height: 1 })
        .raw()
        .toBuffer();
      expect(pixel[0]).toBeGreaterThan(pixel[1] ?? 0); // rounded interior exposes red background
    },
  },
  {
    id: "collage",
    options: {
      layout: "horizontal",
      cellWidth: 40,
      cellHeight: 30,
      gap: 2,
      padding: 2,
      format: "png",
    },
    parts: (fixtures) => [
      file(fixtures.basePng, "one.png", "files"),
      file(fixtures.changedPng, "two.png", "files"),
    ],
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 86,
        height: 34,
      });
    },
  },
  {
    id: "metadata",
    options: { includeRaw: true, includeGps: false },
    parts: (fixtures) => [
      file(fixtures.baseJpeg, "meta.jpg", "file", "image/jpeg"),
    ],
    assert: (result) => {
      expect(result.kind).toBe("json");
      if (result.kind !== "json") return;
      const body = result.body as {
        format: string;
        width: number;
        categorized: Record<string, unknown[]>;
      };
      expect(body).toMatchObject({ format: "jpeg", width: 120 });
      expect(body.categorized.image.length).toBeGreaterThan(0);
    },
  },
  {
    id: "metadata-clean",
    options: { policy: "strip-all" },
    parts: (fixtures) => [
      file(fixtures.baseJpeg, "meta.jpg", "file", "image/jpeg"),
    ],
    assert: async (result) => {
      expectImage(result);
      expect((await sharp(result.body).metadata()).exif).toBeUndefined();
    },
  },
  {
    id: "metadata-edit",
    options: { artist: "Edited Artist", description: "Edited description" },
    parts: (fixtures) => [
      file(fixtures.baseJpeg, "meta.jpg", "file", "image/jpeg"),
    ],
    assert: async (result) => {
      expectImage(result);
      const inspected = await executeRoute(
        "metadata",
        [file(result.body, "edited.jpg", "file", "image/jpeg")],
        { includeRaw: true },
      );
      expect(inspected.kind).toBe("json");
      if (inspected.kind === "json") {
        expect(JSON.stringify(inspected.body)).toContain("Edited Artist");
      }
    },
  },
  {
    id: "stats",
    options: { includeChannels: false },
    parts: singlePng,
    assert: (result) => {
      expect(result.kind).toBe("json");
      if (result.kind === "json") {
        const body = result.body as { entropy: number; channels: unknown[] };
        expect(body.entropy).toBeGreaterThan(0);
        expect(body.channels).toEqual([]);
      }
    },
  },
  {
    id: "palette",
    options: { colors: 6, sampleSize: 64 },
    parts: singlePng,
    assert: (result) => {
      expect(result.kind).toBe("json");
      if (result.kind === "json") {
        const body = result.body as { colors: unknown[]; samplePixels: number };
        expect(body.colors).toHaveLength(6);
        expect(body.samplePixels).toBeGreaterThan(0);
      }
    },
  },
  {
    id: "histogram",
    options: { mode: "luminance", bins: 16 },
    parts: singlePng,
    assert: (result) => {
      expect(result.kind).toBe("json");
      if (result.kind === "json") {
        const body = result.body as {
          pixels: number;
          channels: { luminance: number[] };
        };
        expect(body.channels.luminance).toHaveLength(16);
        expect(
          body.channels.luminance.reduce((sum, count) => sum + count, 0),
        ).toBe(body.pixels);
      }
    },
  },
  {
    id: "compare",
    options: { threshold: 0, resize: "error" },
    parts: (fixtures) => [
      file(fixtures.basePng, "one.png", "file"),
      file(fixtures.changedPng, "two.png", "other"),
    ],
    assert: (result) => {
      expect(result.kind).toBe("json");
      if (result.kind === "json") {
        const body = result.body as { mae: number; differingPixels: number };
        expect(body.mae).toBeGreaterThan(0);
        expect(body.differingPixels).toBeGreaterThan(0);
      }
    },
  },
  {
    id: "compare-diff",
    options: { threshold: 0, resize: "error", amplify: 8 },
    parts: (fixtures) => [
      file(fixtures.basePng, "one.png", "file"),
      file(fixtures.changedPng, "two.png", "other"),
    ],
    assert: async (result) => {
      expectImage(result);
      expect(result.format).toBe("png");
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 120,
        height: 80,
      });
    },
  },
  {
    id: "process",
    options: {
      steps: [
        { op: "resize", options: { width: 50, height: 40, fit: "fill" } },
        { op: "filter", options: { kind: "grayscale" } },
      ],
      output: { format: "png", lossless: true },
    },
    parts: singlePng,
    assert: async (result) => {
      expectImage(result);
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 50,
        height: 40,
      });
    },
  },
  {
    id: "batch",
    options: {
      pipeline: {
        steps: [{ op: "resize", options: { width: 50, fit: "inside" } }],
        output: { format: "jpeg", quality: 70 },
      },
      continueOnError: true,
      filenamePrefix: "processed",
    },
    parts: (fixtures) => [
      file(fixtures.basePng, "one.png", "files"),
      file(fixtures.changedPng, "two.png", "files"),
    ],
    assert: (result) => {
      expectZip(result);
      expect(result.entries).toBe(3);
      expect(result.body.includes(Buffer.from("processed-1-one.jpg"))).toBe(
        true,
      );
    },
  },
];

describe("all v2 operation routes", () => {
  it("has one direct semantic engine assertion for every route", () => {
    expect(cases.map((testCase) => testCase.id).sort()).toEqual(
      V2_ROUTE_REGISTRY.map((route) => route.id).sort(),
    );
  });

  it.each(cases)("executes $id with a real image", async (testCase) => {
    const fixtures = await getFixtures();
    const options =
      typeof testCase.options === "function"
        ? testCase.options(fixtures)
        : testCase.options;
    const result = await executeRoute(
      testCase.id,
      testCase.parts(fixtures),
      options,
    );
    await testCase.assert(result, fixtures, options);
  });
});

describe("input policy", () => {
  it("sniffs bytes instead of trusting multipart MIME", async () => {
    const fixtures = await getFixtures();
    expect(sniffImageFormat(fixtures.baseJpeg)).toBe("jpeg");
    const result = await executeRoute(
      "metadata",
      [file(fixtures.baseJpeg, "spoof.png", "file", "image/png")],
      {},
    );
    expect(result.kind).toBe("json");
    if (result.kind === "json")
      expect(result.body).toMatchObject({ format: "jpeg" });
  });

  it.each([
    ["animated GIF", ANIMATED_GIF],
    ["multi-page TIFF", MULTIPAGE_TIFF],
  ])("rejects %s without flattening", async (_label, buffer) => {
    await expect(openStillImage(buffer)).rejects.toMatchObject({
      code: "ANIMATED_INPUT_UNSUPPORTED",
      status: 422,
    });
  });

  it("maps Sharp's early pixel-limit error to the stable 413 code", async () => {
    const fixtures = await getFixtures();
    const oversized = Buffer.from(fixtures.basePng);
    oversized.writeUInt32BE(10_000, 16);
    oversized.writeUInt32BE(7_000, 20);
    oversized.writeUInt32BE(crc32(oversized.subarray(12, 29)), 29);
    await expect(openStillImage(oversized)).rejects.toMatchObject({
      code: "INPUT_PIXELS_EXCEEDED",
      status: 413,
    });
  });

  it("rejects corrupt and unsupported bytes with no raw Sharp detail", async () => {
    await expect(openStillImage(Buffer.from("not an image"))).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "UNSUPPORTED_MEDIA_TYPE",
        status: 415,
      }),
    );
  });

  it("rejects unexpected authenticated multipart file fields", async () => {
    const fixtures = await getFixtures();
    await expect(
      executeRoute(
        "resize",
        [
          file(fixtures.basePng),
          file(fixtures.overlayPng, "overlay.png", "overlay"),
        ],
        { width: 20 },
      ),
    ).rejects.toMatchObject({ code: "MALFORMED_MULTIPART", status: 400 });
  });

  it("makes includeChannels observable", async () => {
    const fixtures = await getFixtures();
    const result = await executeRoute("stats", singlePng(fixtures), {
      includeChannels: true,
    });
    expect(result.kind).toBe("json");
    if (result.kind === "json") {
      expect(
        (result.body as { channels: unknown[] }).channels.length,
      ).toBeGreaterThan(0);
    }
  });
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
