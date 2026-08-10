import { TOOL_OPTION_SCHEMAS, type ToolId } from "@image-everything/contracts"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import {
  OptionControls,
  toIsoDateTime,
} from "@/components/tool-workspace/option-controls"
import { cloneToolDefaults, getToolById } from "@/lib/tools/manifest"

describe("OptionControls", () => {
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
    expect(onChange).toHaveBeenCalledTimes(1)
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
