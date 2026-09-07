import {
  EXTENSION_OPTION_SCHEMAS,
  LIMITS,
  type ExtensionToolId,
} from "@image-everything/contracts"

import type { SerializableValue, ToolControl, ToolDefinition } from "./types"

const formatOptions = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "WebP", value: "webp" },
  { label: "AVIF", value: "avif" },
  { label: "GIF", value: "gif" },
  { label: "TIFF", value: "tiff" },
] as const

const format: ToolControl = {
  type: "select",
  path: "format",
  label: "Output format",
  options: formatOptions,
}
const encodingControls: readonly ToolControl[] = [
  {
    type: "range",
    path: "quality",
    label: "Quality",
    min: 1,
    max: 100,
    step: 1,
    visibleWhen: { path: "format", oneOf: ["jpeg", "webp", "gif"] },
  },
  {
    type: "range",
    path: "quality",
    label: "Quality",
    min: 1,
    max: 100,
    step: 1,
    visibleWhen: {
      path: "format",
      oneOf: ["png", "avif", "tiff"],
      and: { path: "lossless", equals: false },
    },
  },
  {
    type: "boolean",
    path: "lossless",
    label: "Lossless encoding",
    visibleWhen: { path: "format", oneOf: ["png", "webp", "avif", "tiff"] },
  },
]
const outputControls = [format, ...encodingControls]
const background: ToolControl = {
  type: "color",
  path: "background",
  label: "Background",
  description: "Use #RRGGBBAA to include transparency, such as #00000000.",
}
const gap: ToolControl = {
  type: "number",
  path: "gap",
  label: "Gap",
  min: 0,
  max: 500,
  step: 1,
  unit: "px",
}
const opacity: ToolControl = {
  type: "range",
  path: "opacity",
  label: "Opacity",
  min: 0,
  max: 1,
  step: 0.05,
}
const color: ToolControl = {
  type: "color",
  path: "color",
  label: "Color",
  alpha: false,
}
const gridControls: readonly ToolControl[] = [
  {
    type: "number",
    path: "columns",
    label: "Columns",
    min: 1,
    max: 10,
    step: 1,
  },
  { type: "number", path: "rows", label: "Rows", min: 1, max: 10, step: 1 },
]

type ExtensionDefinition = Pick<
  ToolDefinition,
  "title" | "shortTitle" | "description" | "category" | "controls" | "keywords"
> &
  Partial<
    Pick<
      ToolDefinition,
      | "inputKind"
      | "resultKind"
      | "inputLabel"
      | "minimumFiles"
      | "maximumFiles"
      | "notes"
    >
  >

function defineExtension<Id extends ExtensionToolId>(
  id: Id,
  definition: ExtensionDefinition
): ToolDefinition & { id: Id; slug: Id } {
  return {
    id,
    slug: id,
    endpoint: `/api/v2/images/${id}`,
    inputKind: "single",
    resultKind: "image",
    controlMode: "fields",
    defaults: EXTENSION_OPTION_SCHEMAS[id].parse({}) as Record<
      string,
      SerializableValue
    >,
    ...definition,
  }
}

