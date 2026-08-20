# Change Log

All notable changes to the "custom-intellij-nav" extension will be documented
in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

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
