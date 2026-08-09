import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";

import type { EngineResult } from "@/lib/types";
import {
  attachmentHeader,
  outputFilename,
  safeFilenameBase,
  sendImageResult,
} from "@/shared/image-response";

describe("image response safety", () => {
  it("removes paths and control characters from output filenames", () => {
    const filename = outputFilename(
      "../../folder\\portrait\r\nX-Injected: yes.png",
      "webp",
    );

    expect(filename).toBe("portrait__X-Injected_ yes.webp");
    expect(filename).not.toMatch(/[\\/\r\n]/);
  });

  it("falls back for empty or dot-only names and caps long names", () => {
    expect(safeFilenameBase("...png")).toBe("image");
    expect(safeFilenameBase(`${"a".repeat(200)}.png`)).toHaveLength(120);
  });

  it("builds an ASCII fallback plus an RFC 5987 UTF-8 filename", () => {
    const header = attachmentHeader("résumé.png");

    expect(header).toContain('filename="r_sum_.png"');
    expect(header).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.png");
    expect(header).not.toMatch(/[\r\n]/);
  });

  it("sets no-store and nosniff on binary responses", () => {
    const headers = new Map<string, string>();
    const response = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(function (this: unknown, name: string, value: string) {
        headers.set(name, value);
        return this;
      }),
      send: vi.fn(),
    } as unknown as Response;
    const result: EngineResult = {
      buffer: Buffer.from("image"),
      format: "png",
      width: 10,
      height: 20,
      size: 5,
    };

    sendImageResult(response, result, "photo.png");

    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Content-Disposition")).toContain("photo.png");
    expect(response.send).toHaveBeenCalledWith(result.buffer);
  });
});
