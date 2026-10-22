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
/** The TypeScript Go extensions VS Code 1.143 looks for; any one will do. */
const TYPESCRIPT_GO_EXTENSIONS = [
  "typescriptteam.vscode-typescript",
  "typescriptteam.vscode-typescript-nightly",
  "typescriptteam.native-preview",
];

/**
 * Whether VS Code has handed TS/JS to TypeScript Go instead of its built-in
 * TypeScript.
 *
 * Mirrors typescript-language-features in VS Code 1.143 rather than guessing
 * at it: the switch is `js/ts.experimental.useTsgo`, falling back to
 * `typescript.experimental.useTsgo` only when the first has no value of its
 * own, and the switch does nothing unless a TypeScript Go extension is
 * installed. With the setting on and no such extension, the built-in
 * TypeScript keeps serving, and saying otherwise would be wrong.
 */
export function isTypeScriptGoServing(): boolean {
  const primary = vscode.workspace.getConfiguration("js/ts");
  const own = primary.inspect<boolean>("experimental.useTsgo");
  const hasOwnValue =
    own !== undefined &&
    [
      own.globalValue,
      own.workspaceValue,
      own.workspaceFolderValue,
      own.globalLanguageValue,
      own.workspaceLanguageValue,
      own.workspaceFolderLanguageValue,
    ].some((value) => value !== undefined);
  const isSwitchedOn = hasOwnValue
    ? primary.get<boolean>("experimental.useTsgo", false)
    : vscode.workspace
        .getConfiguration("typescript")
        .get<boolean>("experimental.useTsgo", false);

  return (
    isSwitchedOn &&
    TYPESCRIPT_GO_EXTENSIONS.some((id) => vscode.extensions.getExtension(id) !== undefined)
  );
}

export function getShowRefactorNotifications(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("showRefactorNotifications", true);
}
