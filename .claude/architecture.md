# Architecture

A single VS Code extension. ~1626 LOC across 18 files (6 of them tests, 572 LOC). Two user-facing capabilities:

1. **`cmd+B` Go to Declaration or Usages** — IntelliJ-style merged
   navigation. Single command (`intellij.goToDeclarationOrUsages`).
2. **Refactoring** (Extract Variable / Method / Constant, Inline, Move,
   Override / Implement Methods) with per-language LSP kind dispatch and a
   prefetch-based dispatcher that avoids the "No preferred code actions"
   toast.

On top of those, a curated **168-keybinding IntelliJ Mac keymap** spread
across 11 functional categories plus one feature toggle.

## Module graph

```
src/extension.ts (52 LOC) — builds the Logger and the request factory,
│                            registers 8 commands from a data table
├─ src/core/logger.ts (33 LOC) — OutputChannel + status bar wrapper
├─ src/core/config.ts (25 LOC) — getShowErrorToasts, etc.
├─ src/core/migrate-settings.ts (61 LOC) — one-time 2.0.0 setting move.
│     A `when` clause sees only the *effective* value, so it cannot tell
│     an explicit `false` from an unset default. That is why the
│     deprecated-setting migration has to be code.
├─ src/core/editor-request.ts (123 LOC) — the request lifecycle and the
│  │   extension's one port. Owns the counter (in a closure), issues
│  │   EditorRequests, answers isStale() / isSelectionStale().
│  └─ src/core/snapshot.ts (52 LOC) — the pure rules: captureSnapshot,
│         editorMatches, selectionMatches. No global reads.
├─ src/navigation/go-to-declaration.ts (211 LOC) — cmd+B handler
│  └─ src/navigation/location-utils.ts (73 LOC) — dedupe, normalize,
│         and RawLocation
└─ src/refactor/run-refactor.ts (101 LOC) — the adapter: talks to VS Code
   └─ src/refactor/policy.ts (94 LOC) — the decisions: which chain, whether
      │    we may call a language unsupported, what to say. No vscode.
      └─ src/refactor/language-action-table.ts (185 LOC) — per-lang kind
            table + ACTION_LABELS + CodeActionAttempt. Carries the measured
            census of every refactor kind TypeScript emits; that census is
            the reason cmd+alt+f / cmd+f6 / cmd+alt+p are not shipped.
src/types.ts (31 LOC) — only types crossing folders: IntelliJAction,
                        EditorSnapshot
```

No cycles. Each file has one job.

**One port, one global.** `vscode.window.activeTextEditor` is read in
exactly one place: the adapter behind `ActiveEditorSource` in
`editor-request.ts`. Everything downstream receives an editor rather than
reaching for one, which is what makes the staleness rules testable.

**One counter.** The only mutable state in the extension is
`latestId` inside `createRequestFactory`'s closure. Call sites never see it.

**Three files may not import `vscode` at runtime** — `types.ts`,
`language-action-table.ts`, `policy.ts`. That is enforced by
`@typescript-eslint/no-restricted-imports` in `eslint.config.mjs`, not by
convention. `location-utils.ts` is deliberately outside the ring: it calls
`new vscode.Location`, and that construction is the point of the module.

## Domain layers

- **`core/`** — infrastructure: Logger, config getters, the request
  lifecycle and its port, and the pure snapshot rules.
- **`navigation/`** — Go to Declaration or Usages. Takes a `BeginRequest`
  and a `Logger`, walks `PROVIDER_CHAIN` in order, guards every await
  boundary with `request.isStale()`.
- **`refactor/`** — split in two on purpose. `run-refactor.ts` is the
  adapter that talks to VS Code; `policy.ts` and `language-action-table.ts`
  are the decisions and the data, and cannot import `vscode`.
- **`types.ts`** — All cross-module type definitions in one place to
  prevent circular type imports.

## Manifest surface (`package.json`)

| Surface | Count | Notes |
|---|---|---|
| Commands | 8 | All in the `intellij.*` namespace |
| Keybindings | 168 | Each gated by `config.customIntellijNav.enableXxxKeymap` |
| Settings | 17 | 11 category toggles + 1 feature toggle + 2 deprecated + `useCamelHumpsWords` + `showErrorToasts` + `showRefactorNotifications` |

