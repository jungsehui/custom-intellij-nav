---
name: "source-command-docs-sync"
description: "Re-sync README, CHANGELOG, and the architecture/handoff docs against the actual state of the code. Run after any non-trivial change."
---

# source-command-docs-sync

Use this skill when the user asks to run the `docs-sync` command.

The procedure lives in `.claude/commands/docs-sync.md`. Read that file and follow
it exactly; every path it names is real.

It is not copied here on purpose. This file used to be a copy, and the copy
had already drifted: every `.claude/` path in it had become `.Codex/`, a
directory that does not exist. One source, read by both tools, cannot drift.
