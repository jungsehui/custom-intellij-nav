import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "jungsehui.custom-intellij-nav";

/**
 * Chords VS Code already binds, on macOS and with no `when`, to the very
 * command IntelliJ wants.
 *
 * Re-binding one changes nothing a user can see except priority. An
 * extension's keybinding outranks every built-in one (ExternalExtension 400
 * against WorkbenchContrib 200), so ours also beat every *contextual* default
 * VS Code put on the same chord. Measured from VS Code 1.140.0's own default
 * keybindings:
 *
 * - `cmd+w`: ours beat Close Group (an empty group in a split), Close Window
 *   (no editor open), Restore Auxiliary Bar (while it is maximized) and Kill
 *   Terminal Editor.
 * - `cmd+\`: ours beat Split Terminal (terminal focused) and Split Active Tab
 *   (terminal tabs focused).
 */
const LEFT_TO_VS_CODE: ReadonlyArray<readonly [chord: string, command: string]> =
  [
    ["cmd+w", "workbench.action.closeActiveEditor"],
    ["cmd+\\", "workbench.action.splitEditor"],
  ];

interface ManifestKeybinding {
  readonly key?: string;
  readonly mac?: string;
  readonly command: string;
}

const MODIFIER_ORDER = ["ctrl", "shift", "alt", "cmd"];

/** `shift+cmd+f` and `cmd+shift+f` are one chord to VS Code, so to us. */
function normalizeChord(chord: string): string {
  return chord
    .trim()
    .split(/\s+/)
    .map((part) => {
      const tokens = part.toLowerCase().split("+");
      const key = tokens.pop() ?? "";
      const modifiers = tokens.sort(
        (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b),
      );
      return [...modifiers, key].join("+");
    })
    .join(" ");
}

suite("keymap manifest", () => {
  test("never re-binds a chord to the command VS Code already gives it", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);

    const keybindings = (
      extension.packageJSON as { contributes: { keybindings: ManifestKeybinding[] } }
    ).contributes.keybindings;

    // An empty or unreadable manifest would pass the check below vacuously.
    assert.ok(keybindings.length > 100, `read ${keybindings.length} keybindings`);

    const rebound = keybindings
      .filter((binding) =>
        LEFT_TO_VS_CODE.some(
          ([chord, command]) =>
            binding.command === command &&
            normalizeChord(binding.mac ?? binding.key ?? "") ===
              normalizeChord(chord),
        ),
      )
      .map((binding) => `${binding.mac ?? binding.key} -> ${binding.command}`);

    assert.deepStrictEqual(rebound, []);
  });

  test("every setting a when clause names is a declared setting", () => {
    // `config.x` of an undeclared key is never true, and VS Code says
    // nothing. A typo, or a setting removed from `configuration` but not
    // from the `when` clauses, silently switches a binding off for good.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);

    const manifest = extension.packageJSON as {
      contributes: {
        keybindings: Array<ManifestKeybinding & { readonly when?: string }>;
        configuration: { properties: Record<string, unknown> };
      };
    };
    const declared = new Set(Object.keys(manifest.contributes.configuration.properties));

    const named = manifest.contributes.keybindings.flatMap((binding) =>
      [...(binding.when ?? "").matchAll(/config\.([\w.]+)/g)].map((m) => m[1]),
    );
    // Without a match this would pass on any manifest at all.
    assert.ok(named.length > 100, `found ${named.length} config references`);

    const undeclared = [...new Set(named)].filter((key) => !declared.has(key));
    assert.deepStrictEqual(undeclared, []);
  });
});
