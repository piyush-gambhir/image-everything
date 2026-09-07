# Advanced image APIs

These 24 operations extend Image Everything to 57 tools and 58 processing
routes. They run in the private image worker and are available through the
same web UI and public Nest API as the original tools. The authoritative
options and result schemas are in
[`extensions.ts`](../packages/image-contracts/src/extensions.ts).

## Request and output conventions

Every route below is a `POST` to `/api/v2/images/<tool-id>`. Supply a multipart
`file` and an optional JSON `options` field. `sprite-sheet` instead takes 1–20
repeated `files` fields. Send `Authorization: Bearer <API_KEY>` when the public
API key is configured. Discover installed codecs at `GET /api/v2/capabilities`.

The 19 tools that return one image share these options:

| Option     | Accepted values                                                          | Default |
| ---------- | ------------------------------------------------------------------------ | ------- |
| `format`   | `png`, `jpeg`, `webp`, `avif`, `gif`, `tiff`, subject to runtime support | `png`   |
| `quality`  | Integer 1–100                                                            | `80`    |
| `lossless` | Boolean; applied where the encoder supports it                           | `true`  |

PNG defaults to full-color lossless encoding. JPEG remains lossy and flattens
transparency using the tool's `background` where supplied, otherwise white.
Set `lossless: false` explicitly for lossy WebP or AVIF.
CMYK requires JPEG or TIFF. ZIP and JSON tools have their own options below.

All encoded outputs from these tools strip source metadata, including EXIF and
ICC metadata, and apply input orientation. Coordinates use the oriented image,
with `(0, 0)` at its top-left. Effect colors use `#RRGGBB`; canvas `background`
accepts `#RRGGBB` or `#RRGGBBAA`. Most color effects preserve existing alpha;
channel extraction returns an opaque grayscale image, and chroma key modifies
alpha intentionally.

These are standalone operations, not additional `process`/`batch` pipeline
steps. To combine them, pass the encoded result of one API request into the next.

## Color and pixel operations

All ranges include their endpoints. Counts, byte thresholds, and radii marked
as integers reject fractions; strength, gamma, tolerances, and matrix values
can be fractional.

