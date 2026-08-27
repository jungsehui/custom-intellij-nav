import * as vscode from "vscode";
import { createVscodeCommandRunner } from "./core/command-runner";
import { createRequestFactory, createVscodeEditorSource } from "./core/editor-request";
import { Logger } from "./core/logger";
import { migrateLegacySettings } from "./core/migrate-settings";
import { goToDeclarationOrUsages } from "./navigation/go-to-declaration";
import { runRefactor } from "./refactor/run-refactor";
import type { IntelliJAction } from "./types";

const GO_TO_COMMAND_ID = "intellij.goToDeclarationOrUsages";

/**
 * Command id → action, as data.
 *
 * Adding a refactoring is a row here plus a row in LANGUAGE_ACTION_TABLE and
 * a keybinding in package.json. No branching to edit, which is the point.
 */
const REFACTOR_COMMANDS: ReadonlyArray<readonly [string, IntelliJAction]> = [
  ["intellij.extractVariable", "extractVariable"],
  ["intellij.extractMethod", "extractMethod"],
  ["intellij.extractConstant", "extractConstant"],
  ["intellij.inline", "inline"],
  ["intellij.move", "move"],
  ["intellij.overrideMethods", "overrideMethods"],
  ["intellij.implementMethods", "implementMethods"],
];

export function activate(context: vscode.ExtensionContext): void {
  vscode.window.setStatusBarMessage(
    "Custom IntelliJ Navigation activated",
    1500,
  );

  const logger = new Logger();
  const commands = createVscodeCommandRunner(vscode);
  const beginRequest = createRequestFactory(
    createVscodeEditorSource(vscode),
    logger,
  );

  void migrateLegacySettings(logger);

  context.subscriptions.push(
    logger,
    vscode.commands.registerCommand(GO_TO_COMMAND_ID, () =>
      goToDeclarationOrUsages(beginRequest, commands, logger),
    ),
    ...REFACTOR_COMMANDS.map(([id, action]) =>
      vscode.commands.registerCommand(id, () =>
        runRefactor(action, beginRequest, commands, logger),
      ),
    ),
  );
}
