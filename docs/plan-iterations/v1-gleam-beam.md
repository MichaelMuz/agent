# Always-on agent, the plan

A self-hosted, always-on agent I talk to over Telegram. Designed by me, understood by me,
end to end. Philosophy: reinvent nothing, leverage 60 years of unix, lock the environment
rather than the agent.

**Decided** (mine): Gleam, OpenAI via the Codex sub, Telegram as the only surface,
filesystem wiki memory, permissions via a locked environment and external identity.
Everything marked *suggestion* below is a candidate to investigate when its milestone
arrives, not a decision.

## Principles

- **Freedom inside, walls outside.** The agent is unrestricted within its environment.
  Restrictions live in external systems: a locked-down k8s pod, its own email and
  GitHub identity with scoped repo permissions, a Ramp card with a hard monthly limit.
  No in-agent permission theater that it will just script its way around.
- **Unix-native.** Scheduling is a crontab. Skills are scripts on `$PATH`. Memory is
  files. The agent's superpower is a shell, not a bespoke plugin API.
- **Built for one user.** One provider (OpenAI via Codex sub), one chat surface
  (Telegram), one operator. No abstraction paid for that I don't use.

## Language: Gleam on the BEAM

Decision: **Gleam**, targeting Erlang.

Why BEAM fits an always-on agent: supervision trees mean a crashed conversation or tool
call restarts without taking down the gateway, and spawning a delegated sub-agent is just
spawning another cheap process. This is the actual runtime need, not raw compute.

Why Gleam over Elixir: static HM-style types, which is home turf and what I want.

The ecosystem worry is smaller than it looks, because Gleam consumes the whole BEAM
ecosystem: any Erlang or Elixir hex package works, and FFI to Erlang is a one-line
`@external`. What exists already:

