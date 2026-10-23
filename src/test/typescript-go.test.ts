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

/**
 * Wait until the TypeScript language server answers code-action queries.
 *
 * Same method as the wait in run-refactor.test.ts. Used twice here: at the
 * start of the suite, because on the Linux runner the test files run in a
 * different order and this file can run before anything has started the
 * server; and right after flipping `js/ts.experimental.useTsgo`, which is
 * what actually broke the v3.0.1 tag build (see the test below).
 */
async function waitForLanguageServer(): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    content: "const a = 1 + 2;\n",
    language: "typescript",
  });
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  editor.selection = new vscode.Selection(new vscode.Position(0, 10), new vscode.Position(0, 15));

  const deadline = Date.now() + 90_000;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        editor.selection,
        "refactor.extract.constant",
      );
      if (actions && actions.length > 0) {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
        return;
      }
    } catch {
      // A cancelled probe is not an answer. Try again.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  assert.fail(`the TypeScript language server never answered after ${attempts} attempts`);
}

function currentRequest(editor: vscode.TextEditor, logged: string[] = []): BeginRequest {
  const request: EditorRequest = {
    id: 1,
    editor,
    snapshot: captureSnapshot(editor),
    isStale: () => false,
    isSelectionStale: () => false,
    // Kept, so a failure can say what runRefactor saw (an exception's
    // message lands here, not on the status bar).
    log: (message) => {
      logged.push(message);
    },
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

  suiteSetup(async function () {
    this.timeout(120000);
    await waitForLanguageServer();
  });

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

  test("runRefactor keeps the usual message in that case", async function () {
    this.timeout(120000);
    await section().update("experimental.useTsgo", true, vscode.ConfigurationTarget.Workspace);
    // Flipping the setting makes the built-in TypeScript extension react, and
    // a query sent straight after it came back `Canceled`: logged on
    // 2026-10-22, locally and in the v3.0.1 tag build, where it read as
    // "Extract Variable failed (see Output)". A cold server was the first
    // guess and was wrong; warming it at suite start did not help. So wait
    // until the server answers again. It has to: with no TypeScript Go
    // installed, the built-in TypeScript keeps serving, which is this test's
    // premise, and the wait only returns once it offers a refactoring.
    await waitForLanguageServer();

    // An empty line: nothing to extract, so the prefetch comes back empty and
    // the outcome is what reaches the status bar.
    const doc = await vscode.workspace.openTextDocument({ content: "\n", language: "typescript" });
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const logger = new RecordingLogger();
    const logged: string[] = [];

    await runRefactor("extractVariable", currentRequest(editor, logged), createVscodeCommandRunner(vscode), logger);
    logger.dispose();

    assert.deepStrictEqual(
      logger.statuses,
      ["No Extract Variable available for typescript"],
      `runRefactor logged: ${JSON.stringify(logged)}`,
    );
  });
});
