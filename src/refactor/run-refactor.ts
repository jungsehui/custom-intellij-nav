import * as vscode from "vscode";
import type { Logger } from "../core/logger";
import { getShowRefactorNotifications } from "../core/config";
import type { IntelliJAction } from "../types";
import { LANGUAGE_ACTION_TABLE } from "./language-action-table";

/**
 * Apply an IntelliJ-style refactoring (Extract Variable / Method / Constant /
 * Inline) at the current selection.
 *
 * Strategy:
 *  1. Pick a per-language list of code-action `kind`s to attempt
 *     (LANGUAGE_ACTION_TABLE).
 *  2. Prefetch via `vscode.executeCodeActionProvider` to check whether the
 *     language server actually reports any matching action. This avoids the
 *     "No preferred code actions for X available" toast that VS Code throws
 *     when `editor.action.codeAction` is invoked with no matching kind.
 *  3. Delegate the actual application to `editor.action.codeAction` with
 *     `apply: "ifSingle"` — single match auto-applies, multiple matches
 *     surface VS Code's picker (e.g. "Extract to method in class" /
 *     "Extract to inner function" / "Extract to module scope" for TS).
 *  4. If no kind in the chain is available, surface a friendly notification
 *     so the user knows the extension was invoked but the language server
 *     has nothing to offer at this position.
 */
export async function runRefactor(
  action: IntelliJAction,
  logger: Logger,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const langId = editor.document.languageId;
  const table = LANGUAGE_ACTION_TABLE[action];
  const attempts = table[langId] ?? table["*"];

  logger.log(
    `refactor ${action} lang=${langId} attempts=${attempts
      .map((a) => a.kind)
      .join(",")}`,
  );

  for (const attempt of attempts) {
    try {
      const available = await vscode.commands.executeCommand<
        vscode.CodeAction[]
      >(
        "vscode.executeCodeActionProvider",
        editor.document.uri,
        editor.selection,
        attempt.kind,
      );

      if (!available || available.length === 0) {
        logger.log(`refactor ${action}: no actions for kind=${attempt.kind}`);
        continue;
      }

      logger.log(
        `refactor ${action}: ${available.length} action(s) found for kind=${attempt.kind}, apply=ifSingle`,
      );

      await vscode.commands.executeCommand("editor.action.codeAction", {
        kind: attempt.kind,
        apply: "ifSingle",
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.log(`refactor ${action} kind=${attempt.kind} error ${message}`);
      // Swallow and try the next attempt.
    }
  }

  logger.showStatus(`No ${action} available for ${langId}`);

  if (getShowRefactorNotifications()) {
    void vscode.window.showInformationMessage(
      `Custom IntelliJ Nav: No ${action} available for ${langId} at this position. Try selecting an expression or block of statements.`,
    );
  }
}
