import type { Response } from "express";

import type { EngineResult } from "@/lib/types";
import { OUTPUT_FORMAT_TO_MIME } from "@/lib/types";

export function sendImageResult(
  res: Response,
  result: EngineResult,
  originalName: string,
): void {
  const filename = outputFilename(originalName, result.format);
  res
    .status(200)
    .setHeader("Content-Type", OUTPUT_FORMAT_TO_MIME[result.format])
    .setHeader("Content-Disposition", attachmentHeader(filename))
    .setHeader("Content-Length", String(result.size))
    .setHeader("X-Output-Width", String(result.width))
    .setHeader("X-Output-Height", String(result.height))
    .setHeader("X-Output-Size", String(result.size))
    .setHeader("X-Output-Format", result.format)
    .setHeader("Cache-Control", "no-store")
    .setHeader("X-Content-Type-Options", "nosniff")
    .send(result.buffer);
}

export function outputFilename(
  originalName: string,
  extension: string,
): string {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${safeFilenameBase(originalName)}.${safeExtension || "bin"}`;
}

export function safeFilenameBase(name: string, fallback = "image"): string {
  const leaf = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const extensionIndex = leaf.lastIndexOf(".");
  const withoutExtension =
    extensionIndex > 0 ? leaf.slice(0, extensionIndex) : leaf;
  const safe = replaceUnsafeCodePoints(withoutExtension.normalize("NFKC"))
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "")
    .trim();
  return Array.from(safe || fallback)
    .slice(0, 120)
    .join("");
}

export function attachmentHeader(filename: string): string {
  const safeFilename = replaceUnsafeCodePoints(filename).replace(
    /[\\/"]/g,
    "_",
  );
  const asciiFallback = safeFilename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/[;=]/g, "_");
  const encoded = encodeURIComponent(safeFilename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

function replaceUnsafeCodePoints(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControl = codePoint <= 0x1f || codePoint === 0x7f;
    const isUnpairedSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    return isControl || isUnpairedSurrogate ? "_" : character;
  }).join("");
}
