# Image Everything v2 scope

Image Everything v2 is a comprehensive, self-hostable toolbox for common
**still-image** workflows. “Complete” means complete against the published
surface and acceptance matrix in this document; it does not mean every imaging
workflow that could ever exist.

## Product promise

> 57 open-source tools and 58 processing routes covering common still-image conversion,
> optimization, editing, composition, metadata, analysis, and batch workflows.

The product does not claim professional RAW development, animated-image
editing, layered document round trips, vector illustration, video, scientific
imaging, or vendor-backed AI features.

## Architecture

The v2 release has four product surfaces with one shared contract:

1. `@image-everything/contracts` owns operation IDs, Zod schemas, limits,
   result metadata, runtime capabilities, and problem responses.
2. `image-worker` owns Sharp/libvips decoding, analysis, transforms, encoding,
   runtime codec probes, and bounded multi-file execution.
3. The Nest API is a thin authenticated multipart gateway. It validates the
   public request, dispatches to the private worker, and returns safe responses.
4. The Next.js application derives navigation, tool pages, controls, API
   reference content, and search from one typed tool manifest.

The public v2 base path is `/api/v2/images`. Existing `/api/v1/images` and
`/api/images` routes remain compatibility adapters.

## Format boundary

| Format       | Decode                                              | Encode         | v2 policy                                          |
| ------------ | --------------------------------------------------- | -------------- | -------------------------------------------------- |
| JPEG         | yes                                                 | yes            | still image                                        |
| PNG          | yes                                                 | yes            | still image                                        |
| WebP         | runtime-probed                                      | runtime-probed | static only                                        |
| AVIF         | runtime-probed                                      | runtime-probed | static only                                        |
| GIF          | runtime-probed                                      | runtime-probed | static only                                        |
| TIFF         | runtime-probed                                      | runtime-probed | multi-page input is rejected                       |
| HEIC         | embedded-fixture-probed native/fallback decode      | no             | single image only; explicit output required        |
| Generic HEIF | not advertised without an independent fixture probe | no             | rejected unless a future runtime probe verifies it |

Runtime codec capabilities are derived from worker probes rather than
hard-coded. Operation availability is gated by the required JPEG/PNG baseline
and backed by semantic engine tests rather than a separate startup probe for
every operation. Animated or multi-page transforms return
`ANIMATED_INPUT_UNSUPPORTED`; they are never silently flattened. Input type is
detected from bytes rather than trusted from a filename or multipart MIME
header.

`icon-set` additionally generates PNG-backed, multi-resolution ICO files inside
a ZIP. ICO is an asset-bundle output, not an accepted input or a general
`convert` output format. `color-space` supports basic sRGB, grayscale, and CMYK
conversion; CMYK output requires JPEG or TIFF.

## Tool inventory

### Optimize and export

1. **Compress** — contextual JPEG, PNG, WebP, AVIF, GIF, and TIFF encoder
   controls.
2. **Compress to size** — bounded quality search for a requested byte target.
3. **Resize** — dimensions or percentage, five fit modes, position, kernel,
   background, and no-enlargement policy.
4. **Convert** — explicit output format with no silent JPEG fallback.
5. **Responsive set** — multiple widths and formats returned as a ZIP with a
   manifest.
6. **Quick enhance** — deterministic normalize, brightness, saturation, hue,
   and sharpen controls.

### Geometry and canvas

7. **Crop** — exact rectangle or aspect-ratio crop after auto-orientation.
8. **Rotate / flip** — arbitrary angle, horizontal/vertical flip, and
   background.
9. **Trim** — remove matching borders with threshold controls.
10. **Extend / pad** — per-edge canvas extension using background, copy,
    repeat, or mirror behavior.
11. **Background / alpha** — flatten, ensure alpha, remove alpha, or extract
    alpha.

### Color and effects

12. **Adjust color** — brightness, saturation, hue, contrast, and gamma.
13. **Normalize / CLAHE** — tonal normalization or local histogram equalization.
14. **Filters** — grayscale, sepia, invert, threshold, and tint.
15. **Blur / sharpen / median** — bounded local filtering controls.
16. **Pixelate** — deterministic block-size pixelation.

### Composition

17. **Watermark** — validated text or image overlays with anchor, opacity,
    scale, offset, and safe font choices.
18. **Frame / rounded corners** — border, color, radius, and optional
    background.
19. **Collage / contact sheet** — grid, horizontal, or vertical layout for
    2–20 images.

### Metadata and analysis

20. **Metadata inspector** — recognized EXIF, IPTC, XMP, GPS, ICC, and image
    properties.
21. **Metadata cleaner** — privacy, strip-all, or selected-preservation policy.
22. **Metadata editor** — whitelisted artist, copyright, description, software,
    capture date, and density fields.
23. **Image statistics** — dimensions, color space, entropy, sharpness,
    dominant color, and per-channel statistics.
24. **Palette** — deterministic sampled colors with approximate percentages.
25. **Histogram** — RGB, RGBA, or luminance bins.
26. **Compare** — MAE, RMSE, differing-pixel percentage, and a PNG difference
    view for two images.

