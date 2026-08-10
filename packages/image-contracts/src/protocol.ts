import { z } from "zod";

import { InputFormatSchema, OutputFormatSchema } from "./formats";
import { LimitsSchema } from "./limits";
import { ROUTE_IDS, TOOL_IDS } from "./registry";

export const API_VERSION = "v2" as const;
export const WORKER_PROTOCOL_VERSION = "2.0" as const;
export const WORKER_AUTH_HEADER = "authorization" as const;
export const WORKER_COMPAT_AUTH_HEADER = "x-image-worker-key" as const;
export const WORKER_MULTIPART_OPTIONS_FIELD = "options" as const;
export const WORKER_MULTIPART_SINGLE_FIELD = "file" as const;
export const WORKER_MULTIPART_OTHER_FIELD = "other" as const;
export const WORKER_MULTIPART_MULTIPLE_FIELD = "files" as const;
export const WORKER_MULTIPART_OVERLAY_FIELD = "overlay" as const;

export const ERROR_CODES = [
  "MALFORMED_MULTIPART",
  "MISSING_INPUT",
  "INVALID_OPTIONS",
  "UNAUTHORIZED",
  "UPLOAD_TOO_LARGE",
  "AGGREGATE_TOO_LARGE",
  "OVERLAY_TOO_LARGE",
  "INPUT_PIXELS_EXCEEDED",
  "OUTPUT_LIMIT_EXCEEDED",
  "TOO_MANY_FILES",
  "UNSUPPORTED_MEDIA_TYPE",
  "CODEC_UNAVAILABLE",
  "CORRUPT_INPUT",
  "ANIMATED_INPUT_UNSUPPORTED",
  "INVALID_OPERATION_COMBINATION",
  "DIMENSION_MISMATCH",
  "TARGET_SIZE_UNREACHABLE",
  "RATE_LIMITED",
  "WORKER_BAD_RESPONSE",
  "WORKER_UNAVAILABLE",
  "EXECUTION_TIMEOUT",
  "INTERNAL_ERROR",
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ProblemSchema = z.object({
  type: z.string().url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  code: ErrorCodeSchema,
  detail: z.string().min(1),
  instance: z.string().optional(),
  traceId: z.string().optional(),
  retryable: z.boolean(),
  errors: z.array(ValidationIssueSchema).optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;

export const CodecCapabilitySchema = z.object({
  format: InputFormatSchema,
  decode: z.boolean(),
  encode: z.boolean(),
  runtimeReportedDecode: z.boolean(),
  runtimeReportedEncode: z.boolean(),
  reason: z.string().optional(),
});

export const OperationCapabilitySchema = z.object({
  id: z.enum(TOOL_IDS),
  available: z.boolean(),
  reason: z.string().optional(),
});

export const WorkerCapabilitiesSchema = z.object({
  apiVersion: z.literal(API_VERSION),
  protocolVersion: z.literal(WORKER_PROTOCOL_VERSION),
  workerVersion: z.string(),
  runtime: z.object({
    node: z.string(),
    sharp: z.string(),
    libvips: z.string(),
    versions: z.record(z.string(), z.string()),
  }),
  codecs: z.array(CodecCapabilitySchema),
  formats: z.object({
    decode: z.array(InputFormatSchema),
    encode: z.array(OutputFormatSchema),
  }),
  operations: z.array(OperationCapabilitySchema),
  animationSupported: z.literal(false),
  limits: LimitsSchema,
  capabilityFingerprint: z.string().min(1),
});

export type WorkerCapabilities = z.infer<typeof WorkerCapabilitiesSchema>;

export const ImageResultSchema = z.object({
  kind: z.literal("image"),
  format: OutputFormatSchema,
  contentType: z.string(),
  filename: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
});

export const JsonResultSchema = z.object({
  kind: z.literal("json"),
  contentType: z.literal("application/json"),
});

export const ZipResultSchema = z.object({
  kind: z.literal("zip"),
  contentType: z.literal("application/zip"),
  filename: z.string(),
  entries: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
});

export const WorkerExecutionResultSchema = z.discriminatedUnion("kind", [
  ImageResultSchema,
  JsonResultSchema,
  ZipResultSchema,
]);

export type WorkerExecutionResult = z.infer<typeof WorkerExecutionResultSchema>;

export const ParsedWorkerRequestSchema = z.object({
  protocolVersion: z
    .literal(WORKER_PROTOCOL_VERSION)
    .default(WORKER_PROTOCOL_VERSION),
  routeId: z.enum(ROUTE_IDS),
  options: z.unknown(),
  filenames: z.array(z.string()),
  hasOverlay: z.boolean(),
});

export type ParsedWorkerRequest = z.infer<typeof ParsedWorkerRequestSchema>;

export const WORKER_RESPONSE_HEADERS = Object.freeze({
  protocolVersion: "x-image-worker-protocol",
  outputFormat: "x-image-output-format",
  outputWidth: "x-image-output-width",
  outputHeight: "x-image-output-height",
  outputBytes: "x-image-output-bytes",
  outputFiles: "x-image-output-files",
  capabilityFingerprint: "x-image-capability-fingerprint",
} as const);
