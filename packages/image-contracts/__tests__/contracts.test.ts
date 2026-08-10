import { describe, expect, it } from "vitest";

import {
  LIMITS,
  LimitsSchema,
  OPERATION_SCHEMAS,
  PipelineSchema,
  ProblemSchema,
  TOOL_IDS,
  TOOL_REGISTRY,
  V1_OPERATION_MAP,
  V2_ROUTE_REGISTRY,
  WorkerCapabilitiesSchema,
  getToolOptionsSchema,
  translateV1Options,
} from "../src";

describe("v2 contract registry", () => {
  it("contains exactly 28 tools and 29 unique POST routes", () => {
    expect(TOOL_IDS).toHaveLength(28);
    expect(TOOL_REGISTRY).toHaveLength(28);
    expect(V2_ROUTE_REGISTRY).toHaveLength(29);
    expect(new Set(TOOL_IDS).size).toBe(28);
    expect(new Set(V2_ROUTE_REGISTRY.map((route) => route.id)).size).toBe(29);
    expect(new Set(V2_ROUTE_REGISTRY.map((route) => route.path)).size).toBe(29);
    expect(V2_ROUTE_REGISTRY.every((route) => route.method === "POST")).toBe(
      true,
    );
  });

  it("publishes an options schema for every tool", () => {
    expect(Object.keys(OPERATION_SCHEMAS).sort()).toEqual([...TOOL_IDS].sort());
    for (const id of TOOL_IDS) expect(getToolOptionsSchema(id)).toBeDefined();
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
