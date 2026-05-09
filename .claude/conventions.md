# Conventions — DO and DON'T

## DO

- **Keep `extension.ts` thin.** It's an entry point — register commands,
  push subscriptions, return. New logic goes in `core/` /`navigation/` /
  `refactor/`.
- **Write pure handlers when you can.** `goToDeclaration` and
  `runRefactor` take a `Logger` (and a `RequestState` for navigation)
  and never reach into singleton state. The class owns state; handlers
  are stateless.
- **Add new types to `src/types.ts`.** Keeps cross-module type imports
  acyclic.
- **Add new languages to `LANGUAGE_ACTION_TABLE`** when you encounter an
  LSP that uses different `kind` values. The `"*"` fallback chain
  catches the unknown case but a named entry is more reliable.
- **Gate every keybinding with a category toggle.** New keys go under
  `enableEditingKeymap` / `enableNavigationKeymap` / etc. so users can
  opt out of an entire category if it conflicts with their workflow.
- **Include `editorTextFocus` (or `editorFocus` for non-edit ops) in the
  `when` clause.** Otherwise the keybinding fires in unexpected places
  (terminal, search panel, etc.).
- **Bump the patch version for any package.json change**, even cosmetic.
  VS Code caches extensions aggressively; without a version bump, an
  install of the same VSIX may not take effect.
- **Update CHANGELOG.md and README.md in the same commit as the code
  change.** The Stop hook (see `.claude/settings.json`) reminds you when
  you forget.

## DON'T

- **Don't `showErrorMessage` from provider catch blocks.** TS server and
  vue.volar throw transient internal errors all the time. Use
  `logger.showStatus(...)` and the Output channel; gate any toast on
  `customIntellijNav.showErrorToasts`.
- **Don't pass `preferred: true` to `editor.action.codeAction`.** It
  silently fails when an LSP exposes multiple non-preferred actions
  (this was the v0.x → v1.0 bug). Always use `apply: "ifSingle"` (after
  prefetching to confirm there's at least one match).
- **Don't hardcode `refactor.extract.variable` for Extract Variable.**
  TS LS uses `refactor.extract.constant`. Java uses
  `refactor.extract.variable`. Always go through
  `LANGUAGE_ACTION_TABLE`.
- **Don't add a keybinding without `when: "isMac && …"`.** This repo
  ships a Mac-only extension (the README says so). Adding a non-`isMac`
  binding will conflict with users on Linux/Windows running k--kato.
- **Don't commit `.idea/`, `.planning/`, `.omc/`, `.claude/local`,
  `.cursor/`.** They're listed in `.gitignore` for a reason —
  workspace tooling, not source.
- **Don't run `vsce publish` from a tag-triggered CI job without a PAT
  rotation plan.** PATs expire. Either keep the manual publish
  ritual or set up a calendar reminder.
- **Don't use `cmd+.` for Toggle Fold without a flag.** It's VS Code's
  default Quick Fix. Mapping it would silently break a heavily-used
  built-in. If we add Toggle Fold, do it under `enableEditingKeymap`
  with an explicit user choice.

## Style

- TypeScript strict mode (`tsconfig.json` is permissive — strict is
  inherited from `@types/vscode` types). Keep new code strict-clean.
- ESLint: `npm run lint`. Errors block release.
- Imports: relative paths. No path aliases (extension hosts can be
  picky).
- File header JSDoc on the main exported symbol of every file. The big
  comment in `runRefactor.ts` and `languageActionTable.ts` is the
  template.
- Korean comments are fine for inline rationale; English for exported
  doc-comments (so users reading the source from the Marketplace
  install dir can follow).
