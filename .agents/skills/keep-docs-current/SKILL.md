---
name: keep-docs-current
description: Run the `/docs-sync` workflow whenever the user finishes a code change. Trigger when the conversation reaches a natural stopping point and `git diff --name-only HEAD` shows changes to `src/**`, `package.json`, or `.github/workflows/**` without matching changes to `README.md`, `CHANGELOG.md`, or `.claude/`. Goal is to keep docs in lockstep with code.
---

# keep-docs-current

The procedure lives in `.claude/skills/keep-docs-current/SKILL.md`. Read that
file and follow it exactly. Two translations for Codex:

- Its `Stop` hook is `.codex/hooks.json`, not `.claude/settings.json`. Both
  run the same check.
- `CLAUDE.md` and `AGENTS.md` are one file: `AGENTS.md` is a symlink to it.

It is not copied here on purpose. This file used to be a copy, and every
`.claude/` path in it had become `.Codex/`, a directory that does not exist.
