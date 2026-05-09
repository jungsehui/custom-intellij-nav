---
description: Re-sync README, CHANGELOG, and the architecture/handoff docs against the actual state of the code. Run after any non-trivial change.
---

After any non-trivial code change, run this to make sure the docs
haven't drifted from reality.

## 1. Diff the surface

```bash
node -e "
  const p = require('./package.json');
  console.log('cmds:', p.contributes.commands.length);
  console.log('keys:', p.contributes.keybindings.length);
  console.log('cfgs:', Object.keys(p.contributes.configuration.properties).length);
"
```

Compare with the numbers in `CLAUDE.md` ("5 commands, 80 keybindings,
12 settings"). If they differ, update CLAUDE.md and the matching tables
in `README.md` and `.claude/architecture.md`.

## 2. Check the LOC table in `.claude/architecture.md`

```bash
for f in $(find src -name "*.ts" | sort); do
  echo "$(wc -l < $f) $f"
done
```

If a file's line count is dramatically different from the architecture
doc, update the doc.

## 3. CHANGELOG sanity check

```bash
git log --oneline $(node -p "
  const v = require('./package.json').version;
  'v' + v;
" 2>/dev/null || echo 'HEAD~5')..HEAD
```

Any commit that landed since the version listed in `package.json` should
be reflected in CHANGELOG.md under the next-version section. If
CHANGELOG.md's top entry is for the current `package.json` version but
new commits exist, you owe a CHANGELOG bump.

## 4. README cross-check

The README has tables for:
- Settings (12 keys with defaults)
- Each keymap category (counts and example keys)
- The "Why this extension exists" rationale

Run a quick visual scan against `package.json` `contributes` and the
real settings list. Update prose only if a table is wrong.

## 5. Handoff freshness

Look at the latest file in `.claude/handoff/`. If its TL;DR doesn't
match the current `git log` and `git status`, write a new dated handoff
file.

## 6. Settings.json hook reminder

If new commands or settings are added, also add them to `.claude/`
documentation tables (architecture.md and CLAUDE.md). The
`Stop` hook in `.claude/settings.json` will warn if you forget.
