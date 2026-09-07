import { TOOL_OPTION_SCHEMAS, type ToolId } from "@image-everything/contracts"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import {
  OptionControls,
  toIsoDateTime,
} from "@/components/tool-workspace/option-controls"
import { cloneToolDefaults, getToolById } from "@/lib/tools/manifest"

describe("OptionControls", () => {
  it("chooses an available CMYK encoder when switching away from PNG", () => {
    const onChange = vi.fn()
    const tool = getToolById("color-space")!
    render(
      <OptionControls
        controls={tool.controls}
        value={cloneToolDefaults(tool)}
        unavailableFormats={new Set(["jpeg"])}
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByRole("combobox", { name: "Color space" }), {
      target: { value: "cmyk" },
    })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ space: "cmyk", format: "tiff" })
    )
    expect(
      TOOL_OPTION_SCHEMAS["color-space"].safeParse(onChange.mock.lastCall?.[0])
        .success
    ).toBe(true)
  })

  it("allows alpha-bearing hex colors and retains alpha when choosing a new swatch", () => {
    const onChange = vi.fn()
    render(
      <OptionControls
        controls={[{ type: "color", path: "background", label: "Background" }]}
        value={{ background: "#ffffff80" }}
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Background" }), {
      target: { value: "#00000000" },
    })
    expect(onChange).toHaveBeenLastCalledWith({ background: "#00000000" })
    fireEvent.change(screen.getByLabelText("Background color picker"), {
      target: { value: "#112233" },
    })
    expect(onChange).toHaveBeenLastCalledWith({ background: "#11223380" })
  })

  it("preserves JSON matrix order, zeros, negative coefficients, and repeats", () => {
    const onChange = vi.fn()
    render(
      <OptionControls
        controls={[{ type: "json", path: "matrix", label: "Color matrix" }]}
        value={{
          matrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
        }}
        onChange={onChange}
      />
    )
    const matrix = [
      [-1, 0, 0.5],
      [0, -1, 0],
      [0, 0, -1],
    ]
    fireEvent.change(screen.getByRole("textbox", { name: "Color matrix" }), {
      target: { value: JSON.stringify(matrix) },
    })
    expect(onChange).toHaveBeenLastCalledWith({ matrix })
  })

  it("exposes malformed JSON drafts to schema validation and resets from external values", () => {
    const onChange = vi.fn()
    const controls = [
      { type: "json", path: "regions", label: "Regions" },
    ] as const
    const { rerender } = render(
      <OptionControls
        controls={controls}
        value={{ regions: [] }}
        onChange={onChange}
      />
    )
    const input = screen.getByRole("textbox", { name: "Regions" })
    fireEvent.change(input, { target: { value: "[{" } })
    expect(onChange).toHaveBeenLastCalledWith({ regions: "[{" })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Enter valid JSON")
    rerender(
      <OptionControls
        controls={controls}
        value={{ regions: [{ left: 0, top: 0, width: 5, height: 5 }] }}
        onChange={onChange}
      />
    )
    expect(input).toHaveValue(
      JSON.stringify([{ left: 0, top: 0, width: 5, height: 5 }], null, 2)
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("converts datetime-local values to an offset-bearing ISO instant", () => {
    expect(toIsoDateTime("2026-08-10T12:00")).toMatch(
      /^2026-08-10T\d{2}:\d{2}:00\.000Z$/
    )
  })

  it("deduplicates number lists and refuses values outside list bounds", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <OptionControls
        controls={[
          {
            type: "number-list",
            path: "widths",
            label: "Widths",
            minItems: 1,
            maxItems: 3,
          },
        ]}
        value={{ widths: [320] }}
        onChange={onChange}
      />
    )
    const input = screen.getByRole("textbox", { name: "Widths" })
    await user.clear(input)
    await user.type(input, "320, 320, 640")
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith({ widths: [320, 640] })

    await user.click(input)
    await user.clear(input)
    await user.type(input, "1, 2, 3, 4")
    await user.tab()
    expect(screen.getByRole("alert")).toHaveTextContent("at most 3")
    expect(onChange).toHaveBeenLastCalledWith({ widths: "1, 2, 3, 4" })
  })

  it("hydrates and validates every discriminated option branch after switching", async () => {
    const user = userEvent.setup()
    const cases: readonly {
      id: ToolId
      label: string
      branch: string
      expected: Record<string, unknown>
    }[] = [
      {
        id: "crop",
        label: "Crop mode",
        branch: "aspect",
        expected: { aspectWidth: 1, aspectHeight: 1, position: "center" },
      },
      {
        id: "alpha",
        label: "Operation",
        branch: "ensure",
        expected: { alpha: 1 },
      },
      {
        id: "filter",
        label: "Filter",
        branch: "tint",
        expected: { color: "#6d5dfc" },
      },
      {
        id: "normalize",
        label: "Method",
        branch: "clahe",
        expected: { width: 3, height: 3, maxSlope: 3 },
      },
      {
        id: "blur-sharpen",
        label: "Filter",
        branch: "median",
        expected: { size: 3 },
      },
      {
        id: "watermark",
        label: "Watermark type",
        branch: "image",
        expected: { scale: 0.25 },
      },
      {
        id: "color-space",
        label: "Color space",
        branch: "cmyk",
        expected: { space: "cmyk", format: "jpeg" },
      },
      {
        id: "convolve",
        label: "Kernel preset",
        branch: "custom",
        expected: {
          kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          scale: 1,
          offset: 0,
        },
      },
      {
        id: "redact",
        label: "Redaction method",
        branch: "pixelate",
        expected: { blockSize: 12 },
      },
    ]

    for (const testCase of cases) {
      const tool = getToolById(testCase.id)!
      const { unmount } = render(<ControlledOptions toolId={testCase.id} />)
      await user.selectOptions(
        screen.getByRole("combobox", { name: testCase.label }),
        testCase.branch
      )
      const value = JSON.parse(
        screen.getByTestId("option-value").textContent ?? "{}"
      )
      expect(value).toMatchObject(testCase.expected)
      expect(
        TOOL_OPTION_SCHEMAS[testCase.id].safeParse(value).success,
        testCase.id
      ).toBe(true)
      expect(tool.defaults).toBeDefined()
      unmount()
    }
  })
})

function ControlledOptions({ toolId }: { toolId: ToolId }) {
  const tool = getToolById(toolId)!
  const [value, setValue] = React.useState(() => cloneToolDefaults(tool))
  return (
    <>
      <OptionControls
        controls={tool.controls}
        value={value}
        fallbackValue={tool.defaults}
        onChange={setValue}
      />
      <output data-testid="option-value">{JSON.stringify(value)}</output>
    </>
  )
}
