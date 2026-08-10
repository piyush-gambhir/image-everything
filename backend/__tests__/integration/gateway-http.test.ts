import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

import type { INestApplication } from "@nestjs/common";
import {
  INPUT_FORMATS,
  LIMITS,
  OUTPUT_FORMATS,
  ProblemSchema,
  TOOL_IDS,
  V1_OPERATION_MAP,
  V2_ROUTE_REGISTRY,
  WorkerCapabilitiesSchema,
  getToolOptionsSchema,
  translateV1Options,
  type ErrorCode,
  type Problem,
  type RouteDefinition,
  type RouteId,
  type V1OperationId,
} from "@image-everything/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "@/app";

const API_KEY = "public-test-key";
const WORKER_TOKEN = "private-worker-test-key";

const VALID_OPTIONS = {
  compress: {},
  "compress-to-size": { targetBytes: 4096 },
  resize: { width: 16 },
  convert: { format: "png" },
  responsive: { widths: [320] },
  "quick-enhance": {},
  crop: { mode: "rectangle", left: 0, top: 0, width: 1, height: 1 },
  rotate: {},
  trim: {},
  extend: { top: 1 },
  alpha: { action: "ensure" },
  adjust: {},
  normalize: { mode: "normalize" },
  filter: { kind: "grayscale" },
  "blur-sharpen": { kind: "blur" },
  pixelate: {},
  watermark: { kind: "image" },
  frame: {},
  collage: {},
  metadata: {},
  "metadata-clean": {},
  "metadata-edit": { artist: "Image Everything" },
  stats: {},
  palette: {},
  histogram: {},
  compare: {},
  "compare-diff": {},
  process: { version: 1, steps: [], output: {} },
  batch: {
    pipeline: { version: 1, steps: [], output: {} },
  },
} satisfies Record<RouteId, unknown>;

const LEGACY_OPTIONS = {
  metadata: {},
  clean: {},
  compress: {},
  resize: { width: 16 },
  convert: { targetFormat: "png" },
  crop: { left: 0, top: 0, width: 1, height: 1 },
  rotate: { angle: 0 },
  watermark: { kind: "image" },
  "auto-enhance": {},
  transform: { ops: [{ op: "rotate", options: { angle: 0 } }] },
  batch: { ops: [{ op: "rotate", options: { angle: 0 } }] },
} satisfies Record<V1OperationId, unknown>;

type Observation = {
  authorization?: string;
  compatibilityKey?: string;
  body: Buffer;
};

