import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { Response as ExpressResponse } from "express";
import {
  CompareResultSchema,
  HistogramResultSchema,
  LIMITS,
  MetadataResultSchema,
  OutputFormatSchema,
  PaletteResultSchema,
  StatsResultSchema,
  WORKER_PROTOCOL_VERSION,
  WORKER_RESPONSE_HEADERS,
  type RouteId,
} from "@image-everything/contracts";

import { readResponseBytes } from "@/shared/fetch-body";
import { attachmentHeader, outputFilename } from "@/shared/image-response";
import { ProblemException, problem } from "@/shared/problem";
import type { WorkerResultKind } from "@/worker/image-worker.client";

const MAX_JSON_BYTES = 5 * 1024 * 1024;

export async function sendWorkerResponse(args: {
  worker: Response;
  response: ExpressResponse;
  kind: WorkerResultKind;
  routeId: RouteId;
  originalName?: string;
  fallbackZipName?: string;
}): Promise<void> {
  const contentType = normalizedContentType(args.worker.headers);
  assertExpectedContentType(args.kind, contentType);

  args.response.status(args.worker.status);
  args.response.setHeader("Cache-Control", "no-store");
  args.response.setHeader("X-Content-Type-Options", "nosniff");
  args.response.setHeader("Content-Type", contentType);

  const output = mapWorkerHeaders(args.worker.headers, args.response);

  if (args.kind === "json") {
    let value: unknown;
    try {
      const bytes = await readResponseBytes(args.worker, MAX_JSON_BYTES);
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw invalidWorkerResponse();
    }
    const parsed = resultSchemaFor(args.routeId)?.safeParse(value);
    if (!parsed?.success) throw invalidWorkerResponse();
    args.response.send(parsed.data);
    return;
  }

  const filename = safeWorkerFilename(
    args.worker.headers.get("content-disposition"),
  );
  if (filename) {
    args.response.setHeader("Content-Disposition", attachmentHeader(filename));
  } else if (args.kind === "zip") {
    args.response.setHeader(
      "Content-Disposition",
      attachmentHeader(args.fallbackZipName ?? "images.zip"),
    );
  } else {
    const format = output.format ?? extensionForMime(contentType);
    args.response.setHeader(
      "Content-Disposition",
      attachmentHeader(
        outputFilename(args.originalName ?? "image", format ?? "bin"),
      ),
    );
  }

  const contentLength = args.worker.headers.get("content-length");
  if (contentLength && /^\d{1,20}$/.test(contentLength)) {
    args.response.setHeader("Content-Length", contentLength);
  }

  if (!args.worker.body) {
    args.response.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.fromWeb(
      args.worker.body as unknown as NodeReadableStream<Uint8Array>,
    );
    stream.once("error", reject);
    args.response.once("error", reject);
    args.response.once("finish", resolve);
    stream.pipe(args.response);
  });
}

function resultSchemaFor(routeId: RouteId) {
  switch (routeId) {
    case "metadata":
      return MetadataResultSchema;
    case "stats":
      return StatsResultSchema;
    case "palette":
      return PaletteResultSchema;
    case "histogram":
      return HistogramResultSchema;
    case "compare":
      return CompareResultSchema;
    default:
      return undefined;
  }
}

