#!/usr/bin/env node

import { createServer } from "node:net";
import { spawn } from "node:child_process";
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { deflateSync, inflateRawSync } from "node:zlib";

// A smooth, bounded-range RGB fixture makes every tonal/effect smoke observable,
// while its uniform four-pixel border gives trim a deterministic target.
const FIXTURE_A = createPngFixture("a");
const FIXTURE_B = createPngFixture("b");
const HEIC_FIXTURE = Buffer.from(
  "AAAAJGZ0eXBoZWljAAAAAG1pZjFNaVBybWlhZk1pSEJoZWljAAABw21ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAADnBpdG0AAAAAAAEAAAA4aWluZgAAAAAAAgAAABVpbmZlAgAAAAABAABodmMxAAAAABVpbmZlAgAAAQACAABFeGlmAAAAABppcmVmAAAAAAAAAA5jZHNjAAIAAQABAAAA5mlwcnAAAADFaXBjbwAAABNjb2xybmNseAACAAIABoAAAAAMY2xsaQDLAEAAAAAUaXNwZQAAAAAAAABAAAAAMAAAAAlpcm90AAAAABBwaXhpAAAAAAMICAgAAABxaHZjQwEDcAAAALAAAAAAAB7wAPz9+PgAAAsDoAABABdAAQwB//8DcAAAAwCwAAADAAADAB5wJKEAAQAjQgEBA3AAAAMAsAAAAwAAAwAeoBQgQcGMTiHuRZVNwICBgCCiAAEACUQBwGcshEU2QAAAABlpcG1hAAAAAAAAAAEAAQaBAgMFhoQAAAAsaWxvYwAAAABEAAACAAEAAAABAAACRQAAAdsAAgAAAAEAAAH3AAAATgAAAAFtZGF0AAAAAAAAAjkAAAAGRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAMAAAAAAAAAHXKAGvoTWY6/6m+9IY7/OQSdHWmIamgriCskQe13ZX5UD/DDtGqx+ddkN+YuspAB7xZ7TwsfUd4+7pDVTB3lghjPD2bCYZdx76GOHkwH9SD2VFXMHr2t6sTUT3GEJLPlvaOeM+LgehGw5BgPC7fxlOFU9sxUubTRgqjhDTrfLQfOzvZc14DZVoKUsRGJDH9q55TvMu64eLLsm+vTmsHgH4qEzQWuvIItbPJooOP0vLQPxkHVo3PRgMV2cc5Xc/57jsVV/Rl65EzNwjVzj0QB5sGPGXYxsYchBwYoXwSpH/bDatj7WnId1gWHi1yQor9HXXnXwKtMunOoBpS/PuQ55auvPbxLEjawNn4mXDd9vGlbMaGTeyUtY382s2iCqlc8G4SJVm+r4Z0n9Hx/LV2/6XCkWAANQpcbMWTPd3f4RFTo7u0noewGSDClDgjaLn4eiocvxDHy3PaPj///6y13OqIHdUjZUv8FG1H+sIBB/G4T/nWc7qokXBL9TbUfG7WUiB00LkqAUTXjZN/cefXOnx7RetbJ42kVRLLCa+rTriOEkX2HJ1SHT9ZiwDxPwmyqF/N/qFzO6YsQF8a6uyRrM2JEZr90cjk2iNkTxv7kNg11RG9UTUpYLq",
  "base64",
);

const PIPELINE = {
  version: 1,
  steps: [
    {
      id: "resize-smoke",
      enabled: true,
      op: "resize",
      options: { width: 48, height: 36, fit: "fill" },
    },
    {
      id: "filter-smoke",
      enabled: true,
      op: "filter",
      options: { kind: "grayscale" },
    },
  ],
  output: { format: "webp", quality: 78, metadata: "strip" },
};

const TOOL_CASES = [
  imageCase("compress", "/api/v2/images/compress", {
    format: "webp",
    quality: 72,
  }),
  imageCase("compress-to-size", "/api/v2/images/compress-to-size", {
    targetBytes: 2048,
    format: "jpeg",
    minQuality: 20,
    maxQuality: 90,
  }),
  imageCase("resize", "/api/v2/images/resize", {
    width: 48,
    height: 36,
    fit: "fill",
  }),
  imageCase("convert", "/api/v2/images/convert", {
    format: "webp",
    quality: 80,
  }),
  zipCase("responsive", "/api/v2/images/responsive", {
    widths: [24, 48],
    formats: ["jpeg", "webp"],
    quality: 75,
    filenamePrefix: "smoke",
  }),
  imageCase("quick-enhance", "/api/v2/images/quick-enhance", {
    normalize: true,
    brightness: 1.05,
    saturation: 1.1,
    hue: 5,
    sharpen: true,
  }),
  imageCase("crop", "/api/v2/images/crop", {
    mode: "rectangle",
    left: 4,
    top: 4,
    width: 40,
    height: 30,
  }),
  imageCase("rotate", "/api/v2/images/rotate", {
    angle: 15,
    flipHorizontal: true,
    flipVertical: false,
    background: "#ffffff",
  }),
  imageCase("trim", "/api/v2/images/trim", {
    threshold: 10,
    lineArt: false,
  }),
  imageCase("extend", "/api/v2/images/extend", {
    top: 2,
    right: 3,
    bottom: 4,
    left: 5,
    mode: "background",
    background: "#112233",
  }),
  imageCase("alpha", "/api/v2/images/alpha", {
    action: "ensure",
    alpha: 0.8,
  }),
  imageCase("adjust", "/api/v2/images/adjust", {
    brightness: 1.05,
    saturation: 1.1,
    hue: 5,
    contrast: 0.1,
    gamma: 1.1,
  }),
  imageCase("normalize", "/api/v2/images/normalize", {
    mode: "normalize",
    lower: 1,
    upper: 99,
  }),
  imageCase("filter", "/api/v2/images/filter", {
    kind: "grayscale",
  }),
  imageCase("blur-sharpen", "/api/v2/images/blur-sharpen", {
    kind: "blur",
    sigma: 1,
  }),
  imageCase("pixelate", "/api/v2/images/pixelate", {
    blockSize: 7,
  }),
  imageCase(
    "watermark",
    "/api/v2/images/watermark",
    {
      kind: "image",
      opacity: 0.55,
      anchor: "bottom-right",
      offsetX: 0,
      offsetY: 0,
      scale: 0.2,
    },
    "overlay",
  ),
  imageCase("frame", "/api/v2/images/frame", {
    border: 3,
    color: "#ffffff",
    radius: 6,
    background: "#00000000",
  }),
  multiImageCase("collage", "/api/v2/images/collage", {
    layout: "grid",
    columns: 2,
    cellWidth: 48,
    cellHeight: 36,
    fit: "contain",
    gap: 2,
    padding: 2,
    background: "#ffffff",
    format: "png",
    quality: 80,
  }),
  jsonCase("metadata", "/api/v2/images/metadata", {
    includeRaw: false,
    includeGps: true,
  }),
  imageCase("metadata-clean", "/api/v2/images/metadata/clean", {
    policy: "privacy",
    preserve: [],
  }),
  imageCase("metadata-edit", "/api/v2/images/metadata/edit", {
    artist: "Image Everything smoke test",
    description: "v2 endpoint verification",
    preserveExisting: false,
  }),
  jsonCase("stats", "/api/v2/images/analyze/stats", {
    includeChannels: true,
  }),
  jsonCase("palette", "/api/v2/images/analyze/palette", {
    colors: 4,
    sampleSize: 32,
  }),
  jsonCase("histogram", "/api/v2/images/analyze/histogram", {
    mode: "rgb",
    bins: 16,
  }),
  dualJsonCase("compare", "/api/v2/images/analyze/compare", {
    resize: "error",
    threshold: 8,
    includeAlpha: true,
    amplify: 4,
  }),
  dualImageCase("compare-diff", "/api/v2/images/analyze/compare/diff", {
    resize: "error",
    threshold: 8,
    includeAlpha: true,
    amplify: 4,
  }),
  imageCase("process", "/api/v2/images/process", PIPELINE),
  multiZipCase("batch", "/api/v2/images/batch", {
    pipeline: PIPELINE,
    continueOnError: true,
    filenamePrefix: "smoke",
  }),
];