describe("Nest public gateway -> private image worker", () => {
  let worker: ReturnType<typeof createServer>;
  let app: INestApplication;
  let apiOrigin: string;
  let workerOrigin: string;
  const observed = new Map<string, Observation>();

  beforeAll(async () => {
    worker = createServer(async (request, response) => {
      await handleFakeWorker(request, response, observed);
    });
    await listen(worker);
    workerOrigin = originFor(worker);

    process.env.IMAGE_WORKER_URL = workerOrigin;
    process.env.IMAGE_WORKER_TOKEN = WORKER_TOKEN;
    process.env.API_KEY = API_KEY;
    process.env.RATE_LIMIT_PER_MINUTE = "1000";

    app = await createApp({ logger: false, requireWorkerConfig: true });
    await app.listen(0, "127.0.0.1");
    apiOrigin = originFor(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await close(worker);
    delete process.env.IMAGE_WORKER_URL;
    delete process.env.IMAGE_WORKER_TOKEN;
    delete process.env.IMAGE_WORKER_DEADLINE_MS;
    delete process.env.API_KEY;
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  it("publishes every explicit v2 POST operation in OpenAPI with bearer auth", async () => {
    const response = await fetch(`${apiOrigin}/api/openapi.json`);
    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      paths: Record<
        string,
        { post?: { security?: Array<Record<string, string[]>> } }
      >;
    };
    const expected = V2_ROUTE_REGISTRY.map((route) => route.path).sort();
    const actual = Object.entries(document.paths)
      .filter(
        ([path, methods]) => path.startsWith("/api/v2/images/") && methods.post,
      )
      .map(([path]) => path)
      .sort();
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(29);
    for (const path of actual) {
      expect(document.paths[path]?.post?.security).toContainEqual({
        "api-key": [],
      });
    }
  });

  it("proxies readiness and schema-valid runtime capabilities through worker auth", async () => {
    const ready = await fetch(`${apiOrigin}/api/ready`);
    expect(ready.status, await ready.clone().text()).toBe(200);
    expect(await ready.json()).toEqual({ status: "ready" });

    const capabilities = await fetch(`${apiOrigin}/api/v2/capabilities`);
    expect(capabilities.status).toBe(200);
    expect(
      WorkerCapabilitiesSchema.parse(await capabilities.json()),
    ).toMatchObject({ apiVersion: "v2", animationSupported: false });
    expect(observed.get("/v2/capabilities")?.authorization).toBe(
      `Bearer ${WORKER_TOKEN}`,
    );
    expect(observed.get("/v2/capabilities")?.compatibilityKey).toBe(
      WORKER_TOKEN,
    );
  });

  for (const definition of V2_ROUTE_REGISTRY) {
    it(`multipart-tests ${definition.method} ${definition.path}`, async () => {
      const response = await postMultipart(
        `${apiOrigin}${definition.path}`,
        formForRoute(definition),
      );
      expect(response.status, await response.clone().text()).toBe(200);
      await expectResult(definition, response);

      const forwarded = observed.get(definition.workerPath);
      expect(forwarded?.authorization).toBe(`Bearer ${WORKER_TOKEN}`);
      expect(forwarded?.compatibilityKey).toBe(WORKER_TOKEN);
      const multipart = forwarded?.body.toString("latin1") ?? "";
      expectMultipartShape(definition.inputKind, multipart);
      const expectedOptions = getToolOptionsSchema(definition.toolId).parse(
        VALID_OPTIONS[definition.id],
      );
      expect(readMultipartJsonField(multipart, "options")).toEqual(
        expectedOptions,
      );
    });
  }

  it("preserves the maximum ZIP entry count including its manifest", async () => {
    const form = new FormData();
    form.append("file", imageBlob("fixture"), "fixture.png");
    form.append(
      "options",
      JSON.stringify({
        widths: [1],
        formats: ["png"],
        filenamePrefix: "max-archive-entries",
      }),
    );
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/responsive`,
      form,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-output-files")).toBe(
      String(LIMITS.maxFiles + 1),
    );
    await response.arrayBuffer();
  });

  it("requires the public bearer credential and emits a contract Problem", async () => {
    const response = await fetch(`${apiOrigin}/api/v2/images/compress`, {
      method: "POST",
      body: formForRoute(routeById("compress")),
    });
    const value = await expectProblem(response, 401, "UNAUTHORIZED");
    expect(value).toMatchObject({
      retryable: false,
      instance: "/api/v2/images/compress",
    });
  });

  it("reports missing inputs with the stable MISSING_INPUT problem", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      new FormData(),
    );
    await expectProblem(response, 400, "MISSING_INPUT");
  });

  it("rejects malformed options JSON before dispatch", async () => {
    observed.delete("/v2/compress");
    const form = new FormData();
    form.append("file", imageBlob("fixture"), "fixture.png");
    form.append("options", "{not-json");
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      form,
    );
    const value = await expectProblem(response, 422, "INVALID_OPTIONS");
    expect(value.errors).toEqual([
      { path: "options", message: "Invalid JSON" },
    ]);
    expect(observed.has("/v2/compress")).toBe(false);
  });

  it("validates each route's shared options schema before dispatch", async () => {
    observed.delete("/v2/resize");
    const form = new FormData();
    form.append("file", imageBlob("fixture"), "fixture.png");
    form.append("options", "{}");
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/resize`,
      form,
    );
    const value = await expectProblem(response, 422, "INVALID_OPTIONS");
    expect(value.errors?.length).toBeGreaterThan(0);
    expect(observed.has("/v2/resize")).toBe(false);
  });

  it("enforces the image-watermark overlay contract", async () => {
    observed.delete("/v2/watermark");
    const form = new FormData();
    form.append("file", imageBlob("fixture"), "fixture.png");
    form.append("options", JSON.stringify({ kind: "image" }));
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/watermark`,
      form,
    );
    await expectProblem(response, 422, "INVALID_OPERATION_COMBINATION");
    expect(observed.has("/v2/watermark")).toBe(false);
  });

  it("enforces the overlay byte limit before worker dispatch", async () => {
    const form = new FormData();
    form.append("file", imageBlob("fixture"), "fixture.png");
    form.append(
      "overlay",
      new Blob([new Uint8Array(LIMITS.maxOverlayBytes + 1)]),
      "large.png",
    );
    form.append("options", JSON.stringify({ kind: "image" }));
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/watermark`,
      form,
    );
    await expectProblem(response, 413, "OVERLAY_TOO_LARGE");
  });

  it("enforces the per-file upload byte limit", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(LIMITS.maxPrimaryUploadBytes + 1)]),
      "too-large.png",
    );
    form.append("options", "{}");
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      form,
    );
    await expectProblem(response, 413, "UPLOAD_TOO_LARGE");
  });

  it("enforces the aggregate multipart byte limit", async () => {
    const form = new FormData();
    const maximumFile = new Blob([
      new Uint8Array(LIMITS.maxPrimaryUploadBytes - 1),
    ]);
    for (let index = 0; index < 4; index += 1) {
      form.append("files", maximumFile, `large-${index}.png`);
    }
    form.append("options", JSON.stringify(VALID_OPTIONS.batch));
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/batch`,
      form,
    );
    await expectProblem(response, 413, "AGGREGATE_TOO_LARGE");
  }, 30_000);

  it("enforces the repeated-file count limit", async () => {
    const form = new FormData();
    for (let index = 0; index <= LIMITS.maxFiles; index += 1) {
      form.append("files", imageBlob(String(index)), `${index}.png`);
    }
    form.append("options", JSON.stringify(VALID_OPTIONS.batch));
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/batch`,
      form,
    );
    await expectProblem(response, 413, "TOO_MANY_FILES");
  });

  it("preserves a schema-valid worker problem without exposing internals", async () => {
    const form = singleForm("worker-problem", {});
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      form,
    );
    const value = await expectProblem(response, 422, "CORRUPT_INPUT");
    expect(value.detail).toBe("The uploaded image is corrupt.");
    expect(value).not.toHaveProperty("stack");
  });

  it("rejects an invalid successful worker content type as 502", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      singleForm("invalid-success", {}),
    );
    const value = await expectProblem(response, 502, "WORKER_BAD_RESPONSE");
    expect(value.retryable).toBe(true);
  });

  it("rejects a schema-invalid successful worker JSON body as 502", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/metadata`,
      singleForm("invalid-json-shape", {}),
    );
    await expectProblem(response, 502, "WORKER_BAD_RESPONSE");
  });

  it("does not expose malformed internal output headers", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      singleForm("invalid-headers", {}),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-output-format")).toBeNull();
    expect(response.headers.get("x-output-width")).toBeNull();
    expect(response.headers.get("x-output-height")).toBeNull();
    expect(response.headers.get("x-output-size")).toBeNull();
    await response.arrayBuffer();
  });

  it("rejects a non-contract worker problem as 502", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/v2/images/compress`,
      singleForm("invalid-problem", {}),
    );
    await expectProblem(response, 502, "WORKER_BAD_RESPONSE");
  });

  it("maps an unavailable private worker to a retryable 503 problem", async () => {
    const original = process.env.IMAGE_WORKER_URL;
    process.env.IMAGE_WORKER_URL = "http://127.0.0.1:1";
    try {
      const response = await postMultipart(
        `${apiOrigin}/api/v2/images/compress`,
        singleForm("fixture", {}),
      );
      const value = await expectProblem(response, 503, "WORKER_UNAVAILABLE");
      expect(value.retryable).toBe(true);
    } finally {
      process.env.IMAGE_WORKER_URL = original;
    }
  });

  it("maps a private worker deadline to a retryable 504 problem", async () => {
    process.env.IMAGE_WORKER_DEADLINE_MS = "25";
    try {
      const response = await postMultipart(
        `${apiOrigin}/api/v2/images/compress`,
        singleForm("slow-worker", {}),
      );
      const value = await expectProblem(response, 504, "EXECUTION_TIMEOUT");
      expect(value.retryable).toBe(true);
    } finally {
      delete process.env.IMAGE_WORKER_DEADLINE_MS;
    }
  });

  for (const operation of Object.keys(LEGACY_OPTIONS) as V1OperationId[]) {
    it(`keeps POST /api/v1/images/${operation} as a translated worker adapter`, async () => {
      const form = legacyForm(operation);
      const response = await postMultipart(
        `${apiOrigin}/api/v1/images/${operation}`,
        form,
      );
      expect(response.status).toBe(200);
      await response.arrayBuffer();

      const mapping = V1_OPERATION_MAP[operation];
      const forwarded = observed.get(`/v2/${mapping.v2Route}`);
      expect(forwarded?.authorization).toBe(`Bearer ${WORKER_TOKEN}`);
      expect(
        readMultipartJsonField(
          forwarded?.body.toString("latin1") ?? "",
          "options",
        ),
      ).toEqual(translateV1Options(operation, LEGACY_OPTIONS[operation]));
    });
  }

  it("preserves the unversioned legacy route alias", async () => {
    const response = await postMultipart(
      `${apiOrigin}/api/images/compress`,
      legacyForm("compress"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
  });
});

