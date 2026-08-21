# Custom IntelliJ Navigation

IntelliJ-style keymap and navigation for VS Code, with **language-aware Extract refactoring** and a **silent error policy**.

Self-contained alternative to `k--kato/intellij-idea-keybindings`. Solves the long-standing issue [#142](https://github.com/kasecato/vscode-intellij-idea-keybindings/issues/142) where `cmd+alt+v` (Extract Variable) doesn't work in TypeScript because `refactor.extract.variable` is sent but TypeScript Language Service only exposes `refactor.extract.constant`.

## What it does

### 1. `cmd+b` — Go to Declaration or Usages

A custom command that combines VS Code's separate navigation actions to approximate IntelliJ's `⌘B`:

1. Try **Go to Declaration** first.
2. If an external declaration exists, navigate to it.
3. If declaration resolves to the current location, show **Usages** in a peek view.
4. If no declaration exists, try **Go to Definition**.
5. If definition also resolves to the current location, show **Usages**.

Command id: `intellij.goToDeclarationOrUsages`

### 2. Language-aware Extract refactoring

Seven commands that auto-select the correct `kind` per language and `prefetch` to avoid the "No preferred code actions for X available" toast:

| Command id | Default key (Mac) | TypeScript | Java | Kotlin |
|---|---|---|---|---|
| `intellij.extractVariable` | `cmd+alt+v` | `refactor.extract.constant` | `refactor.extract.variable` | `refactor.extract.variable` |
| `intellij.extractMethod` | `cmd+alt+m` | `refactor.extract.function` | `refactor.extract.method` | `refactor.extract.function` |
| `intellij.extractConstant` | `cmd+alt+c` | `refactor.extract.constant` | `refactor.extract.constant` | — |
| `intellij.inline` | `cmd+alt+n` | `refactor.inline.variable` | `refactor.inline` | `refactor.inline` |
| `intellij.move` | `f6` | `refactor.move` | `refactor.move` | `refactor.move` |
| `intellij.overrideMethods` | `ctrl+o` | — | `source.overrideMethods` | — |
| `intellij.implementMethods` | `ctrl+i` | — | `source.overrideMethods` | — |

Falls back through a multi-kind chain, and if no action is available it writes to the status bar instead of throwing a toast.

A dash means the language server exposes no such kind, so the key reports
"No *X* available for *language*" rather than doing something else. That
restraint is deliberate: kind matching is prefix-based, so a broad
fallback like `refactor.rewrite` will happily match an unrelated
refactoring and `apply: "ifSingle"` will auto-apply it. Until v1.3.0
`cmd+alt+n` (Inline) did exactly that.

### 3. Silent error policy

Provider call failures (TypeScript server hiccups, `vue.volar` inlay hint internal failures, etc.) are written to the `Custom IntelliJ Navigation` output channel only — no error toasts by default. Toggle with `customIntellijNav.showErrorToasts` if you need to see them.

### 4. IntelliJ Mac keymap

Optional keymap categories (each independently toggleable via settings, default `false`):

#### Bundled (default `true`)
| Mac key | IntelliJ action |
|---|---|
| `⌘B` | Go to Declaration or Usages |

#### Extended (`enableExtendedMacKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘⇧B` | Go to Type Definition |
| `⌘⌥⇧N` | Go to Symbol in Workspace |
| `⌘N` / `⌘⇧N` | New File / Folder (Explorer) |
| `⌘1` | Focus / toggle Explorer |
| `⌘\` | Split Editor |
| `⌃⇧R` / `⌃⇧D` | Run / Debug Test at Cursor |
| `⌥J` | Add Selection to Next Find Match |
| `⌘⌃G` | Select Highlights |
| `⌘⌥V` / `⌘⌥M` / `⌘⌥C` / `⌘⌥N` | Extract Variable / Method / Constant / Inline |

#### Editing (`enableEditingKeymap`)

> ⚠️ This category displaces five VS Code defaults: `⌘-` / `⌘=` /
> `⌘⇧-` / `⌘⇧=` (window zoom) and `⌘.` (Quick Fix). See
> [Displaced defaults](#displaced-defaults) below.

| Mac key | IntelliJ action |
|---|---|
| `⌘/` / `⌘⌥/` | Comment / Block Comment |
| `⌘⌥L` | Reformat code |
| `⌃⌥O` | Optimize imports |
| `⌃⌥I` | Auto-Indent Lines |
| `⌘D` | Duplicate Line |
| `⌘⌫` | Delete Line |
| `⌘X` / `⌘⌦` | Cut line (or selection) |
| `⇧⌥↑` / `⇧⌥↓` | Move Line Up / Down |
| `⌥↑` / `⌥↓` | Expand / Shrink Selection |
| `⌥↩` | Show intention actions |
| `⌘↩` | Smart line split |
| `⇧↩` | Start new line |
| `⌥⌘↩` | Start new line before current |
| `⌘⇧U` | Toggle case |
| `⌘P` | Parameter info |
| `⌃J` | Quick documentation |
| `F1` | Quick documentation lookup |
| `⌘F1` | Show error/warning at caret |
| `⌘W` | Close active editor |
| `⌘Home` / `⌘End` | Move caret to text start / end |
| `⌃G` / `⌃⇧G` | Add selection to next occurrence / unselect |
| `⇧⌘8` | Column selection mode |
| `⇧⌃.` / `⇧⌃,` | Increase / decrease editor font size |

**Folding**

| Mac key | IntelliJ action |
|---|---|
| `⌘-` / `⌘=` | Collapse / Expand code block |
| `⌘⌥-` / `⌘⌥=` | Collapse / Expand recursively |
| `⌘⇧-` / `⌘⇧=` | Collapse all / Expand all |
| `⌘.` | Fold selection (toggle) |

**Numpad mirrors.** IntelliJ binds the numpad equivalents of folding and
comments alongside the main keys, and so does this keymap:
`⌘numpad/` `⌘⌥numpad/` `⌘numpad±` `⌘⌥numpad±` `⌘⇧numpad±`. Each is a
clone of its non-numpad counterpart, so the two can never drift apart.

**Word navigation** (`⌥←` `⌥→` `⌥⇧←` `⌥⇧→` `⌥⌫` `⌥⌦`) matches VS Code's
macOS defaults, which already implement IntelliJ's semantics. They are
registered explicitly so the behavior holds even alongside another
keymap extension. Set `customIntellijNav.useCamelHumpsWords` to `true`
to stop at camelCase sub-word boundaries instead, mirroring IntelliJ's
*Use "CamelHumps" words* option.

#### Navigation (`enableNavigationKeymap`)

> ⚠️ Displaces `⌘[` (Outdent Lines) and `⌘]` (Indent Lines). Outdent and
> indent are still on `⇧Tab` / `Tab`. See [Displaced defaults](#displaced-defaults).

| Mac key | IntelliJ action |
|---|---|
| `⌘E` | Recent files |
| `⌘⇧E` | Recent files, previous entry |
| `⌘L` | Go to Line |
| `⌘F12` | File Structure |
| `⌘O` / `⌘⇧O` | Go to Class / File |
| `⌘⌥O` | Go to Symbol in file |
| `⌥Space` / `⌘Y` | Quick definition popup |
| `⌥F7` / `⌘F7` | Find Usages / in File |
| `⌘⌥←` / `⌘⌥→` | Navigate Back / Forward |
| `⌘[` | Navigate Back |
| `⌘⇧⌫` | Last edit location |
| `⌘⌥B` | Go to Implementation |
| `⌃⇧B` | Go to Type Declaration |
| `⌃H` / `⌃⌥H` | Type hierarchy / Call hierarchy |
| `F2` / `⇧F2` | Next / Previous error |
| `F4` | Edit source (editor) / Open and focus (Explorer) |
| `⌃↑` / `⌃↓` | Previous / Next method |
| `⌃←` / `⌃→` | Previous / Next editor tab |
| `⌘⇧[` / `⌘⇧]` | Previous / Next editor tab (terminal tabs when the terminal has focus) |
| `⌘]` / `⌃M` | Move to bracket |
| `⌘U` | Go to super implementation (Java, Dart) |
| `⌘⇧T` | Go to Test (Java) |

`⌃H` binds VS Code's core `editor.showTypeHierarchy`, so it works in any
language whose server provides type hierarchy, not just Java.

**Not mapped on purpose**: IntelliJ's `⌘↑` (Jump to Navigation Bar) and
`⌘↓` (View source). On macOS those are the system document-start /
document-end gesture, and MacBook keyboards have no physical Home / End
keys to fall back to.

#### Search (`enableSearchKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘⇧A` | Find Action |
| `⌘⇧Space` | Search Everywhere (chord, see [Limitations](#limitations)) |
| `⌘R` | Replace |
| `⌘⇧F` / `⌘⇧R` | Find / Replace in Files |
| `⌘G` / `⌘⇧G` | Find Next / Previous |
| `⌥⌘F7` | Show Usages |
| `⌃⌥↓` / `⌃⌥↑` | Next / Previous Highlighted Usage |

#### Refactoring (`enableRefactoringKeymap`)

> ⚠️ Displaces `⌃O` (Emacs-style insert-line-break). See
> [Displaced defaults](#displaced-defaults).

| Mac key | IntelliJ action |
|---|---|
| `⇧F6` | Rename |
| `F6` | Move |
| `⌃T` | Refactor This |
| `⌃O` | Override Methods (Java) |
| `⌃I` | Implement Methods (Java) |

#### VCS (`enableVcsKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘K` | Commit |
| `⌘⌥K` | Push |
| `⌘T` | Pull |
| `⌘⌥Z` | Revert selected ranges (use with care) |
| `⌃⌥⇧↓` / `⌃⌥⇧↑` | Next / Previous change |

#### Tool Windows (`enableToolWindowKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘3` / `⌘5` / `⌘9` / `⌘0` | Search / Debug / SCM / Problems |
| `⌥F12` | Toggle Terminal |
| `⌘7` | Structure |
| `⌘numpad0` / `1` / `3` / `5` / `9` | numpad mirrors of `⌘0` / `⌘1` / `⌘3` / `⌘5` / `⌘9` |
| `⌘⇧'` | Maximize tool window |
| `⇧⎋` | Hide active tool window |

#### Run (`enableRunKeymap`)

| Mac key | IntelliJ action |
|---|---|
| `⌘F9` | Build Project |
| `⌃⌥R` | Run… (pick a task) |
| `⌃R` | Run last |

All three stand down while a terminal has focus. `⌃R` also defers to
VSCodeVim — see [Using this with VSCodeVim](#using-this-with-vscodevim).

#### Debugging (`enableDebuggingKeymap`)

> ⚠️ Displaces `⌥F8` (Go to Next Problem). It is still on `F2` / `⇧F2`
> under `enableNavigationKeymap`, which is where IntelliJ puts it.

| Mac key | IntelliJ action |
|---|---|
| `F8` / `F7` / `⇧F8` | Step Over / Step Into / Step Out |
| `⌘F8` | Toggle Breakpoint |
| `⌥F9` | Run to Cursor |
| `⌘⌥R` | Resume Program |
| `⌘F2` | Stop |
| `⌃D` | Start Debugging |
| `⌃⌥D` | Debug configuration picker |
| `⌥F8` | Evaluate Expression |
| `⌘⇧F8` | View Breakpoints |

The step and resume keys only fire while a debug session is **paused**
(`debugState == 'stopped'`). Outside a session, `F7` and `F8` go back to
being VS Code's Next Highlighted Usage and Go to Next Problem in Files.

#### Diff (`enableDiffKeymap`)

Only active while a diff editor is open, so nothing here displaces a
default anywhere else.

| Mac key | IntelliJ action |
|---|---|
| `F7` / `⇧F7` | Next / Previous difference |
| `⌃⇧⇥` | Focus the other side |

#### Workbench (`enableWorkbenchKeymap`)

> ⚠️ Displaces `⇧F12` (Go to References). Find Usages is on `⌥F7` under
> `enableNavigationKeymap`, which is where IntelliJ puts it.

| Mac key | IntelliJ action |
|---|---|
| `⌘⇧C` | Copy Path |
| `⇧F12` | Restore Default Layout |
| `⌃⌘F` | Toggle Full Screen |

`⌃⌘F` is already VS Code's default. It is registered explicitly so the
behavior survives alongside another keymap extension.

#### Explorer tree (`enableExplorerTreeKeymap`)

IntelliJ Project view arrow navigation. Most of this is VS Code's
built-in behavior, which already matches IntelliJ; the toggle adds the
one binding that fills the gap.

| Key | Context | Behavior |
|---|---|---|
| `↑` / `↓` | any | previous / next row |
| `←` | expanded folder | collapse in place |
| `←` | file or collapsed folder | jump to **parent folder** |
| `→` | collapsed folder | expand |
| `→` | expanded folder | move to first child |
| `→` | file | move down one row **(added by this toggle)** |

The last row is a deliberate divergence from IntelliJ, where `→` on a
file is a no-op. It lets you walk the whole tree downward with `→`
alone, expanding folders as you meet them.

## Settings

```json
{
  "customIntellijNav.enableBundledMacKeymap": true,
  "customIntellijNav.enableExtendedMacKeymap": true,
  "customIntellijNav.enableEditingKeymap": true,
  "customIntellijNav.enableNavigationKeymap": true,
  "customIntellijNav.enableSearchKeymap": true,
  "customIntellijNav.enableRefactoringKeymap": true,
  "customIntellijNav.enableVcsKeymap": true,
  "customIntellijNav.enableToolWindowKeymap": true,
  "customIntellijNav.enableExplorerTreeKeymap": true,
  "customIntellijNav.enableDebuggingKeymap": true,
  "customIntellijNav.enableRunKeymap": true,
  "customIntellijNav.enableDiffKeymap": true,
  "customIntellijNav.enableWorkbenchKeymap": true,
  "customIntellijNav.enableGoToDeclarationOrUsages": true,
  "customIntellijNav.useCamelHumpsWords": false,
  "customIntellijNav.showErrorToasts": false,
  "customIntellijNav.showRefactorNotifications": true
}
```

## Displaced defaults

Turning on `enableEditingKeymap` takes five keys away from VS Code. This
is deliberate, because IntelliJ uses those keys for something else, but
you should know before you flip the switch.

Under `enableEditingKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌘-` | Window Zoom Out | Collapse code block |
| `⌘=` | Window Zoom In | Expand code block |
| `⌘⇧-` / `⌘⇧=` | Zoom Out / In (secondary) | Collapse all / Expand all |
| `⌘.` | **Quick Fix** | Fold selection |
| `F1` | Command Palette (secondary) | Quick documentation |

Under `enableNavigationKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌘[` | Outdent Lines (still on `⇧Tab`) | Navigate Back |
| `⌘]` | Indent Lines (still on `Tab`) | Move to bracket |

Under `enableRefactoringKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌃O` | `lineBreakInsert` (Emacs open-line) | Override Methods |

`F6` is the opposite case: it used to displace
`workbench.action.focusNextPart` while being bound to a command that does
not exist. It is now scoped to `editorTextFocus`, so Focus Next Part
works again everywhere outside the editor.

Always on (`enableGoToDeclarationOrUsages`, default `true`):

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌘B` | **Toggle Primary Side Bar** (this keymap puts it on `⌘1`, IntelliJ's Project window key) | Go to Declaration or Usages |

Under `enableToolWindowKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌘1` | Focus First Editor Group | Project (Explorer) |
| `⌘0` | Focus into Primary Side Bar | Problems |
| `⌘9` | Open Last Editor in Group — *secondary only*, `⌥0` / `⌃0` still work | Version control |

Under `enableWorkbenchKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⇧F12` | **Go to References** (Find Usages is on `⌥F7`) | Restore Default Layout |
| `⌘⇧C` | Open New External Terminal, outside the editor only | Copy Path |

Under `enableRunKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `⌃R` | **Open Recent…** (still on `⌘E`) | Run last task |

Under `enableDebuggingKeymap`:

| Key | VS Code default you lose | What it becomes |
|---|---|---|
| `F7` / `⇧F7` | Next / Previous highlighted usage | Step Into / Smart step into |
| `⌥F8` | **Go to Next Problem** (still on `F2`) | Evaluate Expression |
| `⌃D` | `deleteRight` (Emacs secondary; `⌦` unaffected) | Start Debugging |

Both `F7` and `F8` are now conditional on a paused debug session, so the
defaults they used to displace unconditionally are back whenever you are
not debugging.

Highlighted-usage navigation moves to `⌃⌥↓` / `⌃⌥↑` under
`enableSearchKeymap`, which is where IntelliJ puts it.

`⌘.` deserves a note. IntelliJ users press `⌥↩` for intentions and quick
fixes, and this extension maps `⌥↩` → `editor.action.quickFix`, so the
capability moves rather than disappears. `⌘⇧P` still opens the Command
Palette.

To keep a specific default instead of disabling the whole category, add
a targeted unbind to your user `keybindings.json`:

```jsonc
[
  { "key": "cmd+.", "command": "-editor.toggleFold" },
  { "key": "cmd+-", "command": "-editor.fold" },
  { "key": "cmd+=", "command": "-editor.unfold" }
]
```

Every keymap category is `false` by default. The one exception is
`enableGoToDeclarationOrUsages`, which is `true` because `⌘B` is the
extension's headline feature. Enable categories incrementally to avoid
surprises.

## Using this with VSCodeVim

Nine of the `⌃` keys in this keymap are also Vim keys. Rather than making
you choose, every one of them defers to VSCodeVim when Vim has claimed
that key:

`⌃J` `⌃D` `⌃G` `⌃H` `⌃M` `⌃T` `⌃O` `⌃I` `⌃R`

VSCodeVim publishes a context key per claimed key (`vim.use<C-t>` and so
on), and each of our bindings carries `!vim.use<C-x>`. That gives three
behaviors, in order of what you have installed:

| Situation | What happens |
|---|---|
| No VSCodeVim | Context key is undefined, so our binding fires. |
| VSCodeVim, default settings | Vim wins. `⌃O` is jumplist-back, `⌃T` is tag-stack-pop, and so on. |
| VSCodeVim, key handed back | Ours fires. |

To hand a specific key back to this extension, add it to
`vim.handleKeys` in your settings:

```jsonc
{
  "vim.handleKeys": {
    "<C-t>": false,
    "<C-o>": false
  }
}
```

Per key, no need to turn off a whole category.

## Migrating to 2.0.0

2.0.0 deprecates two settings. **If you never changed the defaults, you do
not need to do anything** — `⌘B` still works and nothing else turns on by
itself.

| Old setting | Replacement |
|---|---|
| `customIntellijNav.enableBundledMacKeymap` | `customIntellijNav.enableGoToDeclarationOrUsages` |
| `customIntellijNav.enableExtendedMacKeymap` | its 15 bindings moved into `enableNavigationKeymap`, `enableEditingKeymap`, `enableRefactoringKeymap`, `enableToolWindowKeymap`, `enableWorkbenchKeymap`, `enableRunKeymap`, `enableDebuggingKeymap` |

Both old settings still work in 2.0.0 and will be removed in 3.0.0.

If you had `enableExtendedMacKeymap: true`, everything keeps working.
To migrate, delete it and enable the categories you actually want:

```jsonc
{
  // was: "customIntellijNav.enableExtendedMacKeymap": true
  "customIntellijNav.enableRefactoringKeymap": true,   // cmd+alt+v/m/c/n, shift+f6, ctrl+t, ...
  "customIntellijNav.enableNavigationKeymap": true,    // cmd+shift+b, cmd+alt+shift+n, ...
  "customIntellijNav.enableToolWindowKeymap": true     // cmd+1, cmd+3, cmd+7, ...
}
```

If you had `enableBundledMacKeymap: false` to keep VS Code's `⌘B`, that
still holds. Rename it when convenient:

```jsonc
{ "customIntellijNav.enableGoToDeclarationOrUsages": false }
```

## Migrating off k--kato

This extension does not need
[`k--kato.intellij-idea-keybindings`](https://marketplace.visualstudio.com/items?itemName=k--kato.intellij-idea-keybindings).
Running both means 138 chords are registered twice; the later-loaded
extension wins, and load order is not guaranteed.

1. **Enable the categories you use here first**, while k--kato is still
   installed. Compare behavior key by key.
2. **Uninstall k--kato**, then reload the window. Extension keybindings
   are not released until reload.
3. **Roll back** by reinstalling k--kato and setting every
   `customIntellijNav.enable*Keymap` to `false`. Leave
   `enableGoToDeclarationOrUsages` on if you want `⌘B` to keep merging
   declaration and usages — k--kato binds `⌘B` to plain Go to Definition.

While both are installed, pin `⌘B` explicitly in your user
`keybindings.json` so load order stops mattering:

```jsonc
[
  { "key": "cmd+b", "command": "-workbench.action.toggleSidebarVisibility" },
  { "key": "cmd+b", "command": "-editor.action.goToDeclaration", "when": "editorTextFocus" },
  { "key": "cmd+b", "command": "intellij.goToDeclarationOrUsages", "when": "editorTextFocus" }
]
```

Category mapping, if you are used to k--kato's single on/off model:

| What you used k--kato for | Enable here |
|---|---|
| Editing, folding, comments | `enableEditingKeymap` |
| Navigation, hierarchies | `enableNavigationKeymap` |
| Find, replace, usages | `enableSearchKeymap` |
| Rename, extract, override | `enableRefactoringKeymap` |
| Tool windows | `enableToolWindowKeymap` |
| Git | `enableVcsKeymap` |
| Debugging | `enableDebuggingKeymap` |
| Run, build | `enableRunKeymap` |
| Diff viewer | `enableDiffKeymap` |
| Copy path, layout, full screen | `enableWorkbenchKeymap` |
| Project view arrows | `enableExplorerTreeKeymap` |

## Coverage and what is deliberately missing

138 of k--kato's 157 unique Mac chords are covered (87.9%). The other 19
are not oversights — each has a recorded reason:

| Chord | IntelliJ action | Why not |
|---|---|---|
| `⌘⌥F` | Extract Field | TypeScript emits no `refactor.extract.field`; the key is also macOS **Replace** |
| `⌘F6` | Change Signature | no such refactor kind in TypeScript |
| `⌘⌥P` | Introduce Parameter | no such refactor kind in TypeScript |
| `⌥⇥` / `⇧⌥⇥` | Goto next/prev splitter | macOS application switcher takes them first |
| `⇧⇧` / `⌃⌃` | Search Everywhere / Run Anything | VS Code cannot detect double-tapped modifiers. `⌘⇧Space` is the workaround |
| `⌘S` | Save All | would run `formatOnSave` against every open file |
| `⌘;` | Project Structure | `⌘;` is a chord prefix for VS Code's testing commands |
| `` ⌃` `` | Quick Switch Scheme | it is Toggle Terminal; Select Theme is `⌘K ⌘T` |
| `⌃⇥` | Switcher | VS Code's `⌃⇥` already is the switcher |
| `⌘,` / `⌘numpad,` | Preferences | already `openGlobalSettings` |
| `⌘↑` / `⌘↓` | Nav Bar / View source | macOS document start and end; MacBooks have no Home / End key |
| `↩` / `⇥` / `⌃↩` | various | identical to VS Code defaults, or notebook-only |
| `⌘⇧↩` | Complete Current Statement | deferred |

Beyond the keymap, IntelliJ subsystems with no VS Code equivalent are out
of scope entirely: Live Templates, Surround With, postfix completion,
structural search and replace, bookmarks, and Safe Delete.

## Limitations

VS Code's contribution model imposes a few hard constraints:

- **`shift+shift` (Search Everywhere) and `ctrl+ctrl` (Run Anything)** — VS Code does not natively support double-tap modifier keys. The closest workaround is the `⌘⇧Space` chord routed to `workbench.action.quickOpen`.
- **Save All (`⌘S`)** — not shipped. `formatOnSave` and
  `codeActionsOnSave` would run against every open file, which quietly
  corrupts diffs. Use `⌥⌘S` or the File menu.
- **Project Structure (`⌘;`)** — not shipped. `⌘;` is a *chord prefix* in
  VS Code: `⌘; A` runs all tests, and five more testing commands hang off
  it. Binding `⌘;` alone would kill the whole family.
- **Quick Switch Scheme (`⌃\`)** — not shipped. That is Toggle Terminal on
  macOS, and Select Theme is already on `⌘K ⌘T`.
- **Goto next/prev splitter (`⌥⇥`, `⇧⌥⇥`)** — impossible. The macOS
  application switcher takes these before VS Code sees them.
- **Postfix completion (`.var`, `.for`, `.return`)** — IntelliJ Live Templates have no first-class equivalent. Use VS Code snippets.
- **Successively increasing code blocks** — `editor.action.smartSelect.expand` is close but not syntax-aware in the same way.
- **Extract Field (`⌘⌥F`), Change Signature (`⌘F6`), Introduce Parameter (`⌘⌥P`)** — not shipped. Enumerating microsoft/TypeScript@v5.9.2 `src/services/refactors/` shows TypeScript emits no `refactor.extract.field`, `refactor.change.signature`, or `refactor.introduce.parameter`, so all three would be inert. `⌘⌥F` is additionally the macOS **Replace** shortcut (`editor.action.startFindReplaceAction`, `findController.ts` L1011), so binding it would cost a heavily-used default and return nothing. They will ship if and when a language server is measured to support them.

## Why this extension exists

I came from 10 years of Java/Spring with IntelliJ Ultimate. Switching to NestJS/TypeScript meant context-switching to VS Code, where:

- `cmd+alt+v` (Extract Variable) was silently failing for TypeScript files (k--kato hardcodes `refactor.extract.variable` which TS LS doesn't expose).
- Provider failures from `vue.volar` inlay hint internals were spamming red toast notifications on every `cmd+b`.
- The IntelliJ keymap extensions and VS Code defaults were fighting over `cmd+b`, `cmd+1`, etc.

This extension solves all three with: language-aware kind dispatch + prefetch, a silent-by-default error policy, and a self-contained keymap that owns its key conflicts via clear `when` clauses and configuration-gated toggles.

## Local development

```bash
npm install
npm run check
npm run compile
```

Press `F5` in VS Code to open an Extension Development Host window.

## Packaging

Requires Node.js 20+.

```bash
npm run check
npm run compile
npx vsce package --allow-missing-repository
```

## License

MIT — see `LICENSE.txt`.
