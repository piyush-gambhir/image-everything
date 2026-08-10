import { PipelineSchema } from "@image-everything/contracts"
import { describe, expect, it } from "vitest"

import {
  OUTPUT_CONTROLS,
  validateImportedPipeline,
} from "@/components/tool-workspace/pipeline-builder"

describe("pipeline import", () => {
  it("uses the shared schema and applies contract defaults", () => {
    const imported = validateImportedPipeline({
      version: 1,
      steps: [
        {
          op: "pixelate",
          options: { blockSize: 12 },
        },
      ],
      output: {},
    })
    expect(PipelineSchema.safeParse(imported).success).toBe(true)
    expect(imported.steps[0]).toMatchObject({ enabled: true })
    expect(imported.output).toMatchObject({ format: "auto", quality: 80 })
  })

  it("rejects structurally valid JSON with invalid step options", () => {
    expect(() =>
      validateImportedPipeline({
        version: 1,
        steps: [{ op: "pixelate", options: { blockSize: 1 } }],
        output: {},
      })
    ).toThrow(/blockSize|too small/i)
  })

  it("exposes the complete terminal metadata-edit contract", () => {
    expect(
      OUTPUT_CONTROLS.filter((control) =>
        control.path.startsWith("metadataEdits.")
      ).map((control) => control.path)
    ).toEqual([
      "metadataEdits.artist",
      "metadataEdits.copyright",
      "metadataEdits.description",
      "metadataEdits.software",
      "metadataEdits.capturedAt",
      "metadataEdits.density",
      "metadataEdits.preserveExisting",
    ])
  })
})
