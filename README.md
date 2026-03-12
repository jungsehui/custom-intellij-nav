# Custom IntelliJ Navigation

IntelliJ-style **Go to Declaration or Usages** for VS Code.

## What it does
This extension provides a custom command:

- `IntelliJ Navigation: Go to Declaration or Usages`

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

## Command
- `intellij.goToDeclarationOrUsages`

## Recommended keybinding (macOS)
Add this to your `keybindings.json`:

```json
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
}
```

## Local development
```bash
npm install
npm run check
npm run compile
```

Then press `F5` in VS Code to open an **Extension Development Host** window.

## Packaging
Requires Node.js 20+.

```bash
npm run check
npm run compile
npx vsce package
```

## Publish
Publishing to the Visual Studio Marketplace requires a Marketplace publisher and a Personal Access Token (PAT).

## Status
Experimental. Tested first with a small TypeScript sample workspace before real-project integration.
