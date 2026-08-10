# Testing and release gate

Image Everything does not treat an HTTP `200` as proof that an image feature
works. The release gate verifies the shared schema, native engine behavior,
private multipart boundary, public multipart boundary, UI request shape, and a
real production-build smoke path.

## Test layers

1. **Contracts** — every route and tool ID is unique; defaults and example
   payloads parse; pipeline and v1 translations produce canonical v2 options;
   capability and problem documents match their public schemas.
2. **Worker engine** — operations decode generated fixtures and assert output
   format, dimensions, metadata, measurements, archive manifests, or
   representative pixels. Boundary and invalid-combination behavior is also
   asserted.
3. **Private worker HTTP** — authenticated multipart requests exercise each
   input shape and result shape. Multipart field validation, byte sniffing,
   configured uploaded-image payload limits, and stable errors are checked at
   the native HTTP boundary. Animation/multi-page rejection is covered directly
   at the engine boundary.
4. **Public gateway HTTP** — a running Nest application forwards every one of
   the 29 explicit POST routes to a fake private HTTP worker, validates options,
   preserves safe results, maps failures, publishes OpenAPI, and keeps v1
   adapters operational.
5. **UI** — all 28 manifest entries have valid defaults, controls, icons,
   canonical routes, correct FormData field names, result handling, cancellation,
   stale-result protection, and pipeline import/export behavior.
6. **Full-stack smoke** — production builds of the worker, API, and web app run
   on isolated ports. Real PNG and HEIC fixtures traverse the public API and
   private worker through all 29 routes. All 28 canonical UI URLs receive
   server-render route checks. Headless Chrome additionally selects a real file,
   submits the hydrated UI, and validates the rendered image, JSON, and ZIP
   result shapes through the compress, metadata, and responsive tools.

## Per-tool acceptance matrix

| Tool                    | Implemented semantic coverage                                                |
| ----------------------- | ---------------------------------------------------------------------------- |
| Compress                | advertised codecs decode; representative low/high quality outputs differ     |
| Compress to size        | a reachable target is met without returning undecodable bytes                |
| Resize                  | fill/inside, percentage, and no-enlargement dimensions                       |
| Convert                 | each advertised requested output format decodes as that format               |
| Responsive set          | deduplicated variants, manifest/output agreement, and geometry preflight     |
| Quick enhance           | a combined tonal/color/sharpen request changes representative pixels         |
| Crop                    | rectangle bounds and centered aspect-ratio output geometry                   |
| Rotate / flip           | right-angle and arbitrary-angle geometry plus the flip execution path        |
| Trim                    | a known uniform border is removed                                            |
| Extend / pad            | all four edge modes produce bounded, distinct outputs                        |
| Background / alpha      | flatten, ensure, remove, and extract-alpha channel behavior                  |
| Adjust color            | a combined brightness/saturation/hue/contrast/gamma request changes pixels   |
| Normalize / CLAHE       | global normalization and CLAHE both produce transformed output               |
| Filters                 | every filter variant transforms output; grayscale channel values agree       |
| Blur / sharpen / median | every local-filter variant produces transformed output                       |
| Pixelate                | pixels change while dimensions are preserved                                 |
| Watermark               | XML escaping, text opacity/anchors, and uploaded-image overlay execution     |
| Frame / rounded corners | border dimensions and a rounded-background pixel sample                      |
| Collage                 | grid, horizontal, and vertical geometry for repeated inputs                  |
| Metadata inspector      | core format/dimensions and categorized metadata                              |
| Metadata cleaner        | privacy, strip-all, and selected EXIF preservation                           |
| Metadata editor         | every edit field plus preserve/replace policy is observable after inspection |
| Image statistics        | entropy plus channel inclusion/exclusion                                     |
| Palette                 | requested color count plus valid sampled color entries                       |
| Histogram               | RGB, RGBA, and luminance bin shapes; exercised bin totals match pixels       |
| Compare                 | error/first/smallest/largest sizing, alpha policy, threshold, and metrics    |
| Pipeline                | ordering, enable/disable, metadata edit, geometry, and UI import/export      |
| Batch                   | parsed success/error manifest, sanitized names, continuation, and fail-fast  |

Compare also has a separate difference-image route, so the full public surface
contains 29 POST endpoints for 28 tools.

## Cross-cutting fixtures and failures

The test matrix also covers:

- every encoder advertised by the running worker, with decode round trips;
- an embedded HEIC primary-image decode-to-PNG round trip plus live multipart
  metadata and conversion coverage;
- invalid bytes with a trusted-looking filename and MIME type;
- animated or multi-page inputs without silent first-frame flattening;
- missing fields, malformed options, over-size files, aggregate uploaded-image
  payload, pixel limits, file count, pipeline length, and output dimensions;
- the typed 100 MiB encoded-output limit and archive aggregate guard at its
  exact boundary without allocating a 100 MiB fixture;
- missing and invalid public bearer credentials plus missing and invalid
  private-worker bearer credentials;
- worker timeout, unavailability, invalid errors, and invalid successful
  responses;
- safe `Content-Disposition` generation and archive-path sanitization for
  malicious input filenames; and
- parsed batch success/error manifests, continuation after a bad file, and
  fail-fast rejection.

## Commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
docker compose config --quiet
docker compose build
```

The commands above are required in CI. Encoder output bytes are not compared
byte-for-byte because valid libvips builds may encode differently; tests decode
the result and assert its observable contract instead. `pnpm smoke` requires a
Chrome/Chromium binary; set `IMAGE_EVERYTHING_CHROME_PATH` when it is not on a
standard executable path.