function routeById(id: RouteId): RouteDefinition {
  const definition = V2_ROUTE_REGISTRY.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Missing test route ${id}`);
  return definition;
}

function formForRoute(definition: RouteDefinition): FormData {
  const form = new FormData();
  switch (definition.inputKind) {
    case "single":
      form.append("file", imageBlob("fixture"), "fixture.png");
      break;
    case "single-overlay":
      form.append("file", imageBlob("fixture"), "fixture.png");
      form.append("overlay", imageBlob("overlay"), "overlay.png");
      break;
    case "multiple":
      form.append("files", imageBlob("first"), "first.png");
      form.append("files", imageBlob("second"), "second.png");
      break;
    case "compare":
      form.append("file", imageBlob("first"), "first.png");
      form.append("other", imageBlob("other"), "other.png");
      break;
  }
  form.append("options", JSON.stringify(VALID_OPTIONS[definition.id]));
  return form;
}

function legacyForm(operation: V1OperationId): FormData {
  const form = new FormData();
  if (operation === "batch") {
    form.append("files", imageBlob("first"), "first.png");
    form.append("files", imageBlob("second"), "second.png");
  } else {
    form.append("file", imageBlob("fixture"), "fixture.png");
    if (operation === "watermark") {
      form.append("overlay", imageBlob("overlay"), "overlay.png");
    }
  }
  form.append("options", JSON.stringify(LEGACY_OPTIONS[operation]));
  return form;
}

function singleForm(marker: string, options: unknown): FormData {
  const form = new FormData();
  form.append("file", imageBlob(marker), "fixture.png");
  form.append("options", JSON.stringify(options));
  return form;
}

function imageBlob(marker: string): Blob {
  return new Blob([new TextEncoder().encode(`png-${marker}`)], {
    type: "image/png",
  });
}

async function postMultipart(url: string, body: FormData): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body,
  });
}

async function expectResult(
  definition: RouteDefinition,
  response: Response,
): Promise<void> {
  if (definition.resultKind === "json") {
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(fakeJsonResult(definition.id));
    return;
  }
  if (definition.resultKind === "zip") {
    expect(response.headers.get("content-type")).toContain("application/zip");
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 2)
        .toString(),
    ).toBe("PK");
    expect(response.headers.get("content-disposition")).not.toContain("../");
    expect(response.headers.get("x-output-files")).toBe("2");
    return;
  }
  expect(response.headers.get("content-type")).toContain("image/png");
  expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  expect(response.headers.get("content-disposition")).not.toContain("../");
  expect(response.headers.get("x-output-format")).toBe("png");
  expect(response.headers.get("x-output-width")).toBe("1");
  expect(response.headers.get("x-output-height")).toBe("1");
  expect(response.headers.get("x-output-size")).toBe("8");
  expect(response.headers.get("x-image-output-format")).toBeNull();
}

async function expectProblem(
  response: Response,
  status: number,
  code: ErrorCode,
): Promise<Problem> {
  expect(response.headers.get("content-type")).toContain(
    "application/problem+json",
  );
  const value = ProblemSchema.parse(await response.json());
  expect(response.status, JSON.stringify(value)).toBe(status);
  expect(value).toMatchObject({ status, code });
  return value;
}

function expectMultipartShape(
  kind: RouteDefinition["inputKind"],
  multipart: string,
): void {
  if (kind === "single" || kind === "single-overlay") {
    expect(multipart).toContain('name="file"; filename="fixture.png"');
  }
  if (kind === "single-overlay") {
    expect(multipart).toContain('name="overlay"; filename="overlay.png"');
  }
  if (kind === "compare") {
    expect(multipart).toContain('name="file"; filename="first.png"');
    expect(multipart).toContain('name="other"; filename="other.png"');
  }
  if (kind === "multiple") {
    expect(multipart.match(/name="files"/g)).toHaveLength(2);
  }
}

function readMultipartJsonField(body: string, field: string): unknown {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `name="${escaped}"\\r\\n\\r\\n([^\\r]*)\\r\\n--`,
  ).exec(body);
  if (!match?.[1]) throw new Error(`Missing multipart field ${field}`);
  return JSON.parse(match[1]) as unknown;
}

async function handleFakeWorker(
  request: IncomingMessage,
  response: ServerResponse,
  observed: Map<string, Observation>,
): Promise<void> {
  const path = new URL(request.url ?? "/", "http://worker.test").pathname;
  const body = await readBody(request);
  observed.set(path, {
    authorization: request.headers.authorization,
    compatibilityKey:
      typeof request.headers["x-image-worker-key"] === "string"
        ? request.headers["x-image-worker-key"]
        : undefined,
    body,
  });

  if (
    path !== "/health" &&
    request.headers.authorization !== `Bearer ${WORKER_TOKEN}`
  ) {
    return sendProblem(
      response,
      401,
      "UNAUTHORIZED",
      "Unauthorized worker call.",
    );
  }
  if (path === "/health") return sendJson(response, { status: "ok" });
  if (path === "/ready") return sendJson(response, { status: "ready" });
  if (path === "/v2/capabilities") {
    return sendJson(response, fakeCapabilities());
  }

  const bodyText = body.toString("latin1");
  if (bodyText.includes("worker-problem")) {
    return sendProblem(
      response,
      422,
      "CORRUPT_INPUT",
      "The uploaded image is corrupt.",
    );
  }
  if (bodyText.includes("invalid-problem")) {
    response.writeHead(422, { "content-type": "application/problem+json" });
    response.end(
      JSON.stringify({
        status: 422,
        code: "NOT_A_CONTRACT_CODE",
        detail: "private details",
      }),
    );
    return;
  }
  if (bodyText.includes("invalid-success")) {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("not an image");
    return;
  }
  if (bodyText.includes("invalid-json-shape")) {
    return sendJson(response, { privateWorkerValue: "invalid" });
  }
  if (bodyText.includes("slow-worker")) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (response.destroyed) return;
  }

  const definition = V2_ROUTE_REGISTRY.find(
    (candidate) => candidate.workerPath === path,
  );
  if (!definition) {
    return sendProblem(
      response,
      400,
      "MALFORMED_MULTIPART",
      "Unknown worker route.",
    );
  }
  if (definition.resultKind === "json") {
    return sendJson(response, fakeJsonResult(definition.id));
  }
  if (definition.resultKind === "zip") {
    const outputFiles = bodyText.includes("max-archive-entries")
      ? String(LIMITS.maxFiles + 1)
      : "2";
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="../../unsafe.zip"',
      "x-image-output-files": outputFiles,
    });
    response.end(Buffer.from("PK\u0003\u0004fixture"));
    return;
  }

  const invalidHeaders = bodyText.includes("invalid-headers");
  response.writeHead(200, {
    "content-type": "image/png",
    "content-disposition": 'attachment; filename="../../unsafe.png"',
    "x-image-worker-protocol": "2.0",
    "x-image-output-format": invalidHeaders ? "not-an-image" : "png",
    "x-image-output-width": invalidHeaders ? "0" : "1",
    "x-image-output-height": invalidHeaders ? "999999999" : "1",
    "x-image-output-bytes": invalidHeaders ? "-1" : "8",
  });
  response.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function fakeJsonResult(routeId: RouteId): unknown {
  switch (routeId) {
    case "metadata":
      return {
        format: "png",
        width: 1,
        height: 1,
        pages: 1,
        channels: 4,
        hasAlpha: true,
        density: null,
        orientation: null,
        bytes: 8,
        space: "srgb",
        isProgressive: false,
        hasProfile: false,
        categorized: {},
      };
    case "stats":
      return {
        width: 1,
        height: 1,
        space: "srgb",
        channels: [],
        isOpaque: false,
        entropy: 0,
        sharpness: 0,
        dominant: { r: 0, g: 0, b: 0 },
      };
    case "palette":
      return {
        samplePixels: 1,
        colors: [
          {
            hex: "#000000",
            rgb: [0, 0, 0],
            count: 1,
            percentage: 100,
          },
        ],
      };
    case "histogram":
      return {
        mode: "rgb",
        bins: 2,
        pixels: 1,
        channels: { r: [1, 0], g: [1, 0], b: [1, 0] },
      };
    case "compare":
      return {
        width: 1,
        height: 1,
        channels: 4,
        mae: 0,
        rmse: 0,
        differingPixels: 0,
        differingPixelPercentage: 0,
        threshold: 0,
      };
    default:
      throw new Error(`Route ${routeId} has no JSON result fixture`);
  }
}

function fakeCapabilities() {
  return {
    apiVersion: "v2",
    protocolVersion: "2.0",
    workerVersion: "test-worker",
    runtime: {
      node: process.version,
      sharp: "test",
      libvips: "test",
      versions: {},
    },
    codecs: INPUT_FORMATS.map((format) => ({
      format,
      decode: true,
      encode: (OUTPUT_FORMATS as readonly string[]).includes(format),
      runtimeReportedDecode: true,
      runtimeReportedEncode: (OUTPUT_FORMATS as readonly string[]).includes(
        format,
      ),
    })),
    formats: { decode: [...INPUT_FORMATS], encode: [...OUTPUT_FORMATS] },
    operations: TOOL_IDS.map((id) => ({ id, available: true })),
    animationSupported: false,
    limits: LIMITS,
    capabilityFingerprint: "fake-capability-fingerprint",
  };
}

function sendJson(response: ServerResponse, value: unknown): void {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function sendProblem(
  response: ServerResponse,
  status: number,
  code: ErrorCode,
  detail: string,
): void {
  response.writeHead(status, { "content-type": "application/problem+json" });
  response.end(
    JSON.stringify({
      type: `https://image-everything.dev/problems/${code
        .toLowerCase()
        .replaceAll("_", "-")}`,
      title: status === 401 ? "Unauthorized" : "Unprocessable Entity",
      status,
      code,
      detail,
      retryable: false,
    }),
  );
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function originFor(server: { address(): string | AddressInfo | null }): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server did not bind TCP");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function listen(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
