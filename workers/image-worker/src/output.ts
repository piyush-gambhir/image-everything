import {
  FORMAT_EXTENSIONS,
  FORMAT_TO_MIME,
  LIMITS,
  type CompressOptions,
  type OutputFormat,
} from "@image-everything/contracts";
import type { Sharp } from "sharp";

import { DomainError } from "./errors";
import { ensureOutputFormat, enforceOutputDimensions } from "./input";

type EncoderOptions = CompressOptions;
type MetadataDisposition = "strip" | "preserve" | "privacy";

export type ImageExecutionResult = {
  kind: "image";
  body: Buffer;
  format: OutputFormat;
  contentType: string;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  headers?: Readonly<Record<string, string>>;
};

export type JsonExecutionResult = {
  kind: "json";
  body: unknown;
  contentType: "application/json";
};

export type ZipExecutionResult = {
  kind: "zip";
  body: Buffer;
  contentType: "application/zip";
  filename: string;
  entries: number;
  bytes: number;
};

export type ExecutionResult =
  | ImageExecutionResult
  | JsonExecutionResult
  | ZipExecutionResult;

export function safeFilenameBase(filename: string): string {
  const withoutPath =
    filename.replaceAll("\\", "/").split("/").pop() ?? "image";
  const withoutExtension = withoutPath.replace(/\.[^.]*$/, "");
  const safe = withoutExtension
    .normalize("NFKC")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);
  return safe || "image";
}

export function imageFilename(
  originalName: string,
  format: OutputFormat,
): string {
  return `${safeFilenameBase(originalName)}.${FORMAT_EXTENSIONS[format]}`;
}

export function attachmentHeader(filename: string): string {
  const safe = `${safeFilenameBase(filename)}${
    filename.includes(".")
      ? `.${filename
          .split(".")
          .pop()
          ?.replace(/[^a-zA-Z0-9]/g, "")}`
      : ""
  }`;
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

function applyMetadataDisposition(
  pipeline: Sharp,
  disposition: MetadataDisposition,
): Sharp {
  if (disposition === "preserve") return pipeline.keepMetadata();
  if (disposition === "privacy") return pipeline.keepIccProfile();
  return pipeline;
}

export function applyEncoder(
  pipeline: Sharp,
  format: OutputFormat,
  options: Partial<EncoderOptions> = {},
): Sharp {
  const quality = options.quality ?? 80;
  switch (format) {
    case "jpeg":
      return pipeline
        .flatten({ background: options.background ?? "#ffffff" })
        .jpeg({
          quality,
          progressive: options.progressive ?? false,
          mozjpeg: options.mozjpeg ?? true,
          chromaSubsampling: options.chromaSubsampling ?? "4:2:0",
        });
    case "png":
      return pipeline.png({
        compressionLevel: options.compressionLevel ?? 9,
        effort: Math.max(1, Math.min(10, options.effort ?? 4)),
        palette: options.lossless === false,
        quality,
        colours: Math.max(
          2,
          Math.min(256, Math.round(2 + (quality / 100) * 254)),
        ),
      });
    case "webp":
      return pipeline.webp({
        quality,
        lossless: options.lossless ?? false,
        effort: Math.min(6, options.effort ?? 4),
      });
    case "avif":
      return pipeline.avif({
        quality,
        lossless: options.lossless ?? false,
        effort: options.effort ?? 4,
      });
    case "gif":
      return pipeline.gif({
        effort: Math.max(1, Math.min(10, options.effort ?? 4)),
        colours: Math.max(
          2,
          Math.min(256, Math.round(2 + (quality / 100) * 254)),
        ),
      });
    case "tiff":
      return pipeline.tiff({
        quality,
        compression: options.lossless === false ? "jpeg" : "lzw",
      });
  }
}

export async function encodeImage(
  pipeline: Sharp,
  format: OutputFormat,
  originalName: string,
  options: Partial<EncoderOptions> = {},
): Promise<ImageExecutionResult> {
  await ensureOutputFormat(format);
  const metadata = (options.metadata ?? "strip") as MetadataDisposition;
  const prepared = applyMetadataDisposition(
    pipeline.timeout({ seconds: Math.ceil(LIMITS.deadlineMs / 1000) }),
    metadata,
  );
  const { data, info } = await applyEncoder(prepared, format, options).toBuffer(
    {
      resolveWithObject: true,
    },
  );
  enforceOutputDimensions(info.width, info.height);
  if (data.length > LIMITS.maxAggregateOutputBytes) {
    throw new DomainError(
      "OUTPUT_LIMIT_EXCEEDED",
      `Encoded output may not exceed ${LIMITS.maxAggregateOutputBytes} bytes.`,
      413,
    );
  }
  return {
    kind: "image",
    body: data,
    format,
    contentType: FORMAT_TO_MIME[format],
    filename: imageFilename(originalName, format),
    width: info.width,
    height: info.height,
    bytes: data.length,
  };
}

export function jsonResult(body: unknown): JsonExecutionResult {
  return { kind: "json", body, contentType: "application/json" };
}
