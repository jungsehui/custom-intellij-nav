import { ACTION_LABELS, LANGUAGE_ACTION_TABLE } from "./language-action-table";
import type { CodeActionAttempt, IntelliJAction } from "../types";

/**
 * Decisions about a refactoring that need no editor, no language server and
 * no VS Code at all.
 *
 * This file must not import `vscode`. It is the inner ring: the rules that
 * `run-refactor.ts` applies, separated from the machinery that applies them.
 * `eslint.config.mjs` enforces the ban so the separation cannot quietly rot.
 *
 * Both rules here have each shipped as a real user-facing bug, which is why
 * they get their own reachable interface rather than living inside a
 * function whose only test surface is a running language server.
 */

/**
 * The chain of code-action kinds to try for this action in this language.
 *
 * `Object.hasOwn`, not `table[langId] ?? table["*"]`: a `languageId` that
 * collides with a prototype key ("constructor", "toString") would otherwise
 * resolve to a function and `??` would not fire.
 */
export function resolveAttempts(
  action: IntelliJAction,
  langId: string,
): readonly CodeActionAttempt[] {
  const table = LANGUAGE_ACTION_TABLE[action];
  return Object.hasOwn(table, langId) ? table[langId] : table["*"];
}

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
 * information toast on every single press in TypeScript, forever.
 */
export function shouldClaimUnsupported(
  action: IntelliJAction,
  langId: string,
): boolean {
  return Object.hasOwn(LANGUAGE_ACTION_TABLE[action], langId);
}

/**
 * What to say when no attempt in the chain produced anything.
 *
 * `status` always goes to the status bar. `notification` is the stronger
 * claim, and is `undefined` whenever we are not entitled to make it — either
 * because the failure was an exception rather than an absence, or because
 * the language was never measured. The caller still decides whether to show
 * it, since that depends on a setting this file cannot read.
 */
export interface RefactorOutcome {
  readonly status: string;
  readonly notification?: string;
}

export function describeOutcome(
  action: IntelliJAction,
  langId: string,
  sawError: boolean,
): RefactorOutcome {
  const label = ACTION_LABELS[action];

  // An exception is not the same as "the language server has nothing here".
  // Reporting the former as the latter tells the user the feature does not
  // exist for their language, which is the one message they would act on.
  if (sawError) {
    return { status: `${label} failed (see Output)` };
  }

  const status = `No ${label} available for ${langId}`;

  if (!shouldClaimUnsupported(action, langId)) {
    return { status };
  }

  return {
    status,
    notification:
      `Custom IntelliJ Nav: ${langId} offers no ${label} at this position. ` +
      `Either the language server does not implement it, or the caret is ` +
      `not on something it applies to.`,
  };
}
