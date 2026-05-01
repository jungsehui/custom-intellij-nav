import * as vscode from "vscode";

const SECTION = "customIntellijNav";

/**
 * Whether to surface provider failures (TS server hiccups, vue.volar inlay
 * hint internals, etc.) as red error toasts. Off by default — failures are
 * always logged to the Output channel regardless.
 */
export function getShowErrorToasts(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("showErrorToasts", false);
}

/**
 * Whether to surface "no refactoring available at this position" as an
 * information notification. Helps users disambiguate between "extension
 * not invoked" and "TS LS has no action here." On by default.
 */
export function getShowRefactorNotifications(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("showRefactorNotifications", true);
}
