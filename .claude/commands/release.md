---
description: Cut a new release — bump version, update CHANGELOG, commit, tag, push to GitHub. Optional Marketplace publish.
---

Walk the user through a release. Stop at each branch and ask before
proceeding.

## 1. Decide the bump

Read the recent git log + open work:

```bash
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo 'HEAD~10')..HEAD
```

Decide major / minor / patch per semver:
- **major** — breaking change to settings, command IDs, or default
  keybindings.
- **minor** — new keymap category, new command, new language in
  `LANGUAGE_ACTION_TABLE`.
- **patch** — bug fix, docs only, internal refactor.

Ask the user to confirm the bump.

## 2. Update version + CHANGELOG + README

- Bump `package.json` `version`.
- Prepend a new section to `CHANGELOG.md` with today's date and grouped
  `### Added`, `### Changed`, `### Fixed`. Match the v1.0.0 entry's
  prose style.
- If the surface changed (new keys, new settings, new commands), update
  the relevant tables in `README.md`.

## 3. Verify build is clean

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
npm run check && npm run compile && npx vsce package --allow-missing-repository
```

Stop on any error.

## 4. Commit and tag

```bash
git add -A
git commit -m "feat: vX.Y.Z — <one-line summary>"
git tag vX.Y.Z
```

Use the same commit-message template as `594d92b feat: v1.0.0 …`.

## 5. Push (mind the gh account)

```bash
gh auth switch -u jungsehui
gh auth setup-git
git push origin main --tags
```

## 6. Marketplace publish (optional)

Only if the user explicitly asks. Otherwise stop here.

```bash
npx vsce login jungsehui  # paste Azure DevOps PAT
npx vsce publish
```

## 7. Update handoff

Write a new file under `.claude/handoff/YYYY-MM-DD-vX.Y.Z-shipped.md`
summarizing what changed and what loose ends remain.
