# Reference: Codex and Pi tool inventories

A reading of the tools the two local reference harnesses expose to the model, how Codex
presents its shell tool, and the decision we made for our own bash tool.

All paths are relative to this repo, i.e. into the sibling checkouts `../codex` and `../pi`.
They include line anchors where a specific claim is being sourced, so each is one click from
the code it describes. Line numbers are against the checkouts as of this writing; if they
drift, grep the quoted string.

## Why this exists

Our target is an OpenAI model reached through the Codex OAuth path. That model was RL'd
inside Codex's own harness, so the closer our tool surface (names, descriptions, parameter
schemas, output shape) sits to Codex's, the more the model stays in-distribution for tool
use. This doc records what Codex actually shows the model so we can match the parts that
matter. Pi is here as the smaller, TypeScript-native reference we build against.

Note on models: the harness is not built for `gpt-5.4-mini`. That is only a cheap model to
test on. The real target is an OpenAI model whose subscription terms permit an always-on
agent use case; the mini is a stand-in during development.

## Codex tool inventory

Handlers live in `../codex/codex-rs/core/src/tools/handlers/`; specs (the JSON the model
sees) are the `*_spec.rs` files. Extensions add more under `../codex/codex-rs/ext/*/src/tool.rs`.

Execution:
- `exec_command` — run a shell command, optionally in a PTY.
  `../codex/codex-rs/core/src/tools/handlers/shell.rs`,
  spec at `../codex/codex-rs/core/src/tools/handlers/shell_spec.rs`.
- `unified_exec` / `write_stdin` — interactive sessions: a command can return a `session_id`
  you keep writing stdin to, for long-running or REPL-style processes.
  `../codex/codex-rs/core/src/tools/handlers/unified_exec.rs`.
- `apply_patch` — structured file edits via a patch grammar, not free-form shell.
  `../codex/codex-rs/core/src/tools/handlers/apply_patch.rs`,
  grammar `../codex/codex-rs/core/src/tools/handlers/apply_patch.lark`.

Context and planning (`../codex/codex-rs/core/src/tools/handlers/`):
- `plan` (`plan_spec.rs`), `get_context_remaining` (`get_context_remaining_spec.rs`),
  `new_context_window` (`new_context_window_spec.rs`), `current_time.rs`, `sleep.rs`,
  `wait_for_environment.rs`.

Discovery and extension:
- `tool_search` — deferred tools searched on demand.
  `../codex/codex-rs/core/src/tools/handlers/tool_search_spec.rs`.
- `mcp` / `mcp_resource` — MCP tool calls and resource reads.
  `../codex/codex-rs/core/src/tools/handlers/mcp.rs`, `.../mcp_resource.rs`.
- `request_user_input` (`request_user_input_spec.rs`), `request_permissions.rs` — hand
  control back to the human.
- `agent_jobs.rs`, `multi_agents.rs` (`multi_agents_spec.rs`) — spawn and coordinate
  sub-agents.
- `list_available_plugins_to_install_spec.rs`, `request_plugin_install.rs`,
  `extension_tools.rs`.
- Ext crates under `../codex/codex-rs/ext/`: `web-search/src/tool.rs`,
  `image-generation/src/tool.rs`, `goal/src/tool.rs`, `memories/src/tools/`,
  `skills/src/tools/`, plus `view_image` (`.../handlers/view_image_spec.rs`).

The set is large because Codex is a full product. Most of it is out of scope for us; the
execution tools are what we care about.

## Pi (coding-agent) tool inventory

All in `../pi/packages/coding-agent/src/core/tools/`, one file per tool, plus shared helpers.
Concrete tools: `bash.ts`, `read.ts`, `write.ts`, `edit.ts` (with `edit-diff.ts`), `ls.ts`,
`find.ts`, `grep.ts`. Helpers (not tools): `output-accumulator.ts`, `truncate.ts`,
`path-utils.ts`, `render-utils.ts`, `file-mutation-queue.ts`, `tool-definition-wrapper.ts`.

Agent Core (`../pi/packages/agent/src/`) ships no concrete tools, only the `AgentTool`
interface (`../pi/packages/agent/src/types.ts`). These coding-agent tools are person-oriented
(diff rendering, output accumulation for a scrollback pane, approval UX), so we read them as
reference and do not import them.

Pi's `bash` tool (`../pi/packages/coding-agent/src/core/tools/bash.ts`):
- name `bash`, param `command: string` (+ optional `timeout` seconds); schema at `bash.ts:41`,
  name/description at `bash.ts:299`.