| Tool ID           | Operation options and defaults                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color-space`     | `space`: `srgb` (default), `b-w`, or `cmyk`. CMYK additionally requires `format: "jpeg"` or `"tiff"`.                                                                                                                                                |
| `extract-channel` | `channel`: `red` (default), `green`, `blue`, or `alpha`. Missing source alpha produces a white mask.                                                                                                                                                 |
| `duotone`         | `dark: "#0f172a"`, `light: "#fbbf24"`; `amount` 0–1, default `1`.                                                                                                                                                                                    |
| `posterize`       | `levels`: integer 2–32, default `4`, independently for each RGB channel.                                                                                                                                                                             |
| `solarize`        | `threshold`: integer 0–255, default `128`. Values at or above the threshold become `255 - value`.                                                                                                                                                    |
| `levels`          | `black`: integer 0–254, default `16`; `white`: integer 1–255, default `235`; require `black < white`. `gamma`: 0.1–5, default `1`.                                                                                                                   |
| `color-matrix`    | `matrix`: exactly 9 row-major coefficients, each −8 to 8. Default sepia matrix: `[0.393,0.769,0.189,0.349,0.686,0.168,0.272,0.534,0.131]`.                                                                                                           |
| `convolve`        | `preset`: `edge` (default), `emboss`, `sharpen`, `box-blur`, or `custom`. Custom-only controls: `kernel`, exactly 9 coefficients −100 to 100, default `[0,-1,0,-1,5,-1,0,-1,0]`; `scale` 0.01–1,000, default `1`; `offset` −255 to 255, default `0`. |
| `morphology`      | `mode`: `dilate` (default) or `erode`; `radius`: integer 1–10, default `1`.                                                                                                                                                                          |
| `replace-color`   | `from: "#ff0000"`, `to: "#0000ff"`; `tolerance` 0–442, default `30`.                                                                                                                                                                                 |
| `chroma-key`      | `color: "#00ff00"`; `tolerance` 0–442, default `40`; `softness` 0–442, default `20`.                                                                                                                                                                 |
| `noise`           | `amount` 0–100, default `15`; `seed`: integer 0–4,294,967,295, default `1`; `monochrome`: boolean, default `true`.                                                                                                                                   |

Duotone interpolates between its endpoint colors using encoded sRGB luminance
`(0.2126R + 0.7152G + 0.0722B) / 255`, then blends with the original RGB by
`amount`. Levels clips the black/white range to 0–1 and applies the exponent
`1 / gamma`; gamma above 1 brightens midtones. Matrix output is clamped to 0–255.

Convolution filters RGB only, retaining each original alpha value. Built-in
kernels are edge `[-1,-1,-1,-1,8,-1,-1,-1,-1]`, emboss
`[-2,-1,0,-1,1,1,0,1,2]` with offset 128, sharpen
`[0,-1,0,-1,5,-1,0,-1,0]`, and a nine-ones box blur with scale 9. Other presets
use scale 1 and offset 0. Custom parameters affect only the `custom` preset.

Morphology uses a square `(2 × radius + 1)` neighborhood: dilation selects each
RGB channel's maximum, erosion its minimum, and alpha stays unchanged. Edges
use available image pixels. This supports grayscale/color intensities rather
than requiring a binary mask.

Color replacement and chroma key use Euclidean distance in 8-bit sRGB, with
matching inclusive of `tolerance`. Replacement keeps the source alpha. Chroma
key makes matches transparent; over the next `softness` distance units it
linearly restores the original alpha. With zero softness, the boundary is
hard. This is specified-color keying; it does not identify subjects or use AI.

Noise is deterministic for a given input, seed, and options. `amount` is the
maximum additive deviation in byte units; `monochrome: true` uses the same
random deviation for all three channels. Values clamp to 0–255, and alpha is
unchanged.

```bash
IMAGE_API=http://localhost:3001/api/v2/images

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/duotone" \
  -F file=@photo.png \
  -F 'options={"dark":"#16213e","light":"#ffd166","amount":0.8}' \
  -o duotone.png

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/color-space" \
  -F file=@photo.png -F 'options={"space":"cmyk","format":"tiff"}' \
  -o cmyk.tiff

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/convolve" \
  -F file=@photo.png \
  -F 'options={"preset":"custom","kernel":[0,-1,0,-1,5,-1,0,-1,0],"scale":1,"offset":0}' \
  -o sharpened.png
