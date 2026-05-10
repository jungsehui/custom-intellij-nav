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
  comment in `run-refactor.ts` and `language-action-table.ts` is the
  template.
- Korean comments are fine for inline rationale; English for exported
  doc-comments (so users reading the source from the Marketplace
  install dir can follow).

## TypeScript naming conventions (2026, project-wide)

The 2026 community consensus is **kebab-case for file and folder names,
PascalCase for type-shaped exports, camelCase for value-shaped exports.**
This repo follows that. References:

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) (Google uses lowercase with `_`; we standardize on `-` for cross-OS safety on case-insensitive filesystems like macOS APFS)
- [Angular Style Guide — symbols and file names](https://angular.dev/style-guide) (canonical `<feature>.<role>.ts` kebab-case)
- [Biome `useFilenamingConvention`](https://biomejs.dev/linter/rules/use-filenaming-convention/) (lints this automatically)

### File & folder names

| Kind | Style | Example |
|---|---|---|
| Source file | `kebab-case.ts` | `go-to-declaration.ts`, `language-action-table.ts` |
| Folder | `kebab-case` | `src/navigation/`, `src/refactor/` |
| Test file | `<name>.test.ts` | `extension.test.ts` |
| Single-word file | `lowercase.ts` (still kebab-compliant) | `types.ts`, `logger.ts`, `config.ts` |
| Domain entry (optional) | `<domain>.<role>.ts` | (not used here — folders carry the domain) |
| React component (if ever added) | `PascalCase.tsx` | `StatusBarItem.tsx` |
| Markdown / docs | `UPPERCASE.md` for top-level conventions (`README.md`, `CHANGELOG.md`, `LICENSE.txt`); `kebab-case.md` inside `.claude/` and `docs/` |

### Identifiers inside files

| Kind | Style | Example |
|---|---|---|
| Class / Interface / Type alias / Enum | `PascalCase` | `IntelliJNavigator`, `EditorSnapshot`, `IntelliJAction` |
| Variable / function / method / parameter | `camelCase` | `runRefactor`, `latestRequestId`, `getShowErrorToasts` |
| Module-level constant (treated as compile-time literal) | `SCREAMING_SNAKE_CASE` | `LANGUAGE_ACTION_TABLE`, `OUTPUT_CHANNEL_NAME`, `COMMAND_ID` |
| Boolean | prefix `is` / `has` / `should` / `can` | `isStale`, `hasReferences` |
| Private fields | `camelCase` (TypeScript `private` modifier — no underscore prefix) | `this.logger`, `this.latestRequestId` |

### When you rename a file

1. `git mv old-name.ts new-name.ts` — never plain `mv` (case-insensitive FS will silently miss the change).
2. Update **every relative import** that references the file. Hunt them with `grep -rn "old-name" src/`.
3. Run `npm run check` to catch missed imports.
4. Commit the rename + import updates in one atomic commit so reviewers can `git log --follow` cleanly.

### Don't

- Don't use `camelCase` for file names (`runRefactor.ts` ❌ → `run-refactor.ts` ✅). The 2026 community has converged on kebab; mixed conventions inside one repo are the worst outcome.
- Don't use `snake_case` for file names — it's Google's recommendation but breaks the kebab consistency the rest of the JS/TS ecosystem uses.
- Don't capitalize file names except for PascalCase React components (and we have none).
- Don't add Hungarian prefixes (`I` for interfaces, `T` for type aliases) — TypeScript's structural typing makes them noise.
