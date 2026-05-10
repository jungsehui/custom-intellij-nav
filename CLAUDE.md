# CLAUDE.md — custom-intellij-nav

Auto-loaded entry point for any Claude Code session in this repo. Keep it under
60 lines. Detail lives in `.claude/`.

## Project at a glance

VS Code extension that gives users an IntelliJ-style keymap with a working
TypeScript Extract refactoring (the 4-year-old k--kato issue #142 fix). Single
binary published to the Marketplace as `jungsehui.custom-intellij-nav`.

- **Status**: v1.0.0 shipped to GitHub. Marketplace publish pending.
- **Source**: `src/` — 11 TypeScript files, ~700 LOC total. `extension.ts` is a
  30-line entry point. Domain split: `core/` + `navigation/` + `refactor/`.
- **Manifest**: `package.json` — 5 commands, 80 keybindings, 12 settings.

## Where to look first

| Need | Read |
|---|---|
| What does each module do, who imports who? | `.claude/architecture.md` |
| How do I build / package / install / release? | `.claude/workflows.md` |
| What patterns must I follow? Anti-patterns? | `.claude/conventions.md` |
| What's the current state, what's next? | `.claude/handoff/` (latest dated file) |
| What slash commands does this repo provide? | `.claude/commands/` |
| What skills auto-trigger? | `.claude/skills/` |
| When should I reach for ccg / ultrawork / sub-agents? | `.claude/multi-ai-playbook.md` |

## Hard rules

1. **Provider failures are silent by default.** Do not add `showErrorMessage`
   to provider catch blocks. Toggle via `customIntellijNav.showErrorToasts`.
2. **Refactor command flow**: `prefetch` (`vscode.executeCodeActionProvider`)
   then `editor.action.codeAction` with `apply: "ifSingle"`. Never use
   `preferred: true` (matches too narrowly, breaks Extract Method).
3. **Per-language LSP kind**: TS/JS use `refactor.extract.constant` for Extract
   Variable, not `refactor.extract.variable`. Source of truth is
   `src/refactor/language-action-table.ts`.
4. **Build needs Node 22+** (vsce uses undici with global `File`). Use the
   nvm-installed Node 22, not the default Node 18.
5. **Two GitHub accounts on this machine** — `jungsehui202` is the gh CLI
   default but the repo owner is `jungsehui`. Push needs
   `gh auth switch -u jungsehui` first.

## Slash commands

- `/ship` — typecheck + compile + package + install (dev loop).
- `/release` — bump version + CHANGELOG + commit + push + tag (when ready
  to publish).
- `/docs-sync` — re-sync README/CHANGELOG/handoff after a code change.

See `.claude/commands/` for the actual definitions.
