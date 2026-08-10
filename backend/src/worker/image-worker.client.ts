import { Injectable } from "@nestjs/common";
import {
  LIMITS,
  ProblemSchema,
  WORKER_COMPAT_AUTH_HEADER,
  WorkerCapabilitiesSchema,
  type WorkerCapabilities,
} from "@image-everything/contracts";

import { readResponseBytes } from "@/shared/fetch-body";
import { ProblemException, problem, type ProblemInput } from "@/shared/problem";

export type WorkerResultKind = "image" | "json" | "zip";

export type WorkerUpload = {
  fieldName: "file" | "overlay" | "other" | "files";
  file: Express.Multer.File;
};

export type WorkerExecution = {
  route: string;
  uploads: WorkerUpload[];
  options?: unknown;
  rawOptions?: string;
  requestId?: string;
};

const DEFAULT_WORKER_URL = "http://127.0.0.1:3020";
const DEFAULT_DEADLINE_MS = LIMITS.synchronousDeadlineMs;
const MAX_WORKER_PROBLEM_BYTES = 1_000_000;
const MAX_WORKER_JSON_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ImageWorkerClient {
  assertConfigured(): void {
    if (!process.env.IMAGE_WORKER_TOKEN?.trim()) {
      throw new Error("IMAGE_WORKER_TOKEN is required");
    }
    workerOrigin();
  }

  async ready(): Promise<unknown> {
    const response = await this.request("/ready", { method: "GET" }, 5_000);
    const value = await readWorkerJson(response);
    if (
      !value ||
      typeof value !== "object" ||
      (value as { status?: unknown }).status !== "ready"
    ) {
      throw new ProblemException(invalidWorkerProblem());
    }
    return value;
  }

  async capabilities(): Promise<WorkerCapabilities> {
    const response = await this.request(
      "/v2/capabilities",
      { method: "GET" },
      5_000,
    );
    const value = await readWorkerJson(response);
    const parsed = WorkerCapabilitiesSchema.safeParse(value);
    if (!parsed.success) throw new ProblemException(invalidWorkerProblem());
    return parsed.data;
  }

  async execute(input: WorkerExecution): Promise<Response> {
    if (!/^\/?[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(input.route)) {
      throw new Error(`Invalid worker route: ${input.route}`);
    }

    const form = new FormData();
    for (const upload of input.uploads) {
      const bytes = new Uint8Array(upload.file.buffer);
      const blob = new Blob([bytes], {
        // The worker detects input types from bytes. Avoid forwarding an
        // attacker-controlled multipart MIME as if it were authoritative.
        type: "application/octet-stream",
      });
      form.append(upload.fieldName, blob, upload.file.originalname || "image");
    }
    if (input.rawOptions !== undefined) {
      form.append("options", input.rawOptions);
    } else if (input.options !== undefined) {
      form.append("options", JSON.stringify(input.options));
    }

    const route = input.route.replace(/^\/+/, "");
    return this.request(
      `/v2/${route}`,
      {
        method: "POST",
        body: form,
        headers: input.requestId
          ? { "x-request-id": input.requestId }
          : undefined,
      },
      workerDeadlineMs(),
    );
  }

  private async request(
    path: string,
    init: RequestInit,
    deadlineMs: number,
  ): Promise<Response> {
    const token = process.env.IMAGE_WORKER_TOKEN?.trim();
    if (!token) {
      throw new ProblemException(
        problem({
          status: 503,
          code: "WORKER_UNAVAILABLE",
          detail: "The private image worker is not configured.",
          retryable: true,
        }),
      );
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set(WORKER_COMPAT_AUTH_HEADER, token);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), deadlineMs);
    let response: Response;
    try {
      response = await fetch(`${workerOrigin()}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new ProblemException(
          problem({
            status: 504,
            code: "EXECUTION_TIMEOUT",
            detail:
              "The image worker did not finish before the execution deadline.",
            retryable: true,
          }),
        );
      }
      throw new ProblemException(
        problem({
          status: 503,
          code: "WORKER_UNAVAILABLE",
          detail: "The image worker is unavailable.",
          retryable: true,
        }),
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ProblemException(await workerProblem(response));
    }
    return response;
  }
}

function workerOrigin(): string {
  const raw = process.env.IMAGE_WORKER_URL?.trim() || DEFAULT_WORKER_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new ProblemException(
      problem({
        status: 503,
        code: "WORKER_UNAVAILABLE",
        detail: "IMAGE_WORKER_URL is invalid.",
        retryable: false,
      }),
    );
  }
}

function workerDeadlineMs(): number {
  const configured = Number(process.env.IMAGE_WORKER_DEADLINE_MS);
  if (!Number.isFinite(configured) || configured < 1)
    return DEFAULT_DEADLINE_MS;
  return Math.min(configured, DEFAULT_DEADLINE_MS);
}

async function workerProblem(response: Response): Promise<ProblemInput> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/problem+json")) {
    return invalidWorkerProblem();
  }

  try {
    const bytes = await readResponseBytes(response, MAX_WORKER_PROBLEM_BYTES);
    const parsed = ProblemSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    );
    if (!parsed.success || parsed.data.status !== response.status) {
      return invalidWorkerProblem();
    }

    if (parsed.data.status === 401) {
      return problem({
        status: 503,
        code: "WORKER_UNAVAILABLE",
        detail: "The private image worker rejected the gateway credential.",
        retryable: false,
      });
    }
    if (parsed.data.status === 500) {
      return problem({
        status: 500,
        code: "INTERNAL_ERROR",
        detail: "The image worker could not complete the request.",
        retryable: false,
      });
    }
    const status = publicWorkerStatus(parsed.data.status);
    if (status === 502 && parsed.data.status !== 502) {
      return invalidWorkerProblem();
    }
    return problem({
      status,
      code: parsed.data.code,
      title: parsed.data.title,
      detail: parsed.data.detail.slice(0, 2_000),
      retryable: parsed.data.retryable,
      errors: parsed.data.errors?.slice(0, 100),
    });
  } catch {
    return invalidWorkerProblem();
  }
}

function invalidWorkerProblem(): ProblemInput {
  return problem({
    status: 502,
    code: "WORKER_BAD_RESPONSE",
    detail: "The image worker returned an invalid error response.",
    retryable: true,
  });
}

function publicWorkerStatus(status: number): number {
  return [400, 413, 415, 422, 429, 502, 503, 504].includes(status)
    ? status
    : 502;
}

async function readWorkerJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ProblemException(invalidWorkerProblem());
  }
  try {
    const bytes = await readResponseBytes(response, MAX_WORKER_JSON_BYTES);
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new ProblemException(invalidWorkerProblem());
  }
}