### Automation

27. **Pipeline** — add, remove, reorder, duplicate, enable, disable, import,
    and export a validated sequence; decode and encode once.
28. **Batch** — run one pipeline over 1–20 inputs and return a ZIP plus a
    per-file success/error manifest.

### Encoding, decoding, and validation

29. **Decode pixels** — extract auto-oriented, 8-bit interleaved sRGB RGB/RGBA
    bytes and a layout manifest in a ZIP. This is pixel decoding, not camera RAW development.
30. **Encode pixels** — validate an exact raw byte layout and encode it to any
    available output format. PNG defaults to lossless for exact pixel round trips.
31. **Image to Base64** — fully validate and serialize the original encoded
    image bytes as standard Base64 or a data URL, preserving original metadata.
32. **Base64 to image** — decode canonical Base64 or a supported image data URL,
    check its actual image bytes, and re-encode to an explicit output format.
33. **Validate image** — fully decode the pixel payload and report core properties;
    corrupt, unavailable-codec, animated, and oversized inputs use stable problems.

### Advanced color and pixel effects

34. **Color space** — convert to sRGB, grayscale, or JPEG/TIFF CMYK.
35. **Extract channel** — export red, green, blue, or alpha as an opaque grayscale image.
36. **Duotone** — map luminance between two colors with adjustable strength.
37. **Posterize** — quantize RGB to 2–32 levels per channel.
38. **Solarize** — invert RGB components at or above a threshold.
39. **Levels** — black/white point clipping and midtone gamma.
40. **Color matrix** — apply a bounded, row-major 3×3 RGB matrix.
41. **Convolve** — edge, emboss, sharpen, box-blur, or custom 3×3 kernels.
42. **Morphology** — square RGB dilation/erosion with preserved alpha.
43. **Replace color** — replace RGB colors within a Euclidean distance tolerance.
44. **Chroma key** — remove a specified color with a soft alpha transition.
45. **Noise** — deterministic, seeded, monochrome or independent RGB noise.

### Advanced geometry, assets, and analysis

46. **Affine transform** — bounded invertible scale, shear, and rotation matrices.
47. **Vignette** — darken edges with adjustable radius and strength.
48. **Drop shadow** — blur and offset the source alpha onto an expanded canvas.
49. **Reflection** — append a vertically flipped, fading reflection.
50. **Tile image** — repeat an image in a grid with configurable gaps.
51. **Slice image** — partition every source pixel into tiles with a ZIP layout manifest.
52. **Sprite sheet** — contain-fit 1–20 images in fixed cells and export a PNG atlas with coordinates.
53. **Icon set / favicon** — generate PNG sizes and an optional multi-resolution ICO.
54. **Pixel inspector** — report sRGB RGBA and hex at an oriented pixel coordinate.
55. **Image fingerprint** — 64-bit average/difference perceptual hash and source-byte SHA-256.
56. **Auto-orient** — bake EXIF orientation into the output pixels.
57. **Region masking** — opaque cover, blur, or pixelation in user-selected rectangles.

These 24 tools execute entirely inside the image worker and are standalone API
operations. See [advanced tools](advanced-tools.md) for exact schemas,
semantics, examples, and ZIP/JSON result definitions.

## V2 endpoints

```text
POST /api/v2/images/compress
POST /api/v2/images/compress-to-size
POST /api/v2/images/resize
POST /api/v2/images/convert
POST /api/v2/images/responsive
POST /api/v2/images/quick-enhance

POST /api/v2/images/crop
POST /api/v2/images/rotate
POST /api/v2/images/trim
POST /api/v2/images/extend
POST /api/v2/images/alpha

POST /api/v2/images/adjust
POST /api/v2/images/normalize
POST /api/v2/images/filter
POST /api/v2/images/blur-sharpen
POST /api/v2/images/pixelate

POST /api/v2/images/watermark
POST /api/v2/images/frame
POST /api/v2/images/collage

POST /api/v2/images/metadata
POST /api/v2/images/metadata/clean
POST /api/v2/images/metadata/edit
POST /api/v2/images/analyze/stats
POST /api/v2/images/analyze/palette
POST /api/v2/images/analyze/histogram
POST /api/v2/images/analyze/compare
POST /api/v2/images/analyze/compare/diff

POST /api/v2/images/process
POST /api/v2/images/batch
POST /api/v2/images/decode
POST /api/v2/images/encode
POST /api/v2/images/to-base64
POST /api/v2/images/from-base64
POST /api/v2/images/validate

POST /api/v2/images/color-space
POST /api/v2/images/extract-channel
POST /api/v2/images/duotone
POST /api/v2/images/posterize
POST /api/v2/images/solarize
POST /api/v2/images/levels
POST /api/v2/images/color-matrix
POST /api/v2/images/convolve
POST /api/v2/images/morphology
POST /api/v2/images/replace-color
POST /api/v2/images/chroma-key
POST /api/v2/images/noise
POST /api/v2/images/affine
POST /api/v2/images/vignette
POST /api/v2/images/shadow
POST /api/v2/images/reflection
POST /api/v2/images/tile
POST /api/v2/images/slice
POST /api/v2/images/sprite-sheet
POST /api/v2/images/icon-set
POST /api/v2/images/pixel-inspect
POST /api/v2/images/fingerprint
POST /api/v2/images/auto-orient
POST /api/v2/images/redact
GET  /api/v2/capabilities
```

