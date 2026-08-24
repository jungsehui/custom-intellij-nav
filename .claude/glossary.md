# Glossary

The words this project uses, and **where each one lives**. That second part
matters: a term being absent from `src/` is usually correct, not drift.

`chord` appears 56 times in the docs and zero times in `src/`. That looked
like a split vocabulary until you notice `src/` never touches keys at all —
it deals in commands and code-action kinds. The manifest deals in keys. Two
vocabularies with a clean edge between them is not the same as one
vocabulary going wrong.

## Keys and the manifest

These live in `package.json` and the docs. **Not in `src/`.**

| Term | Meaning |
|---|---|
| **chord** | One key combination, e.g. `⌘⌥V`. The unit the coverage metric counts. Modifier order is normalised (`ctrl, shift, alt, cmd`) before comparing, because VS Code parses `cmd+shift+c` and `shift+cmd+c` as the same chord. |
| **displacement** | Binding a chord that VS Code already uses, so its default stops working. Acceptable only when the displaced capability is reachable on another key this keymap provides — Open Recent on `⌘E`, Go to Next Problem on `F2`, Toggle Side Bar on `⌘1`. |
| **category** | One opt-in toggle covering a group of chords (`enableEditingKeymap`, …). All default off. |
| **feature toggle** | The one exception: `enableGoToDeclarationOrUsages`, default on, because `⌘B` is why people install this. Not a category — it gates the extension's own command, not a remap. |
| **permanent exclusion** | An IntelliJ action that will never ship, with a recorded reason. Nineteen chords, each accounted for. Not a backlog. |

## Refactoring

| Term | Meaning | Lives in |
|---|---|---|
| **action** | An IntelliJ-named refactoring (`extractVariable`, `move`, …). | `IntelliJAction` |
| **kind** | An LSP code-action kind string (`refactor.extract.constant`). Matching is prefix-based on dot boundaries, which is why a broad kind is dangerous. | `CodeActionAttempt.kind` |
| **chain** | The ordered kinds to try for one action in one language. First one the language server offers wins. | `LANGUAGE_ACTION_TABLE` |
| **census** | The enumerated list of kinds a language server actually emits, read from its source. The reason three IntelliJ keys are unshipped. | comments in `language-action-table.ts` |
| **prefetch** | Asking `vscode.executeCodeActionProvider` whether anything matches, before dispatching. Avoids a VS Code toast, and is the reason a staleness guard is needed at all. | `run-refactor.ts` |
| **measured language** | A language with its own entry in the table, as opposed to one falling through `"*"`. We only make claims about measured ones. | `shouldClaimUnsupported` |

## Requests and staleness

| Term | Meaning | Lives in |
|---|---|---|
| **request** | One user gesture in flight. Has an id, appears in every log line as `request#N`. | `EditorRequest` |
| **snapshot** | Editor identity at the moment a request began: uri, version, position, selection. Deliberately does not follow the document. | `EditorSnapshot` |
| **stale** | A newer request has started, or the document changed. Navigation's rule. | `isStale()` |
| **selection-stale** | Stale, **or** the caret moved. Refactoring's rule, stricter because `editor.action.codeAction` takes no range. | `isSelectionStale()` |
| **port** | The one interface standing between this extension and a VS Code global. There is exactly one. | `ActiveEditorSource` |
| **inner ring** | Files forbidden from importing `vscode` at runtime: `types.ts`, `language-action-table.ts`, `policy.ts`. Enforced by lint, not convention. | `eslint.config.mjs` |

## Measurement

| Term | Meaning |
|---|---|
| **corpus** | A complete checkout of `microsoft/vscode` (`--filter=blob:none --sparse`). Measuring against fetched-on-demand files once reported `⌥F8` as free when it is Go to Next Problem. |
| **positive control** | A pattern that must match, run in the same command as a zero-hit claim. Without one, "not present" and "not looked at" are the same result. This has caught five real errors. |
| **candidate list** | What a mechanical sweep produces. Not a verdict. The chord audit reported 104 overlaps; four were real displacements. |

## Related

`.claude/architecture.md` for the module graph, `.claude/conventions.md` for
the rules these words appear in, `.claude/roadmap.md` for the coverage
metric's definition.
