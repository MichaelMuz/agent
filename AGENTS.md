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

## Local references

Prefer these local sibling repositories over web copies when researching behavior. Treat
them as read-only references unless a task explicitly asks for changes there.

- `../pi` — upstream Pi source. Use its `packages/agent` and `packages/ai` implementations
  as the primary reference for Agent Core and provider behavior; its coding-agent JSONL
  session manager is a useful persistence reference, not an architecture to copy whole.
- `../codex` — upstream OpenAI Codex source. Consult it for Codex authentication, provider
  transport, process execution, session recording, and computer-use implementation details.
- `../hermes-agent` — Hermes source. Consult it for Telegram/gateway behavior, lifecycle
  edge cases, and session/transcript experience while keeping this harness much smaller.
- `../expense-splitter` — the owner's existing Bun and TypeScript project; use it as a
  style and tooling reference when repository conventions are otherwise unclear.