const SAME_SIZE_PIXEL_EXPECTATIONS = new Map([
  ["compress", "changed"],
  ["compress-to-size", "changed"],
  ["convert", "changed"],
  ["quick-enhance", "changed"],
  ["alpha", "changed"],
  ["adjust", "changed"],
  ["normalize", "changed"],
  ["filter", "changed"],
  ["blur-sharpen", "changed"],
  ["pixelate", "changed"],
  ["watermark", "changed"],
  ["compare-diff", "changed"],
  ["metadata-clean", "unchanged"],
  ["metadata-edit", "unchanged"],
]);

const FORMAT_MIME = Object.freeze({
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  tiff: "image/tiff",
});

const FORMAT_EXTENSION = Object.freeze({
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  gif: "gif",
  tiff: "tiff",
});

const TOOL_SLUGS = [
  "compress",
  "compress-to-size",
  "resize",
  "convert",
  "responsive-set",
  "quick-enhance",
  "crop",
  "rotate-flip",
  "trim",
  "extend-pad",
  "background-alpha",
  "adjust-color",
  "normalize-clahe",
  "filters",
  "blur-sharpen-median",
  "pixelate",
  "watermark",
  "frame-rounded-corners",
  "collage-contact-sheet",
  "metadata-inspector",
  "metadata-cleaner",
  "metadata-editor",
  "image-statistics",
  "palette",
  "histogram",
  "compare",
  "pipeline",
  "batch",
];

const children = [];
const logs = new Map();
const temporaryDirectories = [];
let apiOrigin = "";

try {
  assertSmokeCatalog();
  const [workerPort, apiPort, webPort] = await Promise.all([
    freePort(),
    freePort(),
    freePort(),
  ]);
  const workerOrigin = `http://127.0.0.1:${workerPort}`;
  apiOrigin = `http://127.0.0.1:${apiPort}`;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  const workerToken = "image-everything-smoke-worker";
  const apiKey = "image-everything-smoke-api";

  children.push(
    start("worker", ["--filter", "@image-everything/image-worker", "start"], {
      PORT: String(workerPort),
      IMAGE_WORKER_PORT: String(workerPort),
      IMAGE_WORKER_TOKEN: workerToken,
    }),
  );
  await waitFor(`${workerOrigin}/health`, {
    headers: workerHeaders(workerToken),
  });

  children.push(
    start("api", ["--filter", "@image-everything/backend", "start"], {
      PORT: String(apiPort),
      API_KEY: apiKey,
      CORS_ORIGIN: webOrigin,
      IMAGE_WORKER_URL: workerOrigin,
      IMAGE_WORKER_TOKEN: workerToken,
      IMAGE_WORKER_DEADLINE_MS: "30000",
    }),
  );
  await waitFor(`${apiOrigin}/api/ready`);

  children.push(
    start("web", ["--filter", "@image-everything/web", "start"], {
      PORT: String(webPort),
      NEXT_PUBLIC_API_URL: apiOrigin,
      NEXT_PUBLIC_APP_URL: webOrigin,
    }),
  );
  await waitFor(webOrigin);

  await verifyAuth(apiOrigin);
  const capabilities = await verifyCapabilities(apiOrigin);
  await verifyAdvertisedCodecs(apiOrigin, apiKey, capabilities);

  let completed = 0;
  for (const testCase of TOOL_CASES) {
    const response = await invoke(apiOrigin, apiKey, testCase);
    await validateResult(apiOrigin, apiKey, testCase, response);
    completed += 1;
    process.stdout.write(`✓ API + worker: ${testCase.name}\n`);
  }

  await verifyInvalidInput(apiOrigin, apiKey);
  await verifyWeb(webOrigin);
  await verifyBrowserFlows({ webOrigin, apiOrigin, apiKey });
  process.stdout.write(
    `\nImage Everything v2 smoke passed: ${completed} API routes, ${TOOL_SLUGS.length} UI route renders, 3 real browser workflows, auth, capabilities, and invalid-input handling.\n`,
  );
} catch (error) {
  for (const [name, output] of logs) {
    if (output.length > 0) {
      process.stderr.write(
        `\n--- ${name} (recent output) ---\n${output.slice(-8_000)}\n`,
      );
    }
  }
  throw error;
} finally {
  await Promise.all(children.map(stop));
  for (const directory of temporaryDirectories) {
    try {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          ["EBUSY", "ENOTEMPTY", "EPERM"].includes(error.code)
        )
      ) {
        throw error;
      }
      process.stderr.write(
        `warning: Chrome profile cleanup will be left to the operating system: ${directory}\n`,
      );
    }
  }
}

function imageCase(name, path, options, extraField) {
  return {
    name,
    path,
    options,
    input: extraField ? "overlay" : "single",
    result: "image",
  };
}

function jsonCase(name, path, options) {
  return { name, path, options, input: "single", result: "json" };
}

function zipCase(name, path, options) {
  return { name, path, options, input: "single", result: "zip" };
}

function dualJsonCase(name, path, options) {
  return { name, path, options, input: "dual", result: "json" };
}

function dualImageCase(name, path, options) {
  return { name, path, options, input: "dual", result: "image" };
}

function multiImageCase(name, path, options) {
  return { name, path, options, input: "multi", result: "image" };
}

function multiZipCase(name, path, options) {
  return { name, path, options, input: "multi", result: "zip" };
}

function assertSmokeCatalog() {
  const names = new Set(TOOL_CASES.map((testCase) => testCase.name));
  const paths = new Set(TOOL_CASES.map((testCase) => testCase.path));
  if (TOOL_CASES.length !== 29 || names.size !== 29 || paths.size !== 29) {
    throw new Error(
      "Smoke catalog must contain exactly 29 uniquely named public API routes",
    );
  }
  if (TOOL_SLUGS.length !== 28 || new Set(TOOL_SLUGS).size !== 28) {
    throw new Error(
      "Smoke catalog must contain exactly 28 unique canonical UI routes",
    );
  }
}

