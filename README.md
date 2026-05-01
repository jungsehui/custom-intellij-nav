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

Four commands that auto-select the correct `kind` per language and `prefetch` to avoid the "No preferred code actions for X available" toast:

| Command id | Default key (Mac) | TypeScript | Java | Kotlin |
|---|---|---|---|---|
| `intellij.extractVariable` | `cmd+alt+v` | `refactor.extract.constant` | `refactor.extract.variable` | `refactor.extract.variable` |
| `intellij.extractMethod` | `cmd+alt+m` | `refactor.extract.function` | `refactor.extract.method` | `refactor.extract.function` |
| `intellij.extractConstant` | `cmd+alt+c` | `refactor.extract.constant` | `refactor.extract.constant` | — |
| `intellij.inline` | `cmd+alt+n` | `refactor.inline` → `refactor.rewrite` | `refactor.inline` | `refactor.inline` |

Falls back gracefully (multi-kind chain), and if no action is available it writes to the status bar instead of throwing a toast.

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
| Mac key | IntelliJ action |
|---|---|
| `⌘/` / `⌘⌥/` | Comment / Block Comment |
| `⌘⌥L` | Reformat code |
| `⌃⌥O` | Optimize imports |
| `⌘D` | Duplicate Line |
| `⌘⌫` | Delete Line |
| `⇧⌥↑` / `⇧⌥↓` | Move Line Up / Down |
| `⌥↑` / `⌥↓` | Expand / Shrink Selection |
| `⌥↩` | Show intention actions |
| `⌘↩` | Smart line split |
| `⌘⇧U` | Toggle case |
| `⌘P` | Parameter info |
| `⌃J` | Quick documentation |
| `⌘W` | Close active editor |

#### Navigation (`enableNavigationKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘E` | Recent files |
| `⌘L` | Go to Line |
| `⌘F12` | File Structure |
| `⌘O` / `⌘⇧O` | Go to Class / File |
| `⌥F7` / `⌘F7` | Find Usages / in File |
| `⌘⌥←` / `⌘⌥→` | Navigate Back / Forward |
| `⌘⇧⌫` | Last edit location |
| `⌘⌥B` | Go to Implementation |
| `F2` / `⇧F2` | Next / Previous error |
| `⌃↑` / `⌃↓` | Previous / Next method |
| `⌘]` | Move to bracket |

#### Search (`enableSearchKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘⇧A` | Find Action |
| `⌘⇧Space` | Search Everywhere (chord, see [Limitations](#limitations)) |
| `⌘R` | Replace |
| `⌘⇧F` / `⌘⇧R` | Find / Replace in Files |

#### Refactoring (`enableRefactoringKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⇧F6` | Rename |
| `F6` | Move |

#### VCS (`enableVcsKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘K` | Commit |
| `⌘⌥K` | Push |
| `⌘T` | Pull |
| `⌘⌥Z` | Revert selected ranges (use with care) |

#### Tool Windows (`enableToolWindowKeymap`)
| Mac key | IntelliJ action |
|---|---|
| `⌘3` / `⌘5` / `⌘9` / `⌘0` | Search / Debug / SCM / Problems |
| `⌥F12` | Toggle Terminal |

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
  "customIntellijNav.showErrorToasts": false
}
```

Each toggle is `false` by default except `enableBundledMacKeymap` (cmd+b is the headline feature). Enable categories incrementally to avoid surprises.

## Limitations

VS Code's contribution model imposes a few hard constraints:

- **`shift+shift` (Search Everywhere) and `ctrl+ctrl` (Run Anything)** — VS Code does not natively support double-tap modifier keys. The closest workaround is the `⌘⇧Space` chord routed to `workbench.action.quickOpen`.
- **Postfix completion (`.var`, `.for`, `.return`)** — IntelliJ Live Templates have no first-class equivalent. Use VS Code snippets.
- **Successively increasing code blocks** — `editor.action.smartSelect.expand` is close but not syntax-aware in the same way.
- **`cmd+alt+f` (Extract Field)** — TypeScript Language Service does not expose this kind. Java only.

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
