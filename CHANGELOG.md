# Change Log

All notable changes to the "custom-intellij-nav" extension will be documented
in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.0] — 2026-05-11

Navigation and Search. Coverage 53.8% → 65.8% of the IntelliJ Mac keymap.
Keybindings 109 → 132. Navigation 16 → 36, Search 7 → 10.

### Measured first, again

Same procedure as v1.1.0. Three of the planned keys turned out to be
macOS defaults already, and four collided with defaults nobody had
checked:

| Key | VS Code default | Source | Outcome |
|---|---|---|---|
| `⌘⇧]` / `⌘⇧[` | `nextEditor` / `previousEditor` (secondary; primary is `⌘⌥→` / `⌘⌥←`) | `editorActions.ts` L1279, L1327 | registered explicitly |
| `⌘,` | Open Settings | `preferences.contribution.ts` L238 | skipped, no-op |
| `⌘↑` / `⌘↓` | **`cursorTop` / `cursorBottom`** (macOS-only override) | `coreCommands.ts` L1248, L1292 | **kept as-is** |
| `⌘[` | `editor.action.outdentLines` | `linesOperations.ts` L645 | displaced |

`⌘↑` / `⌘↓` were left alone deliberately. IntelliJ wants them for Jump to
Navigation Bar and View source, but they are the system-wide macOS
document-start / document-end gesture, and MacBook keyboards have no
physical Home / End keys to fall back on. Those two IntelliJ actions are
dropped rather than break the platform convention.

### Added — Navigation
- `⌥Space` / `⌘Y` quick definition popup (`editor.action.peekDefinition`)
- `⌘⌥O` go to symbol in file
- `⌘[` navigate back
- `⌘⇧E` recent files, previous entry
- `⌃H` **type hierarchy** and `⌃⌥H` call hierarchy
- `⌃M` move caret to matching brace
- `⌃⇧B` go to type declaration
- `F4` edit source (editor) / open and focus (Explorer)
- `⌃←` / `⌃→` and `⌘⇧[` / `⌘⇧]` previous / next editor tab, with terminal
  variants that move between terminal tabs when the terminal has focus
- `⌘U` go to super implementation (Java, Dart)
- `⌘⇧T` go to test (Java)

### Added — Search
- `⌥⌘F7` show usages
- `⌃⌥↓` / `⌃⌥↑` next / previous highlighted usage

`⌃⌥↓` / `⌃⌥↑` restore something this extension had quietly taken away:
`F7` / `⇧F7` are `editor.action.wordHighlight.next` / `.prev` by default
(`wordHighlighter.ts` L936, L951), and `enableDebuggingKeymap` has bound
`F7` to Step Into since v1.0.0. The IntelliJ keys for highlighted-usage
navigation are `⌃⌥↓` / `⌃⌥↑`, so the capability is now reachable again.

### Type hierarchy is language-neutral here
k--kato binds `⌃H` to `java.action.showTypeHierarchy`, which does nothing
outside Java. VS Code core registers `editor.showTypeHierarchy` with an
`editorHasTypeHierarchyProvider` context key
(`typeHierarchy.contribution.ts` L179, L29), so this extension binds the
core command instead and it works in any language whose server provides
type hierarchy. Same approach as wrapping `⌘B` in
`intellij.goToDeclarationOrUsages`.

### BREAKING — one more VS Code default displaced

| Key | What you lose | Where it went | Category |
|---|---|---|---|
| `⌘[` | `editor.action.outdentLines` | Navigate Back | `enableNavigationKeymap` |

Outdent is still on `⇧Tab`. The binding is gated on `canNavigateBack`, so
in a fresh window with no navigation history VS Code's outdent still
fires — the displacement only takes effect once there is somewhere to go
back to.

### Previously undocumented displacements, now recorded
Found while measuring. Both shipped in v1.0.0 without a note:

| Key | Our mapping | Silently displaced |
|---|---|---|
| `⌘]` | `jumpToBracket` (`enableNavigationKeymap`) | `editor.action.indentLines` |
| `F7` | `debug.stepInto` (`enableDebuggingKeymap`) | `editor.action.wordHighlight.next` |

### Dropped
- **Jump to Navigation Bar** (`⌘↑`) and **View source** (`⌘↓`) — see above.
- **`⌘,`** — already the VS Code default, so there is nothing to add.

## [1.1.0] — 2026-05-11

Editing coverage goes from 34% to ~85% of the IntelliJ Mac keymap.
Keybindings 75 → 109, settings 12 → 13.

### Method: every key was measured against the VS Code source first

`.claude/roadmap.md` §2 called for an hour of measurement before writing
any binding, on the theory that many "missing" IntelliJ keys are already
VS Code macOS defaults. That turned out to be true for 11 of the 27
planned keys, and it also caught two keys where the roadmap's planned
command was *worse* than the default.

Measured against `microsoft/vscode@main`:

