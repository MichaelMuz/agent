# Personal agent harness, v2: Unix and Pi

## Thesis

Build a deliberately small personal agent harness around Pi. It is not a general-purpose
agent framework and does not aim for Hermes feature parity. Pi supplies the provider and
tool-call loop; the surrounding system supplies only the runtime primitives this agent
actually needs.

Use ordinary Unix programs, files, SQLite, and Git. The shell is the main tool. Memory is
a filesystem wiki, not a separate memory product.

## Authority and safety

Keep the agent free inside a deliberately constrained environment. Enforce authority
outside the model through Kubernetes security, Linux capabilities, Kubernetes RBAC,
network policy, protected branches, review rules, spending limits, and separate service
accounts for Git hosting, email, and other external systems.

Do not build an internal approval system or special self-modification guards. The agent
may edit its own prompts, scripts, tools, and configuration within its environment.
Secrets remain an exception: give tools secret paths and never place secret contents in
model context or journals.

## Build order

### 1. One-shot CLI and Pi integration

Start with the common execution primitive:

```sh
agent run --prompt "..." --cwd /path/to/project --json
```

Use Pi for provider authentication, streaming, retries, context handling, the tool-call
loop, basic file operations, and unrestricted Bash. The command must work independently
of Telegram so interactive chat, cron, kanban workers, and delegated agents can all use
the same runtime later.

The first satisfying milestone is one local run that loads real context, executes a
tool, journals the complete turn, and returns structured JSON.

### 2. Deterministic context assembly

Load context in a stable, inspectable order:

1. `SOUL.md`
2. Small `USER.md` and `MEMORY.md` pointers
3. `wiki/INDEX.md`
4. The applicable `AGENTS.md` for the working directory
5. The current user prompt

Keep long-lived knowledge in normal Markdown files under Git. The model can search and
read deeper wiki content with shell tools when needed.

### 3. Append-only journal

Persist each run in SQLite, including messages, tool calls and results, model/provider,
token usage, errors, and routing metadata. Later, store computer-use screenshots and
action traces there as well. Favor an append-only event history so it is always possible
to answer “what happened?” SQLite also leaves a straightforward path to full-text session
search.

### 4. Telegram adapter

Put Telegram in front of the same runtime. Add a strict user-ID allowlist, text ingress
and egress, durable update offsets, duplicate-update protection, ordered replies,
Markdown-aware chunking, cancellation, mid-turn steering, and delivery of background-job
results.

Treat concurrency and crash recovery as explicit Telegram concerns; do not let the chat
adapter become the agent runtime.

### 5. Process lifecycle

Begin with ordinary foreground shell execution. Add tracked background processes only
when a workflow needs them: controlled working directory and environment, timeouts,
separate stdout/stderr, handles, polling, stdin, and cancellation. Avoid building a full
process supervisor prematurely.

### 6. Kubernetes packaging

Run the Telegram service as PID 1 in a single-replica Deployment and let kubelet supervise
it. Provide startup, readiness, and liveness endpoints; liveness should measure event-loop
progress rather than external provider availability. Handle `SIGTERM` gracefully, ensure
there is only one active Telegram poller, and keep SQLite and runtime state on durable
storage. Prompts, wiki content, configuration, and scripts remain Git-controlled.

## v0 acceptance

- Pi loop using the chosen provider authentication
- File modification and unrestricted Bash
- `agent run --prompt ... --cwd ... --json`
- Deterministic prompt assembly
- Append-only persistent journal and useful operational logs
- Telegram text access restricted to the owner
- Restart/resume without lost or duplicate messages
- Cancellation without session corruption

## Build after v0

Add capabilities in response to real workflows, roughly in this order:

1. Telegram voice-note transcription
2. Native image attachments to the multimodal model
3. Provider-native computer use
4. Long-context compaction
5. Cron-triggered runs and result delivery
6. Minimal SQLite kanban dispatcher
7. SQLite full-text session search
8. Delegated agents using the same one-shot CLI

Scheduling should remain an external clock invoking ordinary commands. Delegation should
remain another invocation of the common runtime, not a second agent architecture.

## Computer-use requirement

Computer use does not block the first Telegram/process loop, but it is required before
the project is considered complete. Keep it as a thin provider-native screenshot/action
transport over an isolated Playwright, CDP, or CUA-driver target rather than rebuilding
browser automation.

It must eventually pass two real workflows:

- Iterate on a frontend pull request using rendered pixels, not only source inspection.
- Validate an isolated Doom Emacs setup with external tooling, Nerd Icons, rendered UI
  interaction, logs, and batch tests.

## Migration from Hermes

Run this harness alongside Hermes first. Cut over only after a representative week that
includes Telegram conversation, voice and images, shell work, one cron job, one delegated
agent, restart/resume, and a provider failure—without losing or duplicating work.

The measure of success is not feature count. It is a small system whose behavior,
authority, state, and failures are easy to understand end to end.
