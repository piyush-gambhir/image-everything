import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ToolExplorer } from "@/components/tool-explorer"

describe("ToolExplorer", () => {
  it("searches across the shared tool registry", async () => {
    const user = userEvent.setup()
    render(<ToolExplorer />)

    expect(screen.getByText("11 tools ready to use")).toBeInTheDocument()

    await user.type(
      screen.getByRole("textbox", { name: /search image tools/i }),
      "gps"
    )

    expect(screen.getByText("1 tool matching “gps”")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Read Metadata" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Compress" })
    ).not.toBeInTheDocument()
  })

  it("filters tools by category and keeps tool links accessible", async () => {
    const user = userEvent.setup()
    render(<ToolExplorer />)

    await user.click(screen.getByRole("button", { name: "Automate" }))

    expect(screen.getByText("2 tools ready to use")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Pipeline/ })).toHaveAttribute(
      "href",
      "/transform"
    )
    expect(screen.getByRole("link", { name: /Batch/ })).toHaveAttribute(
      "href",
      "/batch"
    )
  })
})
