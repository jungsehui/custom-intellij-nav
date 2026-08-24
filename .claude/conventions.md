# Conventions — DO and DON'T

## DO

- **Keep `extension.ts` thin.** It's an entry point — register commands,
  push subscriptions, return. New logic goes in `core/` /`navigation/` /
  `refactor/`.
- **Handlers take what they need; they do not reach for it.**
  `goToDeclarationOrUsages` and `runRefactor` take a `BeginRequest` and a
  `Logger`. Neither reads a global. The only mutable state in the extension
  is the request counter, closed over inside `createRequestFactory`, and the
  only place `vscode.window.activeTextEditor` is read is the one adapter
  behind `ActiveEditorSource`. If you find yourself reaching for a global,
  that is the signal a port is missing.
- **A type lives with whatever gives it meaning.** See "Where a type lives"
  below — `src/types.ts` is only for types shared across *folders*.
- **Add new languages to `LANGUAGE_ACTION_TABLE`** when you encounter an
  LSP that uses different `kind` values. The `"*"` fallback chain
  catches the unknown case but a named entry is more reliable.
- **Gate every keybinding with a category toggle.** New keys go under
  `enableEditingKeymap` / `enableNavigationKeymap` / etc. so users can
  opt out of an entire category if it conflicts with their workflow.
- **Include `editorTextFocus` (or `editorFocus` for non-edit ops) in the
  `when` clause.** Otherwise the keybinding fires in unexpected places
  (terminal, search panel, etc.).
- **Bump the patch version for any package.json change**, even cosmetic.
  VS Code caches extensions aggressively; without a version bump, an
  install of the same VSIX may not take effect.
- **Update CHANGELOG.md and README.md in the same commit as the code
  change.** The Stop hook (see `.claude/settings.json`) reminds you when
  you forget.

## DON'T

- **Don't `showErrorMessage` from provider catch blocks.** TS server and
  vue.volar throw transient internal errors all the time. Use
  `logger.showStatus(...)` and the Output channel; gate any toast on
  `customIntellijNav.showErrorToasts`.
