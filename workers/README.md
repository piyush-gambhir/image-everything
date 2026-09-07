# Image execution workers

Workers own image decoding, transforms, analysis, encoding, and archives. The
Nest gateway owns the public API; the browser uses that same API as other clients.

```text
Console / API clients -> Nest public API -> private image-worker -> Sharp/libvips
                           contracts shared across every package
```

`image-worker/` groups still-image operations that share Sharp/libvips, EXIF
parsing, and HEIC decoding. Keep operations in the same worker while their
dependencies and scaling needs are the same. A future OCR, animation, or GPU
runtime belongs in a separate worker when its dependencies or resource profile
justify that boundary.

Each runtime owns its implementation, HTTP adapter, tests, and container image.
The gateway must not import the worker implementation or native imaging packages.
Shared contracts live in `packages/image-contracts/` and contain no execution code.

The worker participates in the root pnpm workspace and uses the repository root
as its Docker build context. Its private HTTP protocol is documented in
[`image-worker/README.md`](image-worker/README.md). Public integrations should use
the gateway's `/api/v2/images/*` endpoints and `/api/v2/capabilities` discovery.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for Docker, configuration, verification,
and container image publishing.
