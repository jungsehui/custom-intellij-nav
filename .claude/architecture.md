# Architecture

A single VS Code extension. ~795 LOC. Two user-facing capabilities:

1. **`cmd+B` Go to Declaration or Usages** — IntelliJ-style merged
   navigation. Single command (`intellij.goToDeclarationOrUsages`).
2. **Refactoring** (Extract Variable / Method / Constant, Inline, Move,
   Override / Implement Methods) with per-language LSP kind dispatch and a
   prefetch-based dispatcher that avoids the "No preferred code actions"
   toast.

On top of those, a curated **143-keybinding IntelliJ Mac keymap** spread
across 11 toggleable categories (`enableXxxKeymap`).

## Module graph

```
src/extension.ts (42 LOC) — activate() registers 8 commands
└─ src/core/navigator.ts (35 LOC) — IntelliJNavigator orchestrator class
   ├─ src/core/logger.ts (33 LOC) — OutputChannel + status bar wrapper
   ├─ src/core/snapshot.ts (48 LOC) — captureSnapshot() + isStale()
   ├─ src/core/config.ts (25 LOC) — getShowErrorToasts, etc.
   ├─ src/navigation/go-to-declaration.ts (220 LOC) — cmd+B handler
   │  └─ src/navigation/location-utils.ts (68 LOC) — dedupe, normalize
   └─ src/refactor/run-refactor.ts (87 LOC) — refactoring handler
      └─ src/refactor/language-action-table.ts (173 LOC) — per-lang kind
         table + ACTION_LABELS. Carries the measured census of every
         refactor kind TypeScript emits; that census is the reason
         cmd+alt+f / cmd+f6 / cmd+alt+p are not shipped.
src/types.ts (55 LOC) — shared types (RawLocation, IntelliJAction, …)
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
| Commands | 8 | All in the `intellij.*` namespace |
| Keybindings | 143 | Each gated by `config.customIntellijNav.enableXxxKeymap` |
| Settings | 14 | 11 keymap toggles + `useCamelHumpsWords` + `showErrorToasts` + `showRefactorNotifications` |

### Keymap categories (gating)

| Category | Setting | Keys | Default |
|---|---|---|---|
| bundled | `enableBundledMacKeymap` | 1 (cmd+b) | **on** |
| extended | `enableExtendedMacKeymap` | 15 | off |
| editing | `enableEditingKeymap` | 50 | off |
| navigation | `enableNavigationKeymap` | 36 | off |
| search | `enableSearchKeymap` | 10 | off |
| refactoring | `enableRefactoringKeymap` | 5 | off |
| vcs | `enableVcsKeymap` | 5 | off |
| toolwindow | `enableToolWindowKeymap` | 5 | off |
| explorertree | `enableExplorerTreeKeymap` | 1 | off |
| debugging | `enableDebuggingKeymap` | 12 | off |
| run | `enableRunKeymap` | 3 | off |

Why off-by-default: each toggle conflicts with VS Code defaults or
k--kato. Users opt-in incrementally so a single broken category never
nukes their whole keyboard.

### Two kinds of `when` guard

Beyond the category toggle, bindings carry guards of two kinds, and the
distinction matters when adding keys:

- **Capability guards** decide whether the action is meaningful right now
  — `debugState == 'stopped'`, `debuggersAvailable`, `editorHasSelection`,
  `taskCommandsRegistered`. Without one, the key displaces a VS Code
  default unconditionally while often doing nothing. All eight original
  Debugging bindings had this bug until v1.4.0.
- **Deference guards** hand the key to whoever owns it in context —
  `!terminalFocus`, and `!vim.use<C-x>` for the nine keys VSCodeVim
  claims. These let one chord serve two extensions instead of forcing the
  user to disable a category.

Every context key used in a guard must be verified to exist in the VS Code
source before shipping. A `when` referring to a non-existent key never
matches, so the binding fails closed and silently.

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

### cmd+alt+V (Extract Variable), F6 (Move), ctrl+O (Override), …

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

It is also why kind chains must stay narrow. Kind matching is
prefix-based on dot boundaries, so `refactor.rewrite` matches
`refactor.rewrite.arrow.braces` — and when that is the only match,
`ifSingle` applies it without asking. A broad fallback therefore turns
"nothing to do here" into "silently did something else". This shipped as
a real bug in Inline and was fixed in v1.3.0; see the `inline` comment in
`language-action-table.ts`.