```

## Geometry, composition, and masking

| Tool ID       | Operation options and defaults                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `affine`      | Matrix coefficients `a`, `b`, `c`, `d`, each −4 to 4; defaults `1`, `0.2`, `0`, `1`. Require `abs(a*d - b*c) >= 0.01`. `background: "#00000000"`.                                                                                |
| `vignette`    | `strength` 0–1, default `0.65`; `radius` 0–1, default `0.35`.                                                                                                                                                                    |
| `shadow`      | `offsetX`, `offsetY`: integers −500 to 500, default `12`; `blur` 0.3–100, default `8`; `opacity` 0–1, default `0.5`; `color: "#000000"`.                                                                                         |
| `reflection`  | `height`: fraction 0.05–1 of source height, default `0.5`; `gap`: integer 0–500, default `8`; `opacity` 0–1, default `0.5`.                                                                                                      |
| `tile`        | `columns`, `rows`: integers 1–10, default `2`; `gap`: integer 0–500, default `0`; `background: "#00000000"`.                                                                                                                     |
| `auto-orient` | Shared image output options only; apply EXIF orientation and remove its tag.                                                                                                                                                     |
| `redact`      | `regions`: 1–20 rectangles, default `[{"left":0,"top":0,"width":16,"height":16}]`; `mode`: `solid` (default), `blur`, or `pixelate`; `color: "#000000"`; `blur` 0.3–100, default `10`; `blockSize`: integer 2–128, default `12`. |

Affine maps pixel-center coordinates `(x, y)` using the matrix
`[[a, b], [c, d]]`; the transformed output bounds must remain within the image
limits. A transform that collapses an output dimension below one pixel is
rejected with HTTP 422. Vignette leaves the center unchanged and darkens toward the corners;
`radius: 1` or `strength: 0` leaves RGB unchanged. Shadow follows the source
alpha, adds offset and blur space, then composites the source above it.
Reflection appends vertically mirrored rows from the bottom of the source,
with a fading alpha. Tile repeats the whole oriented image, including alpha.

Masking rectangles have integer `left`/`top` from 0–19,999 and integer
`width`/`height` from 1–20,000. Each rectangle must fit entirely inside the
oriented input; no clipping is applied. Regions are applied in list order.
Solid mode replaces the selected pixels with an opaque color; blur and
pixelate provide visual masking. There is no automatic face/text detection.
Use opaque solid regions when the goal is to remove the selected pixel content.

```bash
curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/redact" \
  -F file=@screenshot.png \
  -F 'options={"mode":"solid","regions":[{"left":20,"top":30,"width":160,"height":40}],"color":"#000000"}' \
  -o masked.png

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/shadow" \
  -F file=@transparent-product.png \
  -F 'options={"offsetX":12,"offsetY":16,"blur":8,"opacity":0.35}' \
  -o product-shadow.png
```

## ZIP asset generation

| Tool ID        | Inputs and options                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slice`        | One `file`. `columns`, `rows`: integers 1–10, default `2`; their product must be at most 20 and neither may exceed the corresponding input dimension. `format`: `png` (default), `jpeg`, or `webp`.        |
| `sprite-sheet` | 1–20 `files` in request order. `cellWidth`, `cellHeight`: integers 1–20,000, default `64`; `columns`: integer 1–20, default `4`; `gap`, `padding`: integers 0–500, default `0`; `background: "#00000000"`. |
| `icon-set`     | One `file`. `sizes`: 1–10 unique integer edges from 8–1,024, default `[16,32,48,64,128,256,512]`; `includeIco`: boolean, default `true`; `fit`: `contain` (default) or `cover`; `background: "#00000000"`. |

`slice` assigns boundaries using floor-scaled row/column positions. Every source
pixel belongs to exactly one tile, even when dimensions are not divisible by
the grid. Tile filenames are `tile-<row+1>-<column+1>.<extension>`; manifest
indices and coordinates are zero-based. The ZIP contains all tiles and
`manifest.json`, for example:

```json
{
  "version": 1,
  "kind": "slice",
  "width": 4,
  "height": 3,
  "columns": 2,
  "rows": 1,
  "tiles": [
    {
      "file": "tile-1-1.png",
      "row": 0,
      "column": 0,
      "left": 0,
      "top": 0,
      "width": 2,
      "height": 3
    },
    {
      "file": "tile-1-2.png",
      "row": 0,
      "column": 1,
      "left": 2,
      "top": 0,
      "width": 2,
      "height": 3
    }
  ]
}
```

`sprite-sheet` contain-fits each image into a fixed cell, preserving its aspect
ratio. It uses at most as many columns as input files. The ZIP contains
`sprite-sheet.png` and a manifest with the atlas dimensions, effective grid,
and each cell's source and rectangle. For two 64-pixel cells with gap 4 and
padding 8, the manifest is:

```json
{
  "version": 1,
  "kind": "sprite-sheet",
  "image": "sprite-sheet.png",
  "width": 148,
  "height": 80,
  "columns": 2,
  "rows": 1,
  "sprites": [
    {
      "index": 0,
      "source": "first",
      "left": 8,
      "top": 8,
      "width": 64,
      "height": 64
    },
    {
      "index": 1,
      "source": "second",
      "left": 76,
      "top": 8,
      "width": 64,
      "height": 64
    }
  ]
}
```