- [telega](https://github.com/bondiano/telega-gleam), a maintained Telegram bot library
  (v1.2, active in 2026) with OTP supervision, long-polling, and per-chat actor dispatch.
  *Suggestion*, evaluate against hand-rolling the long-poll loop (the Bot API is plain
  HTTP, so rolling my own is genuinely on the table).
- `gleam_httpc` + `gleam_http` + `gleam_json` for the provider layer.
- [mcp_toolkit](https://hex.pm/packages/mcp_toolkit) covers MCP *servers*; a stdio MCP
  *client* I write myself (JSON-RPC over stdio, small, and I want to grok MCP anyway).

Known gap: streaming SSE responses from the model. v1 skips streaming entirely
(Telegram can't render token streams well anyway); if wanted later, Erlang's `httpc`
supports `{stream, self}` via FFI.

Escape hatch if Gleam grates: same architecture ports 1:1 to Elixir.

## Provider: the Codex sub, called by me

The core loop is mine. *Suggestion for how the calls happen:* HTTP directly to the
Codex backend endpoint (`chatgpt.com/backend-api/codex/responses`) using the OAuth
tokens from `~/.codex/auth.json`, in the request shape the Codex CLI uses. This is
what community tools (opencode's codex-auth plugin, various proxies) already do. The
alternative is driving `codex exec --json` as a subprocess engine. Investigate both
in milestone 1.

Two sharp edges of the direct-call path, both isolated to one module
(`provider/codex.gleam`):

1. **Shape brittleness.** The endpoint expects codex-like requests, including the
   instructions/system-prompt structure its auth check looks for. OpenAI can change
   this at any time. Mitigation: the Codex CLI stays installed in the image as a
   fallback engine (`codex exec --json`), so a broken provider degrades, not dies.
2. **Token refresh.** `auth.json` holds access + refresh tokens and the CLI refreshes
   them on use. Options: implement the OAuth refresh grant myself (read the codex CLI
   source, it is open), or let the CLI do it via a periodic trivial invocation.
   Decide during milestone 1.

**Milestone 1 exists to de-risk exactly this.** If the raw-call path is unworkable,
the fallback design is: my loop drives `codex exec --json` as a dumb engine, and
everything else in this plan is unchanged.

## Architecture

```
supervision tree
└── root
    ├── gateway            telega long-poll, allowlisted to me
    ├── session supervisor
    │   └── session actor (per chat/thread)
    │       └── agent loop: build context → call provider → run tools → repeat
    ├── wake listener      unix socket; `agentctl wake "<prompt>"` opens a session
    └── mcp supervisor     one actor per configured MCP server (stdio child process)
```

One long-running BEAM node. Everything that talks to the outside world is an actor that
can crash and restart independently.

### Tools

Deliberately few. The shell is the tool.

- `bash` — the big one. Full user permissions inside the pod. brew, git, everything.
- `write` — file writes without heredoc escaping pain.
- `telegram_send` — proactive messages outside the request/response cycle.
- MCP tools — surfaced from connected MCP servers via my client.

### Memory: filesystem wiki

Carrying over the design that already works in Hermes, now first-class:

- A wiki directory tree (`~/wiki/`) of markdown entries, linked, organized by the agent.
- The system prompt embeds only a small bootstrap: who I am, who the agent is, how the
  wiki is structured, and cache entries for the hottest facts. Everything else is
  lazy-loaded, the agent greps and reads the wiki with its own shell.
- Full conversation transcripts persisted as JSONL, they are the raw material for
  self-evolution crons.
- pgvector on the homelab is a later layer *under* the wiki (semantic search over
  entries), not a replacement for it. Not v1.

### Scheduling: a real crontab

Decided in principle: the agent owns a crontab file, and an existing system-clock
scheduler executes it. A cron entry is an ordinary shell line, so the Hermes split
between "run code" and "wake the agent" disappears:

```cron
0 7 * * * ~/bin/morning-brief.sh && agentctl wake "review the brief and message me"
```

*Suggestion for the executor:* [supercronic](https://github.com/aptible/supercronic),
a cron reimplementation built for containers. Classic `crond` assumes it runs as a
root daemon on a full OS and hides job output in syslog/mail; supercronic is a single
binary that runs as a normal unprivileged process, reads a plain crontab file, and
logs job output to stdout. Alternatives to weigh at milestone 4: plain `crond` in the
container, or an in-process scheduler on the BEAM (my lean is against, it recreates
the bespoke-cron trap).

`agentctl wake` hitting a unix socket on the running node is also a suggestion, any
local IPC works. Self-evolution is nothing special either way, it is just cron entries
the agent writes: a nightly job that reads recent transcripts and distills them into
wiki entries and new scripts in `~/bin`.

### Deployment

Same posture as Hermes today: a restricted k8s pod on the homelab, agent process +
supercronic in one container, a PVC for the agent's home (wiki, crontab, `auth.json`,
`~/bin`). Network policy, identities, and spend limits enforced outside the pod.

## Milestones

1. **Prove the provider.** A CLI REPL: my loop, raw calls to the codex endpoint with
   tokens from `auth.json`, a working `bash` tool. Riskiest assumption first.
2. **Telegram.** Gateway (telega or hand-rolled), session actors, talk to it from my phone.
3. **Memory.** Wiki bootstrap in the system prompt, transcript persistence.
4. **Cron.** Pick the executor, wire up wake-by-IPC, first scheduled job.
5. **MCP client.** stdio JSON-RPC client, one real server connected.
6. **Ship.** Image, PVC, deploy to the homelab pod, cut over from Hermes.
7. **Self-evolution.** Nightly distill cron. Later: pgvector under the wiki.

## Open questions

- Token refresh: implement the refresh grant or lean on the CLI? (Milestone 1.)
- Sub-agent delegation: a fresh session actor with a scoped prompt is nearly free on
  BEAM. What context does a child get, and how do results flow back?
- Codex CLI as a delegated *tool*, distinct from the provider-fallback idea: for big
  coding tasks the agent shells out to `codex exec` in a repo and reports back, keeping
  the main loop thin. It is just another bash invocation, so it costs nothing to defer.
- Group chats / forum topics later, or me-only forever?
- A name.
