import { describe, expect, it } from "vitest"

import { categorize } from "@/lib/images/format-metadata"

describe("categorize", () => {
  it("routes camera tags to camera category", () => {
    const result = categorize({ Make: "Canon", Model: "EOS R5" })
    expect(result.camera).toEqual([
      { label: "Make", value: "Canon" },
      { label: "Model", value: "EOS R5" },
    ])
    expect(result.lens).toHaveLength(0)
  })

  it("formats exposure tags", () => {
    const result = categorize({
      ExposureTime: 1 / 250,
      FNumber: 2.8,
      ISO: 400,
      FocalLength: 35,
      ExposureBiasValue: 0.33,
    })
    const map = Object.fromEntries(
      result.exposure.map((t) => [t.label, t.value])
    )
    expect(map["Exposure Time"]).toBe("1/250 s")
    expect(map["F Number"]).toBe("f/2.8")
    expect(map.ISO).toBe("ISO 400")
    expect(map["Focal Length"]).toBe("35 mm")
    expect(map["Exposure Bias Value"]).toBe("+0.33 EV")
  })

  it("formats long shutter speed as seconds", () => {
    const result = categorize({ ExposureTime: 2.5 })
    expect(result.exposure).toContainEqual({
      label: "Exposure Time",
      value: "2.5 s",
    })
  })

  it("routes GPS tags to location and formats coords", () => {
    const result = categorize({
      latitude: 37.774929,
      longitude: -122.419418,
      GPSAltitude: 52.4,
    })
    expect(result.location.length).toBe(3)
    expect(
      result.location.find((t) => t.label === "Latitude")?.value
    ).toContain("37.774929")
    expect(result.location.find((t) => t.label === "GPS Altitude")?.value).toBe(
      "52.4 m"
    )
  })

  it("puts unknown tags in other and skips noise", () => {
    const result = categorize({
      MysteryTag: "hello",
      thumbnail: { something: 1 },
      ExifVersion: "0220",
    })
    expect(result.other).toEqual([{ label: "Mystery Tag", value: "hello" }])
  })

  it("skips null/undefined/empty values", () => {
    const result = categorize({
      Make: null,
      Model: "",
      ISO: undefined,
      FNumber: 4,
    })
    expect(result.camera).toHaveLength(0)
    expect(result.exposure).toEqual([{ label: "F Number", value: "f/4" }])
  })
})