`source` is the sanitized input filename base. Rectangle dimensions describe
the full cell, including contain-fit padding.

`icon-set` generates `icon-<size>.png` for every requested size. When
`includeIco` is true, at least one size must be at most 256; only those sizes
are included in the PNG-backed `favicon.ico`. Larger PNG icons remain in the
ZIP. Its manifest has `version: 1`, `kind: "icon-set"`, an `icons` array of
`{file, width, height}`, and optional `ico: "favicon.ico"`.

```bash
curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/slice" \
  -F file=@poster.png -F 'options={"columns":3,"rows":2,"format":"png"}' \
  -o slices.zip

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/sprite-sheet" \
  -F files=@first.png -F files=@second.png \
  -F 'options={"cellWidth":64,"cellHeight":64,"columns":2,"gap":4,"padding":8}' \
  -o sprites.zip

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/icon-set" \
  -F file=@logo.png \
  -F 'options={"sizes":[16,32,48,128,256,512],"includeIco":true,"fit":"contain"}' \
  -o icons.zip
```

## Pixel inspection and fingerprints

`pixel-inspect` accepts integer `x` and `y`, each 0–63,999,999, default `0`.
The requested point must be inside the actual oriented image. The JSON response
reports `x`, `y`, oriented `width`/`height`, four 8-bit sRGB `rgba` components,
and lowercase `hex` in `#RRGGBBAA` form:

```json
{
  "x": 20,
  "y": 30,
  "width": 640,
  "height": 480,
  "rgba": [34, 68, 102, 255],
  "hex": "#224466ff"
}
```

`fingerprint` accepts `algorithm: "difference"` (default) or `"average"`.
It returns `algorithm`, a 16-character lowercase hexadecimal `hash`, a
64-character lowercase hexadecimal `sha256`, and oriented `width`/`height`.
The perceptual hash flattens transparency onto white, converts to grayscale,
and resizes to 9×8 for adjacent-pixel differences or 8×8 for average-threshold
comparisons. Perceptual hashes can collide; use Hamming distance for approximate
visual matching. SHA-256 hashes the original uploaded bytes, so metadata and
encoding changes affect it even when the visible pixels are unchanged.

```bash
curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/pixel-inspect" \
  -F file=@photo.png -F 'options={"x":20,"y":30}'

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/fingerprint" \
  -F file=@photo.png -F 'options={"algorithm":"difference"}'
```

## Resource and format boundaries

The general upload ceiling is 25 MiB per file and 100 MiB per request. Inputs
and outputs are limited to 64 million pixels, image outputs to 20,000 pixels
per edge, and encoded responses to 100 MiB. ZIPs enforce both combined encoded
entry bytes and final archive bytes. The synchronous deadline is 30 seconds.

The following tools additionally preflight each decoded RGBA working buffer
against 25 MiB (26,214,400 bytes, or 6,553,600 pixels): `extract-channel`,
`duotone`, `posterize`, `solarize`, `levels`, `color-matrix`, `convolve`,
`morphology`, `replace-color`, `chroma-key`, `noise`, `vignette`, `shadow`,
`reflection`, and `redact`. Shadow and reflection also check their expanded
canvas against this ceiling. These are per-buffer allocation limits, not a
promise that total process memory stays below 25 MiB. Resize large images first:

```bash
curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/resize" \
  -F file=@large-photo.jpg \
  -F 'options={"width":2000,"height":2000,"fit":"inside","withoutEnlargement":true}' \
  -o smaller.jpg

curl -H "Authorization: Bearer $API_KEY" "$IMAGE_API/noise" \
  -F file=@smaller.jpg -F 'options={"amount":8,"seed":42}' -o textured.png
```

Animated and multipage inputs are rejected. Camera RAW, SVG/layered editing,
OCR, neural upscaling, generative editing, and AI subject/background removal
remain outside scope. Basic CMYK conversion does not supply custom ICC/prepress
controls. ICO creation is limited to PNG-backed icon-set output; ICO decoding
and general ICO conversion are not supported.
