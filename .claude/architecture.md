# Architecture

A single VS Code extension. ~700 LOC. Two user-facing capabilities:

1. **`cmd+B` Go to Declaration or Usages** — IntelliJ-style merged
   navigation. Single command (`intellij.goToDeclarationOrUsages`).
2. **Extract refactoring** (Variable / Method / Constant / Inline) with
   per-language LSP kind dispatch and a prefetch-based dispatcher that
   avoids the "No preferred code actions" toast.

On top of those, a curated **75-keybinding IntelliJ Mac keymap** spread
across 10 toggleable categories (`enableXxxKeymap`).

## Module graph

```
src/extension.ts (33 LOC) — activate() registers 5 commands
└─ src/core/navigator.ts (35 LOC) — IntelliJNavigator orchestrator class
   ├─ src/core/logger.ts (33 LOC) — OutputChannel + status bar wrapper
   ├─ src/core/snapshot.ts (48 LOC) — captureSnapshot() + isStale()
   ├─ src/core/config.ts (25 LOC) — getShowErrorToasts, etc.
   ├─ src/navigation/go-to-declaration.ts (220 LOC) — cmd+B handler
   │  └─ src/navigation/location-utils.ts (68 LOC) — dedupe, normalize
   └─ src/refactor/run-refactor.ts (84 LOC) — Extract * handler
      └─ src/refactor/language-action-table.ts (89 LOC) — per-lang kind table
src/types.ts (44 LOC) — shared types (RawLocation, IntelliJAction, …)
```

No cycles. Each file has one job. Pure helpers (`location-utils`,
`snapshot`, `language-action-table`) take no `vscode` state — they
receive inputs and return outputs. The class (`IntelliJNavigator`) owns
the only mutable state (`latestRequestId`) and the only resource handle
(`Logger`).

## Domain layers

- **`core/`** — VS Code-aware infrastructure (Logger, config getters,
  snapshot/isStale, the orchestrator class).
- **`navigation/`** — Go to Declaration or Usages flow. Pure(-ish)
  handler that takes a `RequestState` (orchestrator-provided) + `Logger`
  and runs the multi-provider lookup with stale-request guards.
- **`refactor/`** — Extract refactoring. Pure handler that takes a
  `Logger` and dispatches via the language→kind table.
- **`types.ts`** — All cross-module type definitions in one place to
  prevent circular type imports.

## Manifest surface (`package.json`)

| Surface | Count | Notes |
|---|---|---|
| Commands | 5 | All in the `intellij.*` namespace |
| Keybindings | 75 | Each gated by `config.customIntellijNav.enableXxxKeymap` |
| Settings | 12 | 10 keymap toggles + `showErrorToasts` + `showRefactorNotifications` |

### Keymap categories (gating)

| Category | Setting | Keys | Default |
|---|---|---|---|
| bundled | `enableBundledMacKeymap` | 1 (cmd+b) | **on** |
| extended | `enableExtendedMacKeymap` | 15 | off |
| editing | `enableEditingKeymap` | 17 | off |
| navigation | `enableNavigationKeymap` | 16 | off |
| search | `enableSearchKeymap` | 5 | off |
| refactoring | `enableRefactoringKeymap` | 2 | off |
| vcs | `enableVcsKeymap` | 5 | off |
| toolwindow | `enableToolWindowKeymap` | 5 | off |
| explorertree | `enableExplorerTreeKeymap` | 1 | off |
| debugging | `enableDebuggingKeymap` | 8 | off |

Why off-by-default: each toggle conflicts with VS Code defaults or
k--kato. Users opt-in incrementally so a single broken category never
nukes their whole keyboard.

## Critical flows

### cmd+B (Go to Declaration or Usages)

```
keypress
  → intellij.goToDeclarationOrUsages
  → IntelliJNavigator.goToDeclarationOrUsages()
  → goToDeclaration(state, logger):
      capture snapshot
      try declaration provider
      if external result → editor.action.goToLocations
      if at-cursor result → peek references
      else → try definition provider
      else → status bar "No declaration, definition, or usages found"
```

Stale-request guard: every async hop checks `isStale(requestId, ...)`.
Rapid keypresses don't interleave navigation.

### cmd+alt+V (Extract Variable, etc.)

```
keypress
  → intellij.extractVariable
  → IntelliJNavigator.runRefactor("extractVariable")
  → for kind of LANGUAGE_ACTION_TABLE[action][langId]:
      prefetch via vscode.executeCodeActionProvider
      if 0 results → continue
      else → editor.action.codeAction { kind, apply: "ifSingle" }
            (single match auto-applies, multi shows picker)
      return
  if all kinds 0 → status bar + showInformationMessage
```

The `apply: "ifSingle"` is load-bearing: it's what surfaces VS Code's
picker for Extract Method (which exposes "to module scope" / "to inner
function" / "to method in class") and gives an IntelliJ-like Choose
Destination Scope UX.
