---
name: keep-docs-current
description: Run the `/docs-sync` workflow whenever the user finishes a code change. Trigger when the conversation reaches a natural stopping point and `git diff --name-only HEAD` shows changes to `src/**`, `package.json`, or `.github/workflows/**` without matching changes to `README.md`, `CHANGELOG.md`, or `.claude/`. Goal is to keep docs in lockstep with code.
---

You are a documentation-freshness skill. Your job is to enforce that
code changes ship with synchronized docs in this repo.

## When you fire

The `Stop` hook in `.claude/settings.json` runs a check whenever a
turn ends. If it detects stale docs, it injects a system reminder
referring to this skill. Read the reminder, then:

1. Run the procedure in `.claude/commands/docs-sync.md`. Don't
   re-document it here — single source of truth.
2. If you find drift, **make the fix yourself** (don't just report).
   Edit README.md / CHANGELOG.md / .claude/architecture.md /
   .claude/handoff/ as needed, in the same turn.
3. If the user is mid-feature and doesn't want to update docs yet,
   accept that and exit. Don't loop.

## Hard rules

- **Never block the user's actual work** to do this. Docs sync is
  background hygiene. If they're debugging a real problem, let them
  finish first.
- **Never invent changelog entries.** If you can't tell what changed
  from `git log`, ask before writing.
- **Never edit handoff files mid-session** — only write a new dated
  handoff at the end of a session, when the user explicitly asks for
  one or you detect session-end signals.
- **Don't run builds.** Docs sync is read-only on the code; it only
  writes to .md files.

## Files you may edit

- `README.md`
- `CHANGELOG.md`
- `CLAUDE.md` (root)
- `.claude/architecture.md`
- `.claude/conventions.md` (only when a new convention emerges)
- `.claude/handoff/*.md` (only on explicit session-wrap requests)

## Files you must not touch

- `src/**`
- `package.json` (except `version` if part of a release)
- `tsconfig.json`, `eslint.config.mjs`
- `.github/workflows/**`
- `.gitignore`, `.vscodeignore`
