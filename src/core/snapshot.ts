import * as vscode from "vscode";
import type { EditorSnapshot } from "../types";
import type { Logger } from "./logger";

/** Capture editor URI/version/position at the moment a request starts. */
export function captureSnapshot(editor: vscode.TextEditor): EditorSnapshot {
  return {
    uri: editor.document.uri,
    version: editor.document.version,
    position: editor.selection.active,
  };
}

/**
 * True if the request is no longer the latest in flight or the editor has
 * moved/changed since the snapshot was taken. Caller should bail out.
 *
 * `latestRequestId` and `requestId` are managed by the caller (typically
 * IntelliJNavigator) — this helper just compares snapshot vs current editor.
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

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    logger.log(`request#${requestId} ignored: no active editor`);
    return true;
  }

  const sameDocument =
    editor.document.uri.toString() === snapshot.uri.toString();
  const sameVersion = editor.document.version === snapshot.version;

  if (!sameDocument || !sameVersion) {
    logger.log(`request#${requestId} ignored: editor changed while waiting`);
    return true;
  }

  return false;
}