function start(name, args, extraEnv) {
  const child = spawn("pnpm", args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  logs.set(name, "");
  const capture = (chunk) => {
    const current = `${logs.get(name) ?? ""}${chunk.toString()}`;
    logs.set(name, current.slice(-16_000));
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      logs.set(
        name,
        `${logs.get(name) ?? ""}\nExited with ${code} (${signal ?? "no signal"})`,
      );
    }
  });
  return child;
}

async function stop(child) {
  if (!child) return;
  if (child.exitCode === null) {
    if (!child.killed) child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not reserve a smoke port");
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitFor(url, init = {}) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
  );
}

function workerHeaders(token) {
  return { Authorization: `Bearer ${token}`, "x-image-worker-key": token };
}

function apiHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function invoke(origin, apiKey, testCase) {
  const form = new FormData();
  if (testCase.input === "multi") {
    appendFile(form, "files", FIXTURE_A, "quadrants-a.png");
    appendFile(form, "files", FIXTURE_B, "quadrants-b.png");
  } else {
    appendFile(form, "file", FIXTURE_A, "quadrants-a.png");
    if (testCase.input === "dual")
      appendFile(form, "other", FIXTURE_B, "quadrants-b.png");
    if (testCase.input === "overlay")
      appendFile(form, "overlay", FIXTURE_B, "overlay.png");
  }
  form.append("options", JSON.stringify(testCase.options));
  return fetch(`${origin}${testCase.path}`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: form,
  });
}

function appendFile(form, field, bytes, filename, contentType = "image/png") {
  form.append(field, new Blob([bytes], { type: contentType }), filename);
}

