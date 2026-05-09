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

The tag triggers `.github/workflows/release.yml`'s `publish` job (if a
PAT is configured for `vsce publish`). Currently the workflow builds the
VSIX in CI but doesn't publish — see `.github/workflows/release.yml`.

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

## Tests

`npm test` exists but the suite is a single smoke test
(`src/test/extension.test.ts`) that asserts
`intellij.goToDeclarationOrUsages` is registered. Real verification is
manual in an Extension Development Host. If you grow the test suite,
favor integration tests via `@vscode/test-electron`.
