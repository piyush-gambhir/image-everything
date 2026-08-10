import { once } from "node:events";
import type { AddressInfo } from "node:net";

import {
  ProblemSchema,
  V2_ROUTE_REGISTRY,
  WorkerCapabilitiesSchema,
  type RouteId,
} from "@image-everything/contracts";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createImageWorkerServer } from "../src/http";
import { HEIC_PROBE_FIXTURE } from "../src/heic-probe-fixture";
import { getFixtures, type WorkerFixtures } from "./fixtures";

const TOKEN = "private-test-token";
let origin = "";
const server = createImageWorkerServer({ token: TOKEN });
let fixtures: WorkerFixtures;

beforeAll(async () => {
  fixtures = await getFixtures();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

function appendFile(
  form: FormData,
  field: string,
  body: Buffer,
  filename: string,
  type = "image/png",
): void {
  form.append(field, new Blob([new Uint8Array(body)], { type }), filename);
}

function optionsFor(id: RouteId): unknown {
  const options: Record<RouteId, unknown> = {
    compress: { format: "jpeg", quality: 50 },
    "compress-to-size": {
      targetBytes: Math.max(1024, Math.floor(fixtures.baseJpeg.length * 0.9)),
      format: "jpeg",
      minQuality: 1,
      maxQuality: 90,
      maxIterations: 10,
    },
    resize: { width: 50, fit: "inside" },
    convert: { format: "png", lossless: true },
    responsive: { widths: [40, 80], formats: ["png"], filenamePrefix: "http" },
    "quick-enhance": { brightness: 0.9, sharpen: true },
    crop: { mode: "rectangle", left: 0, top: 0, width: 40, height: 30 },
    rotate: { angle: 90 },
    trim: { background: "#ffffff", threshold: 10 },
    extend: { top: 2, right: 2, bottom: 2, left: 2 },
    alpha: { action: "ensure", alpha: 0.8 },
    adjust: { brightness: 0.8, contrast: 0.1 },
    normalize: { mode: "normalize", lower: 1, upper: 99 },
    filter: { kind: "grayscale" },
    "blur-sharpen": { kind: "blur", sigma: 1 },
    pixelate: { blockSize: 8 },
    watermark: { kind: "text", text: "HTTP", anchor: "center" },
    frame: { border: 2, radius: 8, background: "#ff0000" },
    collage: {
      layout: "horizontal",
      cellWidth: 30,
      cellHeight: 20,
      gap: 1,
      padding: 1,
      format: "png",
    },
    metadata: {},
    "metadata-clean": { policy: "strip-all" },
    "metadata-edit": { artist: "HTTP editor" },
    stats: { includeChannels: true },
    palette: { colors: 4, sampleSize: 32 },
    histogram: { mode: "rgb", bins: 16 },
    compare: { threshold: 0 },
    "compare-diff": { threshold: 0, amplify: 4 },
    process: {
      steps: [{ op: "resize", options: { width: 45, fit: "inside" } }],
      output: { format: "png", lossless: true },
    },
    batch: {
      pipeline: { steps: [], output: { format: "jpeg", quality: 60 } },
      continueOnError: true,
      filenamePrefix: "http-batch",
    },
  };
  return options[id];
}

function multipartFor(routeId: RouteId): FormData {
  const route = V2_ROUTE_REGISTRY.find(
    (candidate) => candidate.id === routeId,
  )!;
  const form = new FormData();
  if (route.inputKind === "compare") {
    appendFile(form, "file", fixtures.basePng, "one.png");
    appendFile(form, "other", fixtures.changedPng, "two.png");
  } else if (route.inputKind === "multiple") {
    appendFile(form, "files", fixtures.basePng, "one.png");
    appendFile(form, "files", fixtures.changedPng, "two.png");
  } else {
    const useJpeg =
      routeId === "compress-to-size" ||
      routeId === "metadata" ||
      routeId === "metadata-clean" ||
      routeId === "metadata-edit";
    const useTrim = routeId === "trim";
    appendFile(
      form,
      "file",
      useTrim
        ? fixtures.trimPng
        : useJpeg
          ? fixtures.baseJpeg
          : fixtures.basePng,
      useJpeg ? "fixture.jpg" : "fixture.png",
      useJpeg ? "image/jpeg" : "image/png",
    );
  }
  form.append("options", JSON.stringify(optionsFor(routeId)));
  return form;
}

describe("private image worker HTTP protocol", () => {
  it("exposes public liveness but authenticates readiness", async () => {
    const health = await fetch(`${origin}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    const unauthorized = await fetch(`${origin}/ready`);
    expect(unauthorized.status).toBe(401);
    expect(ProblemSchema.parse(await unauthorized.json())).toMatchObject({
      code: "UNAUTHORIZED",
      retryable: false,
    });

    const wrongToken = await fetch(`${origin}/ready`, {
      headers: { authorization: "Bearer definitely-not-the-worker-token" },
    });
    expect(wrongToken.status).toBe(401);
    expect(wrongToken.headers.get("content-type")).toMatch(
      /^application\/problem\+json/,
    );
    expect(ProblemSchema.parse(await wrongToken.json())).toMatchObject({
      type: "https://image-everything.dev/problems/unauthorized",
      title: "Unauthorized worker request",
      status: 401,
      code: "UNAUTHORIZED",
      detail: "A valid private worker bearer token is required.",
      instance: "/ready",
      retryable: false,
    });

    const ready = await fetch(`${origin}/ready`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(ready.status).toBe(200);
  });

  it("returns runtime-probed authenticated capabilities", async () => {
    const response = await fetch(`${origin}/v2/capabilities`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.status).toBe(200);
    const capabilities = WorkerCapabilitiesSchema.parse(await response.json());
    expect(capabilities.operations).toHaveLength(28);
    expect(
      capabilities.codecs.find((codec) => codec.format === "heic")?.decode,
    ).toBe(true);
    expect(
      capabilities.codecs.find((codec) => codec.format === "heif")?.decode,
    ).toBe(false);
  });

  it("executes advertised HEIC metadata and PNG conversion through multipart", async () => {
    const capabilityResponse = await fetch(`${origin}/v2/capabilities`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    const capabilities = WorkerCapabilitiesSchema.parse(
      await capabilityResponse.json(),
    );
    expect(
      capabilities.codecs.find((codec) => codec.format === "heic")?.decode,
    ).toBe(true);

    const metadataForm = new FormData();
    appendFile(
      metadataForm,
      "file",
      HEIC_PROBE_FIXTURE,
      "probe.heic",
      "image/heic",
    );
    metadataForm.append("options", JSON.stringify({}));
    const metadataResponse = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: metadataForm,
    });
    expect(metadataResponse.status, await metadataResponse.clone().text()).toBe(
      200,
    );
    expect(await metadataResponse.json()).toMatchObject({
      format: "heic",
      width: 64,
      height: 48,
      pages: 1,
    });

    const convertForm = new FormData();
    appendFile(
      convertForm,
      "file",
      HEIC_PROBE_FIXTURE,
      "probe.heic",
      "image/heic",
    );
    convertForm.append("options", JSON.stringify({ format: "png" }));
    const convertResponse = await fetch(`${origin}/v2/convert`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: convertForm,
    });
    expect(convertResponse.status, await convertResponse.clone().text()).toBe(
      200,
    );
    expect(convertResponse.headers.get("content-type")).toMatch(/^image\/png/);
    expect(convertResponse.headers.get("x-image-output-format")).toBe("png");
    const converted = Buffer.from(await convertResponse.arrayBuffer());
    expect(converted.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    await expect(sharp(converted).metadata()).resolves.toMatchObject({
      format: "png",
      width: 64,
      height: 48,
    });
  });

  it.each(V2_ROUTE_REGISTRY)(
    "executes $workerPath through real multipart and validates $resultKind output",
    async (route) => {
      const response = await fetch(`${origin}${route.workerPath}`, {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: multipartFor(route.id),
      });
      expect(response.status, await response.clone().text()).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-image-worker-protocol")).toBe("2.0");

      if (route.resultKind === "json") {
        const body = await response.json();
        expect(body).toBeTypeOf("object");
      } else if (route.resultKind === "zip") {
        const body = Buffer.from(await response.arrayBuffer());
        expect(body.subarray(0, 2).toString("ascii")).toBe("PK");
        expect(body.includes(Buffer.from("manifest.json"))).toBe(true);
        expect(response.headers.get("x-image-output-files")).toMatch(/^\d+$/);
      } else {
        const body = Buffer.from(await response.arrayBuffer());
        const metadata = await sharp(body).metadata();
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        expect(response.headers.get("x-image-output-format")).toBe(
          metadata.format,
        );
        expect(response.headers.get("x-image-output-width")).toBe(
          String(metadata.width),
        );
        expect(response.headers.get("x-image-output-height")).toBe(
          String(metadata.height),
        );
      }
    },
  );

  it("covers image-overlay multipart independently", async () => {
    const form = new FormData();
    appendFile(form, "file", fixtures.basePng, "primary.png");
    appendFile(form, "overlay", fixtures.overlayPng, "overlay.png");
    form.append(
      "options",
      JSON.stringify({
        kind: "image",
        scale: 0.25,
        opacity: 0.5,
        anchor: "center",
      }),
    );
    const response = await fetch(`${origin}/v2/watermark`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: form,
    });
    expect(response.status).toBe(200);
    expect(
      (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width,
    ).toBe(120);
  });

  it("rejects malformed fields, invalid JSON, and MIME spoofing correctly", async () => {
    const wrongField = new FormData();
    appendFile(wrongField, "overlay", fixtures.overlayPng, "unexpected.png");
    appendFile(wrongField, "file", fixtures.basePng, "primary.png");
    wrongField.append("options", JSON.stringify({ width: 20 }));
    const malformed = await fetch(`${origin}/v2/resize`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: wrongField,
    });
    expect(ProblemSchema.parse(await malformed.json())).toMatchObject({
      status: 400,
      code: "MALFORMED_MULTIPART",
    });

    const invalidOptions = new FormData();
    appendFile(invalidOptions, "file", fixtures.basePng, "primary.png");
    invalidOptions.append("options", "{");
    const invalid = await fetch(`${origin}/v2/resize`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: invalidOptions,
    });
    expect(ProblemSchema.parse(await invalid.json())).toMatchObject({
      status: 422,
      code: "INVALID_OPTIONS",
    });

    const spoof = new FormData();
    appendFile(spoof, "file", fixtures.baseJpeg, "spoof.png", "image/png");
    spoof.append("options", "{}");
    const accepted = await fetch(`${origin}/v2/metadata`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: spoof,
    });
    expect(await accepted.json()).toMatchObject({ format: "jpeg" });
  });

  it("enforces a safely capped configured request-byte limit", async () => {
    const limitedServer = createImageWorkerServer({
      token: TOKEN,
      maxRequestBytes: 32,
    });
    limitedServer.listen(0, "127.0.0.1");
    await once(limitedServer, "listening");
    const address = limitedServer.address() as AddressInfo;
    const form = new FormData();
    appendFile(form, "file", fixtures.basePng, "too-large.png");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/v2/metadata`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: form,
      },
    );
    expect(ProblemSchema.parse(await response.json())).toMatchObject({
      status: 413,
      code: "AGGREGATE_TOO_LARGE",
    });
    limitedServer.close();
    await once(limitedServer, "close");
  });
});
