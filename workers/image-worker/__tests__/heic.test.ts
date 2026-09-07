import { LIMITS } from "@image-everything/contracts";
import heicDecode from "heic-decode";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decodeHeic } from "../src/core/heic";

vi.mock("heic-decode", () => ({ default: { all: vi.fn() } }));

const source = Buffer.from("HEIC test input");
const decode = vi.fn(async () => ({
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([12, 34, 56, 255]),
}));
const dispose = vi.fn();

function collection(count = 1, width = 1, height = 1) {
  return Object.assign(
    Array.from({ length: count }, () => ({ width, height, decode })),
    { dispose },
  );
}

describe("HEIC still-image decoder boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects multiple primary images before decoding and releases the container", async () => {
    vi.mocked(heicDecode.all).mockResolvedValueOnce(collection(2));
    await expect(decodeHeic(source)).rejects.toMatchObject({
      code: "ANIMATED_INPUT_UNSUPPORTED",
      status: 422,
    });
    expect(decode).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty container and releases it", async () => {
    vi.mocked(heicDecode.all).mockResolvedValueOnce(collection(0));
    await expect(decodeHeic(source)).rejects.toMatchObject({
      code: "CORRUPT_INPUT",
      status: 422,
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("enforces the pixel ceiling before allocating decoded pixels", async () => {
    vi.mocked(heicDecode.all).mockResolvedValueOnce(
      collection(1, LIMITS.maxInputPixels + 1),
    );
    await expect(decodeHeic(source)).rejects.toMatchObject({
      code: "INPUT_PIXELS_EXCEEDED",
      status: 413,
    });
    expect(decode).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("releases the container when decoding fails", async () => {
    vi.mocked(heicDecode.all).mockResolvedValueOnce(collection());
    decode.mockRejectedValueOnce(new Error("decode failed"));
    await expect(decodeHeic(source)).rejects.toThrow("decode failed");
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("copies decoded pixel bytes before releasing native allocations", async () => {
    const data = new Uint8ClampedArray([12, 34, 56, 255]);
    vi.mocked(heicDecode.all).mockResolvedValueOnce(collection());
    decode.mockResolvedValueOnce({ width: 1, height: 1, data });
    dispose.mockImplementationOnce(() => data.fill(0));
    expect(await decodeHeic(source)).toEqual({
      data: Buffer.from([12, 34, 56, 255]),
      width: 1,
      height: 1,
      channels: 4,
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
