# Image API workflows

All 57 console tools use the same public Nest API as scripts and integrations,
with 58 processing routes (comparison has JSON and PNG-difference routes).
The private image worker executes image operations; Nest owns authentication,
validation, rate limits, OpenAPI, and response handling. Discover installed
codecs at `GET /api/v2/capabilities` and inspect routes at `/api/docs` or
`/api/openapi.json`. The authoritative schemas live in
`packages/image-contracts/src/`.

## Coverage

| Workflow                          | Public route suffix under `/api/v2/images`                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image-to-image conversion         | `convert`                                                                                                                                         |
| Compression / target byte size    | `compress`, `compress-to-size`                                                                                                                    |
| Formatting, dimensions, geometry  | `resize`, `crop`, `rotate`, `trim`, `extend`, `alpha`, `frame`                                                                                    |
| Color and effects                 | `quick-enhance`, `adjust`, `normalize`, `filter`, `blur-sharpen`, `pixelate`                                                                      |
| Composition                       | `watermark`, `collage`                                                                                                                            |
| Metadata and analysis             | `metadata`, `metadata/clean`, `metadata/edit`, `analyze/stats`, `analyze/palette`, `analyze/histogram`, `analyze/compare`, `analyze/compare/diff` |
| Automation                        | `process`, `batch`, `responsive`                                                                                                                  |
| Raw pixel decode and encode       | `decode`, `encode`                                                                                                                                |
| Base64 / data URLs                | `to-base64`, `from-base64`                                                                                                                        |
| Full image validation             | `validate`                                                                                                                                        |
| Color conversion and channels     | `color-space`, `extract-channel`                                                                                                                  |
| Advanced color effects            | `duotone`, `posterize`, `solarize`, `levels`, `color-matrix`, `convolve`, `morphology`, `replace-color`, `chroma-key`, `noise`, `vignette`        |
| Advanced geometry and composition | `affine`, `auto-orient`, `redact`, `shadow`, `reflection`, `tile`                                                                                 |
| Asset generation                  | `slice`, `sprite-sheet`, `icon-set`                                                                                                               |
| Pixel and image identification    | `pixel-inspect`, `fingerprint`                                                                                                                    |

JPEG, PNG, WebP, AVIF, still GIF, and TIFF are output candidates, subject to
runtime probing. HEIC has a probed decode fallback. Unsupported formats and
animated/multi-image inputs are explicitly rejected. Query capabilities rather
than inferring support from the file extension.

## Conversion and compression

These examples assume the local API and a configured `API_KEY`. Omit the
Authorization header when authentication is disabled locally.

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/convert \
  -F file=@photo.heic -F 'options={"format":"webp","quality":85}' -o photo.webp

curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/compress-to-size \
  -F file=@photo.png -F 'options={"format":"jpeg","targetBytes":150000}' -o compact.jpg
```

## Decode and encode raw pixels

`decode` accepts an encoded image and `{ "channels": "rgb" | "rgba" }` (default
`rgba`). It applies image orientation, converts to sRGB, and returns a ZIP:

- `pixels.raw`: 8-bit unsigned, interleaved RGB/RGBA, row-major, without row
  padding; RGBA uses straight (unpremultiplied) alpha.
- `manifest.json`: dimensions, channel layout, stride, byte length, depth, and
  color space. It is separate from batch/responsive archive manifests.

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/decode \
  -F file=@photo.png -F 'options={"channels":"rgba"}' -o decoded.zip
unzip decoded.zip -d decoded

# Read width and height from decoded/manifest.json; use those exact values.
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/encode \
  -F file=@decoded/pixels.raw \
  -F 'options={"width":640,"height":480,"channels":"rgba","format":"png","lossless":true}' \
  -o restored.png
```

Raw input must contain exactly `width × height × channels` bytes. It and decoded
raw output are capped at 25 MiB, with at most 20,000 pixels per edge. Resize
larger images first. `encode` supports the conversion encoder controls and
defaults to lossless PNG. This operates on pixel buffers, not camera RAW files.
Image metadata is not carried in the raw manifest.

## Base64 and data URLs

`to-base64` fully validates an image, then serializes its original encoded bytes
without changing metadata. The JSON response contains `data`, `encoding`,
`format`, `contentType`, and `bytes`.

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/to-base64 \
  -F file=@photo.png -F 'options={"dataUrl":true}' -o image-base64.json

# Extract the text payload, not the surrounding JSON object.
jq -r .data image-base64.json > image.txt
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/from-base64 \
  -F file=@image.txt -F 'options={"format":"webp","quality":85}' -o decoded.webp
```

`from-base64` accepts standard padded Base64 (ASCII whitespace permitted), or a
`data:image/<supported-format>;base64,...` URL. It rejects noncanonical padding,
invalid characters, and a MIME type that disagrees with the actual bytes.
It re-encodes the decoded image with the conversion options, defaulting to PNG
and stripped metadata. It does not fetch remote URLs.

Encoded images are capped at 25 MiB. To allow Base64 round trips, text uploads
may contain `ceil(25 MiB / 3) × 4 + 1024` bytes (approximately 33.34 MiB), while
decoded image bytes remain capped at 25 MiB. Arbitrarily whitespace-padded
files still must fit that serialized limit. JSON responses have a separately
bounded allowance for the Base64 expansion.

## Validation and pipelines

`validate` forces complete pixel decoding, rather than checking only image
headers. A successful JSON response includes `valid: true`, format,
auto-oriented dimensions, source channels, alpha, and input bytes. Source
channels may exceed four for formats such as CMYK+alpha TIFF. Invalid images
return the usual `application/problem+json` response.

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/validate \
  -F file=@photo.png

curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/process \
  -F file=@photo.png \
  -F 'options={"steps":[{"op":"resize","options":{"width":800}},{"op":"filter","options":{"kind":"grayscale"}}],"output":{"format":"webp","quality":80}}' \
  -o processed.webp
```

Use `batch` with repeated `files` fields and a `pipeline` option to apply the
same sequence to multiple images. Base64 serialization, raw pixel I/O, and
validation are standalone operations rather than pipeline steps.
The 24 advanced operations are also standalone endpoints. Chain their encoded
results through subsequent requests when combining them with existing tools.

## Advanced image operations

Use chroma key for a known background color, generate several favicon sizes,
or inspect one exact pixel through the same multipart API:

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/chroma-key \
  -F file=@green-screen.png \
  -F 'options={"color":"#00ff00","tolerance":40,"softness":20,"format":"png"}' \
  -o keyed.png

curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/icon-set \
  -F file=@logo.png \
  -F 'options={"sizes":[16,32,48,128,256,512],"includeIco":true}' \
  -o icons.zip

curl -H "Authorization: Bearer $API_KEY" http://localhost:3001/api/v2/images/pixel-inspect \
  -F file=@photo.png -F 'options={"x":20,"y":30}'
```

Chroma key uses RGB distance and existing alpha; it does not detect subjects or
perform AI background removal. Encoded results from the advanced tools strip
metadata and bake in orientation. PNG is the default image output with
`lossless: true`; use `lossless: false` explicitly for lossy WebP/AVIF output.

The [advanced tools reference](advanced-tools.md) documents all 24 routes,
their option defaults and bounds, the 25 MiB raw working-buffer limit,
sprite/slice/icon ZIP manifests, and pixel/fingerprint JSON responses.

See [scope](v2-scope.md) for the complete limits and exclusions, and
[worker deployment](../workers/DEPLOYMENT.md) for runtime configuration.
