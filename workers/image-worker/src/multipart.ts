import type { IncomingMessage } from "node:http";

import { LIMITS } from "@image-everything/contracts";

import { DomainError } from "./errors";
import type { UploadedPart } from "./execute";

const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");
const MAX_FIELD_BYTES = 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 1024 * 1024;

function parseBoundary(contentType: string | undefined): string {
  if (!contentType?.toLowerCase().startsWith("multipart/form-data")) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Worker execution requires multipart/form-data.",
      400,
    );
  }
  const match = /(?:^|;)\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary || boundary.length > 200 || /[\r\n]/.test(boundary)) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Multipart boundary is invalid.",
      400,
    );
  }
  return boundary;
}

async function readBoundedBody(
  request: IncomingMessage,
  maxFileBytes: number,
): Promise<Buffer> {
  const maximum = maxFileBytes + MAX_MULTIPART_OVERHEAD;
  const declared = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > maximum) {
    throw new DomainError(
      "AGGREGATE_TOO_LARGE",
      `The multipart request may not exceed ${maximum} bytes including framing.`,
      413,
    );
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    bytes += buffer.length;
    if (bytes > maximum) {
      throw new DomainError(
        "AGGREGATE_TOO_LARGE",
        `The multipart request may not exceed ${maximum} bytes including framing.`,
        413,
      );
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, bytes);
}

function unquoteHeaderValue(value: string): string {
  return value.replace(/\\(["\\])/g, "$1");
}

function parseDisposition(value: string | undefined): {
  name: string;
  filename?: string;
} {
  if (!value || !/^form-data(?:;|$)/i.test(value)) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Part disposition must be form-data.",
      400,
    );
  }
  const nameMatch = /(?:^|;)\s*name="((?:[^"\\]|\\.)*)"/i.exec(value);
  const filenameMatch = /(?:^|;)\s*filename="((?:[^"\\]|\\.)*)"/i.exec(value);
  if (!nameMatch) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Multipart part is missing a name.",
      400,
    );
  }
  return {
    name: unquoteHeaderValue(nameMatch[1]!),
    filename: filenameMatch ? unquoteHeaderValue(filenameMatch[1]!) : undefined,
  };
}

function parsePartHeaders(buffer: Buffer): Record<string, string> {
  if (buffer.length > 16 * 1024) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Multipart part headers are too large.",
      400,
    );
  }
  const headers: Record<string, string> = {};
  for (const line of buffer.toString("latin1").split("\r\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Multipart part header is invalid.",
        400,
      );
    }
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (headers[name] !== undefined) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Duplicate multipart part header.",
        400,
      );
    }
    headers[name] = value;
  }
  return headers;
}

function splitParts(
  body: Buffer,
  boundary: string,
): Array<{
  headers: Record<string, string>;
  body: Buffer;
}> {
  const delimiter = Buffer.from(`--${boundary}`);
  const nextDelimiter = Buffer.from(`\r\n--${boundary}`);
  if (!body.subarray(0, delimiter.length).equals(delimiter)) {
    throw new DomainError(
      "MALFORMED_MULTIPART",
      "Multipart body has an invalid preamble.",
      400,
    );
  }
  const parts: Array<{ headers: Record<string, string>; body: Buffer }> = [];
  let cursor = 0;
  while (cursor < body.length) {
    if (!body.subarray(cursor, cursor + delimiter.length).equals(delimiter)) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Multipart delimiter is invalid.",
        400,
      );
    }
    cursor += delimiter.length;
    if (body.subarray(cursor, cursor + 2).toString("ascii") === "--")
      return parts;
    if (!body.subarray(cursor, cursor + 2).equals(CRLF)) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Multipart delimiter line is invalid.",
        400,
      );
    }
    cursor += 2;
    const headerEnd = body.indexOf(HEADER_END, cursor);
    if (headerEnd < 0) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Multipart part headers are incomplete.",
        400,
      );
    }
    const headers = parsePartHeaders(body.subarray(cursor, headerEnd));
    const contentStart = headerEnd + HEADER_END.length;
    const contentEnd = body.indexOf(nextDelimiter, contentStart);
    if (contentEnd < 0) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        "Multipart closing boundary is missing.",
        400,
      );
    }
    parts.push({ headers, body: body.subarray(contentStart, contentEnd) });
    cursor = contentEnd + CRLF.length;
  }
  throw new DomainError(
    "MALFORMED_MULTIPART",
    "Multipart body ended unexpectedly.",
    400,
  );
}

export type ParsedMultipart = {
  files: UploadedPart[];
  options: unknown;
};

export async function parseMultipartRequest(
  request: IncomingMessage,
  maxRequestBytes = LIMITS.maxAggregateBytes,
): Promise<ParsedMultipart> {
  const boundary = parseBoundary(request.headers["content-type"]);
  const body = await readBoundedBody(request, maxRequestBytes);
  const parsedParts = splitParts(body, boundary);
  const files: UploadedPart[] = [];
  let options: unknown = {};
  let optionsSeen = false;

  for (const part of parsedParts) {
    const disposition = parseDisposition(part.headers["content-disposition"]);
    if (disposition.name === "options" && disposition.filename === undefined) {
      if (optionsSeen) {
        throw new DomainError(
          "MALFORMED_MULTIPART",
          "Only one options field is allowed.",
          400,
        );
      }
      if (part.body.length > MAX_FIELD_BYTES) {
        throw new DomainError(
          "MALFORMED_MULTIPART",
          "The options field is too large.",
          400,
        );
      }
      optionsSeen = true;
      try {
        options =
          part.body.length === 0 ? {} : JSON.parse(part.body.toString("utf8"));
      } catch (error) {
        throw new DomainError(
          "INVALID_OPTIONS",
          "The options field is not valid JSON.",
          422,
          {
            cause: error,
          },
        );
      }
      continue;
    }
    if (
      disposition.name !== "file" &&
      disposition.name !== "other" &&
      disposition.name !== "files" &&
      disposition.name !== "overlay"
    ) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        `Unsupported multipart field: ${disposition.name}`,
        400,
      );
    }
    if (disposition.filename === undefined) {
      throw new DomainError(
        "MALFORMED_MULTIPART",
        `Multipart field ${disposition.name} must be a file part.`,
        400,
      );
    }
    files.push({
      fieldName: disposition.name,
      filename: disposition.filename || "image",
      contentType: part.headers["content-type"],
      buffer: Buffer.from(part.body),
    });
    if (files.length > LIMITS.maxFiles + 1) {
      throw new DomainError(
        "TOO_MANY_FILES",
        `At most ${LIMITS.maxFiles} primary files and one overlay are allowed.`,
        413,
      );
    }
  }
  const fileBytes = files.reduce((sum, file) => sum + file.buffer.length, 0);
  if (fileBytes > maxRequestBytes) {
    throw new DomainError(
      "AGGREGATE_TOO_LARGE",
      `Multipart image bytes may not exceed ${maxRequestBytes}.`,
      413,
    );
  }
  return { files, options };
}
