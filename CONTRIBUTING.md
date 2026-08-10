# Contributing

Thanks for helping improve Image Everything.

## Development setup

1. Fork and clone the repository.
2. Install Node.js 22 or later and pnpm 9.15.4.
3. Run `pnpm install` from the repository root.
4. Copy `.env.example` to `.env` and set
   `NEXT_PUBLIC_API_URL=http://localhost:3001` in `web/.env.local`.
5. Run `pnpm dev`.

## Before a pull request

Run the same checks as CI:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Keep pull requests focused. Add or update tests for behavior changes. Image
tests should assert decoded format, dimensions, metadata, or pixel samples—not
byte-for-byte encoder output.

## Adding an image operation

An operation is complete only when it has:

1. A shared Zod schema, registry entry, exported types, and contract tests.
2. A worker engine implementation with success, boundary, and failure tests.
3. A private worker multipart route and a public NestJS route under
   `/api/v2/images`.
4. Public running-HTTP integration coverage and a real-fixture smoke case.
5. A functional manifest-driven UI with controls for every claimed option.
6. OpenAPI, API-reference, capability, scope, and README updates.

Do not add remote-URL image inputs without an SSRF threat model. Heavy OCR,
background-removal, or ML runtimes require a separately bounded worker and an
explicit product-scope decision.

## Reporting bugs

Include the input format, operation and options, expected behavior, actual
behavior, platform, Node version, and the output of `/api/v2/capabilities`.
Never attach private photos or metadata to a public issue.
