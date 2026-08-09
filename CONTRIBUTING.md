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
```

Keep pull requests focused. Add or update tests for behavior changes. Image
tests should assert decoded format, dimensions, metadata, or pixel samples—not
byte-for-byte encoder output.

## Adding an image operation

An operation is complete only when it has:

1. A Zod options schema and exported types.
2. A `sharp` engine implementation with boundary tests.
3. A thin NestJS controller method under `/api/v1/images`.
4. A UI page that calls the same public endpoint.
5. OpenAPI and README/API-reference documentation.

Do not add remote-URL image inputs without an SSRF threat model. Heavy OCR,
background-removal, or ML runtimes should be isolated from the core API.

## Reporting bugs

Include the input format, operation and options, expected behavior, actual
behavior, platform, Node version, and the output of `/api/v1/capabilities`.
Never attach private photos or metadata to a public issue.