async function validateResult(origin, apiKey, testCase, response) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${testCase.name} returned ${response.status}: ${body}`);
  }
  assertToolResponseHeaders(testCase.name, response);

  if (testCase.result === "json") {
    const contentType = normalizedContentType(response);
    if (!contentType.includes("application/json")) {
      throw new Error(`${testCase.name} returned unexpected ${contentType}`);
    }
    const value = await response.json();
    if (
      !value ||
      typeof value !== "object" ||
      Object.keys(value).length === 0
    ) {
      throw new Error(`${testCase.name} returned an empty JSON result`);
    }
    assertJsonSemantics(testCase.name, value);
    return;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0)
    throw new Error(`${testCase.name} returned an empty body`);
  if (testCase.result === "zip") {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error(`${testCase.name} did not return a ZIP signature`);
    }
    await assertArchiveSemantics(
      origin,
      apiKey,
      testCase.name,
      bytes,
      response,
    );
    return;
  }

  const contentType = normalizedContentType(response);
  assertImageSignature(bytes, contentType, testCase.name);
  assertAttachmentHeader(response, testCase.name);
  assertByteHeaders(response, testCase.name, bytes.length);
  const info = await inspectImageBytes(
    origin,
    apiKey,
    bytes,
    contentType,
    `result-${testCase.name}`,
  );
  assertImageSemantics(testCase, bytes, info);
  assertImageOutputHeaders(response, testCase.name, info);
  await assertPixelRelationship(
    origin,
    apiKey,
    testCase.name,
    bytes,
    contentType,
  );
}

async function inspectImageBytes(origin, apiKey, bytes, contentType, name) {
  const metadata = new FormData();
  metadata.append(
    "file",
    new Blob([bytes], { type: contentType || "application/octet-stream" }),
    name,
  );
  metadata.append(
    "options",
    JSON.stringify({ includeRaw: false, includeGps: false }),
  );
  const inspected = await fetch(`${origin}/api/v2/images/metadata`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: metadata,
  });
  if (!inspected.ok) {
    throw new Error(
      `${name} returned bytes the metadata endpoint could not decode`,
    );
  }
  assertToolResponseHeaders(`${name} metadata inspection`, inspected);
  if (normalizedContentType(inspected) !== "application/json") {
    throw new Error(`${name} metadata inspection did not return JSON`);
  }
  const info = await inspected.json();
  if (!(Number(info.width) > 0 && Number(info.height) > 0)) {
    throw new Error(`${name} output has invalid dimensions`);
  }
  return info;
}

function normalizedContentType(response) {
  return (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function assertToolResponseHeaders(name, response) {
  const cache = response.headers.get("cache-control") ?? "";
  if (!cache.toLowerCase().includes("no-store")) {
    throw new Error(`${name} omitted Cache-Control: no-store`);
  }
  if (
    response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff"
  ) {
    throw new Error(`${name} omitted X-Content-Type-Options: nosniff`);
  }
  if (response.headers.get("x-image-worker-protocol") !== "2.0") {
    throw new Error(`${name} omitted the v2 worker protocol header`);
  }
  const fingerprint =
    response.headers.get("x-image-capability-fingerprint") ?? "";
  if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
    throw new Error(`${name} omitted a valid runtime capability fingerprint`);
  }
}

function assertAttachmentHeader(response, name) {
  const disposition = response.headers.get("content-disposition") ?? "";
  if (
    !/^attachment;/i.test(disposition) ||
    !/filename(?:\*|)=/i.test(disposition)
  ) {
    throw new Error(`${name} omitted a safe attachment filename`);
  }
  if (/[\r\n\\]/.test(disposition)) {
    throw new Error(`${name} returned an unsafe Content-Disposition header`);
  }
}

function unsignedHeader(response, header, name) {
  const raw = response.headers.get(header) ?? "";
  if (!/^(?:0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new Error(`${name} omitted a valid ${header} header`);
  }
  return Number(raw);
}

function assertByteHeaders(response, name, bytes) {
  if (unsignedHeader(response, "content-length", name) !== bytes) {
    throw new Error(`${name} Content-Length does not match its response body`);
  }
  if (unsignedHeader(response, "x-output-size", name) !== bytes) {
    throw new Error(`${name} X-Output-Size does not match its response body`);
  }
}

function assertImageOutputHeaders(response, name, info) {
  if (unsignedHeader(response, "x-output-width", name) !== info.width) {
    throw new Error(`${name} X-Output-Width does not match decoded output`);
  }
  if (unsignedHeader(response, "x-output-height", name) !== info.height) {
    throw new Error(`${name} X-Output-Height does not match decoded output`);
  }
  const format = response.headers.get("x-output-format") ?? "";
  if (format !== info.format) {
    throw new Error(
      `${name} X-Output-Format ${format || "<missing>"} does not match ${info.format}`,
    );
  }
  const expectedMime = FORMAT_MIME[format];
  if (!expectedMime || normalizedContentType(response) !== expectedMime) {
    throw new Error(
      `${name} Content-Type does not match its decoded ${format} output`,
    );
  }
  const extension = FORMAT_EXTENSION[format];
  if (
    !response.headers
      .get("content-disposition")
      ?.toLowerCase()
      .includes(`.${extension}`)
  ) {
    throw new Error(
      `${name} attachment filename does not use the ${extension} extension`,
    );
  }
}

async function assertPixelRelationship(
  origin,
  apiKey,
  name,
  output,
  contentType,
) {
  const expectation = SAME_SIZE_PIXEL_EXPECTATIONS.get(name);
  if (!expectation) return;

  const form = new FormData();
  appendFile(form, "file", FIXTURE_A, "pixel-baseline.png");
  appendFile(form, "other", output, `pixel-output-${name}`, contentType);
  form.append(
    "options",
    JSON.stringify({
      resize: "error",
      threshold: 0,
      includeAlpha: true,
      amplify: 1,
    }),
  );
  const response = await fetch(`${origin}/api/v2/images/analyze/compare`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: form,
  });
  if (!response.ok) {
    throw new Error(
      `${name} pixel verification returned ${response.status}: ${await response.text()}`,
    );
  }
  assertToolResponseHeaders(`${name} pixel verification`, response);
  if (normalizedContentType(response) !== "application/json") {
    throw new Error(`${name} pixel verification did not return JSON`);
  }
  const comparison = await response.json();
  if (
    comparison.width !== 64 ||
    comparison.height !== 48 ||
    comparison.channels !== 4 ||
    comparison.threshold !== 0 ||
    !Number.isFinite(comparison.mae) ||
    !Number.isFinite(comparison.rmse) ||
    !Number.isInteger(comparison.differingPixels) ||
    comparison.differingPixels < 0 ||
    comparison.differingPixels > 64 * 48
  ) {
    throw new Error(
      `${name} pixel verification returned invalid comparison metrics`,
    );
  }

  const changed =
    comparison.mae > 0 &&
    comparison.rmse > 0 &&
    comparison.differingPixels > 0 &&
    comparison.differingPixelPercentage > 0;
  const unchanged =
    comparison.mae === 0 &&
    comparison.rmse === 0 &&
    comparison.differingPixels === 0 &&
    comparison.differingPixelPercentage === 0;
  if (expectation === "changed" && !changed) {
    throw new Error(
      `${name} returned a valid image but did not change any source pixels`,
    );
  }
  if (expectation === "unchanged" && !unchanged) {
    throw new Error(
      `${name} unexpectedly changed pixels while editing metadata only`,
    );
  }
}

function assertJsonSemantics(name, value) {
  if (name === "metadata") {
    if (value.format !== "png" || value.width !== 64 || value.height !== 48) {
      throw new Error("Metadata inspector returned incorrect core properties");
    }
    if (!value.categorized || typeof value.categorized !== "object") {
      throw new Error("Metadata inspector omitted categorized metadata");
    }
  } else if (name === "stats") {
    if (value.width !== 64 || value.height !== 48 || !(value.entropy > 0)) {
      throw new Error("Statistics result omitted image measurements");
    }
    if (!Array.isArray(value.channels) || value.channels.length === 0) {
      throw new Error(
        "Statistics result omitted requested channel measurements",
      );
    }
  } else if (name === "palette") {
    if (
      !Array.isArray(value.colors) ||
      value.colors.length < 2 ||
      !(value.samplePixels > 0)
    ) {
      throw new Error("Palette result did not contain sampled colors");
    }
    for (const color of value.colors) {
      if (!/^#[0-9a-f]{6}$/i.test(color.hex) || !(color.percentage >= 0)) {
        throw new Error("Palette returned an invalid color entry");
      }
    }
  } else if (name === "histogram") {
    if (value.mode !== "rgb" || value.bins !== 16 || value.pixels !== 64 * 48) {
      throw new Error("Histogram returned incorrect dimensions or bin count");
    }
    for (const channel of ["red", "green", "blue"]) {
      const bins = value.channels?.[channel];
      if (!Array.isArray(bins) || bins.length !== 16) {
        throw new Error(`Histogram omitted ${channel} bins`);
      }
      if (bins.reduce((sum, count) => sum + count, 0) !== value.pixels) {
        throw new Error(
          `Histogram ${channel} bins do not total the pixel count`,
        );
      }
    }
  } else if (name === "compare") {
    if (
      value.width !== 64 ||
      value.height !== 48 ||
      !(value.mae > 0) ||
      !(value.rmse > 0) ||
      !(value.differingPixels > 0) ||
      !(value.differingPixelPercentage > 0)
    ) {
      throw new Error("Compare metrics did not detect the different fixture");
    }
  }
}

function assertImageSemantics(testCase, bytes, info) {
  const { name } = testCase;
  const exactDimensions = {
    compress: [64, 48],
    "compress-to-size": [64, 48],
    resize: [48, 36],
    convert: [64, 48],
    "quick-enhance": [64, 48],
    crop: [40, 30],
    extend: [72, 54],
    alpha: [64, 48],
    adjust: [64, 48],
    normalize: [64, 48],
    filter: [64, 48],
    "blur-sharpen": [64, 48],
    pixelate: [64, 48],
    watermark: [64, 48],
    frame: [70, 54],
    collage: [102, 40],
    "metadata-clean": [64, 48],
    "metadata-edit": [64, 48],
    "compare-diff": [64, 48],
    process: [48, 36],
  };
  const expected = exactDimensions[name];
  if (expected && (info.width !== expected[0] || info.height !== expected[1])) {
    throw new Error(
      `${name} returned ${info.width}x${info.height}; expected ${expected[0]}x${expected[1]}`,
    );
  }
  if (name === "rotate" && !(info.width > 64 && info.height > 48)) {
    throw new Error(
      "Arbitrary-angle rotation did not expand the output canvas",
    );
  }
  if (name === "trim" && !(info.width < 64 && info.height < 48)) {
    throw new Error("Trim did not remove the fixture's uniform border");
  }
  if (name === "alpha" && info.hasAlpha !== true) {
    throw new Error("Ensure-alpha output did not contain an alpha channel");
  }
  if (name === "metadata-edit") {
    const imageTags = info.categorized?.image;
    if (
      !Array.isArray(imageTags) ||
      !imageTags.some(
        (entry) =>
          entry.label === "Artist" &&
          entry.value === "Image Everything smoke test",
      )
    ) {
      throw new Error(
        "Metadata editor output did not contain the requested artist tag",
      );
    }
  }
  const expectedFormat = name.startsWith("codec-")
    ? testCase.options.format
    : {
        compress: "webp",
        "compress-to-size": "jpeg",
        convert: "webp",
        "compare-diff": "png",
        process: "webp",
      }[name];
  if (expectedFormat && info.format !== expectedFormat) {
    throw new Error(
      `${name} returned ${info.format}; expected ${expectedFormat}`,
    );
  }
  if (name === "compress-to-size" && bytes.length > 2048) {
    throw new Error(
      `Compress-to-size exceeded its hard byte target: ${bytes.length}`,
    );
  }
}

async function assertArchiveSemantics(origin, apiKey, name, bytes, response) {
  if (normalizedContentType(response) !== "application/zip") {
    throw new Error(`${name} returned an unexpected archive Content-Type`);
  }
  assertAttachmentHeader(response, name);
  assertByteHeaders(response, name, bytes.length);
  const entries = readZipEntries(bytes);
  if (unsignedHeader(response, "x-output-files", name) !== entries.size) {
    throw new Error(`${name} X-Output-Files does not match its ZIP directory`);
  }
  for (const entryName of entries.keys()) {
    if (!isSafeArchivePath(entryName)) {
      throw new Error(`${name} ZIP contains an unsafe path: ${entryName}`);
    }
  }
  const manifestBytes = entries.get("manifest.json");
  if (!manifestBytes) throw new Error(`${name} ZIP omitted manifest.json`);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error(`${name} ZIP contains malformed manifest JSON`);
  }
  if (
    manifest.version !== 1 ||
    manifest.kind !== name ||
    !Array.isArray(manifest.items)
  ) {
    throw new Error(`${name} ZIP contains an invalid manifest`);
  }
  const expectedItems = name === "responsive" ? 4 : 2;
  if (manifest.items.length !== expectedItems) {
    throw new Error(
      `${name} manifest returned ${manifest.items.length} items; expected ${expectedItems}`,
    );
  }
  const outputNames = new Set();
  const responsiveVariants = new Set();
  const batchInputs = [];
  for (const item of manifest.items) {
    if (
      !item ||
      item.status !== "success" ||
      typeof item.input !== "string" ||
      typeof item.output !== "string" ||
      !FORMAT_MIME[item.format] ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes <= 0 ||
      !Number.isSafeInteger(item.width) ||
      item.width <= 0 ||
      !Number.isSafeInteger(item.height) ||
      item.height <= 0
    ) {
      throw new Error(
        `${name} manifest did not record a complete successful image output`,
      );
    }
    if (!isSafeArchivePath(item.output) || item.output === "manifest.json") {
      throw new Error(
        `${name} manifest references an unsafe output path: ${item.output}`,
      );
    }
    if (outputNames.has(item.output)) {
      throw new Error(
        `${name} manifest contains duplicate output ${item.output}`,
      );
    }
    outputNames.add(item.output);
    const output = entries.get(item.output);
    if (!output) {
      throw new Error(
        `${name} manifest references missing output ${item.output}`,
      );
    }
    if (output.length !== item.bytes) {
      throw new Error(
        `${name} manifest byte count does not match ${item.output}`,
      );
    }
    const extension = FORMAT_EXTENSION[item.format];
    if (!item.output.toLowerCase().endsWith(`.${extension}`)) {
      throw new Error(
        `${name} output ${item.output} does not match its ${item.format} format`,
      );
    }
    assertImageSignature(
      output,
      FORMAT_MIME[item.format],
      `${name}/${item.output}`,
    );
    const info = await inspectImageBytes(
      origin,
      apiKey,
      output,
      FORMAT_MIME[item.format],
      `${name}-${item.output}`,
    );
    if (
      info.format !== item.format ||
      info.width !== item.width ||
      info.height !== item.height
    ) {
      throw new Error(
        `${name} manifest properties do not match decoded output ${item.output}`,
      );
    }

    if (name === "responsive") {
      if (item.input !== "file") {
        throw new Error(
          "Responsive manifest did not identify its source field",
        );
      }
      responsiveVariants.add(`${item.width}x${item.height}:${item.format}`);
    } else {
      batchInputs.push(item.input);
      if (item.format !== "webp" || item.width !== 48 || item.height !== 36) {
        throw new Error(
          `Batch output ${item.output} did not apply the requested pipeline`,
        );
      }
    }
  }

  const expectedEntryNames = new Set(["manifest.json", ...outputNames]);
  if (
    entries.size !== expectedEntryNames.size ||
    [...entries.keys()].some((entryName) => !expectedEntryNames.has(entryName))
  ) {
    throw new Error(
      `${name} ZIP contains outputs that are not declared exactly once in its manifest`,
    );
  }

  if (name === "responsive") {
    const expectedVariants = new Set([
      "24x18:jpeg",
      "24x18:webp",
      "48x36:jpeg",
      "48x36:webp",
    ]);
    if (
      responsiveVariants.size !== expectedVariants.size ||
      [...responsiveVariants].some((variant) => !expectedVariants.has(variant))
    ) {
      throw new Error(
        "Responsive ZIP did not contain every requested width/format variant exactly once",
      );
    }
  } else if (
    batchInputs.length !== 2 ||
    batchInputs[0] !== "quadrants-a.png" ||
    batchInputs[1] !== "quadrants-b.png"
  ) {
    throw new Error(
      "Batch manifest did not preserve the two uploaded input identities in order",
    );
  }
}

function readZipEntries(bytes) {
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const minimumEnd = Math.max(0, bytes.length - 65_557);
  const end = bytes.lastIndexOf(endSignature);
  if (end < minimumEnd || end + 22 > bytes.length) {
    throw new Error("ZIP end-of-central-directory record is missing");
  }
  const commentLength = bytes.readUInt16LE(end + 20);
  if (end + 22 + commentLength !== bytes.length) {
    throw new Error(
      "ZIP has a truncated end record or unexpected trailing bytes",
    );
  }
  const disk = bytes.readUInt16LE(end + 4);
  const centralDisk = bytes.readUInt16LE(end + 6);
  const diskEntries = bytes.readUInt16LE(end + 8);
  const totalEntries = bytes.readUInt16LE(end + 10);
  const centralSize = bytes.readUInt32LE(end + 12);
  const centralOffset = bytes.readUInt32LE(end + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error(
      "Multi-disk ZIP archives are not accepted by the smoke verifier",
    );
  }
  if (
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    throw new Error("ZIP64 is unnecessary and unsupported for smoke outputs");
  }
  if (centralOffset + centralSize !== end) {
    throw new Error("ZIP central-directory bounds are inconsistent");
  }

  const entries = new Map();
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`ZIP central entry ${index + 1} is malformed`);
    }
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const expectedCrc = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const filenameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const entryCommentLength = bytes.readUInt16LE(offset + 32);
    const startDisk = bytes.readUInt16LE(offset + 34);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const entryEnd =
      offset + 46 + filenameLength + extraLength + entryCommentLength;
    if (
      entryEnd > end ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      throw new Error(`ZIP central entry ${index + 1} exceeds archive bounds`);
    }
    if ((flags & 0x1) !== 0)
      throw new Error("Encrypted ZIP entries are not accepted");
    if (startDisk !== 0) throw new Error("ZIP entry references another disk");
    const filenameBytes = bytes.subarray(
      offset + 46,
      offset + 46 + filenameLength,
    );
    const filename = filenameBytes.toString("utf8");
    if (!filename || filename.includes("\ufffd") || entries.has(filename)) {
      throw new Error(
        `ZIP contains an invalid or duplicate entry name: ${filename}`,
      );
    }
    if (
      localOffset + 30 > centralOffset ||
      bytes.readUInt32LE(localOffset) !== 0x04034b50
    ) {
      throw new Error(`ZIP entry ${filename} has an invalid local header`);
    }
    const localFlags = bytes.readUInt16LE(localOffset + 6);
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localFilenameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localNameStart = localOffset + 30;
    const localNameEnd = localNameStart + localFilenameLength;
    const dataOffset =
      localOffset + 30 + localFilenameLength + localExtraLength;
    if (
      localFlags !== flags ||
      localMethod !== method ||
      localNameEnd > centralOffset ||
      !bytes.subarray(localNameStart, localNameEnd).equals(filenameBytes) ||
      dataOffset + compressedSize > centralOffset
    ) {
      throw new Error(`ZIP entry ${filename} has inconsistent local metadata`);
    }
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const body =
      method === 0
        ? Buffer.from(compressed)
        : method === 8
          ? inflateRawSync(compressed)
          : null;
    if (!body)
      throw new Error(
        `ZIP entry ${filename} uses unsupported compression method ${method}`,
      );
    if (body.length !== uncompressedSize) {
      throw new Error(
        `ZIP entry ${filename} has an incorrect uncompressed size`,
      );
    }
    if (crc32(body) !== expectedCrc) {
      throw new Error(
        `ZIP entry ${filename} failed its CRC-32 integrity check`,
      );
    }
    totalUncompressed += body.length;
    if (
      body.length > 64 * 1024 * 1024 ||
      totalUncompressed > 100 * 1024 * 1024
    ) {
      throw new Error("ZIP expands beyond the smoke verifier's safety limits");
    }
    entries.set(filename, body);
    offset = entryEnd;
  }
  if (entries.size === 0 || offset !== end) {
    throw new Error("ZIP central directory is empty or contains unparsed data");
  }
  return entries;
}

function isSafeArchivePath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.startsWith("/") ||
    /^[a-z]:/i.test(path) ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return false;
  }
  const parts = path.split("/");
  return parts.every((part) => part !== "" && part !== "." && part !== "..");
}

function createPngFixture(variant) {
  const width = 64;
  const height = 48;
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 3;
      const border = x < 4 || x >= width - 4 || y < 4 || y >= height - 4;
      const horizontal = (x - 4) / (width - 9);
      const vertical = (y - 4) / (height - 9);
      let rgb;
      if (border) {
        rgb = variant === "a" ? [245, 245, 245] : [12, 18, 28];
      } else if (variant === "a") {
        rgb = [
          30 + Math.round(horizontal * 150),
          25 + Math.round(vertical * 165),
          35 + Math.round((1 - horizontal) * 80 + vertical * 65),
        ];
        if (x >= 18 && x < 27 && y >= 12 && y < 36) rgb = [205, 42, 78];
        if (x >= 40 && x < 52 && y >= 18 && y < 28) rgb = [48, 192, 104];
      } else {
        rgb = [
          215 - Math.round(horizontal * 145),
          205 - Math.round(vertical * 155),
          55 + Math.round(horizontal * 95 + (1 - vertical) * 55),
        ];
        if (x >= 12 && x < 31 && y >= 20 && y < 30) rgb = [38, 90, 218];
      }
      raw[offset] = rgb[0];
      raw[offset + 1] = rgb[1];
      raw[offset + 2] = rgb[2];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type, body) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0);
  typeBytes.copy(chunk, 4);
  body.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, body])), 8 + body.length);
  return chunk;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assertImageSignature(bytes, contentType, name) {
  let detected;
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    detected = "png";
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    detected = "jpeg";
  } else if (bytes.subarray(0, 3).toString("ascii") === "GIF") {
    detected = "gif";
  } else if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    detected = "webp";
  } else if (
    ["II*\u0000", "MM\u0000*"].includes(bytes.subarray(0, 4).toString("latin1"))
  ) {
    detected = "tiff";
  } else if (
    bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
    /avif|avis/.test(
      bytes.subarray(8, Math.min(bytes.length, 64)).toString("ascii"),
    )
  ) {
    detected = "avif";
  }
  if (!detected) {
    throw new Error(
      `${name} returned ${contentType || "unknown content type"} without a recognized image signature`,
    );
  }
  if (FORMAT_MIME[detected] !== contentType) {
    throw new Error(
      `${name} declared ${contentType || "no content type"} for ${detected} bytes`,
    );
  }
}

async function verifyAuth(origin) {
  for (const credential of [undefined, "definitely-not-the-api-key"]) {
    const form = new FormData();
    appendFile(form, "file", FIXTURE_A, "auth.png");
    form.append("options", JSON.stringify({ includeRaw: false }));
    const response = await fetch(`${origin}/api/v2/images/metadata`, {
      method: "POST",
      headers: credential ? apiHeaders(credential) : undefined,
      body: form,
    });
    if (response.status !== 401) {
      throw new Error(
        `Expected missing/invalid API auth to return 401, received ${response.status}`,
      );
    }
    await assertProblemResponse(
      response,
      ["UNAUTHORIZED"],
      "API authentication",
    );
  }
}

async function verifyCapabilities(origin) {
  const response = await fetch(`${origin}/api/v2/capabilities`);
  if (!response.ok) throw new Error(`Capabilities returned ${response.status}`);
  const value = await response.json();
  const operations = value.operations ?? value.tools ?? [];
  const names = new Set(
    Array.isArray(operations)
      ? operations.map((entry) =>
          typeof entry === "string" ? entry : (entry.id ?? entry.name),
        )
      : [],
  );
  if (
    !Array.isArray(operations) ||
    operations.length !== 28 ||
    names.size !== 28
  ) {
    throw new Error("Capabilities must advertise exactly 28 unique tools");
  }
  for (const name of TOOL_CASES.filter(
    (entry) => entry.name !== "compare-diff",
  ).map((entry) => entry.name)) {
    if (!names.has(name)) throw new Error(`Capabilities omitted ${name}`);
  }
  if (
    operations.some(
      (entry) =>
        typeof entry === "object" && entry !== null && entry.available !== true,
    )
  ) {
    throw new Error(
      "Capabilities advertised an unavailable tool while readiness was healthy",
    );
  }
  if (
    value.apiVersion !== "v2" ||
    value.protocolVersion !== "2.0" ||
    value.animationSupported !== false ||
    !/^[0-9a-f]{64}$/i.test(value.capabilityFingerprint ?? "")
  ) {
    throw new Error("Capabilities omitted required v2 runtime metadata");
  }
  return value;
}

async function verifyAdvertisedCodecs(origin, apiKey, capabilities) {
  const encode = capabilities.formats?.encode;
  const decode = capabilities.formats?.decode;
  if (!Array.isArray(encode) || !Array.isArray(decode)) {
    throw new Error("Capabilities omitted the runtime codec matrix");
  }
  if (
    new Set(encode).size !== encode.length ||
    new Set(decode).size !== decode.length
  ) {
    throw new Error("Capabilities contain duplicate codec declarations");
  }

  for (const format of encode) {
    const testCase = imageCase(`codec-${format}`, "/api/v2/images/convert", {
      format,
      quality: 75,
      effort: 1,
    });
    const response = await invoke(origin, apiKey, testCase);
    await validateResult(origin, apiKey, testCase, response);
    process.stdout.write(`✓ Runtime codec encode + decode: ${format}\n`);
  }

  const unexercisedDecoders = decode.filter(
    (format) => !encode.includes(format) && format !== "heic",
  );
  if (unexercisedDecoders.length > 0) {
    throw new Error(
      `Capability matrix advertises decoders without smoke fixtures: ${unexercisedDecoders.join(", ")}`,
    );
  }

  if (decode.includes("heic")) {
    const metadata = new FormData();
    appendFile(metadata, "file", HEIC_FIXTURE, "fixture.heic", "image/heic");
    metadata.append(
      "options",
      JSON.stringify({ includeRaw: false, includeGps: false }),
    );
    const inspected = await fetch(`${origin}/api/v2/images/metadata`, {
      method: "POST",
      headers: apiHeaders(apiKey),
      body: metadata,
    });
    if (!inspected.ok) {
      throw new Error(
        `Advertised HEIC decoder failed with ${inspected.status}: ${await inspected.text()}`,
      );
    }
    const info = await inspected.json();
    if (info.format !== "heic" || info.width !== 64 || info.height !== 48) {
      throw new Error("Advertised HEIC decoder returned incorrect metadata");
    }

    const convert = new FormData();
    appendFile(convert, "file", HEIC_FIXTURE, "fixture.heic", "image/heic");
    convert.append("options", JSON.stringify({ format: "png" }));
    const converted = await fetch(`${origin}/api/v2/images/convert`, {
      method: "POST",
      headers: apiHeaders(apiKey),
      body: convert,
    });
    await validateResult(
      origin,
      apiKey,
      imageCase("codec-heic", "/api/v2/images/convert", { format: "png" }),
      converted,
    );
    process.stdout.write("✓ Runtime codec decode: heic\n");
  }
}

async function verifyInvalidInput(origin, apiKey) {
  const form = new FormData();
  appendFile(form, "file", Buffer.from("not an image"), "spoofed.png");
  form.append("options", JSON.stringify({ format: "png" }));
  const response = await fetch(`${origin}/api/v2/images/convert`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: form,
  });
  if (![415, 422].includes(response.status)) {
    throw new Error(
      `Expected spoofed input to return 415/422, received ${response.status}`,
    );
  }
  await assertProblemResponse(
    response,
    ["UNSUPPORTED_MEDIA_TYPE", "CORRUPT_INPUT"],
    "Spoofed image input",
  );
}

async function assertProblemResponse(response, expectedCodes, name) {
  if (normalizedContentType(response) !== "application/problem+json") {
    throw new Error(`${name} did not return application/problem+json`);
  }
  const cache = response.headers.get("cache-control") ?? "";
  if (!cache.toLowerCase().includes("no-store")) {
    throw new Error(`${name} problem response omitted Cache-Control: no-store`);
  }
  if (
    response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff"
  ) {
    throw new Error(
      `${name} problem response omitted X-Content-Type-Options: nosniff`,
    );
  }
  const problem = await response.json();
  if (
    problem.status !== response.status ||
    !expectedCodes.includes(problem.code) ||
    typeof problem.type !== "string" ||
    !/^https?:\/\//.test(problem.type) ||
    typeof problem.title !== "string" ||
    problem.title.length === 0 ||
    typeof problem.detail !== "string" ||
    problem.detail.length === 0 ||
    typeof problem.retryable !== "boolean"
  ) {
    throw new Error(
      `${name} returned a malformed or unexpected problem document`,
    );
  }
}

async function verifyWeb(origin) {
  const home = await fetch(origin);
  const homeText = await home.text();
  if (!home.ok || !homeText.includes("Image Everything")) {
    throw new Error("Web homepage smoke failed");
  }
  for (const slug of TOOL_SLUGS) {
    const response = await fetch(`${origin}/${slug}`);
    if (!response.ok)
      throw new Error(`UI tool /${slug} returned ${response.status}`);
    const html = await response.text();
    if (!html.includes("Image Everything") && !html.includes("image")) {
      throw new Error(`UI tool /${slug} did not render product content`);
    }
  }
}

async function verifyBrowserFlows({ webOrigin, apiOrigin, apiKey }) {
  const executable = findChromeExecutable();
  const debuggingPort = await freePort();
  const profile = mkdtempSync(join(tmpdir(), "image-everything-chrome-"));
  temporaryDirectories.push(profile);
  children.push(startChrome(executable, debuggingPort, profile));

  const debuggerOrigin = `http://127.0.0.1:${debuggingPort}`;
  await waitFor(`${debuggerOrigin}/json/version`);
  let targets = await fetch(`${debuggerOrigin}/json/list`).then((response) =>
    response.json(),
  );
  let target = targets.find((candidate) => candidate.type === "page");
  if (!target) {
    target = await fetch(`${debuggerOrigin}/json/new?about%3Ablank`, {
      method: "PUT",
    }).then((response) => response.json());
  }
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("Chrome did not expose a debuggable page target");
  }

  const browser = await connectCdp(target.webSocketDebuggerUrl);
  try {
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: browserApiBridge(apiOrigin, apiKey),
    });

    const flows = [
      {
        name: "image result",
        slug: "compress",
        endpoint: "/api/v2/images/compress",
        kind: "image",
      },
      {
        name: "JSON result",
        slug: "metadata-inspector",
        endpoint: "/api/v2/images/metadata",
        kind: "json",
      },
      {
        name: "ZIP result",
        slug: "responsive-set",
        endpoint: "/api/v2/images/responsive",
        kind: "zip",
      },
    ];

    for (const flow of flows) {
      const url = `${webOrigin}/${flow.slug}`;
      await browser.send("Page.navigate", { url });
      await waitForBrowser(
        browser,
        `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && Boolean(document.querySelector('input[type="file"]'))`,
        `${flow.name} page hydration`,
      );
      await setBrowserFixture(browser);
      await waitForBrowser(
        browser,
        `(() => { const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim().startsWith("Run ")); return Boolean(button && !button.disabled); })()`,
        `${flow.name} run action`,
      );
      const clicked = await evaluateBrowser(
        browser,
        `(() => { const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim().startsWith("Run ")); if (!button) return false; button.click(); return true; })()`,
      );
      if (!clicked)
        throw new Error(
          `${flow.name} browser smoke could not click its run action`,
        );

      await waitForBrowser(
        browser,
        `Boolean(document.querySelector("#tool-result-heading")) || Boolean(document.querySelector('[role="alert"]'))`,
        `${flow.name} result`,
        35_000,
      );
      const alerts = await evaluateBrowser(
        browser,
        `[...document.querySelectorAll('[role="alert"]')].map((element) => element.textContent?.trim()).filter(Boolean)`,
      );
      if (alerts.length > 0) {
        throw new Error(
          `${flow.name} browser flow rendered an alert: ${alerts.join(" | ")}`,
        );
      }

      if (flow.kind === "image") await assertBrowserImageResult(browser);
      if (flow.kind === "json") await assertBrowserJsonResult(browser);
      if (flow.kind === "zip") await assertBrowserZipResult(browser);
      await assertBrowserApiRequest(browser, flow);
      process.stdout.write(`✓ Browser UI: ${flow.name}\n`);
    }
  } finally {
    try {
      await browser.send("Browser.close");
    } catch {
      // Chrome may close the DevTools socket before acknowledging shutdown.
    }
    browser.close();
  }
}

