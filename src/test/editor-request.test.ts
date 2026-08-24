import * as assert from "assert";
import * as vscode from "vscode";
import {
  createRequestFactory,
  type ActiveEditorSource,
} from "../core/editor-request";
import { Logger } from "../core/logger";

/**
 * A fake ActiveEditorSource. This is the second adapter the port exists for:
 * it lets a test say "the user switched editors" or "the editor went away"
 * without actually doing either, and without a single cast — the editors it
 * hands out are real ones opened in the test host.
 */
class FakeEditorSource implements ActiveEditorSource {
  public constructor(private editor: vscode.TextEditor | undefined) {}

  public current(): vscode.TextEditor | undefined {
    return this.editor;
  }

  public switchTo(editor: vscode.TextEditor | undefined): void {
    this.editor = editor;
  }
}

async function openEditor(content: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    content,
    language: "typescript",
  });
  return vscode.window.showTextDocument(doc, { preview: false });
}

suite("EditorRequest", () => {
  let logger: Logger;

  setup(() => {
    logger = new Logger();
  });

  teardown(() => {
    logger.dispose();
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("returns undefined when there is no active editor", () => {
    const beginRequest = createRequestFactory(
      new FakeEditorSource(undefined),
      logger,
    );
    assert.strictEqual(beginRequest(), undefined);
  });

  test("ids increment per request", async () => {
    const editor = await openEditor("const a = 1;\n");
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    assert.strictEqual(beginRequest()?.id, 1);
    assert.strictEqual(beginRequest()?.id, 2);
    assert.strictEqual(beginRequest()?.id, 3);
  });

  test("a fresh request is not stale", async () => {
    const editor = await openEditor("const a = 1;\n");
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    const request = beginRequest();
    assert.ok(request);
    assert.strictEqual(request.isStale(), false);
    assert.strictEqual(request.isSelectionStale(), false);
  });

  test("a superseded request is stale", async () => {
    const editor = await openEditor("const a = 1;\n");
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    const first = beginRequest();
    assert.ok(first);
    assert.strictEqual(first.isStale(), false);

    beginRequest(); // a newer keypress

    assert.strictEqual(
      first.isStale(),
      true,
      "the older request must stand down",
    );
  });

  test("an edited document makes the request stale", async () => {
    const editor = await openEditor("const a = 1 + 2;\n");
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    const request = beginRequest();
    assert.ok(request);

    await editor.edit((b) => b.insert(new vscode.Position(0, 0), "// x\n"));

    assert.strictEqual(request.isStale(), true);
  });

  test("switching to a different editor makes the request stale", async () => {
    const first = await openEditor("const a = 1;\n");
    const source = new FakeEditorSource(first);
    const beginRequest = createRequestFactory(source, logger);

    const request = beginRequest();
    assert.ok(request);

    source.switchTo(await openEditor("const b = 2;\n"));

    assert.strictEqual(request.isStale(), true);
  });

  test("the editor going away makes the request stale", async () => {
    const editor = await openEditor("const a = 1;\n");
    const source = new FakeEditorSource(editor);
    const beginRequest = createRequestFactory(source, logger);

    const request = beginRequest();
    assert.ok(request);

    source.switchTo(undefined);

    assert.strictEqual(request.isStale(), true);
  });

  test("a moved caret is selection-stale but not stale", async () => {
    // This is the distinction the two rules exist for. Navigation can carry
    // on after the caret moves, because it names the position it is going
    // to. Refactoring cannot: editor.action.codeAction takes no range.
    const editor = await openEditor("const a = 1 + 2;\nconst b = 3;\n");
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 10),
      new vscode.Position(0, 15),
    );
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    const request = beginRequest();
    assert.ok(request);

    editor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );

    assert.strictEqual(request.isStale(), false, "document is unchanged");
    assert.strictEqual(
      request.isSelectionStale(),
      true,
      "a refactoring must not dispatch after the caret moves",
    );
  });

  test("isSelectionStale inherits every reason isStale has", async () => {
    const editor = await openEditor("const a = 1;\n");
    const source = new FakeEditorSource(editor);
    const beginRequest = createRequestFactory(source, logger);

    const request = beginRequest();
    assert.ok(request);

    source.switchTo(undefined);

    assert.strictEqual(request.isStale(), true);
    assert.strictEqual(request.isSelectionStale(), true);
  });

  test("the snapshot is taken at begin, not read later", async () => {
    const editor = await openEditor("const a = 1;\n");
    const beginRequest = createRequestFactory(
      new FakeEditorSource(editor),
      logger,
    );

    const request = beginRequest();
    assert.ok(request);
    const capturedVersion = request.snapshot.version;

    await editor.edit((b) => b.insert(new vscode.Position(0, 0), "// x\n"));

    assert.strictEqual(
      request.snapshot.version,
      capturedVersion,
      "the snapshot must not follow the document",
    );
  });
});
