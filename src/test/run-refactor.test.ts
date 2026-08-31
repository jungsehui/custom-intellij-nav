import * as assert from "assert";
import * as vscode from "vscode";
import { Logger } from "../core/logger";
import type { BeginRequest, EditorRequest } from "../core/editor-request";
import { createVscodeCommandRunner } from "../core/command-runner";
import type { CommandRunner } from "../core/command-runner";
import { captureSnapshot } from "../core/snapshot";
import { runRefactor } from "../refactor/run-refactor";

/**
 * `editor.action.codeAction` applies nothing in this test host — measured
 * across `apply: "ifSingle"`, `"first"` and `"never"`, and
 * `editor.action.refactor`, all of which leave the document untouched while
 * `vscode.workspace.applyEdit` works. The code-action widget needs UI the
 * host does not drive.
 *
 * So asserting on document text proves nothing here, in either direction:
 * "unchanged" passes even with the staleness guard deleted. Two such
 * assertions were written and removed after a mutation run caught them.
 *
 * Dispatch goes through `CommandRunner` instead, so a test can see that it
 * was reached and with which kind. The prefetch still hits the real language
 * server — that is what decides availability, and faking it would test the
 * fake.
 */

const TOP_LEVEL_EXPRESSION = "const a = 1 + 2;\n";
const EXPRESSION_RANGE = new vscode.Selection(
  new vscode.Position(0, 10),
  new vscode.Position(0, 15),
);

async function openTypescript(content: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    content,
    language: "typescript",
  });
  return vscode.window.showTextDocument(doc, { preview: false });
}

/**
 * Records every command dispatched, and answers the prefetch for real.
 *
 * The prefetch has to reach the language server -- that is what decides
 * whether a kind is available, and faking it would test the fake. Only
 * `editor.action.codeAction` is intercepted, because in this host it does
 * nothing observable and its being reached is exactly what needs proving.
 */
function recordingCommands(): {
  readonly runner: CommandRunner;
  readonly dispatched: () => readonly string[];
} {
  const real = createVscodeCommandRunner(vscode);
  const seen: string[] = [];

  return {
    runner: {
      run<T>(command: string, ...args: readonly unknown[]): Thenable<T> {
        if (command === "editor.action.codeAction") {
          const kind = (args[0] as { kind?: string } | undefined)?.kind;
          seen.push(`${command}:${kind ?? "?"}`);
          return Promise.resolve(undefined as T);
        }
        return real.run<T>(command, ...args);
      },
    },
    dispatched: () => seen,
  };
}

function countingRequest(
  editor: vscode.TextEditor,
  selectionStale: boolean,
): { readonly begin: BeginRequest; readonly guardChecks: () => number } {
  let checks = 0;

  const request: EditorRequest = {
    id: 1,
    editor,
    snapshot: captureSnapshot(editor),
    isStale: () => false,
    isSelectionStale: () => {
      checks += 1;
      return selectionStale;
    },
    log: () => undefined,
  };

  return { begin: () => request, guardChecks: () => checks };
}

/**
 * Wait until the TypeScript language server answers code-action queries.
 *
 * On a warm machine it answers on the first try, which is what the original
 * version of these tests assumed. On a cold CI runner it does not, and the
 * prefetch comes back empty — so the dispatch assertions failed there while
 * passing locally. Readiness is a precondition of this suite, not something
 * to discover per test.
 */
async function waitForLanguageServer(): Promise<void> {
  const editor = await openTypescript(TOP_LEVEL_EXPRESSION);
  editor.selection = EXPRESSION_RANGE;

  for (let attempt = 0; attempt < 60; attempt++) {
    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      "vscode.executeCodeActionProvider",
      editor.document.uri,
      editor.selection,
      "refactor.extract.constant",
    );
    if (actions && actions.length > 0) {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  assert.fail(
    "the TypeScript language server never offered refactor.extract.constant; " +
      "the dispatch tests below cannot mean anything without it",
  );
}

suite("runRefactor", () => {
  const logger = new Logger();

  suiteSetup(async function () {
    this.timeout(60000);
    await waitForLanguageServer();
  });

  suiteTeardown(() => {
    logger.dispose();
  });

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("dispatches the kind the prefetch matched", async () => {
    const editor = await openTypescript(TOP_LEVEL_EXPRESSION);
    editor.selection = EXPRESSION_RANGE;
    const { runner, dispatched } = recordingCommands();
    const { begin } = countingRequest(editor, false);

    await runRefactor("extractVariable", begin, runner, logger);

    assert.deepStrictEqual(dispatched(), [
      "editor.action.codeAction:refactor.extract.constant",
    ]);
  });

  test("does not dispatch when the selection moved during the lookup", async () => {
    // The v2.1.0 critical defect. The prefetch names a URI and a range;
    // editor.action.codeAction names neither and acts on whatever is focused
    // wherever the caret is when it runs.
    const editor = await openTypescript(TOP_LEVEL_EXPRESSION);
    editor.selection = EXPRESSION_RANGE;
    const { runner, dispatched } = recordingCommands();
    const { begin, guardChecks } = countingRequest(editor, true);

    await runRefactor("extractVariable", begin, runner, logger);

    assert.strictEqual(guardChecks(), 1, "the guard was consulted");
    assert.deepStrictEqual(dispatched(), [], "and nothing was dispatched");
  });

  test("never reaches the guard when the prefetch finds nothing", async () => {
    // Proves the ordering: the guard sits between prefetch and dispatch, so
    // an empty prefetch skips it. TypeScript exposes no
    // source.overrideMethods.
    const editor = await openTypescript(TOP_LEVEL_EXPRESSION);
    editor.selection = EXPRESSION_RANGE;
    const { runner, dispatched } = recordingCommands();
    const { begin, guardChecks } = countingRequest(editor, false);

    await runRefactor("overrideMethods", begin, runner, logger);

    assert.strictEqual(guardChecks(), 0);
    assert.deepStrictEqual(dispatched(), []);
  });

  test("dispatches inline through a different kind chain", async () => {
    const editor = await openTypescript(
      "function f() {\n  const a = 1 + 2;\n  return a;\n}\n",
    );
    editor.selection = new vscode.Selection(
      new vscode.Position(1, 8),
      new vscode.Position(1, 9),
    );
    const { runner, dispatched } = recordingCommands();
    const { begin } = countingRequest(editor, false);

    await runRefactor("inline", begin, runner, logger);

    assert.deepStrictEqual(dispatched(), [
      "editor.action.codeAction:refactor.inline.variable",
    ]);
  });

  test("returns quietly when there is no active editor", async () => {
    const { runner, dispatched } = recordingCommands();
    const beginNothing: BeginRequest = () => undefined;

    await runRefactor("extractVariable", beginNothing, runner, logger);

    assert.deepStrictEqual(dispatched(), []);
  });

  test("walks the whole chain before giving up", async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: "just some prose\n",
      language: "plaintext",
    });
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
    });
    const { runner, dispatched } = recordingCommands();
    const { begin, guardChecks } = countingRequest(editor, false);

    await runRefactor("extractMethod", begin, runner, logger);

    assert.strictEqual(guardChecks(), 0);
    assert.deepStrictEqual(dispatched(), []);
  });
});