function browserApiBridge(apiOrigin, apiKey) {
  return `(() => {
    const targetOrigin = ${JSON.stringify(apiOrigin)};
    const apiKey = ${JSON.stringify(apiKey)};
    const originalFetch = window.fetch.bind(window);
    window.__IMAGE_EVERYTHING_SMOKE_REQUESTS__ = [];
    window.fetch = async (input, init = {}) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, location.href);
      if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
      const target = new URL(url.pathname + url.search, targetOrigin);
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
      headers.set("Authorization", "Bearer " + apiKey);
      const request = {
        ...init,
        method: init.method ?? (input instanceof Request ? input.method : undefined),
        headers,
      };
      try {
        const response = await originalFetch(target.href, request);
        window.__IMAGE_EVERYTHING_SMOKE_REQUESTS__.push({
          url: target.href,
          path: target.pathname,
          method: request.method ?? "GET",
          authorized: headers.get("Authorization") === "Bearer " + apiKey,
          status: response.status,
          contentType: response.headers.get("Content-Type") ?? "",
          outputFiles: response.headers.get("X-Output-Files"),
        });
        return response;
      } catch (error) {
        window.__IMAGE_EVERYTHING_SMOKE_REQUESTS__.push({
          url: target.href,
          path: target.pathname,
          method: request.method ?? "GET",
          authorized: headers.get("Authorization") === "Bearer " + apiKey,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };
  })();`;
}

