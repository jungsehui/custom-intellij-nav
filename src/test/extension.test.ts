import * as assert from "assert";
import * as vscode from "vscode";

suite("Custom IntelliJ Navigation", () => {
  test("registers intellij.goToDeclarationOrUsages command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("intellij.goToDeclarationOrUsages"));
  });
});
