import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ToolFileInput } from "@/components/tool-workspace/tool-file-input"
import { formatBytes, maxBytesForFileKind, validateToolFile } from "@/lib/files"
import { MAX_BASE64_UPLOAD_BYTES } from "@image-everything/contracts"

describe("tool-specific uploads", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ["raw", "pixels.RGBA"],
    ["raw", "pixels.raw"],
    ["raw", "pixels.rgb"],
    ["raw", "pixels.bin"],
    ["base64", "encoded.txt"],
    ["base64", "encoded.base64"],
  ] as const)(
    "accepts %s files named %s without creating a preview",
    (fileKind, name) => {
      // The explicit file kind must also prevent previews for misleading MIME data.
      const file = new File(["AAAA"], name, { type: "image/png" })
      const onChange = vi.fn()
      const onError = vi.fn()
      const { rerender } = render(
        <ToolFileInput
          files={[]}
          label="Source file"
          fileKind={fileKind}
          onChange={onChange}
          onError={onError}
        />
      )
      fireEvent.change(screen.getByLabelText("Choose source file"), {
        target: { files: [file] },
      })
      expect(onChange).toHaveBeenCalledWith([file])
      expect(onError).toHaveBeenCalledWith(null)
      rerender(
        <ToolFileInput
          files={[file]}
          label="Source file"
          fileKind={fileKind}
          onChange={onChange}
          onError={onError}
        />
      )
      expect(
        screen.getByText(fileKind === "raw" ? "Raw pixel data" : "Base64 text")
      ).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
      expect(URL.createObjectURL).not.toHaveBeenCalled()
    }
  )

  it.each([
    ["raw", "image.png", "image/png"],
    ["base64", "pixels.raw", "application/octet-stream"],
    ["image", "encoded.txt", "text/plain"],
  ] as const)(
    "rejects incompatible files for %s through drag and drop",
    (fileKind, name, type) => {
      const onChange = vi.fn()
      const onError = vi.fn()
      render(
        <ToolFileInput
          files={[]}
          label="Source file"
          fileKind={fileKind}
          onChange={onChange}
          onError={onError}
        />
      )
      fireEvent.drop(
        screen.getByRole("button", { name: /drop .* or browse/i }),
        {
          dataTransfer: { files: [new File(["data"], name, { type })] },
        }
      )
      expect(onChange).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.stringContaining(name))
    }
  )

  it.each(["raw", "base64"] as const)(
    "enforces empty and oversized %s upload bounds",
    (fileKind) => {
      const onChange = vi.fn()
      const onError = vi.fn()
      render(
        <ToolFileInput
          files={[]}
          label="Source file"
          fileKind={fileKind}
          onChange={onChange}
          onError={onError}
        />
      )
      const name = fileKind === "raw" ? "pixels.raw" : "encoded.txt"
      const empty = new File([], name)
      fireEvent.change(screen.getByLabelText("Choose source file"), {
        target: { files: [empty] },
      })
      expect(onError).toHaveBeenLastCalledWith(`${name}: file is empty`)
      const oversized = new File(["data"], name)
      const maxBytes = maxBytesForFileKind(fileKind)
      Object.defineProperty(oversized, "size", { value: maxBytes + 1 })
      fireEvent.change(screen.getByLabelText("Choose source file"), {
        target: { files: [oversized] },
      })
      expect(onError).toHaveBeenLastCalledWith(
        `${name}: exceeds ${formatBytes(maxBytes)}`
      )
      expect(onChange).not.toHaveBeenCalled()
    }
  )

  it("accepts Base64 expansion of a maximum-sized image only for text inputs", () => {
    const text = new File(["data"], "image.txt")
    Object.defineProperty(text, "size", { value: MAX_BASE64_UPLOAD_BYTES })
    expect(validateToolFile(text, "base64")).toBeNull()
    const raw = new File(["data"], "pixels.raw")
    Object.defineProperty(raw, "size", { value: MAX_BASE64_UPLOAD_BYTES })
    expect(validateToolFile(raw, "raw")).toContain("exceeds 25.00 MB")
    const image = new File(["data"], "image.png", { type: "image/png" })
    Object.defineProperty(image, "size", { value: MAX_BASE64_UPLOAD_BYTES })
    expect(validateToolFile(image, "image")).toContain("exceeds 25.00 MB")
  })

  it("keeps standard image previews working", () => {
    render(
      <ToolFileInput
        files={[new File(["image"], "source.png", { type: "image/png" })]}
        label="Source image"
        onChange={vi.fn()}
        onError={vi.fn()}
      />
    )
    expect(
      screen.getByRole("img", { name: "Preview of source.png" })
    ).toBeInTheDocument()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })
})