async function setBrowserFixture(browser) {
  const selected = await evaluateBrowser(
    browser,
    `(() => {
      const input = document.querySelector('input[type="file"]');
      if (!input) return null;
      const binary = atob(${JSON.stringify(FIXTURE_A.toString("base64"))});
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const file = new File([bytes], "browser-smoke.png", { type: "image/png", lastModified: 1 });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { name: file.name, size: file.size };
    })()`,
  );
  if (
    selected?.name !== "browser-smoke.png" ||
    selected.size !== FIXTURE_A.length
  ) {
    throw new Error(
      "Browser smoke could not select the fixture through the real file input",
    );
  }
}

async function assertBrowserImageResult(browser) {
  await waitForBrowser(
    browser,
    `(() => { const image = document.querySelector('img[alt="Processed image result"]'); return Boolean(image?.complete && image.naturalWidth === 64 && image.naturalHeight === 48); })()`,
    "decoded browser image preview",
  );
  const result = await evaluateBrowser(
    browser,
    `(() => {
      const image = document.querySelector('img[alt="Processed image result"]');
      const heading = document.querySelector("#tool-result-heading");
      const download = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Download"));
      return {
        heading: heading?.textContent?.trim(),
        blobUrl: image?.src?.startsWith("blob:"),
        width: image?.naturalWidth,
        height: image?.naturalHeight,
        downloadEnabled: Boolean(download && !download.disabled),
      };
    })()`,
  );
  if (
    result.heading !== "Processed result" ||
    result.blobUrl !== true ||
    result.width !== 64 ||
    result.height !== 48 ||
    result.downloadEnabled !== true
  ) {
    throw new Error(
      "Image browser flow did not render a decoded downloadable result",
    );
  }
}

