# Custom IntelliJ Navigation

IntelliJ-style **Go to Declaration or Usages** for VS Code.

## What it does

This extension provides a custom command:

- `IntelliJ Navigation: Go to Declaration or Usages`
- command id: `intellij.goToDeclarationOrUsages`

Behavior:

1. Try **Go to Declaration** first.
2. If an external declaration exists, navigate to it.
3. If declaration resolves to the current location, show **Usages** in a peek view.
4. If no declaration exists, try **Go to Definition**.
5. If definition also resolves to the current location, show **Usages**.

## Why this extension exists

VS Code splits navigation into separate actions such as:

- Go to Definition
- Go to Declaration
- Find References
- Peek References

This extension combines those behaviors to approximate IntelliJ IDEA's `⌘B` experience.

## Bundled macOS keymap

This extension can ship a small curated macOS keymap.

### Enabled by default
- `⌘B` → `Go to Declaration or Usages`

### Optional extended keymap
The following shortcuts can be enabled via settings:

- `⌘⇧B` → Go to Type Definition
- `⌘⌥⇧N` → Go to Symbol in Workspace
- `⌘N` / `⌘⇧N` → New File / New Folder in Explorer
- `⌘1` → Focus/toggle Explorer
- `⌘\` → Split Editor
- `⌃⇧R` → Run Test at Cursor
- `⌃⇧D` → Debug Test at Cursor
- `⌥J` → Add Selection to Next Find Match
- `⌘⌃G` → Select Highlights

## Settings

### `customIntellijNav.enableBundledMacKeymap`
Default: `true`

Enables the bundled macOS `⌘B` keybinding.

### `customIntellijNav.enableExtendedMacKeymap`
Default: `false`

Enables additional macOS shortcuts beyond `⌘B`.

This is disabled by default because some shortcuts can still overlap with built-in VS Code bindings or third-party keymap extensions.

## If you also use IntelliJ IDEA Keybindings

This extension does **not** try to replace the full IntelliJ IDEA keymap.

If you also use the `IntelliJ IDEA Keybindings` extension, the bundled `⌘B` may still compete with another keybinding depending on your setup.

If you want deterministic behavior, add the following overrides to your user `keybindings.json`.

## Optional user overrides for conflict-heavy shortcuts

```json
[
  {
    "key": "cmd+b",
    "command": "-workbench.action.toggleSidebarVisibility"
  },
  {
    "key": "cmd+b",
    "command": "-editor.action.goToDeclaration",
    "when": "editorTextFocus"
  },
  {
    "key": "cmd+b",
    "command": "intellij.goToDeclarationOrUsages",
    "when": "editorTextFocus"
  },
  {
    "key": "cmd+shift+b",
    "command": "-workbench.action.tasks.build"
  },
  {
    "key": "cmd+d",
    "command": "-editor.action.addSelectionToNextFindMatch"
  },
  {
    "key": "cmd+e",
    "command": "-actions.findWithSelection"
  },
  {
    "key": "cmd+1",
    "command": "-workbench.action.focusFirstEditorGroup"
  },
  {
    "key": "ctrl+t",
    "command": "-editor.action.transposeLetters",
    "when": "textInputFocus && !editorReadonly"
  },
  {
    "key": "alt+cmd+b",
    "command": "-workbench.action.toggleAuxiliaryBar"
  }
]
