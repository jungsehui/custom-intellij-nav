import * as vscode from "vscode";
import type { EditorSnapshot } from "../types";

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
