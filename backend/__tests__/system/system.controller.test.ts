import { PATH_METADATA } from "@nestjs/common/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImagesController } from "@/images/images.controller";
import {
  IMAGE_OPERATIONS,
  MAX_BATCH_FILES,
  MAX_INPUT_PIXELS,
  MAX_UPLOAD_BYTES,
  getCapabilities,
} from "@/shared/api-contract";
import { IS_PUBLIC_KEY } from "@/shared/public.decorator";
import { SystemController } from "@/system/system.controller";

describe("public API contract", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("mounts image operations at canonical and legacy base paths", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ImagesController)).toEqual([
      "api/v1/images",
      "api/images",
    ]);

    for (const operation of IMAGE_OPERATIONS) {
      const methodName =
        operation === "auto-enhance" ? "autoEnhance" : operation;
      expect(
        Reflect.getMetadata(
          PATH_METADATA,
          ImagesController.prototype[methodName as keyof ImagesController],
        ),
      ).toBe(operation);
    }
  });

  it("reports the supported operations, formats, codecs, and enforced limits", () => {
    vi.stubEnv("API_KEY", "configured");
    const result = getCapabilities();

    expect(result.apiVersion).toBe("v1");
    expect(result.operations.map(({ name }) => name)).toEqual(IMAGE_OPERATIONS);
    expect(result.formats.input).toEqual(
      expect.arrayContaining(["jpeg", "png", "webp", "heic", "heif"]),
    );
    expect(result.formats.output).toEqual([
      "jpeg",
      "png",
      "webp",
      "avif",
      "gif",
    ]);
    expect(result.codecs.find(({ format }) => format === "tiff")).toMatchObject(
      {
        decode: true,
        encode: false,
      },
    );
    expect(result.limits.upload.maxFileBytes).toBe(MAX_UPLOAD_BYTES);
    expect(result.limits.pixels.maxInputPixels).toBe(MAX_INPUT_PIXELS);
    expect(result.limits.batch.maxFiles).toBe(MAX_BATCH_FILES);
    expect(result.auth.configured).toBe(true);
  });

  it("marks health and capabilities as public", () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SystemController.prototype.health),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        SystemController.prototype.capabilities,
      ),
    ).toBe(true);
  });

  it("returns a stable health response without leaking process details", () => {
    expect(new SystemController().health()).toEqual({
      status: "ok",
      service: "image-everything",
      apiVersion: "v1",
    });
  });
});
