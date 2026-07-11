# Project instructions

This repository is a deliberately small personal agent harness built around Pi, Unix
programs, files, SQLite, and Git. Read `docs/plan-iterations/v2-pure-unix-and-pi.md` for
the current direction.

## Development

- Use Bun for dependency management and scripts. Use `bun install`, `bun add`, `bunx`,
  and `bun run`; do not suggest npm, npx, pnpm, or Yarn commands.
- TypeScript is intentionally maximally strict. Preserve the strict compiler and lint
  settings. Do not introduce `any`, unsafe assertions, or non-null assertions to work
  around the type system; validate and narrow data at system boundaries.
- Prefer small, direct modules over speculative abstractions. Add configuration,
  dependencies, and infrastructure only when the current behavior requires them.
- Use `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` as the foundational Pi
  libraries. Do not couple the harness to the interactive Pi coding-agent application
  without an explicit reason.
- Keep secrets out of prompts, logs, journals, fixtures, and source control. Pass secret
  paths or handles where possible.
- Before handing off code, run `bun run check`.
