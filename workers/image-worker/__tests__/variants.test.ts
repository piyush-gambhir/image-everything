import { inflateRawSync } from "node:zlib";

import { ArchiveManifestSchema, LIMITS } from "@image-everything/contracts";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { enforceAggregateOutputBytes } from "../src/archive";
import { executeRoute, type UploadedPart } from "../src/execute";
import { escapeWatermarkXml } from "../src/operations";
import type { ExecutionResult, ImageExecutionResult } from "../src/output";
import { getCapabilities } from "../src/runtime";
import { sniffImageFormat } from "../src/sniff";
import { getFixtures } from "./fixtures";

const part = (
  buffer: Buffer,
  filename = "image.png",
  fieldName: UploadedPart["fieldName"] = "file",
): UploadedPart => ({ fieldName, filename, buffer });

function image(result: ExecutionResult): ImageExecutionResult {
  expect(result.kind).toBe("image");
  if (result.kind !== "image") throw new Error("Expected image result");
  return result;
}

describe("documented operation variants", () => {
  it.each([
    ["cover", 50, 50],
    ["contain", 50, 50],
    ["fill", 50, 50],
    ["inside", 50, 33],
    ["outside", 75, 50],
  ] as const)("implements resize fit=%s", async (fit, width, height) => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute("resize", [part(fixtures.basePng)], {
        width: 50,
        height: 50,
        fit,
      }),
    );
    expect(await sharp(result.body).metadata()).toMatchObject({
      width,
      height,
    });
  });

  it("supports percentage and no-enlargement resize policies", async () => {
    const fixtures = await getFixtures();
    const percentage = image(
      await executeRoute("resize", [part(fixtures.basePng)], { percent: 50 }),
    );
    expect(await sharp(percentage.body).metadata()).toMatchObject({
      width: 60,
      height: 40,
    });
    const bounded = image(
      await executeRoute("resize", [part(fixtures.basePng)], {
        width: 500,
        withoutEnlargement: true,
      }),
    );
    expect(await sharp(bounded.body).metadata()).toMatchObject({
      width: 120,
      height: 80,
    });
  });

  it("performs maximum-area aspect crop", async () => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute("crop", [part(fixtures.basePng)], {
        mode: "aspect",
        aspectWidth: 1,
        aspectHeight: 1,
        position: "center",
      }),
    );
    expect(await sharp(result.body).metadata()).toMatchObject({
      width: 80,
      height: 80,
    });
  });

  it.each([
    ["flatten", { action: "flatten", background: "#ff0000" }, 3],
    ["ensure", { action: "ensure", alpha: 0.5 }, 4],
    ["remove", { action: "remove" }, 3],
    ["extract", { action: "extract" }, 1],
  ] as const)(
    "implements alpha action=%s",
    async (_name, options, channels) => {
      const fixtures = await getFixtures();
      const result = image(
        await executeRoute("alpha", [part(fixtures.basePng)], options),
      );
      expect((await sharp(result.body).metadata()).channels).toBe(channels);
    },
  );

  it("implements CLAHE independently of global normalization", async () => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute("normalize", [part(fixtures.basePng)], {
        mode: "clahe",
        width: 4,
        height: 4,
        maxSlope: 5,
      }),
    );
    expect(result.body.equals(fixtures.basePng)).toBe(false);
  });

  it.each([
    ["grayscale", { kind: "grayscale" }],
    ["sepia", { kind: "sepia" }],
    ["invert", { kind: "invert", alpha: true }],
    ["threshold", { kind: "threshold", value: 100, grayscale: true }],
    ["tint", { kind: "tint", color: "#00ff00" }],
  ] as const)("implements filter=%s", async (_name, options) => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute("filter", [part(fixtures.basePng)], options),
    );
    expect(result.body.equals(fixtures.basePng)).toBe(false);
  });

  it.each([
    ["blur", { kind: "blur", sigma: 2 }],
    ["sharpen", { kind: "sharpen", sigma: 1.2 }],
    ["median", { kind: "median", size: 3 }],
  ] as const)("implements local filter=%s", async (_name, options) => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute("blur-sharpen", [part(fixtures.basePng)], options),
    );
    expect(result.body.equals(fixtures.basePng)).toBe(false);
  });

  it("implements all extend modes with distinct edge behavior", async () => {
    const fixtures = await getFixtures();
    const bodies: Buffer[] = [];
    for (const mode of ["background", "copy", "repeat", "mirror"] as const) {
      const result = image(
        await executeRoute("extend", [part(fixtures.basePng)], {
          top: 5,
          right: 7,
          bottom: 3,
          left: 4,
          mode,
          background: "#ff00ff",
        }),
      );
      expect(await sharp(result.body).metadata()).toMatchObject({
        width: 131,
        height: 88,
      });
      bodies.push(result.body);
    }
    expect(new Set(bodies.map((body) => body.toString("base64"))).size).toBe(4);
  });

  it("applies an uploaded image watermark", async () => {
    const fixtures = await getFixtures();
    const result = image(
      await executeRoute(
        "watermark",
        [
          part(fixtures.basePng),
          part(fixtures.overlayPng, "overlay.png", "overlay"),
        ],
        { kind: "image", scale: 0.4, opacity: 0.5, anchor: "center" },
      ),
    );
    expect(result.body.equals(fixtures.basePng)).toBe(false);
  });

  it("escapes every XML-sensitive watermark character", () => {
    expect(escapeWatermarkXml(`<>&"'</text>`)).toBe(
      "&lt;&gt;&amp;&quot;&apos;&lt;/text&gt;",
    );
  });

  it("makes text watermark opacity and anchors visually distinguishable", async () => {
    const canvas = await sharp({
      create: {
        width: 240,
        height: 120,
        channels: 4,
        background: "#000000",
      },
    })
      .png()
      .toBuffer();
    const options = {
      kind: "text" as const,
      text: "Anchor",
      fontSize: 24,
      color: "#ffffff",
      strokeColor: "#00000000",
      offsetX: 0,
      offsetY: 0,
    };
    const faint = image(
      await executeRoute("watermark", [part(canvas)], {
        ...options,
        opacity: 0.2,
        anchor: "top-left",
      }),
    );
    const opaqueTop = image(
      await executeRoute("watermark", [part(canvas)], {
        ...options,
        opacity: 1,
        anchor: "top-left",
      }),
    );
    const opaqueBottom = image(
      await executeRoute("watermark", [part(canvas)], {
        ...options,
        opacity: 1,
        anchor: "bottom-right",
      }),
    );
    expect(await meanRgb(opaqueTop.body)).toBeGreaterThan(
      await meanRgb(faint.body),
    );
    const topBounds = await nonBlackBounds(opaqueTop.body);
    const bottomBounds = await nonBlackBounds(opaqueBottom.body);
    expect(topBounds.left).toBeLessThan(20);
    expect(topBounds.top).toBeLessThan(30);
    expect(bottomBounds.left).toBeGreaterThan(100);
    expect(bottomBounds.top).toBeGreaterThan(60);
    expect(opaqueTop.body.equals(opaqueBottom.body)).toBe(false);
  });

  it.each([
    ["grid", 2, 44, 44],
    ["vertical", undefined, 22, 66],
  ] as const)(
    "lays out collage mode=%s",
    async (layout, columns, width, height) => {
      const fixtures = await getFixtures();
      const result = image(
        await executeRoute(
          "collage",
          [
            part(fixtures.basePng, "one.png", "files"),
            part(fixtures.changedPng, "two.png", "files"),
            part(fixtures.basePng, "three.png", "files"),
          ],
          {
            layout,
            columns,
            cellWidth: 20,
            cellHeight: 20,
            gap: 2,
            padding: 1,
            format: "png",
          },
        ),
      );
      expect(await sharp(result.body).metadata()).toMatchObject({
        width,
        height,
      });
    },
  );

  it.each([
    ["rgb", ["red", "green", "blue"]],
    ["rgba", ["red", "green", "blue", "alpha"]],
  ] as const)("emits histogram mode=%s", async (mode, keys) => {
    const fixtures = await getFixtures();
    const result = await executeRoute("histogram", [part(fixtures.basePng)], {
      mode,
      bins: 8,
    });
    expect(result.kind).toBe("json");
    if (result.kind === "json") {
      expect(
        Object.keys((result.body as { channels: object }).channels),
      ).toEqual(keys);
    }
  });

  it("implements compare resize, alpha, and threshold policies", async () => {
    const fixtures = await getFixtures();
    const smaller = await sharp(fixtures.changedPng)
      .resize(60, 40)
      .png()
      .toBuffer();
    for (const [resize, width, height] of [
      ["first", 120, 80],
      ["smallest", 60, 40],
      ["largest", 120, 80],
    ] as const) {
      const result = await executeRoute(
        "compare",
        [part(fixtures.basePng), part(smaller, "small.png", "other")],
        { resize, includeAlpha: false, threshold: 255 },
      );
      expect(result.kind).toBe("json");
      if (result.kind === "json") {
        expect(result.body).toMatchObject({
          width,
          height,
          channels: 3,
          differingPixels: 0,
        });
      }
    }
  });

  it("honors disabled steps, sequence order, and terminal metadata edits", async () => {
    const fixtures = await getFixtures();
    const disabled = image(
      await executeRoute("process", [part(fixtures.baseJpeg, "source.jpg")], {
        steps: [
          { enabled: false, op: "resize", options: { width: 10 } },
          { op: "rotate", options: { angle: 90 } },
        ],
        output: {
          format: "jpeg",
          metadataEdits: { artist: "Pipeline Artist" },
        },
      }),
    );
    expect(await sharp(disabled.body).metadata()).toMatchObject({
      width: 80,
      height: 120,
    });
    const metadata = await executeRoute(
      "metadata",
      [part(disabled.body, "pipeline.jpg")],
      { includeRaw: true },
    );
    expect(
      JSON.stringify(metadata.kind === "json" ? metadata.body : {}),
    ).toContain("Pipeline Artist");

    const first = image(
      await executeRoute("process", [part(fixtures.basePng)], {
        steps: [
          {
            op: "crop",
            options: {
              mode: "rectangle",
              left: 0,
              top: 0,
              width: 60,
              height: 40,
            },
          },
          { op: "rotate", options: { angle: 90 } },
        ],
        output: { format: "png", lossless: true },
      }),
    );
    const second = image(
      await executeRoute("process", [part(fixtures.basePng)], {
        steps: [
          { op: "rotate", options: { angle: 90 } },
          {
            op: "crop",
            options: {
              mode: "rectangle",
              left: 0,
              top: 0,
              width: 60,
              height: 40,
            },
          },
        ],
        output: { format: "png", lossless: true },
      }),
    );
    expect(first.body.equals(second.body)).toBe(false);
  });

  it("parses the batch manifest, reports partial failure, and sanitizes archive paths", async () => {
    const fixtures = await getFixtures();
    const files = [
      part(fixtures.basePng, "../../safe\r\nInjected.png", "files"),
      part(Buffer.from("invalid"), "../bad/../../invalid.png", "files"),
    ];
    const pipeline = { steps: [], output: { format: "png", lossless: true } };
    const partial = await executeRoute("batch", files, {
      pipeline,
      continueOnError: true,
      filenamePrefix: "partial",
    });
    expect(partial.kind).toBe("zip");
    if (partial.kind !== "zip") throw new Error("Expected ZIP result");
    const archive = readZip(partial.body);
    const names = [...archive.keys()];
    expect(names).toContain("manifest.json");
    for (const name of names) {
      expect(name).not.toMatch(/(^|\/)\.\.?($|\/)/);
      expect(name).not.toMatch(/[\\\r\n]/);
      expect(name.startsWith("/")).toBe(false);
    }
    const manifest = ArchiveManifestSchema.parse(
      JSON.parse(archive.get("manifest.json")!.toString("utf8")),
    );
    expect(manifest.items).toHaveLength(2);
    const success = manifest.items.find((item) => item.status === "success");
    const failure = manifest.items.find((item) => item.status === "error");
    expect(success).toMatchObject({ status: "success" });
    expect(success?.status === "success" && archive.has(success.output)).toBe(
      true,
    );
    expect(failure).toMatchObject({
      status: "error",
      problem: { code: "UNSUPPORTED_MEDIA_TYPE", status: 415 },
    });
    await expect(
      executeRoute("batch", files, {
        pipeline,
        continueOnError: false,
        filenamePrefix: "fail-fast",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
  });

  it("enforces the aggregate archive-output byte boundary without allocating it", () => {
    expect(() =>
      enforceAggregateOutputBytes(LIMITS.maxAggregateOutputBytes),
    ).not.toThrow();
    expect(() =>
      enforceAggregateOutputBytes(LIMITS.maxAggregateOutputBytes + 1),
    ).toThrowError(
      expect.objectContaining({ code: "OUTPUT_LIMIT_EXCEEDED", status: 413 }),
    );
  });

  it("writes every metadata-edit field and honors preserveExisting", async () => {
    const fixtures = await getFixtures();
    const source = await sharp(fixtures.baseJpeg)
      .withExif({
        IFD0: {
          Artist: "Original Artist",
          Copyright: "Original Copyright",
          Make: "Original Camera Make",
        },
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    const edited = image(
      await executeRoute("metadata-edit", [part(source, "metadata.jpg")], {
        artist: "Edited Artist",
        copyright: "Edited Copyright",
        description: "Edited Description",
        software: "Image Everything v2",
        capturedAt: "2025-02-03T04:05:06.000Z",
        density: 300,
        preserveExisting: true,
      }),
    );
    expect((await sharp(edited.body).metadata()).density).toBe(300);
    const preserved = await executeRoute(
      "metadata",
      [part(edited.body, "edited.jpg")],
      { includeRaw: true },
    );
    expect(preserved.kind).toBe("json");
    const preservedJson = JSON.stringify(
      preserved.kind === "json" ? preserved.body : {},
    );
    for (const expected of [
      "Edited Artist",
      "Edited Copyright",
      "Edited Description",
      "Image Everything v2",
      "Original Camera Make",
      "2025",
    ]) {
      expect(preservedJson).toContain(expected);
    }

    const replaced = image(
      await executeRoute("metadata-edit", [part(source, "metadata.jpg")], {
        artist: "Replacement Artist",
        preserveExisting: false,
      }),
    );
    const replacedMetadata = await executeRoute(
      "metadata",
      [part(replaced.body, "replaced.jpg")],
      { includeRaw: true },
    );
    const replacedJson = JSON.stringify(
      replacedMetadata.kind === "json" ? replacedMetadata.body : {},
    );
    expect(replacedJson).toContain("Replacement Artist");
    expect(replacedJson).not.toContain("Original Camera Make");
    expect(replacedJson).not.toContain("Original Copyright");
  });

  it("implements metadata privacy, strip, and selected EXIF preservation", async () => {
    const fixtures = await getFixtures();
    for (const [policy, preserve, hasExif] of [
      ["privacy", [], false],
      ["strip-all", [], false],
      ["preserve-selected", ["exif"], true],
    ] as const) {
      const result = image(
        await executeRoute(
          "metadata-clean",
          [part(fixtures.baseJpeg, "meta.jpg")],
          { policy, preserve },
        ),
      );
      expect(Boolean((await sharp(result.body).metadata()).exif)).toBe(hasExif);
    }
  });

  it("preflights an extreme responsive aspect ratio before rendering", async () => {
    const extreme = await sharp({
      create: { width: 1, height: 20_000, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await expect(
      executeRoute("responsive", [part(extreme, "extreme.png")], {
        widths: [20_000],
        formats: ["png"],
        withoutEnlargement: false,
      }),
    ).rejects.toMatchObject({ code: "OUTPUT_LIMIT_EXCEEDED", status: 413 });
  });

  it("applies codec-specific quality controls to every advertised encoder", async () => {
    const fixtures = await getFixtures();
    const capabilities = await getCapabilities();
    for (const format of capabilities.formats.encode) {
      const low = image(
        await executeRoute("compress", [part(fixtures.basePng)], {
          format,
          quality: 20,
          lossless: false,
          effort: 0,
        }),
      );
      const high = image(
        await executeRoute("compress", [part(fixtures.basePng)], {
          format,
          quality: 90,
          lossless: false,
          effort: 0,
        }),
      );
      expect(sniffImageFormat(low.body)).toBe(format);
      expect(sniffImageFormat(high.body)).toBe(format);
      expect(
        low.body.equals(high.body),
        `${format} quality must affect output`,
      ).toBe(false);
    }
  });
});

async function meanRgb(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    sum +=
      (data[offset] ?? 0) + (data[offset + 1] ?? 0) + (data[offset + 2] ?? 0);
  }
  return sum / Math.max(1, info.width * info.height * 3);
}

async function nonBlackBounds(buffer: Buffer): Promise<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}> {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (
        (data[offset] ?? 0) +
          (data[offset + 1] ?? 0) +
          (data[offset + 2] ?? 0) <
        30
      ) {
        continue;
      }
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom };
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  const endSignature = 0x06054b50;
  let endOffset = buffer.length - 22;
  while (endOffset >= 0 && buffer.readUInt32LE(endOffset) !== endSignature) {
    endOffset -= 1;
  }
  if (endOffset < 0) throw new Error("ZIP end-of-central-directory not found");
  const entries = buffer.readUInt16LE(endOffset + 10);
  let centralOffset = buffer.readUInt32LE(endOffset + 16);
  const output = new Map<string, Buffer>();
  for (let index = 0; index < entries; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central-directory entry");
    }
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const filenameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer
      .subarray(centralOffset + 46, centralOffset + 46 + filenameLength)
      .toString("utf8");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("Invalid ZIP local-file entry");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const bodyOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(bodyOffset, bodyOffset + compressedSize);
    const body =
      method === 0
        ? Buffer.from(compressed)
        : method === 8
          ? inflateRawSync(compressed)
          : (() => {
              throw new Error(`Unsupported ZIP compression method ${method}`);
            })();
    output.set(name, body);
    centralOffset += 46 + filenameLength + extraLength + commentLength;
  }
  return output;
}
