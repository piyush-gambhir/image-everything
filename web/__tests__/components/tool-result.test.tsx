import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  MAX_JSON_PREVIEW_CHARACTERS,
  ToolResult,
} from "@/components/tool-workspace/tool-result"
import type { ToolOperationResult } from "@/hooks/use-image-operation"

const resultFor = (data: unknown): ToolOperationResult => ({
  primary: { kind: "json", data },
  revision: 0,
})

function base64Result(data: string) {
  return {
    format: "png",
    contentType: "image/png",
    bytes: 3,
    encoding: "base64",
    data,
  }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe("structured result preview and downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let sequence = 0
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => `blob:result-${++sequence}`
    )
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("bounds the Base64 preview and downloads the complete text and JSON", async () => {
    const data = "A".repeat(MAX_JSON_PREVIEW_CHARACTERS * 2)
    const value = base64Result(data)
    const { container, unmount } = render(
      <ToolResult result={resultFor(value)} stale={false} />
    )
    expect(
      container.querySelector("pre")!.textContent!.length
    ).toBeLessThanOrEqual(MAX_JSON_PREVIEW_CHARACTERS)
    expect(
      screen.getByText(/preview limited to 65,536 characters/i)
    ).toBeInTheDocument()
    expect(URL.createObjectURL).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole("button", { name: "Download Base64 text" })
    )
    const textBlob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(textBlob.type).toBe("text/plain;charset=utf-8")
    expect(await readBlob(textBlob)).toBe(data)
    const textAnchor = vi.mocked(HTMLAnchorElement.prototype.click).mock
      .instances[0] as HTMLAnchorElement
    expect(textAnchor.download).toBe("image-base64.txt")

    fireEvent.click(screen.getByRole("button", { name: "Download JSON" }))
    const jsonBlob = vi.mocked(URL.createObjectURL).mock.calls[1][0] as Blob
    expect(jsonBlob.type).toBe("application/json")
    expect(JSON.parse(await readBlob(jsonBlob))).toEqual(value)
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-1")
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-2")
  })

  it("revokes download URLs after the browser has started the download", () => {
    vi.useFakeTimers()
    render(<ToolResult result={resultFor({ valid: true })} stale={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Download JSON" }))
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:result-1")
  })

  it("preserves the complete data URL prefix in the Base64 text download", async () => {
    const data = "data:image/png;base64,AAAA"
    render(
      <ToolResult
        result={resultFor({ ...base64Result(data), encoding: "data-url" })}
        stale={false}
      />
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Download Base64 text" })
    )
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(await readBlob(blob)).toBe(data)
  })

  it("cleans URLs when replacing a result and disables stale downloads", () => {
    const value = base64Result("AAAA")
    const { rerender } = render(
      <ToolResult result={resultFor(value)} stale={false} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Download JSON" }))
    rerender(
      <ToolResult result={resultFor(base64Result("BBBB"))} stale={true} />
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:result-1")
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Download Base64 text" })
    ).toBeDisabled()
  })

  it("shows ordinary JSON in full without offering a Base64 download", () => {
    const { container } = render(
      <ToolResult result={resultFor({ valid: true })} stale={false} />
    )
    expect(container.querySelector("pre")!.textContent).toBe(
      JSON.stringify({ valid: true }, null, 2)
    )
    expect(screen.queryByText(/preview limited/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Download Base64 text" })
    ).not.toBeInTheDocument()
  })
})
