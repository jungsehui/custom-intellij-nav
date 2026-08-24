import type { IntelliJAction } from "../types";

/**
 * One LSP code-action kind to try for a given action + language.
 *
 * Deliberately carries nothing but `kind`. An earlier revision had a
 * `preferred` flag, but hard rule #2 forbids passing `preferred: true` to
 * `editor.action.codeAction` (it matches too narrowly and breaks Extract
 * Method), so the flag was never read. Keeping a field the dispatcher
 * ignores invites a future contributor to wire it up and re-break #2.
 */
export interface CodeActionAttempt {
  readonly kind: string;
}

/**
 * Per-language refactoring kind dispatch table.
 *
 * Each IntelliJ-style action maps to a list of LSP code-action kinds to try
 * in order. The first kind the language server reports as available wins.
 *
 * Why this exists: IntelliJ assumes a single canonical "Extract Variable"
 * across all languages, but LSP `kind` values diverge sharply per language:
 *
 *   TS / JS:    refactor.extract.constant   (no `variable` kind exists)
 *   Java:       refactor.extract.variable
 *   Kotlin:     refactor.extract.variable
 *   Python:     refactor.extract.variable
 *
 * The k--kato/intellij-idea-keybindings extension hardcodes
 * `refactor.extract.variable` and silently fails in TS — see
 * https://github.com/kasecato/vscode-intellij-idea-keybindings/issues/142
 *
 * Kind matching is prefix-based on dot boundaries: filtering by
 * `refactor.move` also matches `refactor.move.file` and
 * `refactor.move.newFile`. Shorter kinds are therefore broader, and a
 * too-broad kind is dangerous — see the `inline` note below.
 *
 * ── Measured: every refactor kind TypeScript actually emits ──────────────
 * Source: microsoft/TypeScript@v5.9.2 `src/services/refactors/` (16 files),
 * surfaced through microsoft/vscode@main
 * `extensions/typescript-language-features/src/languageFeatures/refactor.ts`.
 *
 *   refactor.extract.function                     extractSymbol.ts:178
 *   refactor.extract.constant                     extractSymbol.ts:173
 *   refactor.extract.type                         extractType.ts
 *   refactor.extract.interface                    extractType.ts
 *   refactor.inline.variable                      inlineVariable.ts:59
 *   refactor.move.file                            moveToFile.ts:172
 *   refactor.move.newFile                         moveToNewFile.ts:41
 *   refactor.rewrite.property.generateAccessors   generateGetAccessorAndSetAccessor.ts:24
 *   refactor.rewrite.import / .export / .arrow.braces /
 *   .parameters.toDestructured  (+ a few more rewrite.* variants)
 *
 * Absent from that list, and therefore impossible in TS/JS today:
 *   refactor.extract.field        → IntelliJ Extract Field       (cmd+alt+f)
 *   refactor.change.signature     → IntelliJ Change Signature    (cmd+f6)
 *   refactor.introduce.parameter  → IntelliJ Introduce Parameter (cmd+alt+p)
 *
 * k--kato binds all three anyway; they are dead keys in TypeScript. We do
 * not ship them until a language is measured to support them.
 *
 * The "*" entry is the fallback chain for unmeasured languages.
 */
export const LANGUAGE_ACTION_TABLE: Record<
  IntelliJAction,
  Record<string, readonly CodeActionAttempt[]>
