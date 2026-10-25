# Node 26 upgrade verification

Reviewed on 25 October 2026 against `32fb6cc` on main. The shared
[upgrade playbook](https://github.com/piyush-gambhir/pdf-everything/blob/main/docs/upgrade-playbook.md)
describes the review and publication sequence.

## Changes and compatibility

- Node 26.12.1 and pnpm 12.15.0 are pinned in local setup, CI, and containers.
  Node 26 has no bundled Corepack. Docker explicitly installs pnpm and allows
  its install script for that global install, without changing global policy.
- Compatible direct dependencies are current. Web ESLint stays on 9.39.5 for
  the Next.js/React plugin peer requirements; other workspaces use ESLint 10.
- TypeScript 7.0.2 runs every workspace's main typecheck and builds the contracts
  and image worker. TypeScript 6.0.3 remains for compiler API consumers such as
  Nest, Next.js, ESLint, and the boundary checker. CI checks both compilers using
  explicit paths because both npm packages expose a `tsc` executable.
- The latest main security updates and web configuration are preserved. The
  stale Browserslist override was removed after it rewrote a valid peer range
  into an incompatible exact version. Redundant overlapping overrides were
  removed; required bounded security overrides remain.

## Verification

- Frozen install and peer checks pass. Full and production dependency audits
  report zero known advisories. This is not a full application security audit.
- 562 tests pass: contracts 46, gateway 117, worker 286, web 113.
- Lint and both compiler checks pass. Four existing React effect warnings
  remain in unchanged web source; lint reports zero errors. Formatting passes.
- All four workspace builds and all three Docker images build successfully.
  Fresh Linux/arm64 images run Node 26.12.1; Sharp 0.35.5 loads libvips 8.18.7.
- The compiled stack passes 58 API routes, 57 UI route renders, three real
  browser workflows, authentication, capabilities, and invalid input handling.
  The same suite passes against the three containers with read-only root
  filesystems and writable `/tmp`, including image, JSON, and ZIP browser flows.
- Existing behavior, pixel round-trip, output, security, and recovery tests
  remain. No tests were deleted solely because they predate the upgrade.

## Measurements

Both compilers checked identical sources and dependencies under Node 26.12.1.
Each project had one warm-up, followed by five samples in alternating order,
with no emit and incremental checking disabled. These are local wall-clock
medians, including compiler startup, on a shared development host.

| Workspace | TypeScript 6 | TypeScript 7 | Speedup |
| --------- | -----------: | -----------: | ------: |
| Contracts |       735 ms |       221 ms |    3.3x |
| Gateway   |     1,038 ms |       243 ms |    4.3x |
| Worker    |       715 ms |       119 ms |    6.0x |
| Web       |     2,473 ms |       436 ms |    5.7x |

[Raw compiler samples](benchmarks/typecheck-2026-10-25.json) include version
checks. These results do not establish a full build speedup: Nest and Next.js
still use the TypeScript 6 API.

A separate runtime-only comparison processed a deterministic 1920x1080 PNG into
512x512 WebP at quality 80. Each runtime ran five separate processes in
alternating order, with three warm-ups and 25 timed images per process. Both
used identical current worker code, Sharp/libvips versions, and image bytes;
every output hash matched. Sharp caching was disabled and libvips used one
thread. Output validation and fixture construction were outside the timing.

| Runtime      |  Median |     p95 |
| ------------ | ------: | ------: |
| Node 24.22.0 | 23.1 ms | 26.0 ms |
| Node 26.12.1 | 22.7 ms | 25.6 ms |

The approximately 1.4% median difference is small relative to run variation and
does not establish a reliable image processing speedup. This older Node 24
comparison isolates the runtime; it is not a before/after comparison against
main's Node 24.22.1 release. It excludes HTTP, browser work, cold starts,
concurrency, memory, cost, and production traffic.
[Raw runtime samples](benchmarks/image-runtime-2026-10-25.json) retain hashes and
all timings.

## Reproduce and publish

Use the pinned runtime and package manager, then run:

```bash
pnpm install --frozen-lockfile
pnpm peers check
pnpm --filter @image-everything/contracts build
pnpm check:boundaries
pnpm exec turbo run lint typecheck test --cache=local:,remote:
pnpm -r --if-present typecheck:compat
pnpm exec turbo run build --cache=local:,remote:
pnpm smoke
pnpm format:check
pnpm audit
pnpm audit --prod
node scripts/benchmark-typecheck.mjs
node scripts/benchmark-image.cjs
```

Chrome is required for the browser flows. To compare image runtimes, invoke
`benchmark-image.cjs` with each Node binary against the same built worker, in
alternating order. It emits one process's samples and verifies output content.

Merging main publishes the API and worker for amd64 and arm64. Verify the
publication workflow, source revision, immutable digests, and downloaded images
before declaring publication complete. The web Docker image is built locally;
the release workflow does not publish or deploy it. Local container verification
used arm64, and no production deployment was performed.
