import * as assert from "assert";
import * as vscode from "vscode";
import { Logger } from "../core/logger";
import { migrateLegacySettings } from "../core/migrate-settings";

const SECTION = "customIntellijNav";
const LEGACY = "enableBundledMacKeymap";
const CURRENT = "enableGoToDeclarationOrUsages";

const GLOBAL = vscode.ConfigurationTarget.Global;
const WORKSPACE = vscode.ConfigurationTarget.Workspace;

/** Re-fetched every time: a Configuration object is a snapshot. */
function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(SECTION);
}

async function write(
  key: string,
  value: boolean | undefined,
  scope: vscode.ConfigurationTarget,
): Promise<void> {
  await config().update(key, value, scope);
}

function readScoped(
  key: string,
  scope: vscode.ConfigurationTarget,
): boolean | undefined {
  const info = config().inspect<boolean>(key);
  return scope === GLOBAL ? info?.globalValue : info?.workspaceValue;
}

async function clearAll(): Promise<void> {
  for (const scope of [GLOBAL, WORKSPACE]) {
    for (const key of [LEGACY, CURRENT]) {
      await write(key, undefined, scope);
    }
  }
}

suite("migrateLegacySettings", () => {
  let logger: Logger;

  suiteSetup(() => {
    // ConfigurationTarget.Workspace is only writable with a folder open.
    // .vscode-test.mjs opens test-fixtures/workspace for exactly this.
    assert.ok(
      vscode.workspace.workspaceFolders?.length,
      "no workspace folder open — the workspace branch would be untestable",
    );
  });

  setup(async () => {
    logger = new Logger();
    await clearAll();
  });

  teardown(async () => {
    await clearAll();
    logger.dispose();
  });

  for (const [label, scope] of [
    ["user", GLOBAL],
    ["workspace", WORKSPACE],
  ] as const) {
    suite(`${label} scope`, () => {
      test("does nothing when the deprecated setting was never set", async () => {
        await migrateLegacySettings(logger);

        assert.strictEqual(readScoped(CURRENT, scope), undefined);
        assert.strictEqual(readScoped(LEGACY, scope), undefined);
      });

      test("does nothing when the deprecated setting is true", async () => {
        // true is the default. Migrating it would write a redundant key.
        await write(LEGACY, true, scope);

        await migrateLegacySettings(logger);

        assert.strictEqual(readScoped(CURRENT, scope), undefined);
        assert.strictEqual(
          readScoped(LEGACY, scope),
          true,
          "a true legacy value is left alone, not cleared",
        );
      });

      test("carries an explicit false over, and clears the old key", async () => {
        // The case the whole module exists for: a 1.x user who turned cmd+B
        // off. 2.0.0 required both settings, which trapped them -- setting
        // the new one to true did nothing while the old one was false.
        await write(LEGACY, false, scope);

        await migrateLegacySettings(logger);

        assert.strictEqual(
          readScoped(CURRENT, scope),
          false,
          "the value must survive the rename",
        );
        assert.strictEqual(
          readScoped(LEGACY, scope),
          undefined,
          "the deprecated key must be cleared, not left to veto",
        );
      });

      test("leaves an already-set replacement alone (true)", async () => {
        await write(LEGACY, false, scope);
        await write(CURRENT, true, scope);

        await migrateLegacySettings(logger);

        assert.strictEqual(
          readScoped(CURRENT, scope),
          true,
          "an explicit choice on the current setting wins",
        );
        assert.strictEqual(
          readScoped(LEGACY, scope),
          false,
          "nothing is cleared when nothing was migrated",
        );
      });

      test("leaves an already-set replacement alone (false)", async () => {
        await write(LEGACY, false, scope);
        await write(CURRENT, false, scope);

        await migrateLegacySettings(logger);

        assert.strictEqual(readScoped(CURRENT, scope), false);
        assert.strictEqual(readScoped(LEGACY, scope), false);
      });

      test("is idempotent", async () => {
        await write(LEGACY, false, scope);

        await migrateLegacySettings(logger);
        await migrateLegacySettings(logger);
        await migrateLegacySettings(logger);

        assert.strictEqual(readScoped(CURRENT, scope), false);
        assert.strictEqual(readScoped(LEGACY, scope), undefined);
      });
    });
  }

  test("the two scopes migrate independently", async () => {
    await write(LEGACY, false, GLOBAL);
    await write(LEGACY, true, WORKSPACE);

    await migrateLegacySettings(logger);

    assert.strictEqual(readScoped(CURRENT, GLOBAL), false, "user migrated");
    assert.strictEqual(readScoped(LEGACY, GLOBAL), undefined);

    assert.strictEqual(
      readScoped(CURRENT, WORKSPACE),
      undefined,
      "workspace was true, so nothing to carry over",
    );
    assert.strictEqual(readScoped(LEGACY, WORKSPACE), true);
  });

  test("a workspace override does not stop the user scope migrating", async () => {
    await write(LEGACY, false, GLOBAL);
    await write(CURRENT, true, WORKSPACE);

    await migrateLegacySettings(logger);

    assert.strictEqual(
      readScoped(CURRENT, GLOBAL),
      false,
      "the user scope is judged on its own values",
    );
    assert.strictEqual(readScoped(LEGACY, GLOBAL), undefined);
  });
});
