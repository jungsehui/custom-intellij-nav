import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "jungsehui.custom-intellij-nav";

const EXPECTED_COMMANDS = [
  "intellij.goToDeclarationOrUsages",
  "intellij.extractVariable",
  "intellij.extractMethod",
  "intellij.extractConstant",
  "intellij.inline",
  "intellij.move",
  "intellij.overrideMethods",
  "intellij.implementMethods",
];

suite("Custom IntelliJ Navigation", () => {
  suiteSetup(async () => {
    // The extension declares no activationEvents, so VS Code activates it
    // lazily on first command use. Nothing in a test run triggers that, and
    // a contributed-but-inactive command is not in the command registry —
    // which is why the earlier version of this test asserted against an
    // extension that had never started.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);
    await extension.activate();
  });

  test("activates without throwing", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension?.isActive);
  });

  test("registers every contributed command", async () => {
    const registered = new Set(await vscode.commands.getCommands(true));
    const missing = EXPECTED_COMMANDS.filter((id) => !registered.has(id));
    assert.deepStrictEqual(missing, [], `unregistered: ${missing.join(", ")}`);
  });

  test("every command in the manifest is actually registered", async () => {
    // Guards the reverse direction: a command contributed in package.json but
    // never wired in activate() shows up in the palette and does nothing.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const contributed: string[] = (
      extension?.packageJSON?.contributes?.commands ?? []
    ).map((c: { command: string }) => c.command);
    assert.ok(contributed.length > 0, "manifest contributes no commands");

    const registered = new Set(await vscode.commands.getCommands(true));
    const missing = contributed.filter((id) => !registered.has(id));
    assert.deepStrictEqual(missing, [], `contributed but not registered`);
  });
});
