# Multi-AI / Sub-agent playbook

When and how to use parallel AI tools in this repo. Default: just use
Claude directly. The tools below earn their tokens only at certain
inflection points — pick by the kind of decision you face, not by
"more is better."

## Decision tree

```
Is the work mechanical (compile, package, install, edit a known file)?
  YES → Do it directly. No agents.
  NO  → Continue.

Is the question "what's the right design / which trade-off?"
  YES → /ccg  (Claude + Codex + Gemini synthesis on the same prompt)

Is the codebase scope unknown ("where is X, how does Y connect")?
  YES → /gsd-map-codebase  or  /gsd-scan  (parallel mapper agents
        write to .planning/codebase/, you synthesize)

Is the task large + parallelizable (e.g. add 20 keybindings,
update 5 doc tables)?
  YES → /ultrawork  (parallel execution engine over a task list)

Is the task one-shot but you want a second opinion?
  YES → /ask codex …  or  /ask gemini …  (single-shot consult)

Need long-running self-correcting loop until verified?
  YES → /ralph or /ralplan  (use sparingly — high token cost)
```

## Tools that earn their keep here

| Tool | When | Cost |
|---|---|---|
| `/gsd-map-codebase` | First time onboarding a stranger to this code or after a major refactor | Medium (parallel agents) |
| `/gsd-scan` | Quick reread of repo state mid-session | Low |
| `/ccg` | Architectural decisions where TS LSP behavior is uncertain | High (3 models) |
| `/ultrawork` | Adding a batch of keybindings/settings/docs in one go | Medium |
| `/handoff` | End of every meaningful session — writes `.claude/handoff/...` | Low |
| `/ask codex` | "Codex agent please rewrite this regex" or "second opinion on this commit" | Low |

## Tools that usually aren't worth it here

- `/ralph` / `/autopilot` / `/self-improve` — this codebase is small
  enough that a single-pass plan + execute beats long autonomous
  loops. Token cost rarely justified.
- `/omc-teams` — process-based parallel CLI runners. Useful for poly-
  repo work; this is a single repo with 11 source files.
- `/sciomc` / `/deep-interview` / `/grill-me` — overkill for a VS Code
  extension. Reserve for genuinely ambiguous product decisions.

## Sub-agent rules (Task tool)

- **Use sub-agents when context isolation matters**: large search,
  thorough audit, third-party doc deep-dive. Their token usage
  doesn't bleed back into your conversation.
- **Don't use sub-agents for simple lookups** — direct `Bash`/`Read`
  is faster and cheaper.
- **Always parallelize independent agents** in a single message.
  Three Explore agents in one turn is much faster than three
  sequential turns.
- **Past lesson**: `Explore` sub-agent type sometimes hits org usage
  limits mid-session. If that happens, switch to direct
  `Bash`/`Read`/`Grep` — the analysis is shorter but the code finds
  out the same answer.

## Hand-off + skill discipline

- Every session that lands meaningful work must end with one of:
  (a) a fresh dated file in `.claude/handoff/`, or
  (b) the `Stop` hook firing the `keep-docs-current` skill which
      writes the file for you.
- The skill never edits handoff files — it only writes new ones.
  Treat handoffs as append-only.
