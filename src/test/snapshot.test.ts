import * as assert from "assert";
import * as vscode from "vscode";
import {
  captureSnapshot,
  editorMatches,
  selectionMatches,
} from "../core/snapshot";

async function openEditor(content: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    content,
    language: "typescript",
  });
  return vscode.window.showTextDocument(doc, { preview: false });
}

suite("snapshot guards", () => {
  suiteTeardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("editorMatches is true for the editor the snapshot came from", async () => {
    const editor = await openEditor("const a = 1 + 2;\nconst b = 3;\n");
    const snap = captureSnapshot(editor);
    assert.ok(editorMatches(snap, editor));
  });

  test("editorMatches is false when there is no editor", async () => {
    const editor = await openEditor("const a = 1;\n");
    const snap = captureSnapshot(editor);
    assert.ok(!editorMatches(snap, undefined));
  });

  test("editorMatches is false after the document is edited", async () => {
    const editor = await openEditor("const a = 1 + 2;\n");
    const snap = captureSnapshot(editor);

    await editor.edit((b) => b.insert(new vscode.Position(0, 0), "// x\n"));

    assert.ok(
      !editorMatches(snap, editor),
      "a version bump must invalidate the snapshot",
    );
  });

  test("editorMatches is false for a different document", async () => {
    const first = await openEditor("const a = 1;\n");
    const snap = captureSnapshot(first);
    const second = await openEditor("const b = 2;\n");
    assert.ok(!editorMatches(snap, second));
  });

  test("selectionMatches is true when the selection has not moved", async () => {
    const editor = await openEditor("const a = 1 + 2;\n");
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 10),
      new vscode.Position(0, 15),
    );
    const snap = captureSnapshot(editor);
    assert.ok(selectionMatches(snap, editor));
  });

  test("selectionMatches is false after the caret moves", async () => {
    // This is the guard that stops a refactoring from landing where the user
    // never selected: the prefetch names a range, editor.action.codeAction
    // does not, and the caret can move in between.
    const editor = await openEditor("const a = 1 + 2;\nconst b = 3;\n");
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 10),
      new vscode.Position(0, 15),
    );
    const snap = captureSnapshot(editor);

    editor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );

    assert.ok(editorMatches(snap, editor), "document itself is unchanged");
    assert.ok(
      !selectionMatches(snap, editor),
      "a moved caret must invalidate a refactoring snapshot",
    );
  });

  test("selectionMatches is false whenever editorMatches is", async () => {
    const editor = await openEditor("const a = 1;\n");
    const snap = captureSnapshot(editor);
    assert.ok(!selectionMatches(snap, undefined));
  });
});
