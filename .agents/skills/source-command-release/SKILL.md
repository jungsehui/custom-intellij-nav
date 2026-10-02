---
name: "source-command-release"
description: "Cut a new release — bump version, update CHANGELOG, commit, tag, push to GitHub. Optional Marketplace publish."
---

# source-command-release

Use this skill when the user asks to run the `release` command.

The procedure lives in `.claude/commands/release.md`. Read that file and follow
it exactly; every path it names is real.

It is not copied here on purpose. This file used to be a copy, and the copy
had already drifted: every `.claude/` path in it had become `.Codex/`, a
directory that does not exist. One source, read by both tools, cannot drift.
