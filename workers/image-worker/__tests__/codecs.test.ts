import type { AddressInfo } from "node:net";
import { inflateRawSync } from "node:zlib";

import {
  Base64ResultSchema,
  EncodeOptionsSchema,
  MAX_RAW_BYTES,
  RawManifestSchema,
} from "@image-everything/contracts";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createImageWorkerServer } from "../src/http/server";
import { ANIMATED_GIF, getFixtures } from "./fixtures";

describe("codec HTTP workflows", () => {
  const server = createImageWorkerServer({ token: "codec-test" });
  let origin: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  async function post(route: string, buffer: Buffer, options: unknown = {}) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), "input.bin");
    form.append("options", JSON.stringify(options));
    return fetch(`${origin}/v2/${route}`, {
      method: "POST",
      headers: { Authorization: "Bearer codec-test" },
      body: form,
    });
  }

  it.each(["rgb", "rgba"] as const)(
    "round-trips %s pixel bytes through decode ZIP and encode",
    async (channels) => {
      const { basePng, width, height } = await getFixtures();
      const decoded = await post("decode", basePng, { channels });
      expect(decoded.status, await decoded.clone().text()).toBe(200);
      expect(decoded.headers.get("content-type")).toBe("application/zip");
      const entries = readZip(Buffer.from(await decoded.arrayBuffer()));
      const manifest = RawManifestSchema.parse(
        JSON.parse(entries.get("manifest.json")!.toString()),
      );
      expect(manifest).toMatchObject({
        width,
        height,
        channels,
        stride: width * (channels === "rgba" ? 4 : 3),
      });
      const pixels = entries.get("pixels.raw")!;
      expect(pixels.length).toBe(manifest.bytes);
      let reference = sharp(basePng).toColourspace("srgb");
      reference =
        channels === "rgba" ? reference.ensureAlpha() : reference.removeAlpha();
      expect(pixels).toEqual(await reference.raw().toBuffer());
      const encoded = await post("encode", pixels, { width, height, channels });
      expect(encoded.status, await encoded.clone().text()).toBe(200);
      const image = sharp(Buffer.from(await encoded.arrayBuffer()));
      expect(await image.metadata()).toMatchObject({
        format: "png",
        width,
        height,
      });
      expect(await image.raw().toBuffer()).toEqual(pixels);
    },
  );

  it.each([false, true])(
    "preserves original bytes in Base64 (data URL=%s) and re-encodes decoded input",
    async (dataUrl) => {
      const { basePng, width, height } = await getFixtures();
      const response = await post("to-base64", basePng, { dataUrl });
      expect(response.status).toBe(200);
      const result = Base64ResultSchema.parse(await response.json());
      expect(result.data).toBe(
        `${dataUrl ? "data:image/png;base64," : ""}${basePng.toString("base64")}`,
      );
      const decoded = await post("from-base64", Buffer.from(result.data), {
        format: "webp",
        lossless: true,
      });
      expect(decoded.status, await decoded.clone().text()).toBe(200);
      const image = sharp(Buffer.from(await decoded.arrayBuffer()));
      expect(await image.metadata()).toMatchObject({
        format: "webp",
        width,
        height,
      });
      expect(await image.raw().toBuffer()).toEqual(
        await sharp(basePng).raw().toBuffer(),
      );
    },
  );

  it("validates pixels and rejects a truncated payload whose PNG header is readable", async () => {
    const { basePng } = await getFixtures();
    const valid = await post("validate", basePng);
    expect(await valid.json()).toMatchObject({
      valid: true,
      format: "png",
      width: 120,
      height: 80,
      bytes: basePng.length,
    });
    const truncated = basePng.subarray(0, Math.floor(basePng.length / 2));
    const invalid = await post("validate", truncated);
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ code: "CORRUPT_INPUT" });
    for (const route of ["decode", "to-base64", "from-base64"]) {
      const input =
        route === "from-base64"
          ? Buffer.from(truncated.toString("base64"))
          : truncated;
      const rejected = await post(route, input);
      expect(rejected.status, route).toBe(422);
      expect(await rejected.json()).toMatchObject({ code: "CORRUPT_INPUT" });
    }
  });

  it.each([
    "%%%%",
    "AAAA=",
    "Zg",
    "Zh==",
    "data:image/png;base64,%%%%",
    "data:text/html;base64,YQ==",
    "_",
  ])("rejects malformed Base64 %s", async (text) => {
    const response = await post("from-base64", Buffer.from(text));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "INVALID_OPTIONS" });
  });

  it("rejects a data URL with a lying MIME type", async () => {
    const { basePng } = await getFixtures();
    const response = await post(
      "from-base64",
      Buffer.from(`data:image/jpeg;base64,${basePng.toString("base64")}`),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "INVALID_OPTIONS" });
  });

  it("validates CMYK plus alpha TIFF without assuming four source channels", async () => {
    const tiff = await sharp({
      create: { width: 3, height: 2, channels: 4, background: "#ff000080" },
    })
      .toColourspace("cmyk")
      .tiff({ compression: "lzw" })
      .toBuffer();
    const response = await post("validate", tiff);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      valid: true,
      channels: 5,
      hasAlpha: true,
      format: "tiff",
    });
    expect((await post("to-base64", tiff)).status).toBe(200);
  });

  it("round-trips Base64 text larger than the binary image upload ceiling", async () => {
    const { basePng } = await getFixtures();
    // A supported PNG may have trailing data; use it to cross the expansion
    // boundary without allocating a huge decoded bitmap.
    const source = Buffer.concat([
      basePng,
      Buffer.alloc(19 * 1024 * 1024 - basePng.length),
    ]);
    const encoded = await post("to-base64", source, { dataUrl: true });
    expect(encoded.status).toBe(200);
    const result = Base64ResultSchema.parse(await encoded.json());
    const text = Buffer.from(result.data);
    expect(text.length).toBeGreaterThan(MAX_RAW_BYTES);
    const decoded = await post("from-base64", text);
    expect(decoded.status, await decoded.clone().text()).toBe(200);
    expect(
      await sharp(Buffer.from(await decoded.arrayBuffer())).metadata(),
    ).toMatchObject({ format: "png", width: 120, height: 80 });
  });

  it("rejects animation after Base64 decoding", async () => {
    const response = await post(
      "from-base64",
      Buffer.from(ANIMATED_GIF.toString("base64")),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "ANIMATED_INPUT_UNSUPPORTED",
    });
  });

  it("checks exact raw byte counts and rejects oversized allocations at schema validation", async () => {
    const response = await post("encode", Buffer.alloc(3), {
      width: 1,
      height: 1,
      channels: "rgba",
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "INVALID_OPTIONS" });
    expect(
      EncodeOptionsSchema.safeParse({ width: 20000, height: 20000 }).success,
    ).toBe(false);
    expect(MAX_RAW_BYTES).toBe(25 * 1024 * 1024);
    const huge = await sharp({
      create: { width: 3000, height: 3000, channels: 4, background: "white" },
    })
      .png()
      .toBuffer();
    const decoded = await post("decode", huge);
    expect(decoded.status).toBe(413);
    expect(await decoded.json()).toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
    });
  });
});

// Read central-directory entries so the test also verifies each archive's
// declared lengths and uncompressed payloads, including data-descriptor ZIPs.
function readZip(bytes: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  while (offset >= 0 && bytes.readUInt32LE(offset) === 0x02014b50) {
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const local = bytes.readUInt32LE(offset + 42);
    const name = bytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString();
    const start =
      local +
      30 +
      bytes.readUInt16LE(local + 26) +
      bytes.readUInt16LE(local + 28);
    const compressed = bytes.subarray(start, start + compressedSize);
    const body = method === 8 ? inflateRawSync(compressed) : compressed;
    expect(body.length).toBe(size);
    entries.set(name, body);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
