# Code Style & Tooling

## Prettier

- Configuration: `.prettierrc`
- Scripts:
  - `pnpm format` – write
  - `pnpm format:check` – check
- Plugins:
  - `@ianvs/prettier-plugin-sort-imports` – stable import sorting
  - `prettier-plugin-tailwindcss` – Tailwind class sorting (keep this plugin last)
  - `prettier-plugin-jsdoc` – JSDoc formatting
  - `prettier-plugin-sort-json` – sort JSON keys
  - `prettier-plugin-packagejson` – keep `package.json` tidy

## ESLint

- Script: `pnpm lint`
- Config: `eslint.config.mjs` (Next.js base)

## Husky & lint-staged

- Pre-commit hook runs `lint-staged` to format and fix staged files.
- See `package.json` → `lint-staged`.

## Naming & Structure

- See `docs/naming-conventions.md` for project-wide conventions (kebab-case files, PascalCase components, etc.).
