import * as assert from "assert";
import * as vscode from "vscode";
import { Logger } from "../core/logger";
import type { BeginRequest, EditorRequest } from "../core/editor-request";
import { createVscodeCommandRunner } from "../core/command-runner";
import { captureSnapshot } from "../core/snapshot";
import { isTypeScriptGoServing } from "../core/config";
import { describeOutcome, isMissingInTypeScriptGo } from "../refactor/policy";
import { runRefactor } from "../refactor/run-refactor";
import type { IntelliJAction } from "../types";

/**
 * TypeScript Go, measured on 2026-10-22 with `npm run probe:tsgo` (VS Code
 * 1.143.0, TypeScript Go 1.0.1): in all four languages the built-in
 * TypeScript offers these five refactorings and TypeScript Go offers none.
 * Override and Implement are absent from both, so they are not TypeScript
 * Go's to lack.
 */
const SERVED_LANGUAGES = ["typescript", "typescriptreact", "javascript", "javascriptreact"];
const LACKING: readonly IntelliJAction[] = [
  "extractVariable", "extractMethod", "extractConstant", "inline", "move",
];
const NEVER_IN_TYPESCRIPT: readonly IntelliJAction[] = ["overrideMethods", "implementMethods"];

suite("TypeScript Go: what policy claims", () => {
  test("claims exactly the measured refactorings in the measured languages", () => {
    for (const lang of SERVED_LANGUAGES) {
      for (const action of LACKING) {
        assert.strictEqual(isMissingInTypeScriptGo(action, lang), true, `${action} in ${lang}`);
      }
      for (const action of NEVER_IN_TYPESCRIPT) {
        assert.strictEqual(isMissingInTypeScriptGo(action, lang), false, `${action} in ${lang}`);
      }
    }
  });

  test("claims nothing for a language TypeScript Go does not serve", () => {
    for (const lang of ["java", "python", "vue", "plaintext", "*", "constructor"]) {
      for (const action of [...LACKING, ...NEVER_IN_TYPESCRIPT]) {
        assert.strictEqual(isMissingInTypeScriptGo(action, lang), false, `${action} in ${lang}`);
      }
    }
  });
});

suite("TypeScript Go: what the user is told", () => {
  test("names TypeScript Go and its setting when it is serving and lacks the refactoring", () => {
    const outcome = describeOutcome("extractVariable", "typescript", false, true);

    assert.strictEqual(outcome.status, "No Extract Variable: TypeScript Go has no refactorings yet");
    assert.ok(
      outcome.notification?.includes("js/ts.experimental.useTsgo"),
      `notification: ${outcome.notification}`,
    );
  });

  test("says exactly what it always said when TypeScript Go is not serving", () => {
    assert.deepStrictEqual(describeOutcome("extractVariable", "typescript", false, false), {
      status: "No Extract Variable available for typescript",
      notification:
        "Custom IntelliJ Nav: typescript offers no Extract Variable at this position. " +
        "Either the language server does not implement it, or the caret is " +
        "not on something it applies to.",
    });
  });

  test("still reports an exception as a failure, not as TypeScript Go", () => {
    assert.deepStrictEqual(describeOutcome("extractVariable", "typescript", true, true), {
      status: "Extract Variable failed (see Output)",
    });
  });

  test("keeps TypeScript's own answer for a refactoring TypeScript never had", () => {
    assert.deepStrictEqual(describeOutcome("overrideMethods", "typescript", false, true), {
      status: "No Override Methods available for typescript",
    });
  });

  test("leaves a language TypeScript Go does not serve alone", () => {
    assert.deepStrictEqual(describeOutcome("extractVariable", "java", false, true), {
      status: "No Extract Variable available for java",
      notification:
        "Custom IntelliJ Nav: java offers no Extract Variable at this position. " +
        "Either the language server does not implement it, or the caret is " +
        "not on something it applies to.",
    });
  });
});

/** Records the status bar instead of writing to it. */
class RecordingLogger extends Logger {
  readonly statuses: string[] = [];

  public override showStatus(message: string): void {
    this.statuses.push(message);
  }
}

function currentRequest(editor: vscode.TextEditor): BeginRequest {
  const request: EditorRequest = {
    id: 1,
    editor,
    snapshot: captureSnapshot(editor),
    isStale: () => false,
    isSelectionStale: () => false,
    log: () => undefined,
  };
  return () => request;
}

suite("TypeScript Go: when it counts as serving", () => {
  // VS Code 1.143's typescript-language-features hands TS/JS to TypeScript Go
  // only when `js/ts.experimental.useTsgo` is on *and* a TypeScript Go
  // extension is installed. The setting alone changes nothing, so the
  // message must not change either. This test host has no TypeScript Go;
  // the case where it is installed is what `npm run probe:tsgo` checks.
  const section = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration("js/ts");

  teardown(async () => {
    await section().update("experimental.useTsgo", undefined, vscode.ConfigurationTarget.Workspace);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("not with the default settings", () => {
    assert.strictEqual(isTypeScriptGoServing(), false);
  });

  test("not with the setting on but no TypeScript Go extension installed", async () => {
    assert.strictEqual(
      vscode.extensions.getExtension("typescriptteam.native-preview"),
      undefined,
      "precondition: this test host has no TypeScript Go",
    );
    await section().update("experimental.useTsgo", true, vscode.ConfigurationTarget.Workspace);

    // The control: the setting really reads back as on.
    assert.strictEqual(section().get("experimental.useTsgo"), true);
    assert.strictEqual(isTypeScriptGoServing(), false);
  });

  test("runRefactor keeps the usual message in that case", async () => {
    await section().update("experimental.useTsgo", true, vscode.ConfigurationTarget.Workspace);
    // An empty line: nothing to extract, so the prefetch comes back empty and
    // the outcome is what reaches the status bar.
    const doc = await vscode.workspace.openTextDocument({ content: "\n", language: "typescript" });
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const logger = new RecordingLogger();

    await runRefactor("extractVariable", currentRequest(editor), createVscodeCommandRunner(vscode), logger);
    logger.dispose();

    assert.deepStrictEqual(logger.statuses, ["No Extract Variable available for typescript"]);
  });
});
