import * as assert from "assert";
import * as vscode from "vscode";
import { Logger } from "../core/logger";
import type { CommandRunner } from "../core/command-runner";
import type { BeginRequest, EditorRequest } from "../core/editor-request";
import { captureSnapshot } from "../core/snapshot";
import { goToDeclarationOrUsages } from "../navigation/go-to-declaration";

const DECLARATION = "vscode.executeDeclarationProvider";
const DEFINITION = "vscode.executeDefinitionProvider";
const REFERENCES = "vscode.executeReferenceProvider";
const GO_TO = "editor.action.goToLocations";
const PEEK = "editor.action.peekLocations";

/** Records the status bar instead of writing to it. */
class RecordingLogger extends Logger {
  readonly statuses: string[] = [];

  public override showStatus(message: string): void {
    this.statuses.push(message);
  }
}

interface Recorded {
  readonly command: string;
  readonly args: readonly unknown[];
}

/**
 * Answers provider queries from a script and records everything.
 *
 * Nothing reaches VS Code: a `undefined` entry means "the provider returned
 * nothing", and `editor.action.goToLocations` / `peekLocations` are observed
 * rather than executed.
 */
function scriptedCommands(script: Readonly<Record<string, unknown>>): {
  readonly runner: CommandRunner;
  readonly calls: () => readonly Recorded[];
  readonly names: () => readonly string[];
} {
  const seen: Recorded[] = [];

  return {
    runner: {
      run<T>(command: string, ...args: readonly unknown[]): Thenable<T> {
        seen.push({ command, args });
        if (command in script) {
          const answer = script[command];
          if (answer instanceof Error) {
            return Promise.reject(answer);
          }
          return Promise.resolve(answer as T);
        }
        return Promise.resolve(undefined as T);
      },
    },
    calls: () => seen,
    names: () => seen.map((c) => c.command),
  };
}

/** A request that turns stale after a given number of checks. */
function scriptedRequest(
  editor: vscode.TextEditor,
  staleAfter = Number.POSITIVE_INFINITY,
): { readonly begin: BeginRequest; readonly staleChecks: () => number } {
  let checks = 0;
  const request: EditorRequest = {
    id: 1,
    editor,
    snapshot: captureSnapshot(editor),
    isStale: () => {
      checks += 1;
      return checks > staleAfter;
    },
    isSelectionStale: () => false,
    log: () => undefined,
  };
  return { begin: () => request, staleChecks: () => checks };
}

