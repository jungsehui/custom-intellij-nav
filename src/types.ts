// Type-only, and declared as such: this file is in the inner ring that
// eslint.config.mjs forbids from importing vscode at runtime.
import type * as vscode from "vscode";

/**
 * Types used by more than one *folder*.
 *
 * That is the whole admission criterion, and only two types meet it.
 * A type shared inside one folder lives in whichever module the others
 * already import; a type with one consumer lives next to it. See
 * `.claude/conventions.md`, "Where a type lives".
 */

/** Every refactoring this extension can dispatch. Crosses core/ ↔ refactor/. */
export type IntelliJAction =
  | "extractVariable"
  | "extractMethod"
  | "extractConstant"
  | "inline"
  | "move"
  | "overrideMethods"
  | "implementMethods";

/** Editor identity at the moment a request began. Crosses core/ ↔ navigation/. */
export interface EditorSnapshot {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly position: vscode.Position;
  /** Full selection at request start. Refactorings apply to a range, not a caret. */
  readonly selection: vscode.Selection;
}
