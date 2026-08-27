import * as vscode from "vscode";
import type { CommandRunner } from "../core/command-runner";
import type { Logger } from "../core/logger";
import type { BeginRequest } from "../core/editor-request";
import { getShowRefactorNotifications } from "../core/config";
import type { IntelliJAction } from "../types";
import { describeOutcome, resolveAttempts } from "./policy";

/**
 * Apply an IntelliJ-style refactoring (Extract Variable / Method / Constant,
 * Inline, Move, Override / Implement Methods) at the current selection.
 *
 * This module is the adapter: it talks to VS Code. Every decision it makes
 * that does not need VS Code lives in `./policy`, which cannot import
 * `vscode` at all.
 *
 * Strategy:
 *  1. Ask the policy which code-action `kind`s to attempt for this language.
 *  2. Prefetch via `vscode.executeCodeActionProvider` to check whether the
 *     language server actually reports any matching action. This avoids the
 *     "No preferred code actions for X available" toast that VS Code throws
 *     when `editor.action.codeAction` is invoked with no matching kind.
 *  3. Delegate the actual application to `editor.action.codeAction` with
 *     `apply: "ifSingle"` — single match auto-applies, multiple matches
 *     surface VS Code's picker (e.g. "Extract to method in class" /
 *     "Extract to inner function" / "Extract to module scope" for TS).
 *  4. If no kind in the chain is available, ask the policy what to say.
 *
 * Staleness: step 2 and step 3 target different things. The prefetch names a
 * URI and a range; `editor.action.codeAction` names neither and acts on
 * whatever is focused wherever the caret is *when it runs*. The provider
 * round-trip between them is an await boundary — tens of milliseconds warm,
 * seconds on a cold TS server. Without a guard, a focus or caret change in
 * that window makes `apply: "ifSingle"` edit code the user never selected.
 */
export async function runRefactor(
  action: IntelliJAction,
  beginRequest: BeginRequest,
  commands: CommandRunner,
  logger: Logger,
): Promise<void> {
  const request = beginRequest();
  if (!request) {
    return;
  }

  const { editor } = request;
  const langId = editor.document.languageId;
  const attempts = resolveAttempts(action, langId);

  request.log(
    `refactor ${action} lang=${langId} attempts=${attempts
      .map((a) => a.kind)
      .join(",")}`,
  );

  let sawError = false;

  for (const attempt of attempts) {
    try {
      const available = await commands.run<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        editor.document.uri,
        editor.selection,
        attempt.kind,
      );

      if (!available || available.length === 0) {
        request.log(`refactor ${action}: no actions for kind=${attempt.kind}`);
        continue;
      }

      if (request.isSelectionStale()) {
        request.log(`refactor ${action}: aborted before dispatch`);
        return;
      }

      request.log(
        `refactor ${action}: ${available.length} action(s) found for kind=${attempt.kind}, apply=ifSingle`,
      );

      await commands.run("editor.action.codeAction", {
        kind: attempt.kind,
        apply: "ifSingle",
      });
      return;
    } catch (error) {
      sawError = true;
      const message = error instanceof Error ? error.message : String(error);
      request.log(`refactor ${action} kind=${attempt.kind} error ${message}`);
      // Swallow and try the next attempt.
    }
  }

  const outcome = describeOutcome(action, langId, sawError);
  logger.showStatus(outcome.status);

  if (outcome.notification && getShowRefactorNotifications()) {
    void vscode.window.showInformationMessage(outcome.notification);
  }
}
