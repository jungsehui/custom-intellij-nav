import * as vscode from "vscode";
import { IntelliJNavigator } from "./core/navigator";

const COMMAND_ID = "intellij.goToDeclarationOrUsages";

export function activate(context: vscode.ExtensionContext): void {
  vscode.window.setStatusBarMessage(
    "Custom IntelliJ Navigation activated",
    1500,
  );

  const navigator = new IntelliJNavigator();
  void navigator.migrateLegacySettings();

  context.subscriptions.push(
    navigator,
    vscode.commands.registerCommand(COMMAND_ID, () =>
      navigator.goToDeclarationOrUsages(),
    ),
    vscode.commands.registerCommand("intellij.extractVariable", () =>
      navigator.runRefactor("extractVariable"),
    ),
    vscode.commands.registerCommand("intellij.extractMethod", () =>
      navigator.runRefactor("extractMethod"),
    ),
    vscode.commands.registerCommand("intellij.extractConstant", () =>
      navigator.runRefactor("extractConstant"),
    ),
    vscode.commands.registerCommand("intellij.inline", () =>
      navigator.runRefactor("inline"),
    ),
    vscode.commands.registerCommand("intellij.move", () =>
      navigator.runRefactor("move"),
    ),
    vscode.commands.registerCommand("intellij.overrideMethods", () =>
      navigator.runRefactor("overrideMethods"),
    ),
    vscode.commands.registerCommand("intellij.implementMethods", () =>
      navigator.runRefactor("implementMethods"),
    ),
  );
}
