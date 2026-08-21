# Change Log

All notable changes to the "custom-intellij-nav" extension will be documented
in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and
this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] — 2026-08-21

A code review pass. One critical race, three correctness fixes, a migration
trap, and the manifest's dead weight. Test cases 1 → 20.

### Fixed — a refactoring could land where you never selected (critical)

`runRefactor` prefetched against a captured `editor.document.uri` and
`editor.selection`, then dispatched `editor.action.codeAction` — which takes
**no URI and no range** and acts on whatever is focused wherever the caret is
*when it runs*. The provider round-trip between the two is an await boundary,
tens of milliseconds warm and seconds on a cold TS server, and there was no
staleness guard at all.

Move the caret or click another file inside that window and, if exactly one
action of the same kind matches at the new position, `apply: "ifSingle"`
applies it **without asking**. Same failure class as the v1.3.0 Inline bug;
that fix narrowed *which kind* is dispatched and left *where* unguarded.

`core/snapshot.ts` now exposes `editorMatches` and `selectionMatches` as pure
predicates — they take the editor instead of reading
`vscode.window.activeTextEditor`, so the rule is unit-testable — and
`runRefactor` bails if either fails immediately before dispatch.

### Fixed — a superseded `⌘B` wrote over the one that replaced it

`peekUsages` returned `false` both for "request superseded" and for "genuinely
zero references", and the three call sites could not tell them apart. Press
`⌘B` twice quickly and request 1 could put **"No usages found"** on the status
bar while request 2 was navigating successfully. It now returns
`"shown" | "none" | "stale"`. The `catch` block had the same leak and now
re-checks staleness before reporting.

### Fixed — exceptions were reported as "this language does not support it"

Every attempt's error was swallowed, so if all attempts threw (TS server
crash, extension-host hiccup) the user was told the language server does not
implement the refactoring. That is the one message a user acts on: they would
conclude the feature does not exist and stop pressing the key. Failures now
say so.

### Fixed — `enableBundledMacKeymap: false` could not be migrated

2.0.0 gated `⌘B` on `enableGoToDeclarationOrUsages && enableBundledMacKeymap`.
That preserved behavior in all four combinations, but created a trap: a 1.x
user who had set the deprecated setting to `false`, then followed the
deprecation notice and set the **new** setting to `true`, got nothing. The
struck-through setting silently vetoed its own replacement.

A `when` clause cannot distinguish an explicit `false` from an unset default,
so this could not be fixed in the manifest. `core/migrate-settings.ts` now
moves the value once at activation and clears the deprecated key, and `⌘B`
gates on the current setting alone. The 17 `||` shims for the other tier
setting are untouched — those are additive and were correct in all four
combinations.

### Changed — manifest

- **128 unreachable `key` values removed.** Entries carried both `key` and
  `mac` with divergent chords (`⌘B` had `"key": "ctrl+b"`). VS Code prefers
  `mac` on macOS and every binding is `isMac`-gated, so the `key` chord could
  never fire on any platform — it only advertised Windows and Linux chords on
  the Marketplace that this extension does not support.
- The Explorer `right` binding gained the `isMac` guard that
  `conventions.md` requires and it alone was missing.
- `enableVcsKeymap` now states that `⌘⌥⇧G` needs the third-party
  **mhutchie.git-graph** extension and is inert without it.

### Changed — source

- `ProviderResolution.all` was written and never read. Removed.
- `isLocationLink` and `toLocation` were exported but used only inside
  `location-utils.ts`. Now module-private.
- `runRefactor`'s table lookup uses `Object.hasOwn` instead of
  `table[langId] ?? table["*"]`, which would have resolved a `languageId`
  colliding with a prototype key (`constructor`, `toString`) to a function.
- Dropped the `console.log` on activation. The Output channel exists for that.

### Added — tests

One test asserting a command was registered, now 20. They cover the pure
predicates behind the critical fix (`editorMatches`, `selectionMatches`
against real editors, including the moved-caret case), `location-utils`
dedupe and normalization, and the action-table invariants — every action has
a `"*"` chain, no chain repeats a kind or holds one that is a dot-prefix of
another, every kind is well-formed.

### Fixed — the test suite had never run

`npm test` failed with `spawn … /Contents/MacOS/Electron ENOENT`.
`@vscode/test-electron@2.5.2` looks for an executable named `Electron`;
VS Code 1.134's macOS bundle names it `Code`. Upgraded to 3.1.0 (and
`@vscode/test-cli` 0.0.11 → 0.0.15).

With the harness working, the one pre-existing test turned out to be wrong:
it asserted `intellij.goToDeclarationOrUsages` was in `getCommands()`, but
the extension declares no `activationEvents` and so activates lazily —
nothing in a test run triggers it, and a contributed-but-inactive command is
not in the command registry. It now activates the extension in
`suiteSetup` and checks both directions: every expected command is
registered, and every command the manifest contributes is registered.

### Checked and found not to be a problem

