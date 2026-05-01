# Change Log

All notable changes to the "custom-intellij-nav" extension will be documented
in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

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