> = {
  extractVariable: {
    typescript: [{ kind: "refactor.extract.constant" }],
    typescriptreact: [{ kind: "refactor.extract.constant" }],
    javascript: [{ kind: "refactor.extract.constant" }],
    javascriptreact: [{ kind: "refactor.extract.constant" }],
    java: [{ kind: "refactor.extract.variable" }],
    kotlin: [{ kind: "refactor.extract.variable" }],
    python: [{ kind: "refactor.extract.variable" }],
    vue: [{ kind: "refactor.extract.constant" }],
    "*": [
      { kind: "refactor.extract.variable" },
      { kind: "refactor.extract.constant" },
    ],
  },

  extractMethod: {
    typescript: [{ kind: "refactor.extract.function" }],
    typescriptreact: [{ kind: "refactor.extract.function" }],
    javascript: [{ kind: "refactor.extract.function" }],
    javascriptreact: [{ kind: "refactor.extract.function" }],
    java: [{ kind: "refactor.extract.method" }],
    kotlin: [{ kind: "refactor.extract.function" }],
    python: [{ kind: "refactor.extract.function" }],
    vue: [{ kind: "refactor.extract.function" }],
    "*": [
      { kind: "refactor.extract.function" },
      { kind: "refactor.extract.method" },
    ],
  },

  extractConstant: {
    typescript: [{ kind: "refactor.extract.constant" }],
    typescriptreact: [{ kind: "refactor.extract.constant" }],
    javascript: [{ kind: "refactor.extract.constant" }],
    javascriptreact: [{ kind: "refactor.extract.constant" }],
    java: [{ kind: "refactor.extract.constant" }],
    "*": [{ kind: "refactor.extract.constant" }],
  },

  /**
   * Inline (cmd+alt+n).
   *
   * TS emits `refactor.inline.variable`; `refactor.inline` prefix-matches it,
   * but naming the exact kind documents what actually exists.
   *
   * There is deliberately NO `refactor.rewrite` fallback here. Until v1.3.0
   * the TS chain ended in one, and it misfired: with the caret somewhere
   * non-inlinable, `refactor.inline` returned nothing, the chain fell through
   * to `refactor.rewrite`, and a lone unrelated action (e.g.
   * `refactor.rewrite.arrow.braces`) was auto-applied by `apply: "ifSingle"`.
   * Pressing Inline silently rewrote an arrow function. A too-broad fallback
   * is worse than no fallback.
   */
  inline: {
    typescript: [{ kind: "refactor.inline.variable" }],
    typescriptreact: [{ kind: "refactor.inline.variable" }],
    javascript: [{ kind: "refactor.inline.variable" }],
    javascriptreact: [{ kind: "refactor.inline.variable" }],
    java: [{ kind: "refactor.inline" }],
    kotlin: [{ kind: "refactor.inline" }],
    python: [{ kind: "refactor.inline" }],
    "*": [{ kind: "refactor.inline" }],
  },

  /**
   * Move (f6) — IntelliJ "Move".
   *
   * `refactor.move` covers both TS variants: "Move to a new file"
   * (`refactor.move.newFile`) and "Move to file…" (`refactor.move.file`).
   * When both are offered, `apply: "ifSingle"` surfaces VS Code's picker,
   * which is the closest thing to IntelliJ's Move dialog.
   *
   * Before v1.3.0 f6 was bound to `workbench.action.files.move`, which is not
   * a VS Code command at all — the only file-move command in the workbench is
   * `moveFileToTrash` (i.e. Delete). The key did nothing while still
   * displacing the built-in `workbench.action.focusNextPart`.
   */
  move: {
    "*": [{ kind: "refactor.move" }],
  },

  /**
   * Override Methods (ctrl+o) and Implement Methods (ctrl+i).
   *
   * `source.overrideMethods` is contributed by redhat.java's language server,
   * which lists both override and implement candidates in one picker — so
   * both keys resolve to the same kind, matching k--kato's mapping.
   *
   * TypeScript has no counterpart: "Implement inherited abstract class" is a
   * plain `quickfix` with no sub-kind, and dispatching bare `quickfix` would
   * auto-apply an arbitrary fix — the same misfire the `inline` note
   * describes. So TS falls through to the status-bar message instead.
   */
  overrideMethods: {
    "*": [
      { kind: "source.overrideMethods" },
      { kind: "source.generate.overrideMethods" },
    ],
  },

  implementMethods: {
    "*": [
      { kind: "source.overrideMethods" },
      { kind: "source.generate.overrideMethods" },
    ],
  },
};

/** Human-readable names for status-bar and notification text. */
export const ACTION_LABELS: Record<IntelliJAction, string> = {
  extractVariable: "Extract Variable",
  extractMethod: "Extract Method",
  extractConstant: "Extract Constant",
  inline: "Inline",
  move: "Move",
  overrideMethods: "Override Methods",
  implementMethods: "Implement Methods",
};