### Keymap categories (gating)

| Category | Setting | Keys | Default |
|---|---|---|---|
| *(feature)* | `enableGoToDeclarationOrUsages` | 1 (cmd+b) | **on** |
| editing | `enableEditingKeymap` | 60 | off |
| navigation | `enableNavigationKeymap` | 36 | off |
| search | `enableSearchKeymap` | 10 | off |
| refactoring | `enableRefactoringKeymap` | 9 | off |
| vcs | `enableVcsKeymap` | 7 | off |
| toolwindow | `enableToolWindowKeymap` | 18 | off |
| explorertree | `enableExplorerTreeKeymap` | 1 | off |
| debugging | `enableDebuggingKeymap` | 13 | off |
| run | `enableRunKeymap` | 4 | off |
| diff | `enableDiffKeymap` | 3 | off |
| workbench | `enableWorkbenchKeymap` | 6 | off |

Why off-by-default: each toggle conflicts with VS Code defaults or
k--kato. Users opt-in incrementally so a single broken category never
nukes their whole keyboard.

### One axis, not two

Until 2.0.0 there were two competing axes: functional categories
(`enableEditingKeymap`, …) and tiers (`enableBundledMacKeymap`,
`enableExtendedMacKeymap`). The same kind of binding could live under
either — `⌘⌥V` Extract Variable sat under the tier toggle while `⇧F6`
Rename sat under Refactoring.

2.0.0 collapses this to one axis plus one exception:

- **11 functional category toggles**, all default off. Each one displaces
  VS Code defaults, so users opt in per area.
- **One feature toggle**, `enableGoToDeclarationOrUsages`, default **on**.
  `⌘B` is not a keymap remap, it is the extension's own command, and it
  is why most people install this. It is the only thing that is on out of
  the box.

The two tier settings remain declared and honoured (`||`-ed into the moved
bindings' `when`, and `&&`-ed into `⌘B`'s) so existing settings keep
working. They go away in 3.0.0.

### Staleness is a shared concern, not a navigation one

Both user-facing flows await a language-server round-trip and then act on
the editor. Both therefore need the same guard, and `core/snapshot.ts` owns
it:

| | navigation | refactoring |
|---|---|---|
| guard | `isStale(requestId, latest, snapshot, logger)` | `selectionMatches(snapshot, editor)` |
| compares | request id, then uri + version | uri + version + **selection** |
| why the difference | a newer `⌘B` supersedes an older one | `editor.action.codeAction` takes no URI and no range, so a moved caret redirects the edit |

`editorMatches` and `selectionMatches` are pure — they take the editor
rather than reading `vscode.window.activeTextEditor` — so the rules are
unit-tested against real editors without mocking. `isStale` layers the
request-id check on top and is the only one that touches global state.

Until 2.1.0 the refactor path had no guard at all, and a focus change
inside the prefetch round-trip could apply a refactoring to code the user
never selected.

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
  → goToDeclarationOrUsages(beginRequest, logger):
      request = beginRequest()          // bumps the counter, takes a snapshot
      for (source, command) of PROVIDER_CHAIN:
        resolve provider
        if request.isStale() → return
        if external result → editor.action.goToLocations
        if at-cursor result → peek references, then return
      else → peek references
      else → status bar "No declaration, definition, or usages found"
```

Stale-request guard: every await boundary is followed by
`request.isStale()` — five of them, each with no arguments. Rapid
keypresses don't interleave navigation, and a superseded request never
writes to the UI.

### cmd+alt+V (Extract Variable), F6 (Move), ctrl+O (Override), …

```
keypress
  → intellij.extractVariable
  → runRefactor("extractVariable", beginRequest, logger):
      request = beginRequest()
      for attempt of resolveAttempts(action, langId):     // policy.ts
        prefetch via vscode.executeCodeActionProvider
        if 0 results → continue
        if request.isSelectionStale() → return            // the caret moved
        else → editor.action.codeAction { kind, apply: "ifSingle" }
              (single match auto-applies, multi shows picker)
        return
  if all kinds 0 → describeOutcome() decides what may be said
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
