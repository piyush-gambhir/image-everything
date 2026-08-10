import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import {
  LIMITS,
  getToolOptionsSchema,
  type ToolId,
} from "@image-everything/contracts";

import { ProblemException, problem } from "@/shared/problem";

export const PUBLIC_LIMITS = {
  maxUploadBytes: LIMITS.maxPrimaryUploadBytes,
  maxAggregateBytes: LIMITS.maxAggregateBytes,
  maxOverlayBytes: LIMITS.maxOverlayBytes,
  maxFiles: LIMITS.maxFiles,
  maxOptionsBytes: 256 * 1024,
} as const;

export const singleUploadOptions: MulterOptions = {
  limits: {
    fileSize: PUBLIC_LIMITS.maxUploadBytes,
    files: 1,
    fields: 1,
    // Busboy emits its parts-limit signal when the configured threshold is
    // reached, so reserve one sentinel slot beyond the allowed shape.
    parts: 3,
    fieldSize: PUBLIC_LIMITS.maxOptionsBytes,
  },
};

export const pairUploadOptions: MulterOptions = {
  limits: {
    fileSize: PUBLIC_LIMITS.maxUploadBytes,
    files: 2,
    fields: 1,
    parts: 4,
    fieldSize: PUBLIC_LIMITS.maxOptionsBytes,
  },
};

export const multipleUploadOptions: MulterOptions = {
  limits: {
    fileSize: PUBLIC_LIMITS.maxUploadBytes,
    // Parse one sentinel file so the controller can return the stable
    // TOO_MANY_FILES contract instead of Nest's generic Multer 400.
    files: PUBLIC_LIMITS.maxFiles + 1,
    fields: 1,
    parts: PUBLIC_LIMITS.maxFiles + 3,
    fieldSize: PUBLIC_LIMITS.maxOptionsBytes,
  },
};

export function requireSingleFile(
  file: Express.Multer.File | undefined,
): Express.Multer.File {
  if (!file) {
    throw missingInput('Missing required multipart field "file".');
  }
  requireNonEmpty(file);
  assertAggregate([file]);
  return file;
}

export function requireWatermarkFiles(
  fields:
    | { file?: Express.Multer.File[]; overlay?: Express.Multer.File[] }
    | undefined,
): { file: Express.Multer.File; overlay?: Express.Multer.File } {
  const file = fields?.file?.[0];
  if (!file) {
    throw missingInput('Missing required multipart field "file".');
  }
  requireNonEmpty(file);
  const overlay = fields?.overlay?.[0];
  if (overlay) {
    requireNonEmpty(overlay);
    if (overlay.size > PUBLIC_LIMITS.maxOverlayBytes) {
      throw new ProblemException(
        problem({
          status: 413,
          code: "OVERLAY_TOO_LARGE",
          detail: `The overlay exceeds the ${PUBLIC_LIMITS.maxOverlayBytes} byte limit.`,
        }),
      );
    }
  }
  assertAggregate(overlay ? [file, overlay] : [file]);
  return { file, ...(overlay ? { overlay } : {}) };
}

export function requireCompareFiles(
  fields:
    | { file?: Express.Multer.File[]; other?: Express.Multer.File[] }
    | undefined,
): { file: Express.Multer.File; other: Express.Multer.File } {
  const file = fields?.file?.[0];
  const other = fields?.other?.[0];
  if (!file || !other) {
    throw missingInput(
      'Comparison requires multipart fields "file" and "other".',
    );
  }
  requireNonEmpty(file);
  requireNonEmpty(other);
  assertAggregate([file, other]);
  return { file, other };
}

export function requireMultipleFiles(
  files: Express.Multer.File[] | undefined,
  minimum = 1,
): Express.Multer.File[] {
  if (!files || files.length < minimum) {
    throw missingInput(
      `Provide at least ${minimum} file${minimum === 1 ? "" : "s"} in the repeated "files" field.`,
    );
  }
  if (files.length > PUBLIC_LIMITS.maxFiles) {
    throw new ProblemException(
      problem({
        status: 413,
        code: "TOO_MANY_FILES",
        detail: `At most ${PUBLIC_LIMITS.maxFiles} files are allowed.`,
      }),
    );
  }
  files.forEach(requireNonEmpty);
  assertAggregate(files);
  return files;
}

export function parseOptionsJson(raw: string | undefined): unknown {
  if (raw === undefined || raw === "") return {};
  if (Buffer.byteLength(raw, "utf8") > PUBLIC_LIMITS.maxOptionsBytes) {
    throw new ProblemException(
      problem({
        status: 422,
        code: "INVALID_OPTIONS",
        detail: "The JSON options field exceeds its byte limit.",
      }),
    );
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ProblemException(
      problem({
        status: 422,
        code: "INVALID_OPTIONS",
        detail: 'The multipart "options" field must contain valid JSON.',
        errors: [{ path: "options", message: "Invalid JSON" }],
      }),
    );
  }
}

export function parseToolOptions(
  toolId: ToolId,
  raw: string | undefined,
): unknown {
  return validateToolOptions(toolId, parseOptionsJson(raw));
}

export function validateToolOptions(toolId: ToolId, value: unknown): unknown {
  const result = getToolOptionsSchema(toolId).safeParse(value);
  if (result.success) return result.data;

  throw new ProblemException(
    problem({
      status: 422,
      code: "INVALID_OPTIONS",
      detail: `The options field does not match the ${toolId} operation schema.`,
      errors: result.error.issues
        .slice(0, 100)
        .map((issue: { path: PropertyKey[]; message: string }) => ({
          path:
            issue.path.length > 0
              ? issue.path.map((segment) => String(segment)).join(".")
              : "options",
          message: issue.message,
        })),
    }),
  );
}

export function assertAggregate(
  files: Express.Multer.File[],
  optionsRaw?: string,
): void {
  const size =
    files.reduce((total, file) => total + file.size, 0) +
    (optionsRaw ? Buffer.byteLength(optionsRaw, "utf8") : 0);
  if (size > PUBLIC_LIMITS.maxAggregateBytes) {
    throw new ProblemException(
      problem({
        status: 413,
        code: "AGGREGATE_TOO_LARGE",
        detail: `Multipart file content exceeds the ${PUBLIC_LIMITS.maxAggregateBytes} byte aggregate limit.`,
      }),
    );
  }
}

function requireNonEmpty(file: Express.Multer.File): void {
  if (file.size === 0) {
    throw missingInput(`Uploaded file "${file.fieldname}" is empty.`);
  }
}

function missingInput(detail: string): ProblemException {
  return new ProblemException(
    problem({
      status: 400,
      code: "MISSING_INPUT",
      detail,
    }),
  );
}
