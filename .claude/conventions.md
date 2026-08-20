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

## Built-in commands often already do the IntelliJ thing

Before mapping a key, **read the VS Code source for the command it would
replace.** Several built-ins already implement IntelliJ semantics exactly,
and overriding them makes things worse.

Verified in `src/vs/workbench/browser/actions/listCommands.ts`:

| Built-in | `when` (default) | Actual behavior |
|---|---|---|
| `list.collapse` (Left) | `listFocus && (treeElementCanCollapse \|\| treeElementHasParent)` | `if (!tree.collapse(focus)) focus(parent)` — expanded folder collapses in place; file or collapsed folder jumps to **parent** |
| `list.expand` (Right) | `listFocus && (treeElementCanExpand \|\| treeElementHasChild)` | `if (!widget.expand(focus)) focus(firstChild)` — collapsed folder expands; expanded folder moves to **first child**; leaf does nothing |
| `list.focusParent` | `listFocus` | Focus parent, never collapses. No default key. |

Tree context keys (`src/vs/platform/list/browser/listService.ts`):

| Key | True when |
|---|---|
| `treeElementCanCollapse` | `node.collapsible && !node.collapsed` (expanded folder) |
| `treeElementCanExpand` | `node.collapsible && node.collapsed` (collapsed folder) |
| `treeElementHasParent` | `tree.getParentElement(focus)` is truthy |
| `treeElementHasChild` | `tree.getFirstElementChild(focus)` is truthy |

### The Explorer arrow regression (fixed in v1.0.1)

v1.0.0 shipped six `enableExplorerTreeKeymap` bindings that **removed**
the built-ins via `-list.collapse` / `-list.expand` and re-implemented
them. The re-implementation mapped Left-on-a-file to `list.focusUp`,
which moves to the previous *visible row* (the sibling file above)
instead of the parent folder. That silently broke the exact IntelliJ
behavior the category was supposed to provide.

The correct config is **one** binding, because the built-ins cover
everything else:

```json
{
  "command": "list.focusDown",
  "key": "right",
  "when": "listFocus && !inputFocus && !treeElementCanExpand && !treeElementHasChild && config.customIntellijNav.enableExplorerTreeKeymap"
}
```

`!treeElementCanExpand && !treeElementHasChild` matches leaves only, so
it fills the one gap (built-in Right does nothing on a file) without
touching folder behavior. This is a deliberate divergence from IntelliJ,
where Right on a file is a no-op.

**Rule: never use a `-command` removal for a built-in `list.*` or
`editor.*` command unless you have read its handler and confirmed the
replacement is strictly better.** Adding a narrowly-scoped `when` rule
that fills a gap beats replacing a whole command.

### Measured macOS defaults (do not re-derive these)

Verified against `microsoft/vscode@main` during the v1.1.0 measurement
pass. **These keys already do the IntelliJ thing by default.** They are
registered explicitly anyway (so the behavior survives alongside another
keymap extension), but never "fix" them to a different command.

| Key | Default command | Source |
|---|---|---|
| `⌥←` | `cursorWordLeft` | `wordOperations.ts` L128 |
| `⌥→` | `cursorWordEndRight` — **not** `cursorWordRight` | `wordOperations.ts` L226 |
| `⌥⇧←` | `cursorWordLeftSelect` | `wordOperations.ts` L167 |
| `⌥⇧→` | `cursorWordEndRightSelect` | `wordOperations.ts` L265 |
| `⌥⌫` | `deleteWordLeft` | `wordOperations.ts` L419 |
| `⌥⌦` | `deleteWordRight` | `wordOperations.ts` L458 |
| `⌘G` / `⌘⇧G` | `nextMatchFindAction` / `previousMatchFindAction` | `findController.ts` L784, L805 |
| `⌘X` | `clipboardCutAction` (cuts the line when the selection is empty, via `editor.emptySelectionClipboard`) | `clipboard.ts` L48 |
| `⌘Home` / `⌘End` | `cursorTop` / `cursorBottom` | `coreCommands.ts` L1247, L1291 |
| `⌘⌥[` / `⌘⌥]` | `editor.fold` / `editor.unfold` | `folding.ts` L727, L644 |
| `⌘K ⌘0` / `⌘K ⌘J` | `editor.foldAll` / `editor.unfoldAll` | `folding.ts` L1003, L1023 |
| `⌘-` / `⌘=` | `workbench.action.zoomOut` / `zoomIn`, plus `⌘⇧-` / `⌘⇧=` and numpad as secondaries | `windowActions.ts` L156, L185 |
| `⌘⇧↩` | `editor.action.insertLineBefore` | `linesOperations.ts` L666 |
| `⌘↩` | `editor.action.insertLineAfter` | `linesOperations.ts` L692 |

`editor.action.fontZoomIn` / `fontZoomOut` / `fontZoomReset` have **no**
default keybinding, so `⇧⌃.` / `⇧⌃,` displace nothing.

Added during the v1.2.0 pass:

| Key | Default command | Source |
|---|---|---|
| `⌘⇧[` / `⌘⇧]` | `previousEditor` / `nextEditor` (secondary; primary is `⌘⌥←` / `⌘⌥→`) | `editorActions.ts` L1327, L1279 |
| `⌘,` | `workbench.action.openGlobalSettings` | `preferences.contribution.ts` L238 |
| `⌘↑` / `⌘↓` | `cursorTop` / `cursorBottom` — **macOS-only override** of the `⌘Home` / `⌘End` primary | `coreCommands.ts` L1248, L1292 |
| `⌘[` / `⌘]` | `outdentLines` / `indentLines` | `linesOperations.ts` L645, L619 |
| `F7` / `⇧F7` | `wordHighlight.next` / `.prev` | `wordHighlighter.ts` L936, L951 |
| `⌘⌃←` / `⌘⌃→` | `moveEditorToPreviousGroup` / `…NextGroup` (mac override) | `editorActions.ts` L2133, L2153 |

`⌘↑` / `⌘↓` are deliberately **not** taken. IntelliJ wants them for Jump
to Navigation Bar and View source, but they are the system-wide macOS
document-start / document-end gesture and MacBook keyboards have no
physical Home / End key. Fidelity loses to platform convention here.

### Prefer the core command over a language-specific one

When k--kato binds a language extension's command, check whether VS Code
core has a language-neutral equivalent first. Two wins so far:

| Key | k--kato | Ours | Why |
|---|---|---|---|
| `⌘B` | `editor.action.goToDeclaration` | `intellij.goToDeclarationOrUsages` | falls through to usages like IntelliJ |
| `⌃H` | `java.action.showTypeHierarchy` | `editor.showTypeHierarchy` | core command + `editorHasTypeHierarchyProvider`, works in every language with a provider |

Also prefer canonical command ids over aliases:
`editor.action.previewDeclaration` is registered as an alias for
`editor.action.peekDefinition` (`goToCommands.ts` L372) — bind the latter.

The `⌥→` row is the cautionary one. The v1.1.0 plan called for
`cursorWordRight`; IntelliJ's "Move Caret to Next Word" stops at the word
*end*, which is what the default already does. Shipping the plan as
written would have been a regression, caught only because the source was
read first.

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
