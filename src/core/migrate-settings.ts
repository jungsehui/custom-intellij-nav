import * as vscode from "vscode";
import type { Logger } from "./logger";

const SECTION = "customIntellijNav";
const LEGACY = "enableBundledMacKeymap";
const CURRENT = "enableGoToDeclarationOrUsages";

/**
 * Carry `enableBundledMacKeymap: false` over to its 2.0.0 replacement.
 *
 * Why this cannot live in a `when` clause: `config.x` evaluates to the
 * *effective* value, so an explicit `false` and an unset default-`true` are
 * indistinguishable. 2.0.0 worked around that by requiring both settings
 * (`… && enableGoToDeclarationOrUsages && enableBundledMacKeymap`), which
 * preserved behavior but created a trap — a user who followed the
 * deprecation notice and set the *new* setting to `true` got nothing,
 * because the deprecated one still vetoed it.
 *
 * So the value moves once, at activation, and the deprecated key is cleared.
 * Only an explicit `false` is migrated; an unset or `true` legacy value is
 * left alone, and an already-set `CURRENT` always wins.
 *
 * 3.0.0 kept this, and kept `LEGACY` declared, on purpose. Someone who skips
 * from 1.x straight past every 2.x release would otherwise lose their
 * `false` and get `⌘B` back without a word. And the declaration cannot go:
 * VS Code refuses to write a key that is not declared ("Unable to write to
 * User Settings because … is not a registered configuration", measured on
 * 1.140), so the clearing step above would fail on every machine.
 */
export async function migrateLegacySettings(logger: Logger): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION);
  const legacy = config.inspect<boolean>(LEGACY);
  const current = config.inspect<boolean>(CURRENT);

  const targets = [
    {
      scope: vscode.ConfigurationTarget.Global,
      legacyValue: legacy?.globalValue,
      currentValue: current?.globalValue,
      label: "user",
    },
    {
      scope: vscode.ConfigurationTarget.Workspace,
      legacyValue: legacy?.workspaceValue,
      currentValue: current?.workspaceValue,
      label: "workspace",
    },
  ];

  for (const target of targets) {
    if (target.legacyValue !== false || target.currentValue !== undefined) {
      continue;
    }

    try {
      await config.update(CURRENT, false, target.scope);
      await config.update(LEGACY, undefined, target.scope);
      logger.log(
        `migrated ${target.label} setting ${LEGACY}=false -> ${CURRENT}=false`,
      );
    } catch (error) {
      // A read-only settings file (remote, restricted workspace) is not a
      // reason to fail activation. The user keeps the old behavior.
      const message = error instanceof Error ? error.message : String(error);
      logger.log(`migration of ${target.label} ${LEGACY} failed: ${message}`);
    }
  }
}