`vscode.executeCodeActionProvider` was suspected of returning `disabled` code
actions, which would let the prefetch gate pass on an unusable action and let
VS Code raise a toast the extension cannot suppress. It returns
`codeActionSet.validActions` (`codeAction.ts` L377), not `allActions`, so the
concern does not apply.

## [2.0.1] — 2026-08-21

### Fixed — `⌃↑` and `⌃↓` were dead twice over

Removed. They were bound to `workbench.action.gotoPrevSymbol` and
`workbench.action.gotoNextSymbol`, **neither of which is a VS Code
command**. The same defect class as the `F6` fix in 1.3.0: VS Code accepts
a keybinding pointing at any string and warns about nothing.

They also could not have worked even with correct commands. On this Mac,
`AppleSymbolicHotKeys` has no override for IDs 32 and 33 (Mission Control,
Application Windows), so both are at their factory assignment — `⌃↑` and
`⌃↓` — and macOS consumes them before any application sees the event.

The intent was IntelliJ's *Move Caret to Previous / Next Method*. VS Code
has no equivalent command: searching the full source for any
`nextSymbol` / `prevSymbol` / `nextMember` navigation action returns
nothing, and the `outline.*` family only focuses and folds the Outline
view. This is now a permanent exclusion, not a gap.

`⌃←` / `⌃→` are kept. They point at real commands
(`previousEditor` / `nextEditor`) and already carry `!terminalFocus`, but
they are subject to the same preemption: symbolic hotkeys 79–82 ("Move
left/right a space") are `enabled = 1` on this Mac with no parameter
override, meaning default assignment. They work only if you turn those
off in System Settings → Keyboard → Keyboard Shortcuts → Mission Control.

Keybindings 170 → 168.

## [2.0.0] — 2026-08-21

**Breaking.** The two legacy tier toggles are deprecated and their bindings
moved into functional categories. Numpad mirrors added. Coverage
79.6% → 87.9%, and every one of the 19 remaining chords now has a recorded
reason for not being implemented.

Keybindings 156 → 170, settings 16 → 17.

### Breaking: `enableBundledMacKeymap` and `enableExtendedMacKeymap` are deprecated

The keymap had two axes that did not agree with each other. `⌘⌥V`
(Extract Variable) is a refactoring but lived under `enableExtendedMacKeymap`,
while `⇧F6` (Rename) lived under `enableRefactoringKeymap`. With 13
categories that was already hard to reason about.

All 16 bindings moved to where they belong:

| Binding | Was | Now |
|---|---|---|
| `⌘B` Go to Declaration or Usages | `enableBundledMacKeymap` | **`enableGoToDeclarationOrUsages`** (new, default `true`) |
| `⌘⇧B`, `⌘⌥⇧N` | `enableExtendedMacKeymap` | `enableNavigationKeymap` |
| `⌘⌥V`, `⌘⌥M`, `⌘⌥C`, `⌘⌥N` | `enableExtendedMacKeymap` | `enableRefactoringKeymap` |
| `⌥J`, `⌘⌃G` | `enableExtendedMacKeymap` | `enableEditingKeymap` |
| `⌘1` (both entries) | `enableExtendedMacKeymap` | `enableToolWindowKeymap` |
| `⌘N`, `⌘⇧N`, `⌘\` | `enableExtendedMacKeymap` | `enableWorkbenchKeymap` |
| `⌃⇧R` | `enableExtendedMacKeymap` | `enableRunKeymap` |
| `⌃⇧D` | `enableExtendedMacKeymap` | `enableDebuggingKeymap` |

**Nothing breaks if you change nothing.** Both old settings are still
declared and still honoured:

- `⌘B` fires when **both** `enableGoToDeclarationOrUsages` and
  `enableBundledMacKeymap` are true. Both default to `true`, so the
  default path is unchanged — and if you had explicitly set
  `enableBundledMacKeymap: false`, `⌘B` stays off.
- The 15 moved bindings fire when **either** their new category **or**
  `enableExtendedMacKeymap` is on. An existing
  `enableExtendedMacKeymap: true` keeps all 15 working.

Both deprecated settings will be removed in 3.0.0. To migrate now: drop
`enableExtendedMacKeymap` and turn on the categories you actually want;
rename `enableBundledMacKeymap` to `enableGoToDeclarationOrUsages`.

### Added — numpad mirrors (13 chords, 14 entries)

IntelliJ's numpad equivalents for folding, comments, and tool windows.
Each is a clone of its non-numpad counterpart, so command and `when` can
never drift apart:

`⌘numpad/` `⌘⌥numpad/` `⌘numpad+` `⌘numpad-` `⌘⌥numpad+` `⌘⌥numpad-`
`⌘⇧numpad+` `⌘⇧numpad-` `⌘numpad0` `⌘numpad1` `⌘numpad3` `⌘numpad5`
`⌘numpad9`

`⌘numpad,` (Preferences) was skipped for the same reason `⌘,` was: it is
already `openGlobalSettings`.

### Displaced defaults that were never documented

A sweep of all 154 chords against the full VS Code source turned up four
displacements that have shipped since v1.0.0 without a line in the README:

| Key | VS Code default | Source |
|---|---|---|
| `⌘B` | **Toggle Primary Side Bar** | `layoutActions.ts` L306 |
| `⌘1` | Focus First Editor Group | `editorActions.ts` L303 |
| `⌘0` | Focus into Primary Side Bar | `sidebarActions.ts` L46 |
| `⌘9` | Open Last Editor in Group — **secondary only**, primary `⌥0` / `⌃0` unaffected | `editorActions.ts` L1446 |

Toggle Primary Side Bar is the notable one: this keymap puts it on `⌘1`,
which is where IntelliJ has the Project window, so the capability moves
rather than disappears.

The sweep is not a clean bill of health for the other 100 chords that show
some overlap. Most of those hits are narrowly scoped (chat, terminal,
browser view, sessions) and are not displacements, but distinguishing them
mechanically would need the `when` clause of every VS Code registration
parsed, which was not done. The table above covers broad-scope
displacements only.

### Coverage: 87.9%, and the remaining 19 are all accounted for

| Chord | Why not |
|---|---|
| `⌘⌥F`, `⌘F6`, `⌘⌥P` | TypeScript emits no such refactor kind (v1.3.0); `⌘⌥F` is also macOS Replace |
| `⌥⇥`, `⇧⌥⇥` | macOS application switcher takes them at OS level |
| `⇧⇧`, `⌃⌃` | VS Code cannot detect double-tapped modifiers |
| `⌘S` | Save All would run `formatOnSave` on every open file |
| `⌘;` | chord prefix for the whole testing command family |
| `` ⌃` `` | Toggle Terminal; Select Theme is already `⌘K ⌘T` |
| `⌃⇥` | VS Code's `⌃⇥` already is the switcher |
| `⌘,`, `⌘numpad,` | already `openGlobalSettings` |
| `⌘↑`, `⌘↓` | macOS document start / end; MacBooks have no Home / End key |
| `↩`, `⇥`, `⌃↩` | identical to VS Code defaults, or notebook-only |
| `⌘⇧↩` | Complete Current Statement, deferred |

None of the 19 is an oversight. That is the claim this release is making.

## [1.5.0] — 2026-08-21

Tool windows, diff navigation, and a Workbench category.
Coverage 73.2% → 79.6%. Keybindings 143 → 156, settings 14 → 16.
Two new categories: Diff and Workbench.

### The coverage metric was undercounting, and is now fixed

Coverage compares our unique Mac chords against k--kato's. It compared
them as **strings**, so `cmd+shift+c` and `shift+cmd+c` counted as two
different chords when VS Code parses them as one. The whole series was
low by 1.6–1.9 points, and k--kato's denominator was 158 when two of its
entries are the same chord written two ways.

Recomputed from the tags with modifier order normalized:

| Version | Ours | Overlap | Missing | Coverage | Previously reported |
|---|---|---|---|---|---|
| v1.1.0 | 102 | 87 | 70 | 55.4% | 53.8% |
| v1.2.0 | 121 | 106 | 51 | 67.5% | 65.8% |
| v1.3.0 | 125 | 109 | 48 | 69.4% | 67.7% |
| v1.4.0 | 131 | 115 | 42 | 73.2% | 71.5% |
| **v1.5.0** | **141** | **125** | **32** | **79.6%** | — |

v1.0.1 has no tag, so its 37.6% is left as recorded.

### Measured

| Key | VS Code default | Source | Outcome |
|---|---|---|---|
| `⌘7`, `⌘⇧'` | none | — | free |
| `⇧⎋` | widget-close secondaries only (action widget, comments, breakpoint widget, …) | 6 files | taken; scopes do not overlap |
| `⌃⌥⇧↑` / `⌃⌥⇧↓` | none, **and none in GitLens** | GitLens `package.json`, 59 bindings | free |
| `⌃⇧⇥` | `quickOpenLeastRecentlyUsedEditorInGroup` | `editorActions.ts` L1898 | taken only inside a diff editor |
| `⇧F7` | `wordHighlight.prev`, plus `accessibleDiffViewer.prev` in diff editors | `wordHighlighter.ts` L951, `diffEditor/commands.ts` L238 | taken only inside a diff editor |
| `⇧F12` | **`editor.action.goToReferences`** | `goToCommands.ts` L681 | displaced |
| `⌘⇧C` | `workbench.action.terminal.openNativeConsole` | `externalTerminal.contribution.ts` L32 | displaced outside the editor |
| `⌃⌘F` | `workbench.action.toggleFullScreen` | `windowActions.ts` L350 | already correct; registered explicitly |

`⌘7` deserves a note. It first measured as free, which is exactly what a
loop-registered keybinding looks like to a naive grep — VS Code does
register `⌘1`–`⌘9` families as `KeyCode.Digit1 + index`. Checking those
call sites found only the Sessions window and a `⌘K ⌘0`-style chord, so
`⌘7` really is free.

### Added — Tool Windows
- `⌘7` Structure (`outline.focus`)
- `⌘⇧'` Maximize tool window (`workbench.action.toggleMaximizedPanel`)
- `⇧⎋` Hide active tool window — sidebar, secondary sidebar, or panel,
  whichever has focus

### Added — VCS
- `⌃⌥⇧↓` / `⌃⌥⇧↑` Next / Previous change
  (`workbench.action.editor.nextChange` / `previousChange`). These had no
  keybinding except `⌥F5` / `⇧⌥F5` on the quick-diff widget.

### Added — Diff (`enableDiffKeymap`, new)
- `F7` / `⇧F7` Next / Previous difference
- `⌃⇧⇥` Focus the other side of the diff

All three require `textCompareEditorVisible` or
`activeCompareEditorCanSwap`, so they are inert outside a diff editor and
the defaults they overlap keep working everywhere else.

### Added — Workbench (`enableWorkbenchKeymap`, new)
- `⌘⇧C` Copy Path (`copyFilePath`, which ships with no keybinding at all)
- `⇧F12` Restore Default Layout
- `⌃⌘F` Toggle Full Screen — already the VS Code default, registered
  explicitly so it survives alongside another keymap extension

### Not shipped, with reasons

| Key | IntelliJ action | Why not |
|---|---|---|
| `⌘S` | Save All | `formatOnSave` and `codeActionsOnSave` would fire on every open file. Fidelity loses to not corrupting diffs. |
| `⌘;` | Project Structure | `⌘;` is a **chord prefix** in VS Code — `⌘; A` runs all tests, and five more testing commands hang off it (`testExplorerActions.ts`). Binding `⌘;` alone kills the family. |
| `⌃\`` | Quick Switch Scheme | It is Toggle Terminal on macOS (`terminal.contribution.ts` L129). Select Theme is already on `⌘K ⌘T`. |
| `⌃⇥` | Switcher | VS Code's `⌃⇥` already *is* the switcher (`quickOpenPreviousRecentlyUsedEditorInGroup`, with quick-navigate). Nothing to add. |
| `⌘,` | Preferences | Already `openGlobalSettings`. No-op, same as the v1.2.0 finding. |
| `⌥⇥` / `⇧⌥⇥` | Goto next/prev splitter | The macOS application switcher takes these at OS level. Moved to the permanent-exclusion list. |

## [1.4.0] — 2026-08-21

Run keymap, Debugging completed, and VSCodeVim coexistence.
Coverage 67.7% → 71.5%. Keybindings 136 → 143, settings 13 → 14.
Debugging 8 → 12, plus a new Run category.

### The measurement pass caught its own instrument first

The previous milestones measured VS Code defaults by grepping a handful of
source files fetched on demand. That is unsound, and this time it produced
a wrong answer: `⌥F8` showed zero hits and would have shipped as "free".
The file that binds it had simply never been downloaded.

Measurement now runs against a complete checkout
(`git clone --filter=blob:none --sparse --depth=1`, 11,832 `.ts` files),
and every zero-hit result is paired with a positive control. Two more
tooling faults surfaced the same way: zsh eats an unquoted
`--include=*.ts`, and `grep -c` on a *single* file omits the `file:`
prefix, which silently zeroed a count pipeline.

Re-measured occupancy:

| Key | VS Code default | Source | Outcome |
|---|---|---|---|
| `⌘F9` | `workbench.action.chat.nextFileTree`, scoped to `inChatSession` | `chatFileTreeActions.ts` L23 | taken; scope does not overlap |
| `⌃⌥R` | sessions picker + two terminal bindings, all narrowly scoped | `sessionsActions.ts` L73, `terminal.history.contribution.ts` L170 | taken behind `!terminalFocus` |
| `⌃R` | **`workbench.action.openRecent`** | `windowActions.ts` L304 | displaced |
| `⌥F8` | **`editor.action.marker.next`** (Go to Next Problem) | `gotoError.ts` L202 | displaced |
| `⌃⌥D` | none | — | free |
| `⌘⇧F8` | none | — | free |

Both displacements are already covered elsewhere in this keymap, on
IntelliJ's own keys: Open Recent is on `⌘E`, and Go to Next Problem is on
`F2` / `⇧F2`. Neither capability is lost.

### Added — Run (`enableRunKeymap`, new)
- `⌘F9` Build Project (`workbench.action.tasks.build`)
- `⌃⌥R` Run… (`workbench.action.tasks.runTask`)
- `⌃R` Run last (`workbench.action.tasks.reRunTask`)

### Added — Debugging
- `⌃⌥D` Debug configuration (`workbench.action.debug.selectandstart`)
- `⌥F8` Evaluate Expression — REPL toggle, or send selection when the
  editor has one
- `⌘⇧F8` View Breakpoints

### Changed — the debugging keys now know whether you are debugging

All eight pre-existing Debugging bindings were gated on nothing but
`isMac`, so `F7` and `F8` fired at a dead debugger while permanently
displacing `wordHighlight.next` and `editor.action.marker.nextInFiles`.
They now carry real state:

| Key | Added condition |
|---|---|
| `F7` / `F8` / `⇧F8` / `⌘⌥R` | `debugState == 'stopped'` |
| `⌘F2` | `inDebugMode && !focusedSessionIsAttach` |
| `⌘F8` | `debuggersAvailable && editorTextFocus` |
| `⌥F9` | `debugState == 'stopped' && editorTextFocus` |
| `⌃D` | `debuggersAvailable && !terminalFocus` |

Outside a paused debug session those VS Code defaults work again.

### Changed — VSCodeVim no longer collides

Nine `⌃`-key bindings overlapped VSCodeVim. VSCodeVim publishes a context
key per key it claims — `configuration.ts` L198 calls
`VSCodeContext.set(\`vim.use${boundKey.key}\`, useKey)` — so each of ours
now carries `!vim.use<C-x>`:

`⌃J` `⌃D` `⌃G` `⌃H` `⌃M` `⌃T` `⌃O` `⌃I` `⌃R`

Without Vim the key is undefined and our binding fires. With Vim it defers.
Set `"vim.handleKeys": { "<C-t>": false }` and ours wins again — per key,
no need to disable a whole category. The `<`/`>` in the identifier is legal:
VS Code's context-key scanner allows it (`scanner.ts` L302) and there is a
unit test for this exact expression (`contextkey.test.ts` L392).

## [1.3.0] — 2026-08-20

Refactoring. Coverage 65.8% → 67.7% of the IntelliJ Mac keymap.
Keybindings 132 → 136, commands 5 → 8. Refactoring 2 → 5, Editing 49 → 50.

### Measured first — and this time the measurement killed half the milestone

The plan listed six keys. Three of them turned out to be impossible, not
because of key conflicts but because the refactorings do not exist.

Every refactor `kind` TypeScript can emit was enumerated from
microsoft/TypeScript@v5.9.2 `src/services/refactors/` (16 files), which
reaches VS Code through
`extensions/typescript-language-features/src/languageFeatures/refactor.ts`:

```
refactor.extract.function        refactor.move.file
refactor.extract.constant        refactor.move.newFile
refactor.extract.type            refactor.inline.variable
refactor.extract.interface       refactor.rewrite.property.generateAccessors
refactor.rewrite.import / .export / .arrow.braces / .parameters.toDestructured
```

`refactor.extract.field`, `refactor.change.signature` and
`refactor.introduce.parameter` are absent. k--kato binds all three anyway;
they are dead keys in TypeScript. They are **not shipped here**.

Key occupancy, measured against microsoft/vscode@main:

| Key | VS Code default | Source | Outcome |
|---|---|---|---|
| `⌃T` | none | — | shipped |
| `⌃I` | none (`triggerSuggest` uses `⌘I`, not `⌃I`) | `suggestController.ts` L809 | shipped |
| `⌃O` | `lineBreakInsert` (Emacs open-line) | `coreCommands.ts` L1990 | displaced |
| `⌘⌥P` | Keybindings-editor sort only | `preferences.contribution.ts` L1179 | skipped, no kind exists |
| `⌘F6` | none | — | skipped, no kind exists |
| `⌘⌥F` | **`startFindReplaceAction`** — the macOS Replace key | `findController.ts` L1011 | skipped, and no kind exists |

### Fixed

- **`F6` did nothing.** It was bound to `workbench.action.files.move`,
  which is not a VS Code command — the workbench's only file-move command
  is `moveFileToTrash` (i.e. Delete). So `F6` was inert *and* it displaced
  the built-in `workbench.action.focusNextPart`. It now runs a real Move
  refactoring (`refactor.move`, covering "Move to a new file" and "Move to
  file…"), scoped to `editorTextFocus` so `focusNextPart` works everywhere
  else again.
- **`⌘⌥N` (Inline) could silently perform an unrelated refactoring.** The
  TypeScript chain ended in a `refactor.rewrite` fallback. With the caret
  somewhere non-inlinable, `refactor.inline` returned nothing, the chain
  fell through, and a lone unrelated action such as
  `refactor.rewrite.arrow.braces` was auto-applied by `apply: "ifSingle"` —
  pressing Inline rewrote an arrow function. The fallback is removed and
  the TS kind is now named exactly: `refactor.inline.variable`.
- Status-bar and notification text now reads "No Extract Variable
  available for typescript" instead of the internal `extractVariable`.

### Added — Refactoring
- `⌃T` **Refactor This** (`editor.action.refactor`)
- `⌃O` **Override Methods**, `⌃I` **Implement Methods**
  (`source.overrideMethods`; Java language server only — see Limitations)
- `F6` **Move**, now functional

### Added — Editing
- `⌃⌥I` Auto-Indent Lines (`editor.action.reindentselectedlines`)

### Changed
- `CodeActionAttempt.preferred` removed. Hard rule #2 forbids passing
  `preferred: true` to `editor.action.codeAction`, so the dispatcher never
  read the flag. A field the dispatcher ignores invites someone to wire it
  up and re-break the rule.

## [1.2.0] — 2026-05-11

Navigation and Search. Coverage 53.8% → 65.8% of the IntelliJ Mac keymap.
Keybindings 109 → 132. Navigation 16 → 36, Search 7 → 10.

### Measured first, again

Same procedure as v1.1.0. Three of the planned keys turned out to be
macOS defaults already, and four collided with defaults nobody had
checked:

| Key | VS Code default | Source | Outcome |
|---|---|---|---|
| `⌘⇧]` / `⌘⇧[` | `nextEditor` / `previousEditor` (secondary; primary is `⌘⌥→` / `⌘⌥←`) | `editorActions.ts` L1279, L1327 | registered explicitly |
| `⌘,` | Open Settings | `preferences.contribution.ts` L238 | skipped, no-op |
| `⌘↑` / `⌘↓` | **`cursorTop` / `cursorBottom`** (macOS-only override) | `coreCommands.ts` L1248, L1292 | **kept as-is** |
| `⌘[` | `editor.action.outdentLines` | `linesOperations.ts` L645 | displaced |

`⌘↑` / `⌘↓` were left alone deliberately. IntelliJ wants them for Jump to
Navigation Bar and View source, but they are the system-wide macOS
document-start / document-end gesture, and MacBook keyboards have no
physical Home / End keys to fall back on. Those two IntelliJ actions are
dropped rather than break the platform convention.

### Added — Navigation
- `⌥Space` / `⌘Y` quick definition popup (`editor.action.peekDefinition`)
- `⌘⌥O` go to symbol in file
- `⌘[` navigate back
- `⌘⇧E` recent files, previous entry
- `⌃H` **type hierarchy** and `⌃⌥H` call hierarchy
- `⌃M` move caret to matching brace
- `⌃⇧B` go to type declaration
- `F4` edit source (editor) / open and focus (Explorer)
- `⌃←` / `⌃→` and `⌘⇧[` / `⌘⇧]` previous / next editor tab, with terminal
  variants that move between terminal tabs when the terminal has focus
- `⌘U` go to super implementation (Java, Dart)
- `⌘⇧T` go to test (Java)

### Added — Search
- `⌥⌘F7` show usages
- `⌃⌥↓` / `⌃⌥↑` next / previous highlighted usage

`⌃⌥↓` / `⌃⌥↑` restore something this extension had quietly taken away:
`F7` / `⇧F7` are `editor.action.wordHighlight.next` / `.prev` by default
(`wordHighlighter.ts` L936, L951), and `enableDebuggingKeymap` has bound
`F7` to Step Into since v1.0.0. The IntelliJ keys for highlighted-usage
navigation are `⌃⌥↓` / `⌃⌥↑`, so the capability is now reachable again.

### Type hierarchy is language-neutral here
k--kato binds `⌃H` to `java.action.showTypeHierarchy`, which does nothing
outside Java. VS Code core registers `editor.showTypeHierarchy` with an
`editorHasTypeHierarchyProvider` context key
(`typeHierarchy.contribution.ts` L179, L29), so this extension binds the
core command instead and it works in any language whose server provides
type hierarchy. Same approach as wrapping `⌘B` in
`intellij.goToDeclarationOrUsages`.

### BREAKING — one more VS Code default displaced

| Key | What you lose | Where it went | Category |
|---|---|---|---|
| `⌘[` | `editor.action.outdentLines` | Navigate Back | `enableNavigationKeymap` |

Outdent is still on `⇧Tab`. The binding is gated on `canNavigateBack`, so
in a fresh window with no navigation history VS Code's outdent still
fires — the displacement only takes effect once there is somewhere to go
back to.

### Previously undocumented displacements, now recorded
Found while measuring. Both shipped in v1.0.0 without a note:

| Key | Our mapping | Silently displaced |
|---|---|---|
| `⌘]` | `jumpToBracket` (`enableNavigationKeymap`) | `editor.action.indentLines` |
| `F7` | `debug.stepInto` (`enableDebuggingKeymap`) | `editor.action.wordHighlight.next` |

### Dropped
- **Jump to Navigation Bar** (`⌘↑`) and **View source** (`⌘↓`) — see above.
- **`⌘,`** — already the VS Code default, so there is nothing to add.

## [1.1.0] — 2026-05-11

Editing coverage goes from 34% to ~85% of the IntelliJ Mac keymap.
Keybindings 75 → 109, settings 12 → 13.

### Method: every key was measured against the VS Code source first

`.claude/roadmap.md` §2 called for an hour of measurement before writing
any binding, on the theory that many "missing" IntelliJ keys are already
VS Code macOS defaults. That turned out to be true for 11 of the 27
planned keys, and it also caught two keys where the roadmap's planned
command was *worse* than the default.

Measured against `microsoft/vscode@main`:

| Key | VS Code default | Source |
|---|---|---|
| `⌥←` | `cursorWordLeft` | `wordOperations.ts` L128-133 |
| `⌥→` | `cursorWordEndRight` | `wordOperations.ts` L226-231 |
| `⌥⇧←` | `cursorWordLeftSelect` | `wordOperations.ts` L167-172 |
| `⌥⇧→` | `cursorWordEndRightSelect` | `wordOperations.ts` L265-270 |
| `⌥⌫` | `deleteWordLeft` | `wordOperations.ts` L419-424 |
| `⌥⌦` | `deleteWordRight` | `wordOperations.ts` L458-463 |
| `⌘G` / `⌘⇧G` | `nextMatchFindAction` / `previousMatchFindAction` | `findController.ts` L784, L805 |
| `⌘X` | `clipboardCutAction` | `clipboard.ts` L48 |
| `⌘Home` / `⌘End` | `cursorTop` / `cursorBottom` | `coreCommands.ts` L1247, L1291 |

The roadmap planned `⌥→` → `cursorWordRight`, but IntelliJ's "Move Caret
to Next Word" stops at the word *end*, which is what VS Code's default
`cursorWordEndRight` already does. Shipping the plan as written would
have been a regression. Same for `⌥⇧→`.

Per an explicit decision these 11 are now **registered explicitly anyway**,
so the IntelliJ behavior holds even if another keymap extension is
installed alongside.

### Added
- **Folding (7)**: `⌘-` fold, `⌘=` unfold, `⌘⌥-` / `⌘⌥=` recursive,
  `⌘⇧-` / `⌘⇧=` all, `⌘.` toggle.
- **Word navigation and deletion (12 entries, 6 keys × 2 modes)**:
  `⌥←` `⌥→` `⌥⇧←` `⌥⇧→` `⌥⌫` `⌥⌦`.
- **`customIntellijNav.useCamelHumpsWords`** (default `false`), mirroring
  IntelliJ's *Use "CamelHumps" words*. When on, the six word keys switch
  to the `cursorWordPart*` / `deleteWordPart*` family and stop at
  camelCase sub-word boundaries.
- **Lines (2)**: `⇧↩` Start new line, `⌥⌘↩` Start new line before current.
- **Cut and caret (4)**: `⌘X` and `⌘⌦` cut line, `⌘Home` / `⌘End` to text
  start / end.
- **Selection (3)**: `⌃G` add selection to next occurrence, `⌃⇧G` unselect
  occurrence, `⇧⌘8` column selection mode.
- **Font (2)**: `⇧⌃.` / `⇧⌃,` increase / decrease editor font. These have
  no VS Code default keybinding, so nothing is displaced.
- **Docs (2)**: `F1` quick documentation, `⌘F1` show error/warning at caret.
- **Search (2)**: `⌘G` / `⌘⇧G` find next / previous.

### BREAKING — VS Code defaults displaced by `enableEditingKeymap`

These only apply when `customIntellijNav.enableEditingKeymap` is `true`.
Set it to `false` to get every one of them back.

| Key | What you lose | Where it went |
|---|---|---|
| `⌘-` | **Window Zoom Out** (`workbench.action.zoomOut`) | Fold |
| `⌘=` | **Window Zoom In** (`workbench.action.zoomIn`) | Unfold |
| `⌘⇧-` / `⌘⇧=` | Zoom Out / In (secondary bindings) | Fold All / Unfold All |
| `⌘.` | **Quick Fix** (`editor.action.quickFix`) | Toggle Fold |
| `F1` | Command Palette (secondary; `⌘⇧P` still works) | Quick documentation |

`⌘.` is the one to know about. IntelliJ users reach for `⌥↩` to get
intentions and quick fixes, and this extension has mapped `⌥↩` →
`editor.action.quickFix` since v1.0.0, so the capability is not lost,
only moved. If you want VS Code's `⌘.` back, the narrowest fix is a
single user keybinding rather than disabling the whole category:

```jsonc
{ "key": "cmd+.", "command": "-editor.toggleFold" }
```

Window zoom has no equivalent escape hatch inside the editor. If you use
`⌘-` / `⌘=` for zoom, keep `enableEditingKeymap` off or unbind the two
folding entries the same way.

### Deferred
- **Complete Current Statement** (`⌘⇧↩`). VS Code binds that chord to
  `editor.action.insertLineBefore`, and IntelliJ's own "Start new line
  before current" is `⌥⌘↩`, which this release maps. Implementing
  Complete Current Statement would mean displacing a default in order to
  ship a JS/TS-only approximation, so it moves to the language-specific
  backlog in `.claude/roadmap.md`.

## [1.0.1] — 2026-05-11

### Fixed
- **Explorer tree Left arrow jumped to the sibling above instead of the
  parent folder.** `enableExplorerTreeKeymap` shipped six bindings that
  removed the built-in `list.collapse` / `list.expand` (via `-command`)
  and re-implemented them, mapping Left-on-a-file to `list.focusUp`.
  `list.focusUp` moves to the previous *visible row*, not the parent.

  VS Code's built-in `list.collapse` already implements IntelliJ
  semantics exactly (`if (!tree.collapse(focus)) focus(parent)`), so the
  override was strictly worse. All six bindings are replaced by one that
  fills the only real gap: Right on a leaf file now moves down a row,
  which the built-in `list.expand` treats as a no-op.

  Net effect on the Explorer tree with `enableExplorerTreeKeymap: true`:

  | Key | Context | Behavior |
  |---|---|---|
  | `↑` / `↓` | any | previous / next row |
  | `←` | expanded folder | collapse in place |
  | `←` | file or collapsed folder | jump to parent folder |
  | `→` | collapsed folder | expand |
  | `→` | expanded folder | move to first child |
  | `→` | file | move down one row |

### Changed
- Keybinding count 80 → 75 (six Explorer tree entries collapsed into one).
- `.vscodeignore` now excludes `CLAUDE.md`, `*.pem`, `*.key`, `*.p12`,
  `.env*`. A stray `global-bundle.pem` (161 KB AWS RDS CA bundle) sitting
  in the repo root had been packaged into the v1.0.0 VSIX.
- `.gitignore` gained the same credential patterns.

## [1.0.0] — 2026-04-28

First production-ready release. The extension is now a self-contained
IntelliJ-style keymap with language-aware Extract refactoring, suitable as
an alternative to `k--kato/intellij-idea-keybindings` for users who hit the
TypeScript Extract Variable bug
([k--kato#142](https://github.com/kasecato/vscode-intellij-idea-keybindings/issues/142)).

### Added
- **Language-aware Extract refactoring** (`intellij.extractVariable`,
  `intellij.extractMethod`, `intellij.extractConstant`, `intellij.inline`)
  with a per-language kind dispatch table. TypeScript routes to
  `refactor.extract.constant` / `refactor.extract.function`; Java/Kotlin/Python
  route to `refactor.extract.variable` / `refactor.extract.method`.
- **Prefetch + `apply: "ifSingle"`** strategy. Single match auto-applies;
  multiple matches surface VS Code's picker (Extract Method shows
  "Extract to inner function" / "Extract to method in class" / "Extract to
  module scope" — equivalent to IntelliJ's Choose Destination Scope dialog).
- **Six new keymap categories**, each independently toggleable via settings:
  `enableEditingKeymap`, `enableNavigationKeymap`, `enableSearchKeymap`,
  `enableRefactoringKeymap`, `enableVcsKeymap`, `enableToolWindowKeymap`.
  ~50 IntelliJ Mac keys covered (`cmd+/`, `cmd+d`, `cmd+e`, `cmd+f12`,
  `cmd+alt+l`, `cmd+k`, `alt+f12`, etc.).
- **Information notification on no-op** (`showRefactorNotifications`, on by
  default). When the language server has no extract action at the cursor,
  surface a toast so users can distinguish "extension not invoked" from
  "TS LS has nothing to offer here."
- **Silent error policy** (`showErrorToasts: false` by default). Provider
  failures (TS server hiccups, vue.volar inlay hint internals, etc.) log to
  the Output channel instead of red toasts. Toggle on for debugging.

### Changed
- Source tree refactored into `core/`, `navigation/`, `refactor/` modules.
  `extension.ts` is now a 30-line entry point. Orchestrator class
  `IntelliJNavigator` owns lifetime of the Logger and request-id state;
  pure command handlers live in their respective domain folders.
- README rewritten with full keymap tables, settings reference, migration
  guide for users coming from k--kato, and an explicit "what won't work"
  section (shift+shift, postfix completion, etc.).

### Fixed
- "Red box" toast on every cmd+B keypress when TypeScript server reported
  internal failures (Debug Failure on PropertyAccessExpression in vue.volar
  inlay hints, common in monorepos). Provider failures now silent by default.
- cmd+alt+v silently doing nothing in TypeScript (kind mismatch with
  k--kato). Direct extension routing + per-language kind dispatch.
- cmd+alt+m firing "No preferred code actions for X available" toast even
  when actions were available — caused by `preferred: true` not matching
  TS LS's Extract Function (which exposes multiple non-preferred options).
  Replaced with prefetch + `apply: "ifSingle"`.

### Known limitations (TS Language Service)
- Extract Variable always produces `const`. WebStorm offers `const`/`let`/`var`
  selection; VS Code's TS LS does not expose that. Users can manually change
  to `let` after extraction.
- Single-line variable-declaration extraction (e.g. `String key = ...` in
  IntelliJ Java) is not supported. Select an expression or block of
  statements.
- `shift+shift` (Search Everywhere) and `ctrl+ctrl` (Run Anything) are not
  implementable — VS Code does not support double-tap modifier keys. Use
  `cmd+shift+space` chord as the closest substitute.

## [0.0.1]
- Initial release: cmd+B → Go to Declaration or Usages.