async function assertBrowserJsonResult(browser) {
  const result = await evaluateBrowser(
    browser,
    `(() => {
      const heading = document.querySelector("#tool-result-heading");
      const encoded = document.querySelector("pre code")?.textContent ?? "";
      try { return { heading: heading?.textContent?.trim(), value: JSON.parse(encoded) }; }
      catch { return { heading: heading?.textContent?.trim(), value: null }; }
    })()`,
  );
  if (
    result.heading !== "Structured result" ||
    result.value?.format !== "png" ||
    result.value?.width !== 64 ||
    result.value?.height !== 48 ||
    !result.value?.categorized
  ) {
    throw new Error(
      "JSON browser flow did not render the real metadata response",
    );
  }
}

async function assertBrowserZipResult(browser) {
  const result = await evaluateBrowser(
    browser,
    `(() => {
      const heading = document.querySelector("#tool-result-heading");
      const download = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Download"));
      return {
        heading: heading?.textContent?.trim(),
        ready: document.body.textContent?.includes("ZIP archive ready"),
        fileSummary: /[1-9]\\d* files/.test(document.body.textContent ?? ""),
        downloadEnabled: Boolean(download && !download.disabled),
      };
    })()`,
  );
  if (
    result.heading !== "Processed result" ||
    result.ready !== true ||
    result.fileSummary !== true ||
    result.downloadEnabled !== true
  ) {
    throw new Error(
      "ZIP browser flow did not render a downloadable archive result",
    );
  }
}

