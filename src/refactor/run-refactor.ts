import * as vscode from "vscode";
import type { Logger } from "../core/logger";
import { getShowRefactorNotifications } from "../core/config";
import { captureSnapshot, selectionMatches } from "../core/snapshot";
import type { IntelliJAction } from "../types";
import { ACTION_LABELS, LANGUAGE_ACTION_TABLE } from "./language-action-table";

/**
 * Whether we are entitled to tell the user this language does not implement
 * an action.
 *
 * Only for languages with a measured entry in the table. Everything else
 * resolves through the "*" chain, which means nobody checked — and "the
 * language server does not implement it" would be a claim about something we
 * never looked at.
 *
 * The concrete case: `overrideMethods` and `implementMethods` have no
 * per-language entry, and `language-action-table.ts` records that TypeScript
 * has no counterpart at all. Without this gate, ctrl+O and ctrl+I pop an
 * information toast on every single press in TypeScript, forever. The status
 * bar still reports the miss either way.
 */
export function shouldClaimUnsupported(
  action: IntelliJAction,
  langId: string,
): boolean {
  return Object.hasOwn(LANGUAGE_ACTION_TABLE[action], langId);
}

/**
 * Apply an IntelliJ-style refactoring (Extract Variable / Method / Constant,
 * Inline, Move, Override / Implement Methods) at the current selection.
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
  logger: Logger,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const snapshot = captureSnapshot(editor);
  const langId = editor.document.languageId;
  const table = LANGUAGE_ACTION_TABLE[action];
  // Own-property check, not `table[langId] ?? table["*"]`: a languageId that
  // collides with a prototype key ("constructor", "toString") would otherwise
  // resolve to a function and `??` would not fire.
  const attempts = Object.hasOwn(table, langId) ? table[langId] : table["*"];

  logger.log(
    `refactor ${action} lang=${langId} attempts=${attempts
      .map((a) => a.kind)
      .join(",")}`,
  );

  let sawError = false;

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

      if (!selectionMatches(snapshot, vscode.window.activeTextEditor)) {
        logger.log(
          `refactor ${action}: aborted, editor or selection moved during lookup`,
        );
        return;
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
      sawError = true;
      const message = error instanceof Error ? error.message : String(error);
      logger.log(`refactor ${action} kind=${attempt.kind} error ${message}`);
      // Swallow and try the next attempt.
    }
  }

  const label = ACTION_LABELS[action];

  // An exception is not the same as "the language server has nothing here".
  // Reporting the former as the latter tells the user the feature does not
  // exist for their language, which is the one message they would act on.
  if (sawError) {
    logger.showStatus(`${label} failed (see Output)`);
    return;
  }

  logger.showStatus(`No ${label} available for ${langId}`);

  if (getShowRefactorNotifications() && shouldClaimUnsupported(action, langId)) {
    void vscode.window.showInformationMessage(
      `Custom IntelliJ Nav: ${langId} offers no ${label} at this position. ` +
        `Either the language server does not implement it, or the caret is ` +
        `not on something it applies to.`,
    );
  }
}