function mapWorkerHeaders(
  headers: Headers,
  response: ExpressResponse,
): { format: string | null } {
  const format = safeFormat(
    headers.get(WORKER_RESPONSE_HEADERS.outputFormat) ??
      headers.get("x-output-format"),
  );
  const width = safeUnsignedInteger(
    headers.get(WORKER_RESPONSE_HEADERS.outputWidth) ??
      headers.get("x-output-width"),
    1,
    LIMITS.maxOutputDimension,
  );
  const height = safeUnsignedInteger(
    headers.get(WORKER_RESPONSE_HEADERS.outputHeight) ??
      headers.get("x-output-height"),
    1,
    LIMITS.maxOutputDimension,
  );
  const bytes = safeUnsignedInteger(
    headers.get(WORKER_RESPONSE_HEADERS.outputBytes) ??
      headers.get("x-output-size"),
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const files = safeUnsignedInteger(
    headers.get(WORKER_RESPONSE_HEADERS.outputFiles) ??
      headers.get("x-output-files"),
    0,
    // ZIP results include one manifest entry in addition to the maximum
    // number of generated images.
    LIMITS.maxFiles + 1,
  );

  setIfPresent(response, "X-Output-Format", format);
  setIfPresent(response, "X-Output-Width", width);
  setIfPresent(response, "X-Output-Height", height);
  setIfPresent(response, "X-Output-Size", bytes);
  setIfPresent(response, "X-Output-Files", files);

  const protocol = headers.get(WORKER_RESPONSE_HEADERS.protocolVersion);
  if (protocol === WORKER_PROTOCOL_VERSION) {
    response.setHeader("X-Image-Worker-Protocol", protocol);
  }
  const fingerprint = safeOpaqueToken(
    headers.get(WORKER_RESPONSE_HEADERS.capabilityFingerprint),
  );
  setIfPresent(response, "X-Image-Capability-Fingerprint", fingerprint);

  // These two headers predate the worker split and remain public compatibility
  // metadata. Only forward canonical finite values.
  setIfPresent(
    response,
    "X-Input-Size",
    safeUnsignedInteger(
      headers.get("x-input-size"),
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  );
  const compressionRatio = headers.get("x-compression-ratio");
  if (
    compressionRatio &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(compressionRatio) &&
    Number.isFinite(Number(compressionRatio))
  ) {
    response.setHeader("X-Compression-Ratio", compressionRatio);
  }
  return { format };
}

function setIfPresent(
  response: ExpressResponse,
  name: string,
  value: string | null,
): void {
  if (value !== null) response.setHeader(name, value);
}

function safeFormat(value: string | null): string | null {
  const parsed = OutputFormatSchema.safeParse(value?.toLowerCase());
  return parsed.success ? parsed.data : null;
}

function safeUnsignedInteger(
  value: string | null,
  minimum: number,
  maximum: number,
): string | null {
  if (!value || !/^(?:0|[1-9]\d{0,15})$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? String(parsed)
    : null;
}

function safeOpaqueToken(value: string | null): string | null {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
}

function normalizedContentType(headers: Headers): string {
  return (headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function assertExpectedContentType(
  kind: WorkerResultKind,
  contentType: string,
): void {
  const valid =
    (kind === "image" && contentType.startsWith("image/")) ||
    (kind === "json" && contentType === "application/json") ||
    (kind === "zip" &&
      (contentType === "application/zip" ||
        contentType === "application/x-zip-compressed"));
  if (!valid) throw invalidWorkerResponse();
}

function invalidWorkerResponse(): ProblemException {
  return new ProblemException(
    problem({
      status: 502,
      code: "WORKER_BAD_RESPONSE",
      detail: "The image worker returned an unexpected response.",
      retryable: true,
    }),
  );
}

function safeWorkerFilename(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  const plain = /filename="?([^";\r\n]+)"?/i.exec(header)?.[1];
  let candidate = plain ?? "";
  if (encoded) {
    try {
      candidate = decodeURIComponent(encoded);
    } catch {
      // Keep the safe ASCII fallback.
    }
  }
  candidate = candidate.replace(/\\/g, "/").split("/").pop() ?? "";
  candidate = replaceUnsafeCodePoints(candidate.normalize("NFKC"))
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "")
    .trim();
  return Array.from(candidate).slice(0, 160).join("") || null;
}

function replaceUnsafeCodePoints(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f ? "_" : character;
  }).join("");
}

function extensionForMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    case "image/tiff":
      return "tiff";
    default:
      return null;
  }
}