| Key | VS Code default | Source |
|---|---|---|
| `⌥←` | `cursorWordLeft` | `wordOperations.ts` L128-133 |
| `⌥→` | `cursorWordEndRight` | `wordOperations.ts` L226-231 |
| `⌥⇧←` | `cursorWordLeftSelect` | `wordOperations.ts` L167-172 |
| `⌥⇧→` | `cursorWordEndRightSelect` | `wordOperations.ts` L265-270 |
| `⌥⌫` | `deleteWordLeft` | `wordOperations.ts` L419-424 |
| `⌥⌦` | `deleteWordRight` | `wordOperations.ts` L458-463 |
| `⌘G` / `⌘⇧G` | `nextMatchFindAction` / `previousMatchFindAction` | `findController.ts` L784, L805 |
| `⌘X` | `clipboardCutAction` | `clipboard.ts` L48 |
| `⌘Home` / `⌘End` | `cursorTop` / `cursorBottom` | `coreCommands.ts` L1247, L1291 |

The roadmap planned `⌥→` → `cursorWordRight`, but IntelliJ's "Move Caret
to Next Word" stops at the word *end*, which is what VS Code's default
`cursorWordEndRight` already does. Shipping the plan as written would
have been a regression. Same for `⌥⇧→`.

Per an explicit decision these 11 are now **registered explicitly anyway**,
so the IntelliJ behavior holds even if another keymap extension is
installed alongside.

### Added
- **Folding (7)**: `⌘-` fold, `⌘=` unfold, `⌘⌥-` / `⌘⌥=` recursive,
  `⌘⇧-` / `⌘⇧=` all, `⌘.` toggle.
- **Word navigation and deletion (12 entries, 6 keys × 2 modes)**:
  `⌥←` `⌥→` `⌥⇧←` `⌥⇧→` `⌥⌫` `⌥⌦`.
- **`customIntellijNav.useCamelHumpsWords`** (default `false`), mirroring
  IntelliJ's *Use "CamelHumps" words*. When on, the six word keys switch
  to the `cursorWordPart*` / `deleteWordPart*` family and stop at
  camelCase sub-word boundaries.
- **Lines (2)**: `⇧↩` Start new line, `⌥⌘↩` Start new line before current.
- **Cut and caret (4)**: `⌘X` and `⌘⌦` cut line, `⌘Home` / `⌘End` to text
  start / end.
- **Selection (3)**: `⌃G` add selection to next occurrence, `⌃⇧G` unselect
  occurrence, `⇧⌘8` column selection mode.
- **Font (2)**: `⇧⌃.` / `⇧⌃,` increase / decrease editor font. These have
  no VS Code default keybinding, so nothing is displaced.
- **Docs (2)**: `F1` quick documentation, `⌘F1` show error/warning at caret.
- **Search (2)**: `⌘G` / `⌘⇧G` find next / previous.

### BREAKING — VS Code defaults displaced by `enableEditingKeymap`

These only apply when `customIntellijNav.enableEditingKeymap` is `true`.
Set it to `false` to get every one of them back.

| Key | What you lose | Where it went |
|---|---|---|
| `⌘-` | **Window Zoom Out** (`workbench.action.zoomOut`) | Fold |
| `⌘=` | **Window Zoom In** (`workbench.action.zoomIn`) | Unfold |
| `⌘⇧-` / `⌘⇧=` | Zoom Out / In (secondary bindings) | Fold All / Unfold All |
| `⌘.` | **Quick Fix** (`editor.action.quickFix`) | Toggle Fold |
| `F1` | Command Palette (secondary; `⌘⇧P` still works) | Quick documentation |

`⌘.` is the one to know about. IntelliJ users reach for `⌥↩` to get
intentions and quick fixes, and this extension has mapped `⌥↩` →
`editor.action.quickFix` since v1.0.0, so the capability is not lost,
only moved. If you want VS Code's `⌘.` back, the narrowest fix is a
single user keybinding rather than disabling the whole category:

```jsonc
{ "key": "cmd+.", "command": "-editor.toggleFold" }
```

Window zoom has no equivalent escape hatch inside the editor. If you use
`⌘-` / `⌘=` for zoom, keep `enableEditingKeymap` off or unbind the two
folding entries the same way.

### Deferred
- **Complete Current Statement** (`⌘⇧↩`). VS Code binds that chord to
  `editor.action.insertLineBefore`, and IntelliJ's own "Start new line
  before current" is `⌥⌘↩`, which this release maps. Implementing
  Complete Current Statement would mean displacing a default in order to
  ship a JS/TS-only approximation, so it moves to the language-specific
  backlog in `.claude/roadmap.md`.

## [1.0.1] — 2026-05-11

