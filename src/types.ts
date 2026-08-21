// Type-only, and now declared as such: this file is in the inner ring that
// eslint.config.mjs forbids from importing vscode at runtime. It was already
// erased at compile time by accident; `import type` makes it on purpose.
import type * as vscode from "vscode";

// ============================================================
// Navigation domain types
// ============================================================

export type RawLocation = vscode.Location | vscode.LocationLink;

export type ProviderCommand =
  | "vscode.executeDeclarationProvider"
  | "vscode.executeDefinitionProvider";

export type ProviderSource = "declaration" | "definition";

export interface ProviderResolution {
  readonly source: ProviderSource;
  readonly external: vscode.Location[];
}

// ============================================================
// Refactoring domain types
// ============================================================

export type IntelliJAction =
  | "extractVariable"
  | "extractMethod"
  | "extractConstant"
  | "inline"
  | "move"
  | "overrideMethods"
  | "implementMethods";

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

// ============================================================
// Editor snapshot — used by goToDeclaration to detect stale requests
// ============================================================

export interface EditorSnapshot {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly position: vscode.Position;
  /** Full selection at request start. Refactorings apply to a range, not a caret. */
  readonly selection: vscode.Selection;
}
