import { describe, expect, it, vi } from "vitest"

import {
  buildToolFormData,
  executeToolRequest,
  parseContentDispositionFilename,
} from "@/lib/tools/request"

const image = (name: string) =>
  new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" })

describe("v2 multipart request construction", () => {
  it("builds the single input shape", () => {
    const file = image("single.png")
    const data = buildToolFormData({ kind: "single", file }, { quality: 80 })
    expect(data.get("file")).toBe(file)
    expect(data.getAll("files")).toHaveLength(0)
    expect(data.get("options")).toBe('{"quality":80}')
  })

  it("builds the optional overlay shape", () => {
    const file = image("base.png")
    const overlay = image("mark.png")
    const data = buildToolFormData({ kind: "overlay", file, overlay })
    expect(data.get("file")).toBe(file)
    expect(data.get("overlay")).toBe(overlay)
  })

  it("builds the exact dual comparison shape", () => {
    const first = image("first.png")
    const second = image("second.png")
    const data = buildToolFormData({ kind: "dual", files: [first, second] })
    expect(data.get("file")).toBe(first)
    expect(data.get("other")).toBe(second)
    expect(data.getAll("files")).toHaveLength(0)
  })

  it("builds the repeated multi-file shape", () => {
    const files = [image("one.png"), image("two.png"), image("three.png")]
    const data = buildToolFormData({ kind: "multi", files })
    expect(data.getAll("files")).toEqual(files)
  })
})

describe("v2 response adapters", () => {
  it("adapts an image and safely handles a malformed encoded filename", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(new Blob(["image"], { type: "image/png" }), {
          status: 200,
          headers: {
            "Content-Disposition": "attachment; filename*=UTF-8''bad%ZZ.png",
            "X-Output-Width": "16",
            "X-Output-Height": "12",
            "X-Output-Format": "png",
          },
        })
    )
    const result = await executeToolRequest({
      endpoint: "/image",
      input: { kind: "single", file: image("in.png") },
      resultKind: "image",
      fetcher,
    })
    expect(result).toMatchObject({
      kind: "image",
      filename: "bad%ZZ.png",
      width: 16,
      height: 12,
      format: "png",
    })
  })

  it("adapts JSON results", async () => {
    const result = await executeToolRequest({
      endpoint: "/json",
      input: { kind: "single", file: image("in.png") },
      resultKind: "json",
      fetcher: vi.fn(async () =>
        Response.json({ entropy: 7.2 }, { status: 200 })
      ),
    })
    expect(result).toEqual({ kind: "json", data: { entropy: 7.2 } })
  })

  it("adapts ZIP results and download metadata", async () => {
    const result = await executeToolRequest({
      endpoint: "/zip",
      input: { kind: "multi", files: [image("one.png")] },
      resultKind: "zip",
      fetcher: vi.fn(
        async () =>
          new Response(new Blob(["zip"]), {
            status: 200,
            headers: {
              "Content-Disposition": 'attachment; filename="batch.zip"',
              "X-Output-Files": "1",
            },
          })
      ),
    })
    expect(result).toMatchObject({
      kind: "zip",
      filename: "batch.zip",
      fileCount: 1,
    })
  })

  it("preserves canonical validation errors from a shared problem response", async () => {
    const request = executeToolRequest({
      endpoint: "/invalid",
      input: { kind: "single", file: image("in.png") },
      resultKind: "image",
      fetcher: vi.fn(async () =>
        Response.json(
          {
            type: "https://image-everything.dev/problems/invalid-options",
            title: "Invalid options",
            status: 422,
            code: "INVALID_OPTIONS",
            detail: "One or more options are invalid.",
            retryable: false,
            errors: [{ path: "quality", message: "Must be at most 100" }],
          },
          { status: 422 }
        )
      ),
    })

    await expect(request).rejects.toMatchObject({
      problem: {
        code: "INVALID_OPTIONS",
        title: "Invalid options",
        detail: "One or more options are invalid.",
        status: 422,
        retryable: false,
        errors: [{ path: "quality", message: "Must be at most 100" }],
      },
    })
  })

  it("never throws while parsing malformed content disposition encoding", () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''hello%ZZ.png"
      )
    ).toBe("hello%ZZ.png")
  })
})
