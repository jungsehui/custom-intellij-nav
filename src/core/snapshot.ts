import * as vscode from "vscode";
import type { EditorSnapshot } from "../types";
import type { Logger } from "./logger";

/** Capture editor URI/version/position/selection at the moment a request starts. */
export function captureSnapshot(editor: vscode.TextEditor): EditorSnapshot {
  return {
    uri: editor.document.uri,
    version: editor.document.version,
    position: editor.selection.active,
    selection: editor.selection,
  };
}

/**
 * Whether `editor` is still the same document at the same revision the
 * snapshot was taken from.
 *
 * Pure: takes the editor rather than reading `vscode.window.activeTextEditor`,
 * so the rule can be unit-tested without a VS Code host.
 */
export function editorMatches(
  snapshot: EditorSnapshot,
  editor: vscode.TextEditor | undefined,
): boolean {
  if (!editor) {
    return false;
  }

  return (
    editor.document.uri.toString() === snapshot.uri.toString() &&
    editor.document.version === snapshot.version
  );
}

/**
 * Same as `editorMatches`, plus the selection must be untouched.
 *
 * Refactorings need the stricter rule. `editor.action.codeAction` takes no
 * URI and no range — it acts on whatever is focused and wherever the caret
 * is *when it runs*. A moved caret means the edit lands somewhere the user
 * never selected.
 */
export function selectionMatches(
  snapshot: EditorSnapshot,
  editor: vscode.TextEditor | undefined,
): boolean {
  if (!editorMatches(snapshot, editor) || !editor) {
    return false;
  }

  return editor.selection.isEqual(snapshot.selection);
}

/**
 * True if the request is no longer the latest in flight or the editor has
 * moved/changed since the snapshot was taken. Caller should bail out.
 *
 * `latestRequestId` and `requestId` are managed by the caller (typically
 * IntelliJNavigator).
 */
export function isStale(
  requestId: number,
  latestRequestId: number,
  snapshot: EditorSnapshot,
  logger: Logger,
): boolean {
  if (requestId !== latestRequestId) {
    logger.log(`request#${requestId} ignored: superseded by newer request`);
    return true;
  }

  if (!editorMatches(snapshot, vscode.window.activeTextEditor)) {
    logger.log(`request#${requestId} ignored: editor changed while waiting`);
    return true;
  }

  return false;
}
