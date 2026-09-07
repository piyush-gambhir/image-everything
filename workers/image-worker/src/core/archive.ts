import { PassThrough } from "node:stream";

import { LIMITS } from "@image-everything/contracts";
import archiver from "archiver";

import { DomainError } from "./errors";
import type { ZipExecutionResult } from "./output";
import { safeFilenameBase } from "./output";

export type ArchiveEntry = {
  name: string;
  body: Buffer | string;
};

export async function createZip(
  filename: string,
  entries: readonly ArchiveEntry[],
): Promise<ZipExecutionResult> {
  const entryBytes = entries.reduce(
    (total, entry) =>
      total +
      (Buffer.isBuffer(entry.body)
        ? entry.body.length
        : Buffer.byteLength(entry.body, "utf8")),
    0,
  );
  enforceAggregateOutputBytes(entryBytes);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const destination = new PassThrough();
  const chunks: Buffer[] = [];
  destination.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));

  const completion = new Promise<void>((resolve, reject) => {
    destination.once("end", resolve);
    destination.once("error", reject);
    archive.once("error", reject);
  });

  archive.pipe(destination);
  for (const entry of entries) {
    archive.append(entry.body, { name: sanitizeArchivePath(entry.name) });
  }
  await archive.finalize();
  await completion;
  const body = Buffer.concat(chunks);
  enforceAggregateOutputBytes(body.length);
  return {
    kind: "zip",
    body,
    contentType: "application/zip",
    filename: `${safeFilenameBase(filename)}.zip`,
    entries: entries.length,
    bytes: body.length,
  };
}

export function enforceAggregateOutputBytes(bytes: number): void {
  if (bytes <= LIMITS.maxAggregateOutputBytes) return;
  throw outputLimit();
}

function outputLimit(): DomainError {
  return new DomainError(
    "OUTPUT_LIMIT_EXCEEDED",
    `Archive output may not exceed ${LIMITS.maxAggregateOutputBytes} bytes.`,
    413,
  );
}

export function sanitizeArchivePath(path: string): string {
  return path
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .map((part) => {
      const extension = part.includes(".") ? part.split(".").pop() : undefined;
      const base = safeFilenameBase(part);
      return extension && /^[a-zA-Z0-9]+$/.test(extension)
        ? `${base}.${extension.toLowerCase()}`
        : base;
    })
    .join("/");
}
