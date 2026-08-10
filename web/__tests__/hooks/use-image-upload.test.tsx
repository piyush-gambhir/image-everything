import { act, renderHook } from "@testing-library/react"
import type * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useImageUpload } from "@/hooks/use-image-upload"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useImageUpload", () => {
  it("keeps the current upload when a replacement is invalid", () => {
    const onError = vi.fn()
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:valid")
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL")
    const valid = new File(["image"], "photo.png", { type: "image/png" })
    const invalid = new File(["text"], "notes.txt", { type: "text/plain" })
    const { result } = renderHook(() => useImageUpload({ onError }))

    chooseFile(result.current.inputProps.onChange, valid)
    expect(result.current.file).toBe(valid)
    expect(result.current.preview).toBe("blob:valid")

    chooseFile(result.current.inputProps.onChange, invalid)
    expect(result.current.file).toBe(valid)
    expect(result.current.preview).toBe("blob:valid")
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/unsupported/i))
  })

  it("revokes the previous preview only after a valid replacement", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second")
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL")
    const first = new File(["one"], "one.png", { type: "image/png" })
    const second = new File(["two"], "two.webp", { type: "image/webp" })
    const { result } = renderHook(() => useImageUpload())

    chooseFile(result.current.inputProps.onChange, first)
    chooseFile(result.current.inputProps.onChange, second)

    expect(result.current.file).toBe(second)
    expect(result.current.preview).toBe("blob:second")
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first")
  })
})

function chooseFile(
  onChange: React.ChangeEventHandler<HTMLInputElement>,
  file: File
) {
  const target = { files: [file], value: "selected" }
  act(() => {
    onChange({ target } as unknown as React.ChangeEvent<HTMLInputElement>)
  })
  expect(target.value).toBe("")
}
