import { describe, expect, it } from "vitest";

import {
  EXTENSION_TOOL_IDS,
  EXTENSION_OPTION_SCHEMAS,
  PixelInspectResultSchema,
  FingerprintResultSchema,
  LIMITS,
  LimitsSchema,
  OPERATION_SCHEMAS,
  PipelineSchema,
  ProblemSchema,
  TOOL_IDS,
  ToolOptionsSchema,
  TOOL_REGISTRY,
  V1_OPERATION_MAP,
  V2_ROUTE_REGISTRY,
  WorkerCapabilitiesSchema,
  getToolOptionsSchema,
  translateV1Options,
} from "../src";

describe("v2 contract registry", () => {
  it("contains exactly 57 tools and 58 unique POST routes", () => {
    expect(TOOL_IDS).toHaveLength(57);
    expect(TOOL_REGISTRY).toHaveLength(57);
    expect(V2_ROUTE_REGISTRY).toHaveLength(58);
    expect(new Set(TOOL_IDS).size).toBe(57);
    expect(new Set(V2_ROUTE_REGISTRY.map((route) => route.id)).size).toBe(58);
    expect(new Set(V2_ROUTE_REGISTRY.map((route) => route.path)).size).toBe(58);
    expect(V2_ROUTE_REGISTRY.every((route) => route.method === "POST")).toBe(
      true,
    );
  });

  it("publishes an options schema for every tool", () => {
    expect(Object.keys(OPERATION_SCHEMAS).sort()).toEqual([...TOOL_IDS].sort());
    for (const id of TOOL_IDS) expect(getToolOptionsSchema(id)).toBeDefined();
  });

  it("accepts the codec tools through the public discriminated options contract", () => {
    for (const [tool, options] of [
      ["decode", {}],
      ["encode", { width: 1, height: 1 }],
      ["to-base64", { dataUrl: true }],
      ["from-base64", {}],
      ["validate", {}],
    ]) {
      expect(
        ToolOptionsSchema.safeParse({ tool, options }).success,
        String(tool),
      ).toBe(true);
    }
  });

  it.each(EXTENSION_TOOL_IDS)(
    "exposes complete defaults for %s through the public options union",
    (tool) => {
      const options = EXTENSION_OPTION_SCHEMAS[tool].parse({});
      expect(ToolOptionsSchema.parse({ tool, options })).toEqual({
        tool,
        options,
      });
      const route = V2_ROUTE_REGISTRY.find((entry) => entry.id === tool)!;
      expect(route.toolId).toBe(tool);
      expect(route.path).toBe(`/api/v2/images/${tool}`);
      expect(route.inputKind).toBe(
        tool === "sprite-sheet" ? "multiple" : "single",
      );
      expect(route.resultKind).toBe(
        ["slice", "sprite-sheet", "icon-set"].includes(tool)
          ? "zip"
          : ["pixel-inspect", "fingerprint"].includes(tool)
            ? "json"
            : "image",
      );
    },
  );

  it.each([
    ["color-space", { space: "cmyk", format: "png" }],
    ["levels", { black: 100, white: 100 }],
    ["color-matrix", { matrix: [1, 0, 0] }],
    ["convolve", { preset: "custom", scale: 0 }],
    ["affine", { a: 1, b: 1, c: 1, d: 1 }],
    ["slice", { columns: 10, rows: 10 }],
    ["icon-set", { sizes: [16, 16] }],
    ["icon-set", { sizes: [512], includeIco: true }],
    ["redact", { regions: [] }],
    ["noise", { seed: -1 }],
    ["pixel-inspect", { x: -1 }],
    ["chroma-key", { tolerance: 443 }],
  ] as const)(
    "rejects invalid %s options at the shared boundary",
    (tool, options) => {
      expect(EXTENSION_OPTION_SCHEMAS[tool].safeParse(options).success).toBe(
        false,
      );
      expect(ToolOptionsSchema.safeParse({ tool, options }).success).toBe(
        false,
      );
    },
  );

  it("preserves matrix zeros, negatives, repeated values and region coordinates", () => {
    const matrix = [1, 0, -1, 0, 1, 0, -1, 0, 1];
    expect(
      EXTENSION_OPTION_SCHEMAS["color-matrix"].parse({ matrix }).matrix,
    ).toEqual(matrix);
    const regions = [{ left: 0, top: 0, width: 1, height: 1 }];
    expect(EXTENSION_OPTION_SCHEMAS.redact.parse({ regions }).regions).toEqual(
      regions,
    );
  });

  it("validates new JSON results without imposing output-image edge caps on analysis", () => {
    expect(
      PixelInspectResultSchema.parse({
        x: 25000,
        y: 0,
        width: 30000,
        height: 1,
        rgba: [0, 128, 255, 64],
        hex: "#0080ff40",
      }).width,
    ).toBe(30000);
    expect(
      FingerprintResultSchema.safeParse({
        algorithm: "difference",
        hash: "0".repeat(16),
        sha256: "a".repeat(64),
        width: 30000,
        height: 1,
      }).success,
    ).toBe(true);
    expect(
      FingerprintResultSchema.safeParse({
        algorithm: "difference",
        hash: "invalid",
        sha256: "a".repeat(64),
        width: 1,
        height: 1,
      }).success,
    ).toBe(false);
  });

  it("populates all terminal pipeline defaults under Zod 4", () => {
    const parsed = PipelineSchema.parse({ steps: [] });
    expect(parsed.output).toMatchObject({
      format: "auto",
      quality: 80,
      lossless: false,
      metadata: "strip",
    });
    expect(parsed.steps).toEqual([]);
  });

  it("rejects an invalid pipeline combination at schema boundaries", () => {
    expect(() =>
      PipelineSchema.parse({
        steps: Array.from({ length: LIMITS.maxPipelineSteps + 1 }, () => ({
          op: "filter",
          options: { kind: "grayscale" },
        })),
      }),
    ).toThrow();
  });

  it("publishes the 100 MiB aggregate output cap through the typed limits contract", () => {
    expect(LIMITS.maxAggregateOutputBytes).toBe(100 * 1024 * 1024);
    expect(LimitsSchema.parse(LIMITS).maxAggregateOutputBytes).toBe(
      LIMITS.maxAggregateOutputBytes,
    );
  });

  it("translates v1 operations and terminal transform settings", () => {
    expect(V1_OPERATION_MAP.clean.v2Route).toBe("metadata/clean");
    expect(V1_OPERATION_MAP["auto-enhance"].v2Route).toBe("quick-enhance");
    expect(
      translateV1Options("transform", {
        ops: [
          { op: "resize", options: { width: 320 } },
          { op: "convert", options: { targetFormat: "png" } },
          { op: "compress", options: { quality: 72 } },
        ],
      }),
    ).toMatchObject({
      steps: [{ op: "resize", options: { width: 320 } }],
      output: { format: "png", quality: 72 },
    });
  });

  it("uses exact problem and capability contracts", () => {
    expect(
      ProblemSchema.parse({
        type: "https://image-everything.dev/problems/missing-input",
        title: "Missing image input",
        status: 400,
        code: "MISSING_INPUT",
        detail: "Missing file",
        retryable: false,
        errors: [{ path: "file", message: "Required" }],
      }).errors,
    ).toHaveLength(1);

    expect(() =>
      WorkerCapabilitiesSchema.parse({ apiVersion: "v2" }),
    ).toThrow();
  });
});
