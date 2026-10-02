# Handoff — 2026-10-02 (Codex pointers, VS Code 1.140 re-measure, one refactor fix)

## TL;DR

Three idle weeks: VS Code went 1.134 → 1.140, CI ran zero times, npm audit
went 4 → 11, and someone added Codex files that were broken copies. Nothing
had reached users. This session re-measured, fixed what was cheap, gave
v3.0.0's gate a date, and made CI run weekly so the next idle stretch is
not silent.

## State

| | |
|---|---|
| GitHub | v2.3.3 tag; `main` carries one unreleased user-visible fix (CHANGELOG `[Unreleased]`) |
| Marketplace | v2.2.0, 49 installs |
| Tests | 71 passing on VS Code 1.140.0 (local, macOS) |
| `npm audit` | 4, all dev-only, all under `@vscode/test-cli`; `--omit=dev` is 0 |
| CI | push to `main`, PRs, tags, and weekly Monday 00:00 UTC |
| v3.0.0 gate | opens **2026-10-19** (plan Task 4) |

## What happened

1. **Codex files** (`15acc8a`). `AGENTS.md` was `CLAUDE.md` with `.claude/`
   rewritten to `.Codex/`, which does not exist; three of four
   `.agents/skills/` had the same rewrite. Now `AGENTS.md` is a symlink and
   the skills are pointers. They were also about to ship: `vsce ls` listed
   6 agent files among 24 entries, because vsce follows the symlink and
   only `CLAUDE.md` was ignored. Back to 18.
2. **Dependencies** (`2423552`). `npm update` + `npm audit fix` cleared 7.
   The other 4 offer only a downgrade of `@vscode/test-cli` to 0.0.11,
   which reintroduces the `Electron` vs `Code` bundle-name bug. Left.
3. **Refactor staleness** (`412cfcb`). `runRefactor` wrote "No X
   available" (and, for measured languages, a notification) even after a
   newer request took over. Test first: red for the right reason (it
   recorded `'No Override Methods available for typescript'`), then one
   guard, then green. A control test proves the recorder records.
4. **Weekly CI** (`ab304f4`).
5. **Re-measure 1.134.0 → 1.140.0.** Method and table now live in
   conventions.md, *Re-measure each VS Code release by diffing tags*. One
   new collision (`⌘E` vs the Markdown Editor's Toggle Locked; kept, and
   listed in README), one old unrecorded one (`⌘W` in the Agents Window).
6. **Doc drift found on the way**: workflows.md still described the
   `publish` job removed in 2.3.2; plan Task 4 still named
   `src/core/navigator.ts`, deleted in 2.3.0, and omitted the 14-test file
   its deletion orphans.

## Corrected along the way

- The first exposure count was 35 bindings with no focus condition, from a
  regex of known context keys. A strict rule (strip `isMac`, `config.*`
  and operators; empty means exposed) gives **27**. The regex missed keys
  it did not know.
- A first `when`-clause lookup returned only `f2`. The sort that
  normalized modifiers also moved the key itself (`indexOf` of `up` is -1),
  so `alt+up` became `up+alt`. Caught because the output was implausibly
  small; fixed and rerun with a positive control.
- "2.2.0 is the first Marketplace version with the migration" was wrong:
  2.1.1 went up on 2026-08-21. The gate keeps 2.2.0 (2026-08-24) as the
  later, conservative anchor.

## Not verified

- That the weekly schedule fires: known after the first Monday on `main`.
- Whether user-extension keybindings load in the Agents Window at all.
- That the Markdown Editor, a webview, never sets `editorTextFocus`.
- The new refactor suite on Linux. It has run only on macOS; the xvfb run
  on a cold language server happens on the first CI run after push.
- Which of 1.137 to 1.139 added the Markdown Editor's `⌘E`. Narrowing it
  failed twice on zsh's `$v:e` modifier and was stopped there; README
  says what is known (absent through 1.136, present in 1.140).
- TypeScript 6.0.3: `tsc --noEmit` is clean on all 22 files; lint under it
  was not run. typescript-eslint 8.71 still caps TS at `<6.1.0`, so TS 7
  stays blocked.

## Next

1. **Publish** the unreleased fix when convenient: `/release` as 2.3.4,
   renaming `## [Unreleased]` rather than adding a section above it, then
   upload the VSIX the tag build attaches.
2. **On or after 2026-10-19**: plan Task 4 (v3.0.0). Ask before deleting
   `src/test/migrate-settings.test.ts`.
3. **Each VS Code release**: diff from 1.140.0 per conventions.md.

## Do not

- Replace `AGENTS.md` with a copy. It is a symlink so it cannot drift.
- Take npm's `@vscode/test-cli` "fix". It is a downgrade.
- Bump `@types/vscode` past `engines.vscode` (1.106.0).
