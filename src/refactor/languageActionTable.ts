import type { CodeActionAttempt, IntelliJAction } from "../types";

/**
 * Per-language refactoring kind dispatch table.
 *
 * Each IntelliJ-style action (extractVariable, extractMethod, ...) maps to a
 * list of LSP code-action kinds to try in order. The first kind that the
 * language server reports as available is used.
 *
 * Why this exists: IntelliJ assumes a single canonical "Extract Variable"
 * across all languages, but LSP `kind` values diverge sharply per language:
 *
 *   TS / JS:    refactor.extract.constant   (no variable kind exposed)
 *   Java:       refactor.extract.variable
 *   Kotlin:     refactor.extract.variable
 *   Python:     refactor.extract.variable
 *
 * The k--kato/intellij-idea-keybindings extension hardcodes
 * `refactor.extract.variable` and silently fails in TS — see
 * https://github.com/kasecato/vscode-intellij-idea-keybindings/issues/142
 *
 * The "*" entry is a fallback chain for unknown languages — try the
 * Java/Kotlin/Python kind first, then the TS/JS kind, then any extract.
 */
export const LANGUAGE_ACTION_TABLE: Record<
  IntelliJAction,
  Record<string, readonly CodeActionAttempt[]>
> = {
  extractVariable: {
    typescript: [{ kind: "refactor.extract.constant", preferred: true }],
    typescriptreact: [{ kind: "refactor.extract.constant", preferred: true }],
    javascript: [{ kind: "refactor.extract.constant", preferred: true }],
    javascriptreact: [{ kind: "refactor.extract.constant", preferred: true }],
    java: [{ kind: "refactor.extract.variable", preferred: true }],
    kotlin: [{ kind: "refactor.extract.variable", preferred: true }],
    python: [{ kind: "refactor.extract.variable", preferred: true }],
    vue: [{ kind: "refactor.extract.constant", preferred: true }],
    "*": [
      { kind: "refactor.extract.variable", preferred: true },
      { kind: "refactor.extract.constant", preferred: true },
      { kind: "refactor.extract", preferred: true },
    ],
  },
  extractMethod: {
    typescript: [{ kind: "refactor.extract.function", preferred: true }],
    typescriptreact: [{ kind: "refactor.extract.function", preferred: true }],
    javascript: [{ kind: "refactor.extract.function", preferred: true }],
    javascriptreact: [{ kind: "refactor.extract.function", preferred: true }],
    java: [{ kind: "refactor.extract.method", preferred: true }],
    kotlin: [{ kind: "refactor.extract.function", preferred: true }],
    python: [{ kind: "refactor.extract.function", preferred: true }],
    vue: [{ kind: "refactor.extract.function", preferred: true }],
    "*": [
      { kind: "refactor.extract.function", preferred: true },
      { kind: "refactor.extract.method", preferred: true },
      { kind: "refactor.extract", preferred: true },
    ],
  },
  extractConstant: {
    typescript: [{ kind: "refactor.extract.constant", preferred: true }],
    typescriptreact: [{ kind: "refactor.extract.constant", preferred: true }],
    javascript: [{ kind: "refactor.extract.constant", preferred: true }],
    javascriptreact: [{ kind: "refactor.extract.constant", preferred: true }],
    java: [{ kind: "refactor.extract.constant", preferred: true }],
    "*": [{ kind: "refactor.extract.constant", preferred: true }],
  },
  inline: {
    typescript: [
      { kind: "refactor.inline", preferred: true },
      { kind: "refactor.rewrite", preferred: true },
    ],
    typescriptreact: [
      { kind: "refactor.inline", preferred: true },
      { kind: "refactor.rewrite", preferred: true },
    ],
    javascript: [
      { kind: "refactor.inline", preferred: true },
      { kind: "refactor.rewrite", preferred: true },
    ],
    javascriptreact: [
      { kind: "refactor.inline", preferred: true },
      { kind: "refactor.rewrite", preferred: true },
    ],
    java: [{ kind: "refactor.inline", preferred: true }],
    kotlin: [{ kind: "refactor.inline", preferred: true }],
    python: [{ kind: "refactor.inline", preferred: true }],
    "*": [{ kind: "refactor.inline", preferred: true }],
  },
};
