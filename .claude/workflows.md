# Workflows

## Dev loop (iterate on a code change)

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"  # Node 22 required
npm run check    # tsc --noEmit
npm run compile  # tsc -p ./
```

For a full hot-reload-ish loop in VS Code: open the project, hit `F5` to
launch an Extension Development Host. Code changes hot-reload on
recompile.

## Ship to local VS Code (test as a real user)

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
npm run compile
npx vsce package --allow-missing-repository
code --uninstall-extension jungsehui.custom-intellij-nav
rm -rf $HOME/.vscode/extensions/jungsehui.custom-intellij-nav-*
code --install-extension custom-intellij-nav-$(node -p "require('./package.json').version").vsix
# then in VS Code: cmd+shift+p → "Developer: Reload Window"
```

The `rm -rf` line clears stale on-disk extension dirs. Without it, VS
Code occasionally activates an old version after install.

The slash command `/ship` does this whole sequence in one shot.

## Release (cut a new version)

```bash
# 1. bump version in package.json + add a CHANGELOG.md section
# 2. update README.md if surface changed
# 3. commit + tag + push
git add -A
git commit -m "feat: vX.Y.Z — <one-line summary>"
git tag vX.Y.Z
gh auth switch -u jungsehui  # repo owner — gh default is jungsehui202
git push origin main --tags
```

The tag triggers `.github/workflows/release.yml`: check, lint, test,
package, then the `release` job attaches the VSIX to the GitHub Release.
There is no `vsce publish` job and no PAT; the Marketplace upload is manual
(see below). The same build also runs on every push to `main`, on pull
requests, and weekly on Monday 00:00 UTC against the VS Code stable of
that day.

The slash command `/release` walks this with prompts.

## Marketplace publish (manual, first time)

```bash
npx vsce login jungsehui  # paste an Azure DevOps PAT with Marketplace scope
npx vsce publish
```

Or upload the VSIX manually via
<https://marketplace.visualstudio.com/manage/publishers/jungsehui>.

## Two-account gotcha

This machine has both `jungsehui` and `jungsehui202` authenticated to
`gh`. `jungsehui202` is the active default; the repo owner is
`jungsehui`. Push will fail with `Permission denied` until you switch:

```bash
gh auth switch -u jungsehui
gh auth setup-git  # configures credential helper for the active account
git push origin main
```

## Re-measure keybindings after a VS Code release

```bash
npm run audit:keybindings -- --baseline 1.143.0
```

macOS only. It asks VS Code for its own default keybindings (stable by
default, or pass a version), checks three controls before concluding
anything, then reports pure duplicates, conditional duplicates, every
default the exposed bindings displace, and what changed since the
baseline on our chords and the three relied-upon ones. It exits 1 on a
failed control or a pure duplicate that `KEPT_DUPLICATES` does not
explain. Dumps are cached in `.vscode-test/kbdump/` (gitignored), so a
baseline is downloaded and dumped once. When the result is clean, move
the baseline in `.claude/conventions.md` to the new version.

## Tests

`npm test` compiles, lints, then runs 73 tests in 10 files under
`src/test/` inside a real VS Code (the stable of the day, via
`@vscode/test-cli`). Run it through `memguard -- npm test` on this
machine. CI runs the same suite under `xvfb-run` on every push, PR and
tag, and weekly on Monday 00:00 UTC. *Corrected 2026-10-22: this section
used to say the suite was a single smoke test.*

## CI

- Actions in `.github/workflows/release.yml` are pinned to full commit
  SHAs with the version in a comment. Bump them when CI warns (the
  2026-10-19 cron warned that upload-artifact@v4 still targeted Node 20).
- A manual run can choose the runner image, to try one before
  `ubuntu-latest` moves to it:
  `gh workflow run ci-release -f runner=ubuntu-26.04`. Ubuntu 26.04 passed
  this way on 2026-10-22, and `ubuntu-latest` was already on it that day.
- npm 11 blocks install scripts until allowed: `@vscode/vsce-sign`'s
  postinstall does not run locally. Harmless here, it only matters for
  signed publishing, which this repo does not do; `vsce package` works.