## Pipeline boundary

Pipeline-safe pixel steps are:

```text
resize, crop, rotate, trim, extend, alpha, adjust, normalize, filter,
blur-sharpen, pixelate, frame, watermark-text, quick-enhance
```

Encoding, compression, metadata policy, and metadata edits are terminal output
settings. Analysis, target-size compression, responsive output, collage,
comparison, and image-overlay watermark stay standalone because they require a
different execution or result shape.
Raw encoding/decoding, Base64, validation, and the 24 advanced tools are also
standalone. Their route IDs are not accepted as pipeline step names; chain
separate API requests when combining those operations.

## Limits

| Resource                                  |         Limit |
| ----------------------------------------- | ------------: |
| One primary upload                        |        25 MiB |
| Raw I/O and affected RGBA working buffers |        25 MiB |
| Aggregate uploaded image payload          |       100 MiB |
| Overlay upload                            |        10 MiB |
| Input or output pixels                    |         64 MP |
| Output dimension                          |     20,000 px |
| Aggregate encoded response                |       100 MiB |
| Batch/collage files                       |            20 |
| Sprite-sheet inputs / slice tiles         |            20 |
| Icon-set sizes / largest icon edge        | 10 / 1,024 px |
| Pipeline steps                            |            20 |
| Synchronous execution deadline            |    30 seconds |

The aggregate upload limit is not the exact wire-format multipart length. The
API counts uploaded files plus serialized options; the worker independently
caps uploaded image bytes and allows at most 1 MiB of bounded multipart framing
and field overhead. The encoded-response limit applies to a single image or to
both the combined encoded entries and final ZIP body. Resource limits are
enforced at the API and/or worker boundary appropriate to each resource.

The RGBA working-buffer ceiling is 6,553,600 pixels. It applies to channel extraction, duotone,
posterize, solarize, levels, color matrix, convolution, morphology, color
replacement, chroma key, noise, vignette, shadow, reflection, and region
masking. Shadow and reflection preflight the expanded canvas as well as their
input. Resize larger images first. Other advanced tools retain the general
pixel and output-dimension ceilings. Every newly encoded advanced-tool result
strips metadata; alpha is preserved where the operation and output format
support it.

## Stable errors

All failures use `application/problem+json` with a stable `code`, HTTP status,
human-readable detail, request instance, and retryability. The public mapping
is:

- `400` malformed multipart or missing inputs
- `401` invalid or missing API key
- `413` byte, pixel, output, or aggregate limit
- `415` unsupported or unavailable codec
- `422` corrupt input, invalid options, unsupported animation, or invalid
  operation combination
- `429` request-rate limit
- `502` invalid worker response
- `503` unavailable worker/runtime
- `504` execution deadline
- `500` opaque internal failure

Raw Sharp/libvips errors and stack traces are never returned to clients.

## Definition of complete

V2 is complete only when all conditions below pass:

- Every one of the 57 tools has a functional UI with no placeholder card.
- Every endpoint uses a shared Zod contract and appears in OpenAPI and the API
  reference.
- The worker runtime-probes advertised codecs; operation availability is gated
  by baseline codec readiness and every route has semantic engine coverage.
- The UI exposes every option it claims and clearly identifies server uploads.
- V1 compatibility routes continue to pass their contract tests.
- Every tool has schema, engine, worker-boundary, public multipart API, and UI
  coverage appropriate to its input/result shape.
- A smoke suite uploads real fixtures through the public Nest API, traverses the
  private worker, and validates every endpoint’s output—not only its status.
- Format fixtures cover every codec advertised by the running worker.
- Missing and invalid public/private bearer credentials, malformed input, MIME
  spoofing, upload/pixel/dimension limits, animation rejection, safe response
  filenames, archive-path sanitization, batch success/error manifests,
  continuation/fail-fast behavior, and unavailable-worker behavior are tested.
- Lint, formatting, type-checking, all unit/integration tests, production and
  container builds, Docker Compose validation, and the full smoke matrix pass
  in CI.

## Explicitly deferred

- Animated GIF/WebP/APNG preservation and editing
- SVG, ICO input, BMP, JPEG XL, camera RAW, PSD/XCF, PDF, video, and layered/vector documents
- AI subject/background removal, OCR, automatic face detection/redaction, neural denoise/upscale,
  generative fill, and other model-backed features
- Professional CMYK/prepress profile controls, HDR grading, scientific, medical, geospatial,
  forensic, or panorama-stacking workflows
- Durable uploads, asynchronous jobs, webhooks, CDN transformations, billing,
  and user accounts
