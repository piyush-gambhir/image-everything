import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useToolOperation } from "@/hooks/use-image-operation"

const file = new File(["x"], "source.png", { type: "image/png" })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useToolOperation", () => {
  it("aborts the active request and returns to idle", async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined
        return new Promise<Response>(() => undefined)
      })
    )
    const { result } = renderHook(() =>
      useToolOperation({ endpoint: "/api", resultKind: "image", revision: 0 })
    )

    act(() => {
      void result.current.run({ kind: "single", file })
    })
    expect(result.current.status).toBe("running")
    act(() => result.current.cancel())
    expect(signal?.aborted).toBe(true)
    expect(result.current.status).toBe("idle")
  })

  it("publishes only the latest request in a race", async () => {
    const resolvers: ((response: Response) => void)[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvers.push(resolve)
          })
      )
    )
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValueOnce("blob:second"),
      revokeObjectURL: vi.fn(),
    })

    const { result } = renderHook(() =>
      useToolOperation({ endpoint: "/api", resultKind: "image", revision: 0 })
    )
    act(() => void result.current.run({ kind: "single", file }))
    act(() => void result.current.run({ kind: "single", file }))

    resolvers[1](
      new Response(new Blob(["second"]), {
        headers: { "Content-Disposition": 'attachment; filename="second.png"' },
      })
    )
    await waitFor(() =>
      expect(result.current.result?.primary).toMatchObject({
        filename: "second.png",
      })
    )
    resolvers[0](
      new Response(new Blob(["first"]), {
        headers: { "Content-Disposition": 'attachment; filename="first.png"' },
      })
    )
    await Promise.resolve()
    expect(result.current.result?.primary).toMatchObject({
      filename: "second.png",
    })
  })

  it("marks a completed result stale after the input/options revision changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob(["done"]), { status: 200 }))
    )
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:done"),
      revokeObjectURL: vi.fn(),
    })
    const { result, rerender } = renderHook(
      ({ revision }) =>
        useToolOperation({ endpoint: "/api", resultKind: "image", revision }),
      { initialProps: { revision: 0 } }
    )
    await act(async () => {
      await result.current.run({ kind: "single", file })
    })
    expect(result.current.isStale).toBe(false)
    rerender({ revision: 1 })
    expect(result.current.isStale).toBe(true)
  })
})
