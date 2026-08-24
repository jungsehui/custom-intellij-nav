import type * as vscode from "vscode";
import type { EditorSnapshot } from "../types";
import type { Logger } from "./logger";
import { captureSnapshot, editorMatches, selectionMatches } from "./snapshot";

/**
 * Where the current editor comes from.
 *
 * The one port in this extension. Everything else it needs from VS Code is a
 * command invocation, which is already an interface; the active editor was
 * the only thing being read out of a global, three levels down inside a
 * predicate, which is what made the staleness rule unreachable from a test.
 *
 * Two adapters: `vscodeActiveEditorSource` below, and whatever a test hands
 * in. That second one is a fake rather than a second production adapter, so
 * this is a weaker justification than two real implementations would be. The
 * stronger one is that `isStale` was the only staleness predicate with no
 * tests, and two of the three defects fixed in 2.1.0 were staleness bugs.
 */
export interface ActiveEditorSource {
  current(): vscode.TextEditor | undefined;
}

/** A single user gesture in flight, and everything needed to judge it. */
export interface EditorRequest {
  /** Monotonic, per extension activation. Appears in every log line. */
  readonly id: number;
  /** The editor as it was when the request began. */
  readonly editor: vscode.TextEditor;
  readonly snapshot: EditorSnapshot;

  /**
   * A newer request has started, or the document changed underneath us.
   *
   * Navigation's rule. Enough for "should I still be navigating", because
   * `editor.action.goToLocations` is told which URI and position to use.
   */
  isStale(): boolean;

  /**
   * `isStale()`, plus the selection must be untouched.
   *
   * Refactoring's rule, and it has to be stricter:
   * `editor.action.codeAction` takes no URI and no range, so it acts on
   * whatever is focused wherever the caret is when it runs. A moved caret
   * means the edit lands somewhere the user never selected.
   */
  isSelectionStale(): boolean;

  /** Log with this request's id already attached. */
  log(message: string): void;
}

/** Begins a request, or returns undefined when there is no active editor. */
export type BeginRequest = () => EditorRequest | undefined;

/** The real adapter. The only place `vscode.window.activeTextEditor` is read. */
export function createVscodeEditorSource(
  vscodeApi: typeof vscode,
): ActiveEditorSource {
  return { current: () => vscodeApi.window.activeTextEditor };
}

/**
 * Issues requests and remembers which one is newest.
 *
 * The counter lives in this closure rather than on a class, so call sites
 * never see it. Before this existed, five call sites each passed four
 * arguments — request id, latest id, snapshot, logger — none of which varies
 * within a request, to get back one boolean.
 */
export function createRequestFactory(
  source: ActiveEditorSource,
  logger: Logger,
): BeginRequest {
  let latestId = 0;

  return function beginRequest(): EditorRequest | undefined {
    const editor = source.current();
    if (!editor) {
      return undefined;
    }

    const id = ++latestId;
    const snapshot = captureSnapshot(editor);
    const log = (message: string) => logger.log(`request#${id} ${message}`);

    const isStale = (): boolean => {
      if (id !== latestId) {
        log("ignored: superseded by newer request");
        return true;
      }

      if (!editorMatches(snapshot, source.current())) {
        log("ignored: editor changed while waiting");
        return true;
      }

      return false;
    };

    return {
      id,
      editor,
      snapshot,
      isStale,
      log,

      isSelectionStale(): boolean {
        if (isStale()) {
          return true;
        }

        if (!selectionMatches(snapshot, source.current())) {
          log("ignored: selection moved while waiting");
          return true;
        }

        return false;
      },
    };
  };
}
