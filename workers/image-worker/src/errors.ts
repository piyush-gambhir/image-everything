import type { ErrorCode, Problem } from "@image-everything/contracts";

const TITLES: Record<ErrorCode, string> = {
  MALFORMED_MULTIPART: "Malformed multipart request",
  MISSING_INPUT: "Missing image input",
  INVALID_OPTIONS: "Invalid operation options",
  UNAUTHORIZED: "Unauthorized worker request",
  UPLOAD_TOO_LARGE: "Upload is too large",
  AGGREGATE_TOO_LARGE: "Request is too large",
  OVERLAY_TOO_LARGE: "Overlay is too large",
  INPUT_PIXELS_EXCEEDED: "Input pixel limit exceeded",
  OUTPUT_LIMIT_EXCEEDED: "Output limit exceeded",
  TOO_MANY_FILES: "Too many files",
  UNSUPPORTED_MEDIA_TYPE: "Unsupported image format",
  CODEC_UNAVAILABLE: "Image codec unavailable",
  CORRUPT_INPUT: "Invalid or corrupt image",
  ANIMATED_INPUT_UNSUPPORTED: "Animated input is unsupported",
  INVALID_OPERATION_COMBINATION: "Invalid operation combination",
  DIMENSION_MISMATCH: "Image dimensions do not match",
  TARGET_SIZE_UNREACHABLE: "Target byte size cannot be reached",
  RATE_LIMITED: "Request rate limit exceeded",
  WORKER_BAD_RESPONSE: "Invalid worker response",
  WORKER_UNAVAILABLE: "Image worker unavailable",
  EXECUTION_TIMEOUT: "Image execution timed out",
  INTERNAL_ERROR: "Internal image worker error",
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly issues?: Array<{ path: string; message: string }>;

  constructor(
    code: ErrorCode,
    detail: string,
    status: number,
    options: {
      retryable?: boolean;
      issues?: Array<{ path: string; message: string }>;
      cause?: unknown;
    } = {},
  ) {
    super(detail, { cause: options.cause });
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.retryable = options.retryable ?? false;
    this.issues = options.issues;
  }

  toProblem(instance?: string, traceId?: string): Problem {
    return {
      type: `https://image-everything.dev/problems/${this.code.toLowerCase().replaceAll("_", "-")}`,
      title: TITLES[this.code],
      status: this.status,
      code: this.code,
      detail: this.message,
      instance,
      traceId,
      retryable: this.retryable,
      errors: this.issues,
    };
  }
}

export function asDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) {
      return new DomainError(
        "EXECUTION_TIMEOUT",
        "Image processing exceeded its execution deadline.",
        504,
        { retryable: true, cause: error },
      );
    }
    if (
      message.includes("unsupported image format") ||
      message.includes("unknown image format") ||
      message.includes("corrupt") ||
      message.includes("premature end") ||
      message.includes("invalid")
    ) {
      return new DomainError(
        "CORRUPT_INPUT",
        "The uploaded bytes are not a valid supported still image.",
        422,
        { cause: error },
      );
    }
  }
  return new DomainError(
    "INTERNAL_ERROR",
    "The image worker could not complete the request.",
    500,
    { cause: error },
  );
}
