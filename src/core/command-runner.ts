import type * as vscode from "vscode";

/**
 * How this extension invokes VS Code commands.
 *
 * The second port, and it exists for the same reason as
 * `ActiveEditorSource`: something this code does was unverifiable from a
 * test, and it was the exact thing that shipped as a defect.
 *
 * `editor.action.codeAction` applies nothing in the test host — measured
 * across `apply: "ifSingle"`, `"first"` and `"never"`, and
 * `editor.action.refactor`, all of which leave the document untouched while
 * `vscode.workspace.applyEdit` works. The code-action widget needs UI the
 * host does not drive. So "the refactoring was applied" is not observable,
 * and neither is "it was not" — asserting the document is unchanged passes
 * even with the staleness guard deleted.
 *
 * Routing the call through an interface makes the decision observable
 * without depending on the widget: a test can see that dispatch was reached,
 * with which kind, or that it was skipped.
 */
export interface CommandRunner {
  run<T>(command: string, ...args: readonly unknown[]): Thenable<T>;
}

/** The real adapter. The only place `vscode.commands.executeCommand` is called. */
export function createVscodeCommandRunner(
  vscodeApi: typeof vscode,
): CommandRunner {
  return {
    run<T>(command: string, ...args: readonly unknown[]): Thenable<T> {
      return vscodeApi.commands.executeCommand<T>(command, ...args);
    },
  };
}