- description: "Execute a bash command in the current working directory. Returns stdout
  and stderr. Output is truncated to last N lines or KB (whichever is hit first). If
  truncated, full output is saved to a temp file."
- stdio: `["ignore"|"pipe", "pipe", "pipe"]` at `bash.ts:101`; stdout and stderr both feed
  the *same* `onData` handler at `bash.ts:124-125`, so they merge into one interleaved
  buffer (no PTY).

## How Codex presents its exec tool to the model

From `../codex/codex-rs/core/src/tools/handlers/shell_spec.rs`, the `exec_command` tool spec
(a `ResponsesApiTool`, name and description near `shell_spec.rs:88-100`):

- name: `exec_command`
- description: "Runs a command in a PTY, returning output or a session ID for ongoing
  interaction."
- required: `cmd`
- parameters (property definitions at `shell_spec.rs:26-84`):
  - `cmd` — "Shell command to execute."
  - `workdir` — "Working directory for the command. Defaults to the turn cwd."
  - `tty` (`shell_spec.rs:38-45`) — "True allocates a PTY for the command; false or omitted
    uses plain pipes."
  - `yield_time_ms` — wait before yielding output; default 10000 ms, range 250-30000 ms.
  - `max_output_tokens` — output token budget; default 10000 tokens, may be capped.
  - `shell`, `login`, `environment_id` — conditional extras.
- an `output_schema` (`unified_exec_output_schema`) — structured, not just a text blob.

Two things worth internalizing:

1. **PTY is a per-call toggle, not always-on.** The description leads with "in a PTY," but
   the `tty` parameter (`shell_spec.rs:38-45`) defaults to plain pipes. Codex lets the
   *model* decide when it wants a real terminal (e.g. for a program that needs `isatty`).
   This refines the earlier read that "Codex always uses a PTY."
2. **Output is budgeted in tokens, and capture is head+tail.** The PTY capture lives in
   `../codex/codex-rs/core/src/unified_exec/`. The model-facing text is
   `String::from_utf8_lossy` of the raw transcript at
   `../codex/codex-rs/core/src/unified_exec/process.rs:278` — ANSI escapes and all, no
   stripping. Head/tail with an omission marker: `.../unified_exec/async_watcher.rs:329`.
   The `ansi-escape` crate (`../codex/codex-rs/ansi-escape/src/lib.rs`) is used only under
   `../codex/codex-rs/tui/` (e.g. `tui/src/exec_cell/render.rs`) to render escapes for the
   human display, never to sanitize the model's copy.

## Decision for our bash tool

Chosen for the first cut: plain pipes, merged. Two pipes for stdout and stderr fed into one
handler (Pi's approach at `../pi/packages/coding-agent/src/core/tools/bash.ts:124-125`), so
output comes back as one interleaved blob. No PTY yet, no ANSI stripping needed (pipes make
child programs auto-disable color).

Why start here:
- **Simplest thing that works.** Pipes need no `openpty`, no master/slave fd management, no
  ANSI cleanup. Child programs see "not a tty" and emit plain, unbuffered-at-exit text.
- **Interleaving loss is immaterial.** Two pipes into one handler is near-real ordering
  (only slightly off under pipe buffering). An LLM reading a result blob does not care about
  exact stdout/stderr interleaving, so the fidelity a PTY buys here is not worth its cost.
- **No JSON terminal.** We do not editorialize output into labeled stdout/stderr blocks. If
  the model wants them separated it redirects streams itself, like a human would.

Planned next: allow a real terminal (PTY) as an opt-in, mirroring Codex's `tty` toggle
(`../codex/codex-rs/core/src/tools/handlers/shell_spec.rs:38-45`) which defaults to pipes.
This is what interactive programs (REPLs, prompts, pagers) need, and it is where the raw
ANSI actually earns its place. Bun's native `terminal` spawn option handles `openpty` for us
(child sees `isatty()` true; `subprocess.stdout/stderr` return null and output is read from
`subprocess.terminal`), and Bun exposes options aimed at driving interactive programs — worth
exploring when we add the toggle. Keeping it out of the first cut.

Deferred (matching Codex, not built yet):
- Output budgeting: a token or line/byte cap with head+tail truncation and spill-to-file
  for the full transcript (Pi caps by lines/KB at `../pi/packages/coding-agent/src/core/tools/bash.ts:299`;
  Codex by tokens).
- Interactive sessions (`session_id` + write-stdin) for long-running processes
  (`../codex/codex-rs/core/src/tools/handlers/unified_exec.rs`).
- `AbortSignal` wired into the spawn so a run can be cancelled.