suite("goToDeclarationOrUsages", () => {
  let logger: RecordingLogger;
  let editor: vscode.TextEditor;
  let here: vscode.Uri;

  const elsewhere = vscode.Uri.file("/elsewhere.ts");
  const range = (l: number, c: number) =>
    new vscode.Range(new vscode.Position(l, c), new vscode.Position(l, c + 4));

  setup(async () => {
    logger = new RecordingLogger();
    const doc = await vscode.workspace.openTextDocument({
      content: "const alpha = 1;\nconst beta = alpha;\n",
      language: "typescript",
    });
    editor = await vscode.window.showTextDocument(doc, { preview: false });
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 6),
      new vscode.Position(0, 6),
    );
    here = doc.uri;
  });

  teardown(async () => {
    logger.dispose();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("navigates when the declaration is somewhere else", async () => {
    const { runner, names } = scriptedCommands({
      [DECLARATION]: [new vscode.Location(elsewhere, range(9, 0))],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(names(), [DECLARATION, GO_TO]);
    assert.deepStrictEqual(logger.statuses, []);
  });

  test("peeks usages when the declaration is the caret itself", async () => {
    // IntelliJ's "already at the declaration" case.
    const { runner, names } = scriptedCommands({
      [DECLARATION]: [new vscode.Location(here, range(0, 6))],
      [REFERENCES]: [new vscode.Location(elsewhere, range(3, 0))],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(names(), [DECLARATION, REFERENCES, PEEK]);
    assert.deepStrictEqual(logger.statuses, []);
  });

  test("falls through to the definition provider when declaration is empty", async () => {
    const { runner, names } = scriptedCommands({
      [DECLARATION]: [],
      [DEFINITION]: [new vscode.Location(elsewhere, range(9, 0))],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(names(), [DECLARATION, DEFINITION, GO_TO]);
  });

  test("reports when nothing answers at all", async () => {
    const { runner, names } = scriptedCommands({
      [DECLARATION]: [],
      [DEFINITION]: [],
      [REFERENCES]: [],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(names(), [DECLARATION, DEFINITION, REFERENCES]);
    assert.deepStrictEqual(logger.statuses, [
      "No declaration, definition, or usages found",
    ]);
  });

  test("reports when the declaration is the caret and there are no usages", async () => {
    const { runner } = scriptedCommands({
      [DECLARATION]: [new vscode.Location(here, range(0, 6))],
      [REFERENCES]: [],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(logger.statuses, ["No usages found"]);
  });

  test("a request superseded after the provider stops without navigating", async () => {
    const { runner, names } = scriptedCommands({
      [DECLARATION]: [new vscode.Location(elsewhere, range(9, 0))],
    });
    const { begin } = scriptedRequest(editor, 0);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(names(), [DECLARATION], "no navigation");
    assert.deepStrictEqual(logger.statuses, [], "and no status either");
  });

  test("a request superseded during the usages lookup writes nothing", async () => {
    // The 2.1.0 defect: peekUsages returned false for both "superseded" and
    // "no references", so a stale request wrote "No usages found" while the
    // request that replaced it may have been navigating successfully.
    const { runner } = scriptedCommands({
      [DECLARATION]: [new vscode.Location(here, range(0, 6))],
      [REFERENCES]: [],
    });
    const { begin } = scriptedRequest(editor, 2);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(
      logger.statuses,
      [],
      "stale must be distinguished from none",
    );
  });

  test("a provider failure reports rather than throwing", async () => {
    const { runner } = scriptedCommands({
      [DECLARATION]: new Error("TS server went away"),
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(logger.statuses, ["Navigation failed (see Output)"]);
  });

  test("a provider failure on a superseded request stays quiet", async () => {
    const { runner } = scriptedCommands({
      [DECLARATION]: new Error("TS server went away"),
    });
    const { begin } = scriptedRequest(editor, 0);

    await goToDeclarationOrUsages(begin, runner, logger);

    assert.deepStrictEqual(logger.statuses, []);
  });

  test("duplicate results collapse before navigating", async () => {
    const duplicate = new vscode.Location(elsewhere, range(9, 0));
    const { runner, calls } = scriptedCommands({
      [DECLARATION]: [duplicate, duplicate, duplicate],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    const goTo = calls().find((c) => c.command === GO_TO);
    assert.ok(goTo);
    assert.strictEqual((goTo.args[2] as vscode.Location[]).length, 1);
    assert.strictEqual(goTo.args[3], "goto", "one target means no peek");
  });

  test("several distinct targets navigate with a peek", async () => {
    const { runner, calls } = scriptedCommands({
      [DECLARATION]: [
        new vscode.Location(elsewhere, range(9, 0)),
        new vscode.Location(elsewhere, range(20, 0)),
      ],
    });
    const { begin } = scriptedRequest(editor);

    await goToDeclarationOrUsages(begin, runner, logger);

    const goTo = calls().find((c) => c.command === GO_TO);
    assert.ok(goTo);
    assert.strictEqual((goTo.args[2] as vscode.Location[]).length, 2);
    assert.strictEqual(goTo.args[3], "gotoAndPeek");
  });

  test("returns quietly when there is no active editor", async () => {
    const { runner, names } = scriptedCommands({});
    const beginNothing: BeginRequest = () => undefined;

    await goToDeclarationOrUsages(beginNothing, runner, logger);

    assert.deepStrictEqual(names(), []);
    assert.deepStrictEqual(logger.statuses, []);
  });
});
