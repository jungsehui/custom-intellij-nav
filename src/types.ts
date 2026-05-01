import * as vscode from "vscode";

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
  readonly all: vscode.Location[];
  readonly external: vscode.Location[];
}

// ============================================================
// Refactoring domain types
// ============================================================

export type IntelliJAction =
  | "extractVariable"
  | "extractMethod"
  | "extractConstant"
  | "inline";

export interface CodeActionAttempt {
  readonly kind: string;
  readonly preferred?: boolean;
}

// ============================================================
// Editor snapshot — used by goToDeclaration to detect stale requests
// ============================================================

export interface EditorSnapshot {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly position: vscode.Position;
}
