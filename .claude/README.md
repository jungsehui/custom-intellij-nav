# `.claude/` — AI session context

This folder is the operating manual for any Claude Code session in this
repo. It's tracked in git so context survives across sessions and
machines.

## Layout

```
.claude/
├── README.md            # this file
├── architecture.md      # module graph, domain layers, critical flows
├── workflows.md         # build, package, install, release, gh quirks
├── conventions.md       # DO / DON'T rules, code style
├── multi-ai-playbook.md # when to reach for ccg/ultrawork/sub-agents
├── settings.json        # hooks (docs-staleness reminder) + permissions
├── commands/
│   ├── ship.md          # /ship — dev iteration loop
│   ├── release.md       # /release — version bump + tag + push
│   └── docs-sync.md     # /docs-sync — refresh docs after a change
├── skills/
│   └── keep-docs-current/SKILL.md  # auto-sync skill triggered by Stop hook
└── handoff/
    └── YYYY-MM-DD-*.md  # dated session handoffs (latest = current state)
```

The root `CLAUDE.md` is the auto-loaded entry — it points into this
folder. Keep `CLAUDE.md` short (under 60 lines); detail belongs here.

## Reading order for a fresh session

1. `CLAUDE.md` (root) — 30-second project overview
2. `.claude/handoff/` — latest dated file = current state
3. `.claude/architecture.md` — only if you're touching code
4. `.claude/workflows.md` — only if you're building/releasing
5. `.claude/conventions.md` — before adding new code

## Editing rules

- **Architecture / conventions / commands**: edit when patterns change.
- **Handoff**: never edit existing handoffs. Write a new dated file when
  a session wraps.
- **CLAUDE.md (root)**: keep it minimal. New facts go into the
  detail files; CLAUDE.md only points to them.

## Hooks contract

`.claude/settings.json` registers a `Stop` hook that warns when:

- `src/**`, `package.json`, or `.github/workflows/**` changed in the
  current diff,
- AND `README.md`, `CHANGELOG.md`, or `.claude/**` did not change.

The reminder text suggests `/docs-sync`. The `keep-docs-current` skill
is the long-form behavior.
