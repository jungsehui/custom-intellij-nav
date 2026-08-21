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

Each toggle is `false` by default except `enableBundledMacKeymap` (cmd+b is the headline feature). Enable categories incrementally to avoid surprises.

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

## If you also use `IntelliJ IDEA Keybindings` (k--kato)

This extension does **not** require k--kato. If you have both installed, add these overrides to your user `keybindings.json` to ensure deterministic behavior on `cmd+b`:

```jsonc
[
  { "key": "cmd+b", "command": "-workbench.action.toggleSidebarVisibility" },
  { "key": "cmd+b", "command": "-editor.action.goToDeclaration", "when": "editorTextFocus" },
  { "key": "cmd+b", "command": "intellij.goToDeclarationOrUsages", "when": "editorTextFocus" }
]
```

To migrate fully off k--kato:
1. Enable all `customIntellijNav.enable*Keymap` toggles in settings.
2. Verify the keys you actually use (the tables above cover ~80% of common IntelliJ usage).
3. Disable or uninstall k--kato.
4. Add any remaining keys directly to your `keybindings.json` or open an issue.

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