async function assertBrowserApiRequest(browser, flow) {
  const requests = await evaluateBrowser(
    browser,
    `window.__IMAGE_EVERYTHING_SMOKE_REQUESTS__ ?? []`,
  );
  const request = requests.find(
    (candidate) =>
      candidate.path === flow.endpoint && candidate.method === "POST",
  );
  const expectedContentType =
    flow.kind === "image"
      ? "image/"
      : flow.kind === "zip"
        ? "application/zip"
        : "application/json";
  if (
    !request ||
    request.status !== 200 ||
    request.authorized !== true ||
    !request.contentType.toLowerCase().includes(expectedContentType)
  ) {
    throw new Error(
      `${flow.name} did not complete its authenticated public API request in Chrome`,
    );
  }
  if (flow.kind === "zip" && !(Number(request.outputFiles) >= 2)) {
    throw new Error(
      "ZIP browser response did not expose its generated file count to the client",
    );
  }
}

function findChromeExecutable() {
  const configured = process.env.IMAGE_EVERYTHING_CHROME_PATH;
  const candidates = [
    configured,
    ...[
      "google-chrome",
      "google-chrome-stable",
      "chromium",
      "chromium-browser",
    ].flatMap((name) =>
      (process.env.PATH ?? "")
        .split(delimiter)
        .filter(Boolean)
        .map((directory) => join(directory, name)),
    ),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      accessSync(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Continue to the next known executable.
    }
  }
  throw new Error(
    "A Chrome/Chromium binary is required for client-side smoke tests. Install one or set IMAGE_EVERYTHING_CHROME_PATH.",
  );
}

function startChrome(executable, port, profile) {
  const child = spawn(
    executable,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-sandbox",
      "--remote-allow-origins=*",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  logs.set("browser", "");
  const capture = (chunk) => {
    const current = `${logs.get("browser") ?? ""}${chunk.toString()}`;
    logs.set("browser", current.slice(-16_000));
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      logs.set(
        "browser",
        `${logs.get("browser") ?? ""}\nExited with ${code} (${signal ?? "no signal"})`,
      );
    }
  });
  return child;
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out connecting to Chrome DevTools")),
      10_000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("Chrome DevTools WebSocket connection failed"));
      },
      { once: true },
    );
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const raw =
      typeof event.data === "string"
        ? event.data
        : Buffer.from(
            event.data instanceof ArrayBuffer ? event.data : [],
          ).toString("utf8");
    const message = JSON.parse(raw);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error)
      request.reject(new Error(`${request.method}: ${message.error.message}`));
    else request.resolve(message.result ?? {});
  });
  socket.addEventListener("close", () => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(
        new Error(`Chrome closed while running ${request.method}`),
      );
    }
    pending.clear();
  });

  return {
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Chrome DevTools command timed out: ${method}`));
        }, 30_000);
        pending.set(id, { resolve, reject, timeout, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluateBrowser(browser, expression) {
  const response = await browser.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    const detail =
      response.exceptionDetails.exception?.description ??
      response.exceptionDetails.text;
    throw new Error(`Browser evaluation failed: ${detail}`);
  }
  return response.result?.value;
}

async function waitForBrowser(
  browser,
  expression,
  description,
  timeoutMs = 25_000,
) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await evaluateBrowser(browser, expression)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(
    `Timed out waiting for ${description}${lastError instanceof Error ? `: ${lastError.message}` : ""}`,
  );
}