export const EXTENDED_TOOL_MANIFEST = [
  defineExtension("color-space", {
    title: "Convert color space",
    shortTitle: "Color space",
    category: "color",
    description:
      "Convert pixels to sRGB, grayscale, or CMYK for screen and print workflows.",
    controls: [
      {
        type: "select",
        path: "space",
        label: "Color space",
        options: [
          { label: "sRGB", value: "srgb" },
          { label: "Grayscale", value: "b-w" },
          { label: "CMYK", value: "cmyk" },
        ],
      },
      { ...format, visibleWhen: { path: "space", oneOf: ["srgb", "b-w"] } },
      {
        type: "select",
        path: "format",
        label: "Output format",
        options: formatOptions.filter(
          (option) => option.value === "jpeg" || option.value === "tiff"
        ),
        visibleWhen: { path: "space", equals: "cmyk" },
      },
      ...encodingControls,
    ],
    notes: ["CMYK output requires JPEG or TIFF."],
    keywords: ["cmyk", "srgb", "print", "colour", "grayscale"],
  }),
  defineExtension("extract-channel", {
    title: "Extract an image channel",
    shortTitle: "Extract channel",
    category: "color",
    description:
      "Export the red, green, blue, or alpha channel as a grayscale image.",
    controls: [
      {
        type: "select",
        path: "channel",
        label: "Channel",
        options: [
          { label: "Red", value: "red" },
          { label: "Green", value: "green" },
          { label: "Blue", value: "blue" },
          { label: "Alpha", value: "alpha" },
        ],
      },
      ...outputControls,
    ],
    keywords: ["rgba", "channel", "alpha", "mask", "separation"],
  }),
  defineExtension("duotone", {
    title: "Apply a duotone effect",
    shortTitle: "Duotone",
    category: "color",
    description:
      "Map shadows and highlights to two chosen colors and blend the result with the original.",
    controls: [
      { type: "color", path: "dark", alpha: false, label: "Shadow color" },
      { type: "color", path: "light", alpha: false, label: "Highlight color" },
      {
        type: "range",
        path: "amount",
        label: "Effect amount",
        min: 0,
        max: 1,
        step: 0.05,
      },
      ...outputControls,
    ],
    keywords: ["duotone", "two color", "stylize", "gradient map"],
  }),
  defineExtension("posterize", {
    title: "Posterize image",
    shortTitle: "Posterize",
    category: "color",
    description:
      "Reduce the number of color levels per channel for a flat, graphic effect.",
    controls: [
      {
        type: "range",
        path: "levels",
        label: "Levels per channel",
        min: 2,
        max: 32,
        step: 1,
      },
      ...outputControls,
    ],
    keywords: ["poster", "quantize", "levels", "flat color"],
  }),
  defineExtension("solarize", {
    title: "Solarize image",
    shortTitle: "Solarize",
    category: "color",
    description:
      "Invert channel values above a chosen threshold to create a solarized effect.",
    controls: [
      {
        type: "range",
        path: "threshold",
        label: "Threshold",
        min: 0,
        max: 255,
        step: 1,
      },
      ...outputControls,
    ],
    keywords: ["solarization", "invert", "threshold", "effect"],
  }),
  defineExtension("levels", {
    title: "Adjust image levels",
    shortTitle: "Levels",
    category: "color",
    description:
      "Set black and white points and adjust midtone gamma to control tonal contrast.",
    controls: [
      {
        type: "range",
        path: "black",
        label: "Black point",
        min: 0,
        max: 254,
        step: 1,
      },
      {
        type: "range",
        path: "white",
        label: "White point",
        min: 1,
        max: 255,
        step: 1,
      },
      {
        type: "range",
        path: "gamma",
        label: "Midtone gamma",
        min: 0.1,
        max: 5,
        step: 0.1,
      },
      ...outputControls,
    ],
    keywords: ["black point", "white point", "gamma", "contrast", "tone"],
  }),
  defineExtension("color-matrix", {
    title: "Apply a color matrix",
    shortTitle: "Color matrix",
    category: "color",
    description:
      "Mix RGB channels with a custom 3 × 3 matrix, starting from a sepia preset.",
    controls: [
      {
        type: "json",
        path: "matrix",
        label: "Color matrix",
        description:
          "A flat JSON array of nine coefficients in row order: [rR, rG, rB, gR, gG, gB, bR, bG, bB]. Each coefficient may be −8 to 8.",
        maxLength: 400,
      },
      ...outputControls,
    ],
    keywords: ["matrix", "recomb", "sepia", "channel mixer", "rgb"],
  }),
  defineExtension("convolve", {
    title: "Apply a convolution filter",
    shortTitle: "Convolve",
    category: "color",
    description:
      "Detect edges, emboss, sharpen, or blur using presets or a custom 3 × 3 convolution kernel.",
    controls: [
      {
        type: "select",
        path: "preset",
        label: "Kernel preset",
        options: [
          { label: "Edge detection", value: "edge" },
          { label: "Emboss", value: "emboss" },
          { label: "Sharpen", value: "sharpen" },
          { label: "Box blur", value: "box-blur" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        type: "json",
        path: "kernel",
        label: "Kernel",
        description:
          "A flat JSON array of nine coefficients in row order. Each may be −100 to 100.",
        maxLength: 400,
        visibleWhen: { path: "preset", equals: "custom" },
      },
      {
        type: "number",
        path: "scale",
        label: "Scale divisor",
        min: 0.01,
        max: 1000,
        step: 0.01,
        visibleWhen: { path: "preset", equals: "custom" },
      },
      {
        type: "number",
        path: "offset",
        label: "Output offset",
        min: -255,
        max: 255,
        step: 1,
        visibleWhen: { path: "preset", equals: "custom" },
      },
      ...outputControls,
    ],
    keywords: ["convolution", "kernel", "edge detection", "emboss", "sharpen"],
  }),
  defineExtension("morphology", {
    title: "Dilate or erode image",
    shortTitle: "Morphology",
    category: "color",
    description:
      "Grow or shrink bright image regions with dilation and erosion.",
    controls: [
      {
        type: "select",
        path: "mode",
        label: "Operation",
        options: [
          { label: "Dilate", value: "dilate" },
          { label: "Erode", value: "erode" },
        ],
      },
      {
        type: "range",
        path: "radius",
        label: "Radius",
        min: 1,
        max: 10,
        step: 1,
        unit: "px",
      },
      ...outputControls,
    ],
    keywords: ["dilate", "erode", "morphology", "mask", "expand", "shrink"],
  }),
  defineExtension("replace-color", {
    title: "Replace an image color",
    shortTitle: "Replace color",
    category: "color",
    description:
      "Replace pixels near a chosen RGB color while retaining their alpha channel.",
    controls: [
      { type: "color", path: "from", alpha: false, label: "Source color" },
      { type: "color", path: "to", alpha: false, label: "Replacement color" },
      {
        type: "range",
        path: "tolerance",
        label: "Color tolerance",
        description: "Maximum distance from the source color in RGB space.",
        min: 0,
        max: 442,
        step: 1,
      },
      ...outputControls,
    ],
    keywords: ["replace", "recolor", "color swap", "tolerance"],
  }),
  defineExtension("chroma-key", {
    title: "Remove a key color",
    shortTitle: "Chroma key",
    category: "color",
    description:
      "Make a selected background color transparent with adjustable edge softness.",
    controls: [
      { ...color, label: "Key color" },
      {
        type: "range",
        path: "tolerance",
        label: "Color tolerance",
        min: 0,
        max: 442,
        step: 1,
      },
      {
        type: "range",
        path: "softness",
        label: "Edge softness",
        min: 0,
        max: 442,
        step: 1,
      },
      ...outputControls,
    ],
    notes: [
      "Choose PNG or another format with alpha support to preserve transparency.",
    ],
    keywords: ["green screen", "background removal", "keying", "transparent"],
  }),
  defineExtension("noise", {
    title: "Add image noise",
    shortTitle: "Noise",
    category: "color",
    description:
      "Add reproducible monochrome or color noise with a chosen intensity and random seed.",
    controls: [
      {
        type: "range",
        path: "amount",
        label: "Noise amount",
        min: 0,
        max: 100,
        step: 1,
      },
      {
        type: "number",
        path: "seed",
        label: "Random seed",
        min: 0,
        max: 4294967295,
        step: 1,
      },
      { type: "boolean", path: "monochrome", label: "Monochrome noise" },
      ...outputControls,
    ],
    keywords: ["grain", "noise", "texture", "seed", "random"],
  }),
  defineExtension("affine", {
    title: "Transform with an affine matrix",
    shortTitle: "Affine transform",
    category: "geometry",
    description:
      "Scale, shear, reflect, or rotate using a custom invertible 2 × 2 affine matrix.",
    controls: [
      ...(["a", "b", "c", "d"] as const).map((path) => ({
        type: "number" as const,
        path,
        label: `Matrix ${path}`,
        min: -4,
        max: 4,
        step: 0.1,
      })),
      background,
      ...outputControls,
    ],
    notes: [
      "Matrix rows are [a, b] and [c, d]. The absolute determinant |ad − bc| must be at least 0.01.",
    ],
    keywords: ["affine", "shear", "skew", "matrix", "transform"],
  }),
  defineExtension("vignette", {
    title: "Add a vignette",
    shortTitle: "Vignette",
    category: "color",
    description:
      "Darken image edges with adjustable strength and a central clear area.",
    controls: [
      {
        type: "range",
        path: "strength",
        label: "Strength",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        type: "range",
        path: "radius",
        label: "Clear radius",
        min: 0,
        max: 1,
        step: 0.05,
      },
      ...outputControls,
    ],
    keywords: ["vignette", "dark edges", "focus", "lens"],
  }),
  defineExtension("shadow", {
    title: "Add a drop shadow",
    shortTitle: "Drop shadow",
    category: "composition",
    description:
      "Place a soft colored shadow behind the image and expand its canvas to contain it.",
    controls: [
      {
        type: "number",
        path: "offsetX",
        label: "Horizontal offset",
        min: -500,
        max: 500,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        path: "offsetY",
        label: "Vertical offset",
        min: -500,
        max: 500,
        step: 1,
        unit: "px",
      },
      {
        type: "range",
        path: "blur",
        label: "Blur radius",
        min: 0.3,
        max: 100,
        step: 0.1,
      },
      opacity,
      color,
      ...outputControls,
    ],
    keywords: ["shadow", "depth", "drop shadow", "blur"],
  }),
  defineExtension("reflection", {
    title: "Add a faded reflection",
    shortTitle: "Reflection",
    category: "composition",
    description:
      "Extend the canvas with a mirrored reflection fading beneath the image.",
    controls: [
      {
        type: "range",
        path: "height",
        label: "Reflection height",
        description: "Fraction of the source height, from 0.05 to 1.",
        min: 0.05,
        max: 1,
        step: 0.05,
      },
      gap,
      opacity,
      ...outputControls,
    ],
    keywords: ["reflection", "mirror", "fade", "product"],
  }),
  defineExtension("tile", {
    title: "Repeat an image in a grid",
    shortTitle: "Tile image",
    category: "composition",
    description:
      "Build a repeating grid from one image with chosen rows, columns, gaps, and background.",
    controls: [...gridControls, gap, background, ...outputControls],
    keywords: ["repeat", "tile", "pattern", "grid", "texture"],
  }),
  defineExtension("slice", {
    title: "Slice image into tiles",
    shortTitle: "Slice image",
    category: "automation",
    description:
      "Split an image into a grid and download every tile with its coordinates in a ZIP manifest.",
    resultKind: "zip",
    controls: [
      ...gridControls,
      {
        type: "select",
        path: "format",
        label: "Tile format",
        options: formatOptions.filter((option) =>
          ["png", "jpeg", "webp"].includes(option.value)
        ),
      },
    ],
    notes: [
      "A request may generate at most 20 tiles. Rows and columns must fit the source image dimensions.",
    ],
    keywords: ["split", "slice", "tiles", "grid", "zip"],
  }),
  defineExtension("sprite-sheet", {
    title: "Build a sprite sheet",
    shortTitle: "Sprite sheet",
    category: "automation",
    description:
      "Pack multiple images into a PNG sprite sheet with JSON coordinates in a ZIP archive.",
    inputKind: "multi",
    resultKind: "zip",
    minimumFiles: 1,
    maximumFiles: 20,
    controls: [
      {
        type: "number",
        path: "cellWidth",
        label: "Cell width",
        min: 1,
        max: LIMITS.maxOutputDimension,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        path: "cellHeight",
        label: "Cell height",
        min: 1,
        max: LIMITS.maxOutputDimension,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        path: "columns",
        label: "Columns",
        min: 1,
        max: 20,
        step: 1,
      },
      gap,
      {
        type: "number",
        path: "padding",
        label: "Outer padding",
        min: 0,
        max: 500,
        step: 1,
        unit: "px",
      },
      background,
    ],
    keywords: ["sprite", "atlas", "css", "game", "spritesheet", "zip"],
  }),
  defineExtension("icon-set", {
    title: "Generate an icon set",
    shortTitle: "Icon set",
    category: "optimize",
    description:
      "Export square PNG icons in multiple sizes plus an optional multi-size ICO file in one ZIP.",
    resultKind: "zip",
    controls: [
      {
        type: "number-list",
        path: "sizes",
        label: "Icon sizes",
        minItems: 1,
        maxItems: 10,
        min: 8,
        max: 1024,
        description: "Up to ten unique sizes, each from 8 to 1024 pixels.",
      },
      { type: "boolean", path: "includeIco", label: "Include ICO file" },
      {
        type: "select",
        path: "fit",
        label: "Image fit",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" },
        ],
      },
      background,
    ],
    notes: [
      "ICO output includes sizes at or below 256 pixels; include at least one such size when ICO is enabled.",
    ],
    keywords: ["favicon", "ico", "icon", "app", "sizes", "zip"],
  }),
  defineExtension("pixel-inspect", {
    title: "Inspect a pixel",
    shortTitle: "Pixel inspector",
    category: "metadata",
    description:
      "Read the exact RGBA channels and hexadecimal value at one oriented image coordinate.",
    resultKind: "json",
    controls: [
      {
        type: "number",
        path: "x",
        label: "X coordinate",
        min: 0,
        max: LIMITS.maxInputPixels - 1,
        step: 1,
        unit: "px",
      },
      {
        type: "number",
        path: "y",
        label: "Y coordinate",
        min: 0,
        max: LIMITS.maxInputPixels - 1,
        step: 1,
        unit: "px",
      },
    ],
    keywords: ["pixel", "rgba", "hex", "eyedropper", "sample"],
  }),
  defineExtension("fingerprint", {
    title: "Fingerprint image content",
    shortTitle: "Fingerprint",
    category: "metadata",
    description:
      "Generate an average or difference perceptual hash and a SHA-256 checksum of the image file.",
    resultKind: "json",
    controls: [
      {
        type: "select",
        path: "algorithm",
        label: "Perceptual hash",
        options: [
          { label: "Difference hash", value: "difference" },
          { label: "Average hash", value: "average" },
        ],
      },
    ],
    keywords: ["hash", "duplicate", "checksum", "sha256", "perceptual"],
  }),
  defineExtension("auto-orient", {
    title: "Auto-orient image",
    shortTitle: "Auto-orient",
    category: "geometry",
    description:
      "Apply EXIF orientation to the pixels and export an image with upright dimensions.",
    controls: outputControls,
    keywords: ["exif", "orientation", "upright", "rotate"],
  }),
  defineExtension("redact", {
    title: "Redact image regions",
    shortTitle: "Redact regions",
    category: "geometry",
    description:
      "Cover, blur, or pixelate one or more rectangular image regions.",
    controls: [
      {
        type: "json",
        path: "regions",
        label: "Regions",
        description:
          'A JSON array of up to 20 rectangles: [{"left":0,"top":0,"width":16,"height":16}]. Coordinates refer to the oriented image.',
        maxLength: 4000,
      },
      {
        type: "select",
        path: "mode",
        label: "Redaction method",
        options: [
          { label: "Solid cover", value: "solid" },
          { label: "Blur", value: "blur" },
          { label: "Pixelate", value: "pixelate" },
        ],
      },
      { ...color, visibleWhen: { path: "mode", equals: "solid" } },
      {
        type: "range",
        path: "blur",
        label: "Blur radius",
        min: 0.3,
        max: 100,
        step: 0.1,
        visibleWhen: { path: "mode", equals: "blur" },
      },
      {
        type: "range",
        path: "blockSize",
        label: "Pixel block size",
        min: 2,
        max: 128,
        step: 1,
        unit: "px",
        visibleWhen: { path: "mode", equals: "pixelate" },
      },
      ...outputControls,
    ],
    notes: [
      "Use solid cover for sensitive content; blurred or pixelated details can retain information.",
    ],
    keywords: ["redact", "privacy", "regions", "censor", "cover"],
  }),
] as const
