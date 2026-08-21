# Remaining Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every open engineering item in the roadmap and handoff chain, so the only thing left between this repo and its users is a Marketplace upload.

**Architecture:** Three of the four tasks are documentation and decision-recording, because the code review pass in v2.1.0 already fixed the defects. The one code change makes the extension stop asserting something it has not measured. Task 4 is deliberately *not* executed: it removes deprecation shims introduced hours ago, and removing them now would defeat their purpose.

**Tech Stack:** TypeScript 5.9, `@vscode/test-cli` 0.0.15 + `@vscode/test-electron` 3.1.0, `@vscode/vsce` 3.7, Node 22 (vsce needs global `File`).

**Spec:** `.claude/roadmap.md` §3 (milestones) and §6 (unconfirmed), plus the "Next" sections of `.claude/handoff/2026-08-21-v2.0.0-complete-replacement.md`.

## Global Constraints

- Node 22 for any `vsce` command: `export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"`. Node 18 throws `ReferenceError: File is not defined`.
- Every keybinding needs `when: "isMac && …"` (`.claude/conventions.md`).
- Never pass `preferred: true` to `editor.action.codeAction` (hard rule #2, `CLAUDE.md`).
- Provider failures stay silent by default; no `showErrorMessage` in provider catch blocks (hard rule #1).
- Korean documentation: no em dash (`—`), no 가운뎃점 for simple enumeration, vary sentence endings. English docs are unaffected.
- Push needs `gh auth switch -u jungsehui` first; `jungsehui202` is the gh CLI default but not the repo owner.
- Measurement is against the full checkout at `/tmp/vscode-src`. Re-clone if gone: `git clone --filter=blob:none --sparse --depth=1 https://github.com/microsoft/vscode.git && cd vscode && git sparse-checkout set src/vs extensions`.
- Every zero-hit measurement needs a positive control in the same command.

---

### Task 1: Stop claiming a language does not support a refactoring we never measured

**Files:**
- Modify: `src/refactor/run-refactor.ts:96-115`
- Test: `src/test/run-refactor-policy.test.ts` (create)

**Interfaces:**
- Consumes: `LANGUAGE_ACTION_TABLE`, `ACTION_LABELS` from `src/refactor/language-action-table.ts`; `getShowRefactorNotifications()` from `src/core/config.ts`.
- Produces: `shouldClaimUnsupported(action: IntelliJAction, langId: string): boolean` exported from `src/refactor/run-refactor.ts`. Returns `true` only when `LANGUAGE_ACTION_TABLE[action]` has an own property for `langId`.

**Why:** `⌃O` and `⌃I` resolve through the `"*"` chain in every language, and `language-action-table.ts:140-147` records that TypeScript has no counterpart at all. So in TypeScript those two keys pop an information toast on *every* press saying "the language server does not implement it" — a claim about a language we never measured, delivered as a notification, forever. The status-bar line is fine; the notification is the part that overstates.

- [ ] **Step 1: Write the failing test**

```ts
import * as assert from "assert";
import { shouldClaimUnsupported } from "../refactor/run-refactor";

suite("unsupported-claim policy", () => {
  test("claims only for languages the table measured", () => {
    // extractVariable has an explicit "typescript" entry
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "typescript"), true);
  });

  test("stays quiet for a language that only hits the '*' fallback", () => {
    // overrideMethods has no per-language entry at all
    assert.strictEqual(shouldClaimUnsupported("overrideMethods", "typescript"), false);
    assert.strictEqual(shouldClaimUnsupported("implementMethods", "typescript"), false);
  });

  test("stays quiet for an unmeasured language", () => {
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "rust"), false);
  });

  test("is not fooled by prototype keys", () => {
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "constructor"), false);
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "toString"), false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH" && npm test`
Expected: compile error — `shouldClaimUnsupported` is not exported from `../refactor/run-refactor`.

- [ ] **Step 3: Implement the minimal change**

In `src/refactor/run-refactor.ts`, add above `runRefactor`:

```ts
/**
 * Whether we are entitled to tell the user this language does not implement
 * an action.
 *
 * Only for languages with a measured entry in the table. Everything else
 * resolves through the "*" chain, which means nobody checked — and
 * "the language server does not implement it" would be a claim about
 * something we never looked at. The status bar still reports the miss.
 */
export function shouldClaimUnsupported(
  action: IntelliJAction,
  langId: string,
): boolean {
  return Object.hasOwn(LANGUAGE_ACTION_TABLE[action], langId);
}
```

Then change the tail of `runRefactor` from:

```ts
  logger.showStatus(`No ${label} available for ${langId}`);

  if (getShowRefactorNotifications()) {
```

to:

```ts
  logger.showStatus(`No ${label} available for ${langId}`);

  if (getShowRefactorNotifications() && shouldClaimUnsupported(action, langId)) {
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH" && npm test; echo "exit=$?"`
Expected: `26 passing`, `exit=0`. Read the exit code from `$?` directly — do not pipe `npm test` into `tail`, or you read the pipe's status instead.

- [ ] **Step 5: Commit**

```bash
git add src/refactor/run-refactor.ts src/test/run-refactor-policy.test.ts
git commit -m "fix: only claim a refactoring is unsupported for languages we measured"
```

---

### Task 2: Record cmd+N Generate as a permanent exclusion

**Files:**
- Modify: `README.md` (the *Coverage and what is deliberately missing* table)
- Modify: `.claude/roadmap.md` (§4 permanent exclusions, and the v1.4.0 deferral note)
- Modify: `.claude/conventions.md` (measured-defaults section)
- Test: `grep` assertions, below

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Documentation only.

**Why:** Every handoff since v1.3.0 lists `⌘N` Generate as deferred. It is not deferrable any further, because the measurement is conclusive and the answer is no.

**The measurement (already done, recorded here so the executor does not repeat it):**

TypeScript's `source.*` actions — what `editor.action.sourceAction` would show — are `source.fixAll.ts` and `source.removeUnused.ts` (`extensions/typescript-language-features/src/languageFeatures/fixAll.ts` L130, L152), plus organize/sort imports. Those are cleanup actions, not Generate.

TypeScript's only Generate-class refactor is `refactor.rewrite.property.generateAccessors` (`microsoft/TypeScript@v5.9.2 src/services/refactors/generateGetAccessorAndSetAccessor.ts` L24). It is caret-position dependent — the caret must be on a property.

So `⌘N` would either show cleanup actions under the name "Generate", or do nothing at most carets, and in both cases it blocks New Untitled File inside the editor. **And the capability is already reachable**: `⌃T` (Refactor This) surfaces `generateAccessors` along with every other refactoring, on IntelliJ's own key.

- [ ] **Step 1: Add the README exclusion row**

In `README.md`, in the *Coverage and what is deliberately missing* table, after the `⌘⇧↩` row, add:

```markdown
| `⌘N` | Generate | TypeScript's only Generate-class action is `refactor.rewrite.property.generateAccessors`, which needs the caret on a property. Binding `⌘N` would block New Untitled File in the editor while usually doing nothing. `⌃T` (Refactor This) already surfaces it. |
```

- [ ] **Step 2: Add the roadmap §4 exclusion row**

In `.claude/roadmap.md` §4, in the *IntelliJ 전용 서브시스템* area, add a row to the VS Code 문법 한계 table:

```markdown
| Generate | `cmd+n` | TS의 Generate 계열 kind는 `refactor.rewrite.property.generateAccessors` 하나뿐이고 커서가 프로퍼티 위에 있어야 한다. `cmd+n`을 걸면 대부분의 위치에서 아무것도 안 하면서 New Untitled File 만 막는다. 해당 기능은 이미 `ctrl+t`(Refactor This)에서 나온다. **v2.1.0 에서 확정 제외** |
```

- [ ] **Step 3: Close the roadmap deferral note**

In `.claude/roadmap.md`, find the v1.3.0 section's paragraph beginning `**미해결로 남긴 것**: cmd+n(Generate)` and replace the whole paragraph with:

```markdown
**~~미해결로 남긴 것: `cmd+n`(Generate)~~** → **2026-08-21 확정 제외.** 4절 참조.
`editor.action.sourceAction` 폴백도 답이 아니다. TS 의 `source.*` 는
`source.fixAll.ts` 와 `source.removeUnused.ts` 뿐이라(`fixAll.ts` L130, L152)
Generate 가 아니라 정리 액션이다.
```

- [ ] **Step 4: Verify no stale deferral text remains**

```bash
grep -rn "cmd+n.*Generate\|Generate.*deferred\|⌘N.*Generate" README.md .claude/ | grep -iv "확정 제외\|permanent\|deliberately missing"
```
Expected: no output. If a handoff still says "still deferred", that is historical record and may stay — restrict the grep to `README.md .claude/roadmap.md .claude/conventions.md` if handoffs match.

- [ ] **Step 5: Commit**

```bash
git add README.md .claude/roadmap.md .claude/conventions.md
git commit -m "docs: cmd+N Generate is a permanent exclusion, not a deferral"
```

---

### Task 3: Write the missing handoff and close the resolved unknowns

**Files:**
- Create: `.claude/handoff/2026-08-21-v2.1.0-review-pass.md`
- Modify: `.claude/roadmap.md` §6

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Documentation only.

**Why:** Handoffs exist through v2.0.0. v2.0.1 (the `⌃↑`/`⌃↓` removal) and v2.1.0 (the review pass) have none, and v2.1.0 is where the critical race was found. Roadmap §6 still lists two unknowns that measurement has since answered.

- [ ] **Step 1: Write the handoff**

Create `.claude/handoff/2026-08-21-v2.1.0-review-pass.md` covering, in this order:

1. **State table** — HEAD, installed version, manifest counts (8 commands / 168 keybindings / 17 settings), source (15 files, ~1,250 LOC, 317 of it tests), tests (22 passing), VSIX size, **Marketplace at v2.0.0 while the repo is at v2.1.0**.
2. **The critical finding** — `runRefactor` prefetched against a captured editor and dispatched `editor.action.codeAction`, which takes no URI and no range. Await boundary between them, no guard. Include the failure scenario and the fix (`selectionMatches` before dispatch).
3. **The three Important findings** — `peekUsages` conflating stale with empty; swallowed exceptions reported as "language unsupported"; the `⌘B` `&&` shim being subtractive where the `||` shims are additive.
4. **What was refuted** — `vscode.executeCodeActionProvider` returns `codeActionSet.validActions`, not `allActions` (`codeAction.ts` L377), so disabled actions cannot pass the prefetch gate. Record that the reviewer flagged this honestly as unverified and the full checkout settled it.
5. **The test suite had never run** — `@vscode/test-electron@2.5.2` looks for `Electron`, VS Code 1.134's macOS bundle names it `Code`. Upgraded to 3.1.0. The one pre-existing test then turned out to assert against an extension that never activated.
6. **A measurement error of mine** — the `key`+`mac` count. I reported "mac 전용 135" by counting entries *having* `mac`; 128 carried both and 101 had divergent, unreachable chords.
7. **Next** — publish v2.1.0 (user action, with the exact `⋮ → Edit → pencil` path), and the v3.0.0 gate from Task 4.

- [ ] **Step 2: Close roadmap §6 unknown #1**

Replace:

```markdown
1. VS Code macOS 기본 키맵의 정확한 바인딩. 앱 번들이 minify돼 있어 `cursorWordStartLeft`
   문자열 존재만 확인했고 어느 키에 묶였는지는 미확인. 2절 실측 대상.
```

with:

```markdown
1. ~~VS Code macOS 기본 키맵의 정확한 바인딩~~ → **2026-08-21 해소.** minify 된 앱 번들
   대신 전체 소스 체크아웃(`--filter=blob:none --sparse`, .ts 11,832개)으로 측정한다.
   방법은 `.claude/conventions.md` 의 "Measure against a complete checkout".
```

- [ ] **Step 3: Close roadmap §6 unknown #3**

Replace:

```markdown
3. `references-view.showTypeHierarchy`가 built-in인지 별도 확장인지. v1.2.0 착수 전 확인.
```

with:

```markdown
3. ~~`references-view.showTypeHierarchy` 가 built-in 인지~~ → **v1.2.0 에서 해소.**
   core 의 `editor.showTypeHierarchy` 를 `editorHasTypeHierarchyProvider` 와 함께 쓴다
   (`typeHierarchy.contribution.ts` L179, L29). 별도 확장 의존 없음.
```

- [ ] **Step 4: Verify §6 has no open unknowns left**

```bash
sed -n '/## 6. 미확인/,/## 참고 파일/p' .claude/roadmap.md | grep -n "^[0-9]\." 
```
Expected: every numbered line contains `~~` (struck through) or an explicit `[GAP]` with a stated reason.

- [ ] **Step 5: Commit**

```bash
git add .claude/handoff/2026-08-21-v2.1.0-review-pass.md .claude/roadmap.md
git commit -m "docs: v2.1.0 handoff, and close the two resolved roadmap unknowns"
```

---

### Task 4: v3.0.0 deprecation removal — planned, gated, NOT executed now

**Files (when the gate opens, not now):**
- Modify: `package.json` — delete the two deprecated settings; strip `|| config.customIntellijNav.enableExtendedMacKeymap` from 17 `when` clauses
- Delete: `src/core/migrate-settings.ts`
- Modify: `src/core/navigator.ts` (drop `migrateLegacySettings`), `src/extension.ts` (drop the call)
- Modify: `README.md` (drop the *Migrating to 2.0.0* section), `.claude/architecture.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

**Do not execute this task yet.** The shims it removes were published in v2.0.0 **on 2026-08-21**, the same day. Removing a deprecation one release after introducing it gives users no migration window and makes the deprecation notice a lie.

**Gate — all three must hold:**

1. v2.1.0 or later has been on the Marketplace for at least one full release cycle, so `migrateLegacySettings` has actually run on installed machines.
2. `enableBundledMacKeymap` has zero `when` references (already true — verify with the command below) **and** the migration has been shipping long enough that a fresh install cannot still carry the old key.
3. The version bump is a major one, with the removal called out at the top of the CHANGELOG entry.

- [ ] **Step 1 (when gated open): Confirm the current shim surface**

```bash
node -e '
const p=require("./package.json"), KB=p.contributes.keybindings;
const props=p.contributes.configuration.properties;
console.log("deprecated settings:", Object.entries(props).filter(([,v])=>v.deprecationMessage).map(([k])=>k));
console.log("bundled when-refs:", KB.filter(b=>(b.when||"").includes("enableBundledMacKeymap")).length);
console.log("extended when-refs:", KB.filter(b=>(b.when||"").includes("enableExtendedMacKeymap")).length);
'
```
Expected today: `bundled when-refs: 0`, `extended when-refs: 17`.

- [ ] **Step 2 (when gated open): Strip the shims**

```bash
node -e '
const fs=require("fs"); const p=JSON.parse(fs.readFileSync("package.json","utf8"));
let n=0;
for (const k of p.contributes.keybindings) {
  const before=k.when;
  k.when=k.when.replace(/\((config\.customIntellijNav\.enable\w+Keymap) \|\| config\.customIntellijNav\.enableExtendedMacKeymap\)/, "$1");
  if (k.when!==before) n++;
}
delete p.contributes.configuration.properties["customIntellijNav.enableBundledMacKeymap"];
delete p.contributes.configuration.properties["customIntellijNav.enableExtendedMacKeymap"];
fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
console.log("shims stripped:", n);
'
```
Expected: `shims stripped: 17`.

- [ ] **Step 3 (when gated open): Delete the migration module and its wiring**

```bash
git rm src/core/migrate-settings.ts
```
Then remove the `migrateLegacySettings` import and method from `src/core/navigator.ts`, and the `void navigator.migrateLegacySettings();` line from `src/extension.ts`.

- [ ] **Step 4 (when gated open): Verify**

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
npm test; echo "exit=$?"
node -e '
const KB=require("./package.json").contributes.keybindings;
console.log("residual shim refs:", KB.filter(b=>/enableExtendedMacKeymap|enableBundledMacKeymap/.test(b.when||"")).length);
console.log("orphan bindings:", KB.filter(b=>!/config\.customIntellijNav\.enable\w+/.test(b.when||"")).length);
'
```
Expected: `exit=0`, `residual shim refs: 0`, `orphan bindings: 0`.

- [ ] **Step 5 (when gated open): Commit**

```bash
git commit -am "feat!: v3.0.0 — remove the 2.0.0 deprecation shims"
```

---

## Self-Review

**Spec coverage.** Roadmap §3 milestones are all complete through v2.0.0; the only forward item was v3.0.0, which Task 4 plans and gates. Roadmap §6 unknowns: #1 and #3 close in Task 3, #2 (GitLens) closed in v1.5.0. The v2.0.0 handoff's "Next" list: publish (user action, documented in Task 3's handoff), v3.0.0 (Task 4), `⌘N` Generate (Task 2), `⌃↑`/`⌃↓` (done in v2.0.1). The reviewer's one recorded observation becomes Task 1.

**Placeholder scan.** No TBDs. Every code step carries the actual code; every verification step carries the actual command and its expected output.

**Type consistency.** `shouldClaimUnsupported(action: IntelliJAction, langId: string): boolean` is the only new signature, defined in Task 1 Step 3 and used with that exact name and argument order in Task 1 Step 1's test.

**One gap accepted deliberately.** Publishing to the Marketplace cannot be automated here — it needs an interactive Microsoft sign-in. Task 3's handoff records the exact path so the human step is mechanical.
