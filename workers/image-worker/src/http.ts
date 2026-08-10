import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import {
  LIMITS,
  ProblemSchema,
  WORKER_COMPAT_AUTH_HEADER,
  WORKER_PROTOCOL_VERSION,
  WORKER_RESPONSE_HEADERS,
  WorkerCapabilitiesSchema,
  getRouteByWorkerPath,
  type Problem,
} from "@image-everything/contracts";

import { DomainError, asDomainError } from "./errors";
import { executeRoute } from "./execute";
import { parseMultipartRequest } from "./multipart";
import { attachmentHeader, type ExecutionResult } from "./output";
import { getCapabilities } from "./runtime";

export type ImageWorkerServerOptions = {
  token: string;
  maxRequestBytes?: number;
};

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
  const authorization = request.headers.authorization;
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const compatibility = request.headers[WORKER_COMPAT_AUTH_HEADER];
  const candidate =
    bearer ?? (Array.isArray(compatibility) ? compatibility[0] : compatibility);
  return typeof candidate === "string" && secureEqual(candidate, token);
}

function requestPath(request: IncomingMessage): string {
  try {
    return new URL(request.url ?? "/", "http://image-worker.invalid").pathname;
  } catch {
    return "/";
  }
}

function traceId(request: IncomingMessage): string {
  const supplied = request.headers["x-request-id"];
  const candidate = Array.isArray(supplied) ? supplied[0] : supplied;
  return candidate && /^[a-zA-Z0-9._:-]{1,128}$/.test(candidate)
    ? candidate
    : randomUUID();
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    WORKER_RESPONSE_HEADERS.protocolVersion,
    WORKER_PROTOCOL_VERSION,
  );
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  const encoded = Buffer.from(JSON.stringify(body));
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", String(encoded.length));
  response.end(encoded);
}

function sendProblem(response: ServerResponse, problem: Problem): void {
  const validated = ProblemSchema.parse(problem);
  const encoded = Buffer.from(JSON.stringify(validated));
  response.statusCode = validated.status;
  response.setHeader("Content-Type", "application/problem+json; charset=utf-8");
  response.setHeader("Content-Length", String(encoded.length));
  response.end(encoded);
}

async function sendExecutionResult(
  response: ServerResponse,
  result: ExecutionResult,
): Promise<void> {
  const capabilities = await getCapabilities();
  response.setHeader(
    WORKER_RESPONSE_HEADERS.capabilityFingerprint,
    capabilities.capabilityFingerprint,
  );
  if (result.kind === "json") {
    sendJson(response, 200, result.body);
    return;
  }
  response.statusCode = 200;
  response.setHeader("Content-Type", result.contentType);
  response.setHeader("Content-Disposition", attachmentHeader(result.filename));
  response.setHeader("Content-Length", String(result.body.length));
  response.setHeader(
    WORKER_RESPONSE_HEADERS.outputBytes,
    String(result.body.length),
  );
  if (result.kind === "image") {
    response.setHeader(WORKER_RESPONSE_HEADERS.outputFormat, result.format);
    response.setHeader(
      WORKER_RESPONSE_HEADERS.outputWidth,
      String(result.width),
    );
    response.setHeader(
      WORKER_RESPONSE_HEADERS.outputHeight,
      String(result.height),
    );
    for (const [name, value] of Object.entries(result.headers ?? {})) {
      response.setHeader(name, value);
    }
  } else {
    response.setHeader(
      WORKER_RESPONSE_HEADERS.outputFiles,
      String(result.entries),
    );
  }
  response.end(result.body);
}

async function withDeadline<T>(operation: Promise<T>): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        new DomainError(
          "EXECUTION_TIMEOUT",
          "Image processing exceeded its execution deadline.",
          504,
          { retryable: true },
        ),
      );
    }, LIMITS.deadlineMs);
    timeout.unref();
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: ImageWorkerServerOptions,
): Promise<void> {
  setSecurityHeaders(response);
  const path = requestPath(request);
  if (request.method === "GET" && path === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  if (!isAuthorized(request, options.token)) {
    throw new DomainError(
      "UNAUTHORIZED",
      "A valid private worker bearer token is required.",
      401,
    );
  }
  if (request.method === "GET" && path === "/ready") {
    const capabilities = await getCapabilities();
    const ready = capabilities.operations.every(
      (operation) => operation.available,
    );
    if (!ready) {
      throw new DomainError(
        "WORKER_UNAVAILABLE",
        "The image runtime is missing a required baseline capability.",
        503,
        { retryable: true },
      );
    }
    sendJson(response, 200, {
      status: "ready",
      capabilityFingerprint: capabilities.capabilityFingerprint,
    });
    return;
  }
  if (request.method === "GET" && path === "/v2/capabilities") {
    sendJson(
      response,
      200,
      WorkerCapabilitiesSchema.parse(await getCapabilities()),
    );
    return;
  }
  const route = getRouteByWorkerPath(path);
  if (request.method !== "POST" || !route) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "The requested private worker route does not exist.",
      400,
    );
  }
  const multipart = await parseMultipartRequest(
    request,
    options.maxRequestBytes ?? LIMITS.maxAggregateBytes,
  );
  const result = await withDeadline(
    executeRoute(route.id, multipart.files, multipart.options),
  );
  await sendExecutionResult(response, result);
}

export function createImageWorkerServer(
  options: ImageWorkerServerOptions,
): Server {
  if (!options.token) {
    throw new Error("Image worker token must not be empty");
  }
  if (
    options.maxRequestBytes !== undefined &&
    (!Number.isInteger(options.maxRequestBytes) ||
      options.maxRequestBytes < 1 ||
      options.maxRequestBytes > LIMITS.maxAggregateBytes)
  ) {
    throw new Error(
      `maxRequestBytes must be an integer between 1 and ${LIMITS.maxAggregateBytes}`,
    );
  }
  return createServer((request, response) => {
    const id = traceId(request);
    void handleRequest(request, response, options).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      setSecurityHeaders(response);
      const problem = asDomainError(error).toProblem(requestPath(request), id);
      sendProblem(response, problem);
    });
  });
}
