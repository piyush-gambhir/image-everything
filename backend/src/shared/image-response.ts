import type { Response } from "express";

import type { EngineResult } from "@/lib/types";
import { OUTPUT_FORMAT_TO_MIME } from "@/lib/types";

export function sendImageResult(
  res: Response,
  result: EngineResult,
  originalName: string,
): void {
  const baseName = stripExt(originalName);
  const filename = `${baseName}.${result.format}`;
  res
    .status(200)
    .setHeader("Content-Type", OUTPUT_FORMAT_TO_MIME[result.format])
    .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    .setHeader("Content-Length", String(result.size))
    .setHeader("X-Output-Width", String(result.width))
    .setHeader("X-Output-Height", String(result.height))
    .setHeader("X-Output-Size", String(result.size))
    .setHeader("X-Output-Format", result.format)
    .setHeader("Cache-Control", "no-store")
    .send(result.buffer);
}

function stripExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}
