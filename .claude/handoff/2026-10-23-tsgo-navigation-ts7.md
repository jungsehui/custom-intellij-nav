# Handoff — 2026-10-23 (a flaky test explained, ⌘B under TypeScript Go, a TypeScript 7 check)

Read `2026-10-22-v3.0.1-shipped.md` first.

## State

| | |
|---|---|
| GitHub | v3.0.1; `main` adds tests, CI and docs only (CHANGELOG `[Unreleased]`) |
| Marketplace | v3.0.0 (3.0.1 not uploaded yet) |
| Tests | 83, VS Code 1.143.0 |
| CI | Ubuntu 26.04; advisory TypeScript 7 step passing |

## Done

1. **The red v3.0.1 tag build** (`28d5617`). One new test, "runRefactor
   keeps the usual message in that case", read "Extract Variable failed
   (see Output)". First guess, a cold server (Linux runs this file first):
   **wrong**; warming the server at suite start still failed locally,
   twice. Letting the fake request keep its log showed the cause:
   `error Canceled`. Flipping `js/ts.experimental.useTsgo` makes the
   built-in TypeScript extension react and cancels a query sent straight
   after. The test now waits after the flip until the server answers a
   refactoring query again, which also checks its premise. 83 passing
   locally twice and on Linux CI twice since.
2. **TypeScript 7, advisory** (`eefd7d7`). `npm run check:ts7` and a CI
   step with `continue-on-error`. 7.0.2 reads all 24 files, no errors,
   0.70 s; a planted `TS2322` in a scratch project was reported, so the
   clean result counts. The build stays on 6.0 while typescript-eslint
   requires `<6.1.0`.
3. **⌘B under TypeScript Go**, measured with `npm run probe:tsgo`: at a
   call site, definition 1 / 1 and usages 3 / 3 (built-in / TypeScript
   Go) in all four languages. Declaration is 0 under both: VS Code's
   TypeScript has no separate declaration provider, and ⌘B lands through
   its definition step. So TypeScript Go users lose only the
   refactorings. README says so, and the probe now fails if that stops
   being true.

## Not verified

- That the flaky test stays fixed: two Linux passes so far; the weekly
  runs will tell.
- `⌘W` in an empty window and in the Agents Window: needs a person.

## Next

1. Marketplace: upload v3.0.1 from the GitHub Release.
2. 2026-10-26 cron: check it, including the TypeScript 7 step.
3. When typescript-eslint accepts TypeScript 7: the advisory step already
   says the source is ready; move the build over then.
4. When TypeScript Go releases: `npm run compile && npm run probe:tsgo`.
