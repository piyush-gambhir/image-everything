import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  OptionControls,
  type OptionValues,
} from "@/components/tool-workspace/option-controls"
import { OUTPUT_CONTROLS } from "@/components/tool-workspace/pipeline-builder"
import { cloneToolDefaults, getToolById } from "@/lib/tools/manifest"
import type { ToolControl } from "@/lib/tools/types"

describe("contextual encoder controls", () => {
  it("shows only controls used by the compress encoder format", async () => {
    const user = userEvent.setup()
    render(<ToolEncoderHarness toolId="compress" />)

    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(screen.getByLabelText("Progressive JPEG")).toBeInTheDocument()
    expect(screen.getByLabelText("MozJPEG")).toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: /^Lossless\b/ })
    ).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Output format"), "png")
    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^Lossless\b/ })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Encoder effort")).toBeInTheDocument()
    expect(screen.getByLabelText("PNG compression level")).toBeInTheDocument()
    expect(screen.queryByLabelText("Progressive JPEG")).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Output format"), "gif")
    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(screen.getByLabelText("Encoder effort")).toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: /^Lossless\b/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText("PNG compression level")
    ).not.toBeInTheDocument()
  })

  it("contextualizes convert controls", async () => {
    const user = userEvent.setup()
    render(<ToolEncoderHarness toolId="convert" />)
    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^Lossless\b/ })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("PNG compression level")).toBeInTheDocument()
    expect(screen.queryByLabelText("Progressive JPEG")).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Output format"), "jpeg")
    expect(screen.getByLabelText("Progressive JPEG")).toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: /^Lossless\b/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Encoder effort")).not.toBeInTheDocument()
  })

  it("exposes PNG palette controls only when raw encoding is lossy", async () => {
    const user = userEvent.setup()
    render(<ToolEncoderHarness toolId="encode" />)
    expect(screen.getByRole("checkbox", { name: "Lossless" })).toBeChecked()
    expect(screen.queryByLabelText("Quality")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Encoder effort")).not.toBeInTheDocument()
    expect(screen.getByLabelText("PNG compression level")).toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "Lossless" }))
    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(screen.getByLabelText("Encoder effort")).toHaveAttribute("min", "1")
    await user.click(screen.getByRole("checkbox", { name: "Lossless" }))
    expect(screen.queryByLabelText("Quality")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Encoder effort")).not.toBeInTheDocument()
  })

  it.each(["encode", "from-base64"] as const)(
    "keeps %s WebP effort in its supported range after a format change",
    async (toolId) => {
      const user = userEvent.setup()
      render(<ToolEncoderHarness toolId={toolId} />)
      await user.selectOptions(screen.getByLabelText("Output format"), "avif")
      const effort = screen.getByRole("spinbutton", {
        name: "Encoder effort exact value",
      })
      await user.clear(effort)
      await user.type(effort, "9")
      expect(effort).toHaveValue(9)
      await user.selectOptions(screen.getByLabelText("Output format"), "webp")
      expect(screen.getByLabelText("Encoder effort")).toHaveAttribute(
        "max",
        "6"
      )
      expect(
        screen.getByRole("spinbutton", { name: "Encoder effort exact value" })
      ).toHaveValue(6)
    }
  )

  it("normalizes PNG effort when switching from lossless to palette encoding", async () => {
    const user = userEvent.setup()
    render(<ToolEncoderHarness toolId="encode" />)
    await user.selectOptions(screen.getByLabelText("Output format"), "webp")
    const effort = screen.getByRole("spinbutton", {
      name: "Encoder effort exact value",
    })
    await user.clear(effort)
    await user.type(effort, "0")
    await user.selectOptions(screen.getByLabelText("Output format"), "png")
    expect(screen.queryByLabelText("Encoder effort")).not.toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "Lossless" }))
    expect(
      screen.getByRole("spinbutton", { name: "Encoder effort exact value" })
    ).toHaveValue(1)
  })

  it("contextualizes terminal pipeline output controls", async () => {
    const user = userEvent.setup()
    const process = getToolById("process")!
    const defaults = cloneToolDefaults(process)
    const output = defaults.output as OptionValues
    render(
      <EncoderHarness
        controls={OUTPUT_CONTROLS}
        initial={output}
        fallback={(process.defaults.output ?? {}) as OptionValues}
      />
    )
    expect(screen.getByLabelText("Quality")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^Lossless encoding\b/ })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Encoder effort")).toBeInTheDocument()
    expect(screen.queryByLabelText("MozJPEG")).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Output format"), "jpeg")
    expect(screen.getByLabelText("Progressive JPEG")).toBeInTheDocument()
    expect(screen.getByLabelText("MozJPEG")).toBeInTheDocument()
    expect(screen.getByLabelText("Chroma subsampling")).toBeInTheDocument()
    expect(
      screen.queryByRole("checkbox", { name: /^Lossless encoding\b/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Encoder effort")).not.toBeInTheDocument()
  })
})

function ToolEncoderHarness({
  toolId,
}: {
  toolId: "compress" | "convert" | "encode" | "from-base64"
}) {
  const tool = getToolById(toolId)!
  return (
    <EncoderHarness
      controls={tool.controls}
      initial={cloneToolDefaults(tool)}
      fallback={tool.defaults}
    />
  )
}

function EncoderHarness({
  controls,
  initial,
  fallback,
}: {
  controls: readonly ToolControl[]
  initial: OptionValues
  fallback: OptionValues
}) {
  const [value, setValue] = React.useState(initial)
  return (
    <OptionControls
      controls={controls}
      value={value}
      fallbackValue={fallback}
      onChange={setValue}
    />
  )
}