### Fixed
- **Explorer tree Left arrow jumped to the sibling above instead of the
  parent folder.** `enableExplorerTreeKeymap` shipped six bindings that
  removed the built-in `list.collapse` / `list.expand` (via `-command`)
  and re-implemented them, mapping Left-on-a-file to `list.focusUp`.
  `list.focusUp` moves to the previous *visible row*, not the parent.

  VS Code's built-in `list.collapse` already implements IntelliJ
  semantics exactly (`if (!tree.collapse(focus)) focus(parent)`), so the
  override was strictly worse. All six bindings are replaced by one that
  fills the only real gap: Right on a leaf file now moves down a row,
  which the built-in `list.expand` treats as a no-op.

  Net effect on the Explorer tree with `enableExplorerTreeKeymap: true`:

  | Key | Context | Behavior |
  |---|---|---|
  | `↑` / `↓` | any | previous / next row |
  | `←` | expanded folder | collapse in place |
  | `←` | file or collapsed folder | jump to parent folder |
  | `→` | collapsed folder | expand |
  | `→` | expanded folder | move to first child |
  | `→` | file | move down one row |

### Changed
- Keybinding count 80 → 75 (six Explorer tree entries collapsed into one).
- `.vscodeignore` now excludes `CLAUDE.md`, `*.pem`, `*.key`, `*.p12`,
  `.env*`. A stray `global-bundle.pem` (161 KB AWS RDS CA bundle) sitting
  in the repo root had been packaged into the v1.0.0 VSIX.
- `.gitignore` gained the same credential patterns.

## [1.0.0] — 2026-04-28

First production-ready release. The extension is now a self-contained
IntelliJ-style keymap with language-aware Extract refactoring, suitable as
an alternative to `k--kato/intellij-idea-keybindings` for users who hit the
TypeScript Extract Variable bug
([k--kato#142](https://github.com/kasecato/vscode-intellij-idea-keybindings/issues/142)).

### Added
- **Language-aware Extract refactoring** (`intellij.extractVariable`,
  `intellij.extractMethod`, `intellij.extractConstant`, `intellij.inline`)
  with a per-language kind dispatch table. TypeScript routes to
  `refactor.extract.constant` / `refactor.extract.function`; Java/Kotlin/Python
  route to `refactor.extract.variable` / `refactor.extract.method`.
- **Prefetch + `apply: "ifSingle"`** strategy. Single match auto-applies;
  multiple matches surface VS Code's picker (Extract Method shows
  "Extract to inner function" / "Extract to method in class" / "Extract to
  module scope" — equivalent to IntelliJ's Choose Destination Scope dialog).
- **Six new keymap categories**, each independently toggleable via settings:
  `enableEditingKeymap`, `enableNavigationKeymap`, `enableSearchKeymap`,
  `enableRefactoringKeymap`, `enableVcsKeymap`, `enableToolWindowKeymap`.
  ~50 IntelliJ Mac keys covered (`cmd+/`, `cmd+d`, `cmd+e`, `cmd+f12`,
  `cmd+alt+l`, `cmd+k`, `alt+f12`, etc.).
- **Information notification on no-op** (`showRefactorNotifications`, on by
  default). When the language server has no extract action at the cursor,
  surface a toast so users can distinguish "extension not invoked" from
  "TS LS has nothing to offer here."
- **Silent error policy** (`showErrorToasts: false` by default). Provider
  failures (TS server hiccups, vue.volar inlay hint internals, etc.) log to
  the Output channel instead of red toasts. Toggle on for debugging.

### Changed
- Source tree refactored into `core/`, `navigation/`, `refactor/` modules.
  `extension.ts` is now a 30-line entry point. Orchestrator class
  `IntelliJNavigator` owns lifetime of the Logger and request-id state;
  pure command handlers live in their respective domain folders.
- README rewritten with full keymap tables, settings reference, migration
  guide for users coming from k--kato, and an explicit "what won't work"
  section (shift+shift, postfix completion, etc.).

### Fixed
- "Red box" toast on every cmd+B keypress when TypeScript server reported
  internal failures (Debug Failure on PropertyAccessExpression in vue.volar
  inlay hints, common in monorepos). Provider failures now silent by default.
- cmd+alt+v silently doing nothing in TypeScript (kind mismatch with
  k--kato). Direct extension routing + per-language kind dispatch.
- cmd+alt+m firing "No preferred code actions for X available" toast even
  when actions were available — caused by `preferred: true` not matching
  TS LS's Extract Function (which exposes multiple non-preferred options).
  Replaced with prefetch + `apply: "ifSingle"`.

### Known limitations (TS Language Service)
- Extract Variable always produces `const`. WebStorm offers `const`/`let`/`var`
  selection; VS Code's TS LS does not expose that. Users can manually change
  to `let` after extraction.
- Single-line variable-declaration extraction (e.g. `String key = ...` in
  IntelliJ Java) is not supported. Select an expression or block of
  statements.
- `shift+shift` (Search Everywhere) and `ctrl+ctrl` (Run Anything) are not
  implementable — VS Code does not support double-tap modifier keys. Use
  `cmd+shift+space` chord as the closest substitute.

## [0.0.1]
- Initial release: cmd+B → Go to Declaration or Usages.
