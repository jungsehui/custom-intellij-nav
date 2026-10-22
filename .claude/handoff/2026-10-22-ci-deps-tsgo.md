# Handoff — 2026-10-22 (CI on Node 24 and Ubuntu 26, TS 6 and ESLint 10, TypeScript Go measured)

Read `2026-10-08-maintenance-1141.md` first.

## State

| | |
|---|---|
| GitHub | v3.0.0, plus maintenance on `main` with no user-facing change (CHANGELOG `[Unreleased]`) |
| Marketplace | v3.0.0, 52 installs, no reviews or Q&A |
| VS Code | 1.143.0 stable; 73 passing locally; keybinding baseline moved to 1.143.0 |
| CI | Ubuntu 26.04 (`ubuntu-latest` had already moved), Node 24 actions pinned to SHAs |
| `npm audit` | 4, all under `@vscode/test-cli`; production 0 |

## Done

| Commit | What |
|---|---|
| `7d78683` | checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2, download-artifact v8.0.2, all `node24`, each pinned to its commit SHA; `workflow_dispatch` takes a `runner` input. Run 39769580674 on `ubuntu-26.04`: 73 passing |
| `d4f7c6c` | typescript-eslint 8.72.0 |
| `6df2634` | TypeScript `~6.0.3`. Build output identical to 5.9.3 (all 23 .js and maps; a one-byte control was detected) |
| `72bd012` | ESLint 10.13.0. Lint clean; the inner-ring ban and `no-unused-vars` still fire on a stdin probe |
| docs | baseline 1.143.0, TypeScript Go result, CI section, a stale `## Tests` section fixed |

The VSIX built today differs from the released v3.0.0 only in
`package.json` devDependencies and `readme.md`. No release needed.

## The finding that matters: TypeScript Go has no refactorings

With `js/ts.experimental.useTsgo` on (VS Code default: off), the TypeScript
Go extension `TypeScriptTeam.native-preview` 1.0.1 serves TS/JS. Measured
in a test host on VS Code 1.143.0, same file and selections as a built-in
TS 6.0.3 control: extract.constant, extract.function, inline.variable and
move all return 0 under TypeScript Go (2, 2, 1, 2 under built-in TS). Not
a cold server: TypeScript Go reported diagnostics and offered `Add import`
in the same run, and each query was retried for 45 s. Details and method:
conventions.md, *TypeScript Go offers no refactorings*. README
*Limitations* and CHANGELOG `[Unreleased]` say so to users.

The probe lives in the session scratchpad, not the repo. The extension is
installed under `.vscode-test/tsgo/` (gitignored).

## Not verified

- download-artifact v8 runs only in the tag job; first exercised by the
  next release.
- `⌘W` in an empty window and in the Agents Window: needs a person.

## Next (decisions for the user)

1. TypeScript Go UX: today a user with it on gets "typescript offers no
   Extract Variable at this position. Either the language server does not
   implement it, or …". Reading `js/ts.experimental.useTsgo` would let the
   message name the real cause. A small code change; not done.
2. Make the TypeScript Go probe a repo script, so a TypeScript Go release
   can be re-measured with one command like the keybinding audit.
3. Each VS Code release: `npm run audit:keybindings -- --baseline 1.143.0`.

## Do not

- Assume `ubuntu-latest` is 24.04. It is 26.04 now.
- Bump TypeScript to 7 while typescript-eslint caps it at `<6.1.0`.