- **Don't pass `preferred: true` to `editor.action.codeAction`.** It
  silently fails when an LSP exposes multiple non-preferred actions
  (this was the v0.x → v1.0 bug). Always use `apply: "ifSingle"` (after
  prefetching to confirm there's at least one match).
- **Don't hardcode `refactor.extract.variable` for Extract Variable.**
  TS LS uses `refactor.extract.constant`. Java uses
  `refactor.extract.variable`. Always go through
  `LANGUAGE_ACTION_TABLE`.
- **Don't add a keybinding without `when: "isMac && …"`.** This repo
  ships a Mac-only extension (the README says so). Adding a non-`isMac`
  binding will conflict with users on Linux/Windows running k--kato.
- **Don't commit `.idea/`, `.planning/`, `.omc/`, `.claude/local`,
  `.cursor/`.** They're listed in `.gitignore` for a reason —
  workspace tooling, not source.
- **Don't run `vsce publish` from a tag-triggered CI job without a PAT
  rotation plan.** PATs expire. Either keep the manual publish
  ritual or set up a calendar reminder.
- **Don't use `cmd+.` for Toggle Fold without a flag.** It's VS Code's
  default Quick Fix. Mapping it would silently break a heavily-used
  built-in. If we add Toggle Fold, do it under `enableEditingKeymap`
  with an explicit user choice.

## Built-in commands often already do the IntelliJ thing

Before mapping a key, **read the VS Code source for the command it would
replace.** Several built-ins already implement IntelliJ semantics exactly,
and overriding them makes things worse.

Verified in `src/vs/workbench/browser/actions/listCommands.ts`:

| Built-in | `when` (default) | Actual behavior |
|---|---|---|
| `list.collapse` (Left) | `listFocus && (treeElementCanCollapse \|\| treeElementHasParent)` | `if (!tree.collapse(focus)) focus(parent)` — expanded folder collapses in place; file or collapsed folder jumps to **parent** |
| `list.expand` (Right) | `listFocus && (treeElementCanExpand \|\| treeElementHasChild)` | `if (!widget.expand(focus)) focus(firstChild)` — collapsed folder expands; expanded folder moves to **first child**; leaf does nothing |
| `list.focusParent` | `listFocus` | Focus parent, never collapses. No default key. |

Tree context keys (`src/vs/platform/list/browser/listService.ts`):

| Key | True when |
|---|---|
| `treeElementCanCollapse` | `node.collapsible && !node.collapsed` (expanded folder) |
| `treeElementCanExpand` | `node.collapsible && node.collapsed` (collapsed folder) |
| `treeElementHasParent` | `tree.getParentElement(focus)` is truthy |
| `treeElementHasChild` | `tree.getFirstElementChild(focus)` is truthy |

### The Explorer arrow regression (fixed in v1.0.1)

v1.0.0 shipped six `enableExplorerTreeKeymap` bindings that **removed**
the built-ins via `-list.collapse` / `-list.expand` and re-implemented
them. The re-implementation mapped Left-on-a-file to `list.focusUp`,
which moves to the previous *visible row* (the sibling file above)
instead of the parent folder. That silently broke the exact IntelliJ
behavior the category was supposed to provide.

The correct config is **one** binding, because the built-ins cover
everything else:

```json
{
  "command": "list.focusDown",
  "key": "right",
  "when": "isMac && listFocus && !inputFocus && !treeElementCanExpand && !treeElementHasChild && config.customIntellijNav.enableExplorerTreeKeymap"
}
```

`!treeElementCanExpand && !treeElementHasChild` matches leaves only, so
it fills the one gap (built-in Right does nothing on a file) without
touching folder behavior. This is a deliberate divergence from IntelliJ,
where Right on a file is a no-op.

**Rule: never use a `-command` removal for a built-in `list.*` or
`editor.*` command unless you have read its handler and confirmed the
replacement is strictly better.** Adding a narrowly-scoped `when` rule
that fills a gap beats replacing a whole command.

### Measured macOS defaults (do not re-derive these)

Verified against `microsoft/vscode@main` during the v1.1.0 measurement
pass. **These keys already do the IntelliJ thing by default.** They are
registered explicitly anyway (so the behavior survives alongside another
keymap extension), but never "fix" them to a different command.

| Key | Default command | Source |
|---|---|---|
| `⌥←` | `cursorWordLeft` | `wordOperations.ts` L128 |
| `⌥→` | `cursorWordEndRight` — **not** `cursorWordRight` | `wordOperations.ts` L226 |
| `⌥⇧←` | `cursorWordLeftSelect` | `wordOperations.ts` L167 |
| `⌥⇧→` | `cursorWordEndRightSelect` | `wordOperations.ts` L265 |
| `⌥⌫` | `deleteWordLeft` | `wordOperations.ts` L419 |
| `⌥⌦` | `deleteWordRight` | `wordOperations.ts` L458 |
| `⌘G` / `⌘⇧G` | `nextMatchFindAction` / `previousMatchFindAction` | `findController.ts` L784, L805 |
| `⌘X` | `clipboardCutAction` (cuts the line when the selection is empty, via `editor.emptySelectionClipboard`) | `clipboard.ts` L48 |
| `⌘Home` / `⌘End` | `cursorTop` / `cursorBottom` | `coreCommands.ts` L1247, L1291 |
| `⌘⌥[` / `⌘⌥]` | `editor.fold` / `editor.unfold` | `folding.ts` L727, L644 |
| `⌘K ⌘0` / `⌘K ⌘J` | `editor.foldAll` / `editor.unfoldAll` | `folding.ts` L1003, L1023 |
| `⌘-` / `⌘=` | `workbench.action.zoomOut` / `zoomIn`, plus `⌘⇧-` / `⌘⇧=` and numpad as secondaries | `windowActions.ts` L156, L185 |
| `⌘⇧↩` | `editor.action.insertLineBefore` | `linesOperations.ts` L666 |
| `⌘↩` | `editor.action.insertLineAfter` | `linesOperations.ts` L692 |

`editor.action.fontZoomIn` / `fontZoomOut` / `fontZoomReset` have **no**
default keybinding, so `⇧⌃.` / `⇧⌃,` displace nothing.

Added during the v1.2.0 pass:

| Key | Default command | Source |
|---|---|---|
| `⌘⇧[` / `⌘⇧]` | `previousEditor` / `nextEditor` (secondary; primary is `⌘⌥←` / `⌘⌥→`) | `editorActions.ts` L1327, L1279 |
| `⌘,` | `workbench.action.openGlobalSettings` | `preferences.contribution.ts` L238 |
| `⌘↑` / `⌘↓` | `cursorTop` / `cursorBottom` — **macOS-only override** of the `⌘Home` / `⌘End` primary | `coreCommands.ts` L1248, L1292 |
| `⌘[` / `⌘]` | `outdentLines` / `indentLines` | `linesOperations.ts` L645, L619 |
| `F7` / `⇧F7` | `wordHighlight.next` / `.prev` | `wordHighlighter.ts` L936, L951 |
| `⌘⌃←` / `⌘⌃→` | `moveEditorToPreviousGroup` / `…NextGroup` (mac override) | `editorActions.ts` L2133, L2153 |

`⌘↑` / `⌘↓` are deliberately **not** taken. IntelliJ wants them for Jump
to Navigation Bar and View source, but they are the system-wide macOS
document-start / document-end gesture and MacBook keyboards have no
physical Home / End key. Fidelity loses to platform convention here.

Added during the v1.3.0 pass:

| Key | Default command | Source |
|---|---|---|
| `⌃O` | `lineBreakInsert` (Emacs open-line) | `coreCommands.ts` L1990 |
| `⌘⌥F` | `startFindReplaceAction` — **the macOS Replace key** | `findController.ts` L1011 |
| `⌘I` | `triggerSuggest` (mac secondary). `⌃I` is **free** — do not confuse the two | `suggestController.ts` L809 |
| `F6` / `⇧F6` | `workbench.action.focusNextPart` / `focusPreviousPart` | `navigationActions.ts` L326, L342 |
| `⌘⌥P` | Keybindings-editor sort-by-precedence, active only inside that editor | `preferences.contribution.ts` L1179 |
| `⌃T`, `⌘F6`, `⌘⌥L`, `⌃⌥O`, `⌃⌥I` | none — free | (absent from source) |

`editor.action.transpose` (`linesOperations.ts` L1060) has no keybinding
at all, so `⌃T` displaces nothing.

Added during the v1.4.0 pass (first pass measured against a **complete**
checkout — see the next section for why that matters):

| Key | Default command | Source |
|---|---|---|
| `⌃R` | `workbench.action.openRecent` — **Open Recent…**, global, no `when` | `windowActions.ts` L304 |
| `⌥F8` / `⇧⌥F8` | `editor.action.marker.next` / `.prev` — **Go to Next / Previous Problem** | `gotoError.ts` L202, L226 |
| `F8` | `editor.action.marker.nextInFiles` | `gotoError.ts` L249 |
| `⌘F9` | `workbench.action.chat.nextFileTree`, scoped to `inChatSession` | `chatFileTreeActions.ts` L23 |
| `⌃⌥R` | sessions picker (`IsSessionsWindowContext`) + two terminal bindings (`terminalFocus`) | `sessionsActions.ts` L73, L231; `terminal.history.contribution.ts` L170 |
| `⌃D` | `deleteRight` mac **secondary** (primary is `⌦`) | `coreCommands.ts` L2081 |
| `⌃G` | `workbench.action.gotoLine` (mac) | `gotoLineQuickAccess.ts` L84 |
| `⌃⌥D`, `⌘⇧F8`, `⌃M` | none — free | (absent from full source) |

`⌃R` and `⌥F8` were taken anyway, because this keymap already carries both
capabilities on IntelliJ's own keys: Open Recent is `⌘E`, and Go to Next
Problem is `F2`. Check for that before deciding a displacement is costly —
the second binding may already exist.

### Check that the command exists before binding a key to it

`F6` shipped in v1.0.0 bound to `workbench.action.files.move`. There is no
such command — the workbench's only file-move command is `moveFileToTrash`
(i.e. Delete). The key was inert *and* it displaced
`workbench.action.focusNextPart`, so the net effect was purely negative,
and nothing surfaced it: VS Code does not warn about a keybinding pointing
at a non-existent command. Grep the VS Code source for the id, or run
`Developer: Show All Commands`, before shipping.

### Keep kind chains narrow — a broad fallback is worse than none

Code-action kind matching is prefix-based on dot boundaries, so
`refactor.rewrite` matches `refactor.rewrite.arrow.braces`. Combined with
`apply: "ifSingle"` (hard rule #2), a lone match is applied without
asking. Until v1.3.0 the `inline` chain for TypeScript ended in
`refactor.rewrite`; with the caret somewhere non-inlinable, pressing
`⌘⌥N` silently rewrote an arrow function instead of reporting that there
was nothing to inline.

Rule: a fallback kind must be a *narrower or equal* description of the
same IntelliJ action. If a language has no matching kind, let the chain
end and let `runRefactor` report it. `source.overrideMethods` for TS and
bare `quickfix` for Implement Methods were both rejected on these grounds.

Added during the v1.5.0 pass:

| Key | Default command | Source |
|---|---|---|
| `⇧F12` | `editor.action.goToReferences` — **Go to References** | `goToCommands.ts` L681 |
| `⌘⇧C` | `workbench.action.terminal.openNativeConsole`, when `terminalNotFocus` | `externalTerminal.contribution.ts` L32 |
| `⌃⇥` / `⌃⇧⇥` | `quickOpenPreviousRecentlyUsedEditorInGroup` / `…LeastRecentlyUsed…` | `editorActions.ts` L1878, L1898 |
| `⇧F7` | `wordHighlight.prev`, plus `accessibleDiffViewer.prev` when `isInDiffEditor` | `wordHighlighter.ts` L951, `diffEditor/commands.ts` L238 |
| `⌃\`` | `workbench.action.terminal.toggleTerminal` (mac) | `terminal.contribution.ts` L129 |
| `⌃⌘F` | `workbench.action.toggleFullScreen` | `windowActions.ts` L350 |
| `⌘S` | `workbench.action.files.save` | `fileCommands.ts` L496 |
| `⌘;` | **chord prefix** — `KeyChord(⌘;, …)` for the testing command family | `testExplorerActions.ts` L662 and 5 more |
| `⌘7`, `⌘⇧'`, `⌃⌥⇧↑/↓`, `⌥⇥` | none — free | (absent from full source) |

`copyFilePath`, `outline.focus`, `resetViewLocations` and
`toggleMaximizedPanel` ship with **no** default keybinding, so binding
them costs nothing.

Added during the v2.0.0 pass:

| Key | Default command | Source |
|---|---|---|
| `⌘B` | **`workbench.action.toggleSidebarVisibility`** — Toggle Primary Side Bar | `layoutActions.ts` L306 |
| `⌘1` | `workbench.action.focusFirstEditorGroup` — a **single** binding, not a `⌘1`–`⌘9` family | `editorActions.ts` L303 |
| `⌘0` | `workbench.action.focusSideBar` | `sidebarActions.ts` L46 |
| `⌘9` | `lastEditorInGroup` **secondary** (primary is `⌥0` / `⌃0`) | `editorActions.ts` L1446 |
| `⌘⌥V` | `editorDictation.start` | `editorDictation.ts` L69 |
| `⌘⌥N` | New Untitled File — **web only** (`isWeb ? ⌘⌥N : ⌘N`), free on desktop | `fileCommands.ts` L694 |
| `⌘numpad0` | Reset Zoom | `windowActions.ts` L218 |
| `⌘numpad-` | Zoom Out (secondary) | `windowActions.ts` L189 |
| `⌘3`, `⌘5`, `⌘7`, `⌘⌥M` | none — free | (absent from full source) |

Numpad chords use the lowercased UI label from the KeyCode table in
`keyCodes.ts` (`'NumPad_Divide'` → `numpad_divide`, `'NumPad0'` →
`numpad0`). Verified tokens: `numpad0`–`numpad9`, `numpad_add`,
`numpad_subtract`, `numpad_divide`, `numpad_separator`, `numpad_decimal`.

### macOS symbolic hotkeys take keys before VS Code sees them

Four `⌃`+arrow combinations belong to Mission Control and are handled by
the window server, not the frontmost app. Binding them in a manifest is
not an error and produces no warning — the key simply never fires.

Check the machine rather than guessing:

```bash
defaults read com.apple.symbolichotkeys AppleSymbolicHotKeys
```

IDs 32 (Mission Control), 33 (Application Windows) and 79–82 (move a
space). **An ID absent from that plist is at its factory default, which is
enabled** — macOS only records overrides. An entry with `enabled = 1` and
no `value`/`parameters` block is enabled at its default key.

On this machine 32/33 are absent and 79–82 are `enabled = 1` with no
parameters, so all four are live. `⌃↑` / `⌃↓` were removed in 2.0.1;
`⌃←` / `⌃→` are kept because the same capability is also on `⌘⇧[` /
`⌘⇧]`, which macOS does not intercept.

Caveat worth stating: the plist proves the user has not overridden these,
not what Apple's factory assignment is. No file on the machine declares
the defaults. The assignment (`⌃↑` = Mission Control, and so on) is
macOS's documented behavior, not something measured here.

### "Generate" has no VS Code counterpart, and the capability is already bound

IntelliJ's `⌘N` opens a Generate popup. The obvious mapping is
`editor.action.sourceAction`, but in TypeScript that shows
`source.fixAll.ts` and `source.removeUnused.ts`
(`typescript-language-features/src/languageFeatures/fixAll.ts` L130, L152)
plus organize imports — cleanup actions, not Generate.

The only Generate-class refactor TypeScript emits is
`refactor.rewrite.property.generateAccessors`
(`microsoft/TypeScript@v5.9.2 .../generateGetAccessorAndSetAccessor.ts` L24),
and it needs the caret on a property.

So `⌘N` would block New Untitled File inside the editor while doing nothing
at most carets. It is not bound. **And it does not need to be**: `⌃T`
(Refactor This, IntelliJ's own key) already surfaces `generateAccessors`
alongside every other refactoring.

The general move: before adding a key for a capability, check whether an
existing binding already reaches it. Twice now the answer was yes — Open
Recent on `⌘E`, Go to Next Problem on `F2` — and here it makes a whole
milestone item disappear.

### A platform ternary can make a key free on the platform you care about

`⌘⌥N` looked occupied: `fileCommands.ts` L694 binds New Untitled File to
it. Reading the whole expression shows
`isWeb ? (… ⌘⌥N) : ⌘N` — the `⌘⌥N` arm only exists in the web build. On
desktop macOS the key is free.

Grep output is one line of a ternary. Read the expression, not the match.

### An audit that cannot separate scope is not an audit

A sweep of all 154 chords against the full VS Code source reported 104
overlaps. Most are meaningless: `⌥↓` "hits" the accessible diff viewer,
notebook cell commands, and a history widget, none of which is a
displacement of anything a user would notice.

Separating a real displacement from a narrowly-scoped one requires parsing
the `when` clause of every VS Code registration, which the sweep does not
do. So the sweep is a *candidate list*, not a verdict. It found four
genuine undocumented displacements (`⌘B`, `⌘1`, `⌘0`, `⌘9`) by pointing
at broad-scope registrations that were then read individually.

Say which of the two you produced. "104 chords overlap" published as-is
would be alarming and wrong.

### A key can be a chord prefix, not just a key

`⌘;` measured as "occupied by testing commands", but the shape matters:
every hit was `KeyChord(KeyMod.CtrlCmd | KeyCode.Semicolon, …)`. That is
`⌘;` followed by a second key — `⌘; A` runs all tests, and five more hang
off the same prefix. Binding `⌘;` on its own does not displace one
command, it kills the entire family, and nothing in the grep output says
so unless you look at the `KeyChord(` wrapper.

Check for `KeyChord(` before judging a two-modifier key cheap.

### Loop-registered keybindings are invisible to a literal grep

`⌘7` first measured as free. That is also exactly what `⌘1`–`⌘9` looks
like when VS Code registers the family as `KeyCode.Digit1 + index` — no
`KeyCode.Digit7` literal exists to find. Searching the `Digit1 +` and
`Digit0 +` forms turned up the real call sites (the Sessions window, and a
`⌘K ⌘0` chord), neither of which claims plain `⌘7`, so the original
answer held. It would not always.

Same failure mode as `terminalFocus` being declared through an enum
constant. When a measurement says "free", ask how the thing would look if
it were registered indirectly, and search for that shape too.

### The coverage metric compares chords, so normalize modifier order

Coverage is `overlap / k--kato chords`, both sides as sets of unique Mac
chords. Until v1.5.0 the comparison was on raw strings, so `cmd+shift+c`
and `shift+cmd+c` counted as two different chords — VS Code parses them as
one. The published series was low by 1.6–1.9 points, and k--kato's
denominator was 158 when it is really 157.

Sort modifiers into a fixed order (`ctrl, shift, alt, cmd`) before
comparing, and split on whitespace first so multi-chord sequences
normalize per chord. Recomputed from the tags:

| Version | Ours | Overlap | Coverage | Previously published |
|---|---|---|---|---|
| v1.1.0 | 102 | 87 | 55.4% | 53.8% |
| v1.2.0 | 121 | 106 | 67.5% | 65.8% |
| v1.3.0 | 125 | 109 | 69.4% | 67.7% |
| v1.4.0 | 131 | 115 | 73.2% | 71.5% |
| v1.5.0 | 141 | 125 | 79.6% | — |

v1.0.1 has no tag, so its 37.6% stands as recorded.

### Measure against a complete checkout, never a handful of fetched files

v1.1.0 through v1.3.0 measured VS Code defaults by `curl`-ing individual
source files and grepping them. In v1.4.0 that method returned a wrong
answer: `⌥F8` showed zero hits and was about to ship as "free", when it is
`editor.action.marker.next` (`gotoError.ts` L202). The file had simply
never been fetched. A partial corpus turns "not present" and "not looked
at" into the same result.

Get the whole thing once:

```bash
git clone --filter=blob:none --sparse --depth=1 https://github.com/microsoft/vscode.git
cd vscode && git sparse-checkout set src/vs extensions
```

Blobless plus sparse keeps it small, and it yields 11,832 `.ts` files —
every place a keybinding can be registered.

Three tooling faults surfaced while doing this. All three return a
plausible wrong answer rather than an error:

- zsh expands an unquoted `--include=*.ts` before grep sees it. Quote it.
- `grep -c pattern file` on a **single** file prints just the count, with
  no `file:` prefix, so `awk -F: '{s+=$2}'` sums empty strings to 0.
- Probe strings you type into a command get written to the session
  transcript before your grep of that transcript runs, so a "should be
  zero" control can legitimately return 2.

Rule: pair every zero-hit result with a positive control in the same
command. If the control is also zero, the instrument is broken.

### Verify every context key before putting it in a `when`

A `when` clause that names a context key which does not exist never
matches. The binding fails closed and silently — the same failure mode as
binding a non-existent command, and just as invisible.

`terminalFocus` is the cautionary one: it is declared through an enum
constant (`terminalContextKey.ts` L19, L52), not a string literal, so
`grep "RawContextKey.*'terminalFocus'"` finds nothing. Search for the bare
name before concluding it is absent.

Verified and in use here: `debugState` (`'inactive'` | `'initializing'` |
`'stopped'` | `'running'`, `debug.ts` L46), `debuggersAvailable`,
`inDebugMode`, `focusedSessionIsAttach`, `taskCommandsRegistered`,
`terminalFocus`, `editorHasSelection`, `editorTextFocus`.

### Defer to VSCodeVim rather than fight it

Nine `⌃` keys in this keymap are also Vim keys. VSCodeVim publishes a
context key per key it claims — `configuration.ts` L198 calls
`VSCodeContext.set(\`vim.use${boundKey.key}\`, useKey)` — so a binding can
carry `!vim.use<C-x>` and get all three behaviors for free: fires when Vim
is absent (key undefined), defers when Vim owns it, and fires again when
the user hands it back via `vim.handleKeys`.

The angle brackets are legal in a `when`. VS Code's scanner regex allows
them (`scanner.ts` L302) and there is a unit test for this exact
expression (`contextkey.test.ts` L392) — VS Code test-covers the
VSCodeVim case specifically.

Prefer this to telling users to disable a category. A category toggle is
all-or-nothing; `vim.handleKeys` is per key.

### Enumerate what the language server can actually do

For v1.3.0 the blocking question was not key conflicts but whether the
refactorings exist. They are enumerable at the source:

- **TypeScript** — `microsoft/TypeScript@v5.9.2 src/services/refactors/`
  (16 files). Each registers a literal `kind:` string. VS Code passes it
  through verbatim (`typescript-language-features/src/languageFeatures/refactor.ts`
  `getKind()`), so this directory *is* the list.
- Result: no `refactor.extract.field`, no `refactor.change.signature`, no
  `refactor.introduce.parameter`. Three planned keys were dropped.

k--kato binds all three anyway. Copying a competitor's keymap without
checking the other side of the binding reproduces their dead keys.

### Prefer the core command over a language-specific one

When k--kato binds a language extension's command, check whether VS Code
core has a language-neutral equivalent first. Two wins so far:

| Key | k--kato | Ours | Why |
|---|---|---|---|
| `⌘B` | `editor.action.goToDeclaration` | `intellij.goToDeclarationOrUsages` | falls through to usages like IntelliJ |
| `⌃H` | `java.action.showTypeHierarchy` | `editor.showTypeHierarchy` | core command + `editorHasTypeHierarchyProvider`, works in every language with a provider |

Also prefer canonical command ids over aliases:
`editor.action.previewDeclaration` is registered as an alias for
`editor.action.peekDefinition` (`goToCommands.ts` L372) — bind the latter.

The `⌥→` row is the cautionary one. The v1.1.0 plan called for
`cursorWordRight`; IntelliJ's "Move Caret to Next Word" stops at the word
*end*, which is what the default already does. Shipping the plan as
written would have been a regression, caught only because the source was
read first.

## Style

- TypeScript strict mode (`tsconfig.json` is permissive — strict is
  inherited from `@types/vscode` types). Keep new code strict-clean.
- ESLint: `npm run lint`. Errors block release.
- Imports: relative paths. No path aliases (extension hosts can be
  picky).
- File header JSDoc on the main exported symbol of every file. The big
  comment in `run-refactor.ts` and `language-action-table.ts` is the
  template.
- Korean comments are fine for inline rationale; English for exported
  doc-comments (so users reading the source from the Marketplace
  install dir can follow).

## TypeScript naming conventions (2026, project-wide)

The 2026 community consensus is **kebab-case for file and folder names,
PascalCase for type-shaped exports, camelCase for value-shaped exports.**
This repo follows that. References:

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) (Google uses lowercase with `_`; we standardize on `-` for cross-OS safety on case-insensitive filesystems like macOS APFS)
- [Angular Style Guide — symbols and file names](https://angular.dev/style-guide) (canonical `<feature>.<role>.ts` kebab-case)
- [Biome `useFilenamingConvention`](https://biomejs.dev/linter/rules/use-filenaming-convention/) (lints this automatically)

### Where a type lives

The old rule was "add new types to `src/types.ts`, keeps cross-module type
imports acyclic". It worked exactly as written, and that was the problem: it
drew no distinction between a type two folders share and a type one function
uses. By v2.1.1 three of seven types in there had a single consumer, and the
file was drifting from an index into a dumping ground.

Three cases, decided by counting consumers:

| Consumers | Where it goes |
|---|---|
| More than one **folder** | `src/types.ts` |
| More than one file, all in **one folder** | whichever of them the others already import |
| Exactly one | next to it, and **not exported** |

Worked examples as of v2.1.1:

- `IntelliJAction` — `core/` and `refactor/` and `extension.ts`. Stays in
  `types.ts`.
- `EditorSnapshot` — `core/` and `navigation/`. Stays.
- `RawLocation` — `location-utils.ts` and `go-to-declaration.ts`, both in
  `navigation/`. Moved to `location-utils.ts`, because `toLocation` there is
  what turns either shape into a plain `Location` and the other file already
  imports the module.
- `CodeActionAttempt` — `language-action-table.ts` and `policy.ts`, both in
  `refactor/`. Moved to the table, which is the thing whose rows have that
  shape.
- `ProviderSource`, `ProviderCommand`, `ProviderResolution` — only
  `go-to-declaration.ts`. Moved there and **un-exported**. An exported type
  with one consumer is a claim that someone else might want it; nobody did.

Check before adding, and check again when a file splits — creating
`policy.ts` turned `CodeActionAttempt` from a one-consumer type into a
two-consumer one, which changed the answer.

### File & folder names

| Kind | Style | Example |
|---|---|---|
| Source file | `kebab-case.ts` | `go-to-declaration.ts`, `language-action-table.ts` |
| Folder | `kebab-case` | `src/navigation/`, `src/refactor/` |
| Test file | `<name>.test.ts` | `extension.test.ts` |
| Single-word file | `lowercase.ts` (still kebab-compliant) | `types.ts`, `logger.ts`, `config.ts` |
| Domain entry (optional) | `<domain>.<role>.ts` | (not used here — folders carry the domain) |
| React component (if ever added) | `PascalCase.tsx` | `StatusBarItem.tsx` |
| Markdown / docs | `UPPERCASE.md` for top-level conventions (`README.md`, `CHANGELOG.md`, `LICENSE.txt`); `kebab-case.md` inside `.claude/` and `docs/` |

### Identifiers inside files

| Kind | Style | Example |
|---|---|---|
| Class / Interface / Type alias / Enum | `PascalCase` | `EditorRequest`, `ActiveEditorSource`, `EditorSnapshot`, `IntelliJAction` |
| Variable / function / method / parameter | `camelCase` | `runRefactor`, `beginRequest`, `createRequestFactory`, `getShowErrorToasts` |
| Module-level constant (treated as compile-time literal) | `SCREAMING_SNAKE_CASE` | `LANGUAGE_ACTION_TABLE`, `OUTPUT_CHANNEL_NAME`, `COMMAND_ID` |
| Boolean | prefix `is` / `has` / `should` / `can` | `isStale`, `isSelectionStale`, `shouldClaimUnsupported` |
| Private fields | `camelCase` (TypeScript `private` modifier — no underscore prefix) | `this.output` in `Logger` |

### When you rename a file

1. `git mv old-name.ts new-name.ts` — never plain `mv` (case-insensitive FS will silently miss the change).
2. Update **every relative import** that references the file. Hunt them with `grep -rn "old-name" src/`.
3. Run `npm run check` to catch missed imports.
3b. **`npm run compile` now wipes `out/` first, and it has to.** `tsc` never
   removes stale output, so a renamed test file leaves its old `.js` behind
   and `vscode-test` keeps running it — against exports that no longer
   exist. That failure looks like a broken test, not a stale artifact.
   Renaming `run-refactor-policy.test.ts` produced exactly this.
4. Commit the rename + import updates in one atomic commit so reviewers can `git log --follow` cleanly.

### Don't

- Don't use `camelCase` for file names (`runRefactor.ts` ❌ → `run-refactor.ts` ✅). The 2026 community has converged on kebab; mixed conventions inside one repo are the worst outcome.
- Don't use `snake_case` for file names — it's Google's recommendation but breaks the kebab consistency the rest of the JS/TS ecosystem uses.
- Don't capitalize file names except for PascalCase React components (and we have none).
- Don't add Hungarian prefixes (`I` for interfaces, `T` for type aliases) — TypeScript's structural typing makes them noise.
