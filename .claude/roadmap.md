# IntelliJ Mac 키맵 완전 클론 로드맵

측정 기준: `custom-intellij-nav` v1.0.1, `vscode-intellij-idea-keybindings` v1.7.7.
집계 단위는 **고유 Mac chord** 1개 = 1건. 같은 키에 `when` 절만 다른 엔트리는 1건으로 합산한다.
**2026-08-21 계측기 수정**: chord 비교를 문자열 그대로 하고 있어서 `cmd+shift+c`와
`shift+cmd+c`를 서로 다른 chord로 셌다. VS Code는 같은 chord로 파싱한다. modifier를
고정 순서(`ctrl, shift, alt, cmd`)로 정규화하도록 고쳤고, 아래 표는 태그에서 전 구간
재집계한 값이다. 기존 공표치는 1.6~1.9%p 낮았고 k--kato 분모도 158이 아니라 157이다.

> 이전 갭 분석(`.planning/todos/pending/2026-04-28-...md`)의 "k--kato 216개 vs 우리 74개"는
> 엔트리 단위 집계라 이 문서와 직접 비교할 수 없다. 이 문서가 최신이며 chord 단위로 재집계했다.

## 1. 현황

| 항목 | v1.0.1† | v1.1.0 | v1.2.0 | v1.3.0 | v1.4.0 | v1.5.0 | **v2.0.0 (현재)** |
|---|---|---|---|---|---|---|---|
| 우리 고유 Mac chord | 73 | 102 | 121 | 125 | 131 | 141 | **154** |
| k--kato 고유 Mac chord | 157 | 157 | 157 | 157 | 157 | 157 | 157 |
| 겹침 (양쪽 보유) | 59 | 87 | 106 | 109 | 115 | 125 | **138** |
| 순수 미구현 | 98 | 70 | 51 | 48 | 42 | 32 | **19** |
| **커버율** | 37.6% | 55.4% | 67.5% | 69.4% | 73.2% | 79.6% | **87.9%** |

**남은 19건은 전부 사유가 기록돼 있다. 누락이 아니라 판정된 제외다.**
불가능 11건(앱 스위처 2, double-tap 2, TS 미지원 3, chord 접두 1, 이미 기본값 2, notebook 전용 1)과
의도적 거부 8건(`cmd+s` diff 오염, `ctrl+\`` 터미널, `ctrl+tab` 중복, `cmd+up/down` 플랫폼 관례,
`enter`/`tab`/`ctrl+enter` 기본값 동일, `cmd+shift+enter` 보류). 상세는 README와 4절.

† v1.0.1은 태그가 없어 재집계 불가. 기록된 값 그대로 둔다.
v1.1.0~v1.4.0은 정규화 기준 재집계값이며 기존 공표치(53.8 / 65.8 / 67.7 / 71.5%)를 대체한다.
분모가 158에서 157로 줄어든 것도 정규화 결과다. 같은 chord를 두 번 세고 있었다.

98건에서 즉시 제외 대상을 빼면 실제 작업량은 79건이다.

| 구분 | 건수 |
|---|---|
| 순수 미구현 | 98 |
| numpad 미러 (기능 중복) | -14 |
| 구현 불가 / VS Code 기본과 동일 | -5 |
| **실제 구현 대상** | **79** |

### 카테고리별 커버리지

| 카테고리 | 우리 | k--kato | 커버율 |
|---|---|---|---|
| Editing | 60 | 53 | **100%** |
| Navigation | 38 | 32 | **100%** |
| Refactoring | 9 | 14 | **64%** |
| ToolWindow | 18 | 14 | **100%** |
| Search | 4 | 10 | 40% |
| Debugging | 12 | 11 | **100%** |
| VCS | 7 | 6 | **100%** |
| Run / Build | 4 | 4 | **100%** |
| Workbench 기타 | 3 | 11 | **27%** |
| Diff / Notebook | 3 | 5 | **60%** |

### 우리에만 있는 14건 (경쟁 우위, 유지 대상)

`cmd+shift+b`, `cmd+alt+shift+n`, `cmd+shift+n`, `cmd+\`, `ctrl+shift+r`, `ctrl+shift+d`,
`alt+j`, `cmd+alt+n`, `cmd+shift+u`, `cmd+f7`, `ctrl+up`, `ctrl+down`, `cmd+shift+space`,
`cmd+alt+shift+g`.

이 중 6건은 **k--kato가 `"command": ""` 로 포기한 자리를 우리가 채운 것**이다:
`cmd+alt+n`(Inline), `cmd+shift+u`(Toggle case), `cmd+f7`(Find usages in file),
`ctrl+up`/`ctrl+down`(Go to prev/next method), `ctrl+shift+r`/`ctrl+shift+d`(Run/Debug at cursor).
README의 "self-contained alternative" 주장을 뒷받침하는 실증 근거다.

### 같은 키, 다른 커맨드 (v2.0.0 전 결론 필요)

| 키 | 우리 | k--kato | 판단 |
|---|---|---|---|
| `cmd+b` | `intellij.goToDeclarationOrUsages` | `editor.action.goToDeclaration` | 우리 우위 |
| `cmd+alt+v/m/c` | `intellij.extract*` | `editor.action.codeAction` | 우리 우위 (언어별 kind) |
| `cmd+k` | `git.commit` | `git.commitAll` | **우리 유지** (안전) |
| `cmd+t` | `git.pull` | `git.sync` | **우리 유지** (sync는 push까지 함) |
| `cmd+o` | `quickOpen` | `showAllSymbols` | k--kato가 IntelliJ에 충실 |
| `cmd+e` | `openRecent` | `quickOpen` + recent picker | k--kato가 IntelliJ에 충실 |
| `cmd+]` | `jumpToBracket` | `navigateForward` | 결정 필요 |
| `alt+f7` | `referenceSearch.trigger` | `references-view.findReferences` | k--kato가 IntelliJ에 충실 |
| `f6` | `files.move` | `editor.action.codeAction` | 둘 다 근사치 |
| `ctrl+d` | `debug.start` | `debug.run` | k--kato가 정확 |

## 2. 실측 (v1.1.0 착수 전 수행, 완료)

**이 로드맵에서 ROI가 가장 높았던 지점.** VS Code 소스(`microsoft/vscode@main`)에서
직접 확인한 결과, v1.1.0 계획 27건 중 11건이 이미 macOS 기본이었다.

### 이미 기본에 있던 것 (11건)

| 키 | VS Code 기본 command | 소스 |
|---|---|---|
| `alt+left` | `cursorWordLeft` | `wordOperations.ts` L128-133 |
| `alt+right` | `cursorWordEndRight` | `wordOperations.ts` L226-231 |
| `alt+shift+left` | `cursorWordLeftSelect` | `wordOperations.ts` L167-172 |
| `alt+shift+right` | `cursorWordEndRightSelect` | `wordOperations.ts` L265-270 |
| `alt+backspace` | `deleteWordLeft` | `wordOperations.ts` L419-424 |
| `alt+delete` | `deleteWordRight` | `wordOperations.ts` L458-463 |
| `cmd+g` / `cmd+shift+g` | `nextMatchFindAction` / `previousMatchFindAction` | `findController.ts` L784, L805 |
| `cmd+x` | `clipboardCutAction` | `clipboard.ts` L48 |
| `cmd+home` / `cmd+end` | `cursorTop` / `cursorBottom` | `coreCommands.ts` L1247, L1291 |

**로드맵이 틀렸던 지점**: `alt+right`에 `cursorWordRight`를 계획했으나 IntelliJ의
"Move Caret to Next Word"는 단어 **끝**에 멈추고, 그게 VS Code 기본 `cursorWordEndRight`다.
계획대로 짰으면 개악이었다. `alt+shift+right`도 동일.

이 11건은 사용자 결정에 따라 **명시적으로 재등록**했다. 다른 키맵 익스텐션이 함께 깔려도
IntelliJ 동작이 보장된다.

### 충돌이 발견된 것 (5건, 사용자가 IntelliJ 우선으로 결정)

| 키 | VS Code 기본 | 처리 |
|---|---|---|
| `cmd+-` / `cmd+=` | `zoomOut` / `zoomIn` primary (`windowActions.ts` L156, L185) | 폴딩이 가져감 |
| `cmd+shift+-` / `cmd+shift+=` | zoom secondary | Fold All / Unfold All이 가져감 |
| `cmd+.` | Quick Fix | Toggle Fold가 가져감 (`alt+enter`가 Quick Fix 대체) |

### 비어 있던 것 (안전하게 추가)

`cmd+alt+-`, `cmd+alt+=`, `shift+enter`, `alt+cmd+enter`, `ctrl+g`, `ctrl+shift+g`,
`shift+cmd+8`, `shift+ctrl+.`, `shift+ctrl+,`, `cmd+f1`.

폴딩 기본은 전혀 다른 키다: `editor.fold`=`cmd+alt+[`, `unfold`=`cmd+alt+]`,
나머지는 `cmd+K` 코드 (`folding.ts` L644, L727, L707, L820, L1003, L1023, L798).
`fontZoomIn/Out`은 기본 키가 아예 없다.

### 포기한 것

`cmd+shift+enter` (Complete Current Statement). VS Code 기본이 `insertLineBefore`이고,
IntelliJ의 "Start new line before current"는 `alt+cmd+enter`라 그쪽을 매핑했다.
Complete Current Statement는 JS/TS 전용 근사 구현이라 기본을 뺏을 가치가 없다.
4절 "언어별 부분 지원"으로 이동.

### v1.2.0 실측 결과 (완료)

| 키 | VS Code 기본 | 소스 | 처리 |
|---|---|---|---|
| `shift+cmd+]` / `shift+cmd+[` | `nextEditor` / `previousEditor` (secondary) | `editorActions.ts` L1279, L1327 | 명시적 재등록 |
| `cmd+,` | Open Settings | `preferences.contribution.ts` L238 | 스킵 (no-op) |
| `cmd+up` / `cmd+down` | **`cursorTop` / `cursorBottom`** (mac override) | `coreCommands.ts` L1248, L1292 | **유지, IntelliJ 액션 포기** |
| `cmd+[` | `editor.action.outdentLines` | `linesOperations.ts` L645 | 뺏음 (`canNavigateBack` 게이트) |
| `f7` / `shift+f7` | `wordHighlight.next` / `.prev` | `wordHighlighter.ts` L936, L951 | 우리 debugging keymap이 이미 점유 중이었음 (미문서화 → 문서화) |
| `alt+space`, `cmd+y`, `ctrl+h`, `ctrl+alt+h`, `ctrl+m`, `cmd+u`, `f4`, `ctrl+alt+up/down`, `ctrl+left/right` | 미검출 | — | 안전하게 추가 |

**언어 중립화 성공**: `ctrl+h`를 k--kato의 Java 전용 `java.action.showTypeHierarchy` 대신
코어의 `editor.showTypeHierarchy` + `editorHasTypeHierarchyProvider`로 바인딩
(`typeHierarchy.contribution.ts` L179, L29). 3절의 미확인 항목이 해소됐다.

`editor.action.previewDeclaration`은 `editor.action.peekDefinition`의 별칭
(`goToCommands.ts` L372). 정식 ID를 쓴다.

### 다음 마일스톤에도 같은 절차를 적용할 것

~~v1.3.0(Refactoring) 착수 전 확인 대상~~ → **2026-08-20 실측 완료.** 결과는 아래
v1.3.0 절에 있다. 예상대로 본체는 키 충돌이 아니라 kind 매핑이었고, 24칸 매트릭스를
채우는 대신 **TypeScript가 낼 수 있는 kind를 전수 열거**하는 쪽이 결정적이었다
(`microsoft/TypeScript@v5.9.2 src/services/refactors/`, 16개 파일). 계획 6건 중
3건이 "키가 겹쳐서"가 아니라 "그 리팩터링이 존재하지 않아서" 탈락했다.

~~다음 마일스톤(v1.4.0) 착수 전 확인 대상~~ → **전부 해소.** `ctrl+r` 은 v1.4.0 에서
`workbench.action.openRecent` 점유로 실측됐고(`windowActions.ts` L304), 기능이 이미
`cmd+e` 에 있어 대체했다. `cmd+n`(Generate)은 v2.1.0 에서 확정 제외했다. 4절 참조.

Refactoring 카테고리 분모가 11에서 14로 늘어난 것은 재집계 차이다. k--kato의
`ctrl+o` / `ctrl+i`는 `editor.action.codeAction` + `args.kind` 형태라 커맨드 이름
기준 분류에서 빠져 있었다.

## 3. 마일스톤

기존 갭 분석의 "새 카테고리 불필요" 결론은 데이터와 맞지 않는다. Run/Build와 Workbench는
커버율 0%이고 대응 토글이 없다. **`enableRunKeymap`, `enableWorkbenchKeymap`,
`enableDiffKeymap` 3개 추가가 필요하다.**

| 버전 | 내용 | 건수 | 시간 | 누적 커버율 |
|---|---|---|---|---|
| ~~v1.1.0~~ | ✅ **완료 (2026-05-11)**. Editing 필수. 34 엔트리 추가 | 27 | 실제 ~3h | **55.4%** |
| ~~v1.2.0~~ | ✅ **완료 (2026-05-11)**. Navigation + Search. 23 엔트리 추가 | 23 | 실제 ~2h | **67.5%** |
| ~~v1.3.0~~ | ✅ **완료 (2026-08-20)**. Refactoring. 4 엔트리 추가 + 죽은 키 2건 수정 | 6 중 4 | 실제 ~2h | **69.4%** |
| ~~v1.4.0~~ | ✅ **완료 (2026-08-21)**. Run 신설 + Debugging 마감 + Vim 공존 | 6 | 실제 ~2h | **73.2%** |
| ~~v1.5.0~~ | ✅ **완료 (2026-08-21)**. ToolWindow + VCS + Diff와 Workbench 신설 | 17 중 11 | 실제 ~2h | **79.6%** |
| ~~v2.0.0~~ | ✅ **완료 (2026-08-21)**. numpad 미러 13 + 토글 구조 정리(BREAKING) + 이관 가이드 | 17 중 13 + 정리 | 실제 ~2h | **87.9%** |
| | | **96** | **21~27h** | |

### v1.1.0 — Editing 필수 (27건, 3~4h)

폴딩 7: `cmd+-` `cmd+=` `cmd+alt+-` `cmd+alt+=` `cmd+shift+-` `cmd+shift+=` `cmd+.`
단어 6: `alt+left` `alt+right` `alt+shift+left` `alt+shift+right` `alt+backspace` `alt+delete`
줄 5: `cmd+x` `cmd+delete` `shift+enter` `alt+cmd+enter` `cmd+shift+enter`
커서 2: `cmd+home` `cmd+end`
선택 3: `ctrl+g` `ctrl+shift+g` `shift+cmd+8`
기타 4: `shift+ctrl+.` `shift+ctrl+,` `f1` `cmd+f1`

신규 설정: `customIntellijNav.useCamelHumpsWords` (default false).
이것 없이는 단어 이동 6건이 각각 2개 엔트리를 가질 수 없다.

`cmd+.`은 VS Code 기본이 Quick Fix다. `.claude/conventions.md`가 이미 금지 조항으로
못 박아뒀으니 넣으려면 CHANGELOG에 BREAKING 표기 필수.

### v1.2.0 — Navigation + Search (23건, 4~5h)

Quick definition 2: `alt+space` `cmd+y`
심볼/계층 4: `cmd+alt+o` `ctrl+alt+h` `ctrl+h` `ctrl+m`
이동 8: `cmd+[` `cmd+down` `cmd+up` `cmd+shift+e` `ctrl+left` `ctrl+right` `shift+cmd+[` `shift+cmd+]`
언어 한정 3: `cmd+shift+t` `cmd+u` `ctrl+shift+b`
소스 1: `f4`
검색 5: `cmd+g` `cmd+shift+g` `alt+cmd+f7` `ctrl+alt+down` `ctrl+alt+up`

k--kato는 `ctrl+h`에 Java 확장 전용 `java.action.showTypeHierarchy`를 쓴다. 우리는
built-in `references-view.showTypeHierarchy`로 언어 중립화할 수 있다. `cmd+b`를
`intellij.goToDeclarationOrUsages`로 감싼 것과 같은 패턴이다.

### ~~v1.3.0 — Refactoring~~ ✅ 완료 (2026-08-20, 실제 ~2h)

**출하**: `ctrl+t`(Refactor This) `ctrl+o`(Override) `ctrl+i`(Implement)
`f6`(Move, 죽은 키 수정) + `ctrl+alt+i`(Auto-Indent Lines, Editing).

**제외 3건, 근거**: TypeScript가 내는 refactor kind를 전수 열거한 결과
`refactor.extract.field`, `refactor.change.signature`,
`refactor.introduce.parameter`가 **존재하지 않는다**. 셋 다 어느 언어에서도
실측되기 전까지 등록하지 않는다. `cmd+alt+f`는 추가로 macOS의 Replace 키
(`editor.action.startFindReplaceAction`, `findController.ts` L1011)라 점유 비용까지
발생한다. k--kato는 셋 다 바인딩하고 있고, TypeScript에서 전부 죽은 키다.

**부수 수확, 자체 버그 2건**:
1. `f6` → `workbench.action.files.move`는 **존재하지 않는 커맨드**였다. v1.0.0부터
   아무 동작도 안 하면서 기본값 `workbench.action.focusNextPart`만 뺏고 있었다.
2. `inline`의 TS 체인 끝에 있던 `refactor.rewrite` 폴백이 `apply: "ifSingle"`과
   맞물려 무관한 리팩터링을 자동 적용했다. Inline을 눌렀는데 화살표 함수 중괄호가
   바뀌는 식이다.

교훈 두 가지는 `.claude/conventions.md`에 규칙으로 올렸다: "커맨드가 실존하는지
확인하고 키를 걸어라", "kind 체인은 좁게 유지하라".

**~~미해결로 남긴 것: `cmd+n`(Generate)~~** → **2026-08-21 확정 제외.** 4절 참조.
`editor.action.sourceAction` 폴백도 답이 아니었다. TS 의 `source.*` 는
`source.fixAll.ts` 와 `source.removeUnused.ts` 뿐이라(`fixAll.ts` L130, L152)
Generate 가 아니라 정리 액션이다. 그리고 유일한 Generate 계열인
`refactor.rewrite.property.generateAccessors` 는 이미 `ctrl+t`(Refactor This)에서
나온다. 키를 새로 걸 이유가 없다.

### ~~v1.4.0 — Run 신설 + Debugging 마감~~ ✅ 완료 (2026-08-21, 실제 ~2h)

**출하**: Run 카테고리 신설(`cmd+f9` Build, `ctrl+alt+r` Run…, `ctrl+r` Run last) +
Debugging 3건(`ctrl+alt+d` Debug 설정, `alt+f8` Evaluate Expression,
`cmd+shift+f8` View Breakpoints). 신규 설정 `enableRunKeymap`.

**부가 작업 완료**: 기존 Debugging 8건 전부 `debugState == 'stopped'` /
`inDebugMode && !focusedSessionIsAttach` / `debuggersAvailable` 로 정밀화했다.
디버그 세션 밖에서 `f7`/`f8`이 VS Code 기본값으로 되돌아온다.

**측정 방법론 교체**: v1.1.0~v1.3.0은 개별 소스 파일을 curl로 받아 grep했다.
이번에 그게 틀린 답을 냈다. `alt+f8`이 0건으로 나와 "미점유"로 출하될 뻔했는데,
실제로는 `editor.action.marker.next`다(`gotoError.ts` L202). 파일을 안 받았을 뿐이었다.
이제 전체 체크아웃(`--filter=blob:none --sparse --depth=1`, .ts 11,832개)으로 측정하고,
0건 결과에는 항상 양성 대조군을 붙인다. 상세는 `.claude/conventions.md`.

### ~~v1.5.0 — ToolWindow + Workbench + Diff~~ ✅ 완료 (2026-08-21, 실제 ~2h)

**출하 11건**: ToolWindow 3(`cmd+7` Structure, `cmd+shift+'` 최대화, `shift+escape`
활성 도구창 숨김 3엔트리) + VCS 2(`ctrl+alt+shift+↓/↑` 다음/이전 변경) +
Diff 신설 3(`f7`/`shift+f7` 다음/이전 차이, `ctrl+shift+tab` 반대편 포커스) +
Workbench 신설 3(`cmd+shift+c` Copy Path, `shift+f12` 레이아웃 복원,
`ctrl+cmd+f` 전체화면 명시 재등록). 신규 설정 `enableDiffKeymap`, `enableWorkbenchKeymap`.

**미출하 6건, 근거**:
- `cmd+s`(Save All): `formatOnSave` / `codeActionsOnSave`가 열린 전 파일에 걸려 diff 오염.
  로드맵 권고대로 제외. 충실도보다 안전이 우선이다.
- `cmd+;`(Project Structure): `⌘;`는 단일 키가 아니라 **chord 접두**다.
  `KeyChord(⌘;, A)` = Run All Tests 외 5건이 이 접두에 매달려 있다(`testExplorerActions.ts`).
  단독 바인딩은 커맨드 하나가 아니라 계열 전체를 죽인다.
- `ctrl+\``(Quick Switch Scheme): macOS Toggle Terminal(`terminal.contribution.ts` L129).
  Select Theme은 이미 `⌘K ⌘T`에 있다.
- `ctrl+tab`(Switcher): VS Code의 `⌃⇥`가 이미 스위처다. 추가할 게 없다.
- `cmd+,`(Preferences): 이미 `openGlobalSettings`. v1.2.0과 같은 no-op 판정.
- `alt+tab` / `shift+alt+tab`: macOS 앱 스위처가 OS 레벨 선점. **4절 영구 제외로 이동 완료.**

**변위 2건**: `shift+f12`가 Go to References를, `cmd+shift+c`가 외부 터미널 열기를 가져간다.
전자는 Find Usages가 이미 `alt+f7`(IntelliJ 키)에 있고, 후자는 에디터 밖에서만 발화한다.

**§6 미확인 #2 해소**: GitLens는 `⌃⌥⇧↑/↓`를 점유하지 않는다. 키바인딩 59건 전수 확인,
전혀 다른 chord 집합을 쓴다(`cmd+alt+g` 계열 + `alt+` 계열).

**계측기 수정**: 커버율 chord 비교가 문자열 그대로여서 modifier 순서가 다른 같은 chord를
서로 다르게 셌다. 1절 참조.

### ~~v2.0.0 — 완전 대체 선언~~ ✅ 완료 (2026-08-21, 실제 ~2h)

**numpad 미러 14건**: 폴딩 6, 주석 2, ToolWindow 5, Workbench 1. 기계적 배치, 기능 신규 없음.

**니치 3건 스킵 확정**: `enter`, `tab`, `ctrl+enter`. k--kato 매핑을 확인하니
suggestion accept와 notebook 셀 실행이고, VS Code 기본과 사실상 동일하다.
`cmd+numpad_separator`(= `cmd+,`)도 같은 이유로 제외해 실제 numpad는 14건이 아니라 13건이다.

**구조 정리 (BREAKING의 핵심) — 완료**. 이중 축을 하나로 접었다.
- 기능 카테고리 토글 11개(전부 default false) + **기능 토글 1개**
  `enableGoToDeclarationOrUsages`(default **true**). `cmd+b`는 키맵 리맵이 아니라
  이 익스텐션 자체 커맨드이므로 카테고리가 아니라 기능으로 분류하는 게 맞다.
- 구 토글 2개는 **선언을 유지하고 계속 인정**한다. 이동한 15건은
  `(새 카테고리 || enableExtendedMacKeymap)`, `cmd+b`는
  `enableGoToDeclarationOrUsages && enableBundledMacKeymap`. 덕분에
  기존 설정이 명시적으로 true든 false든 동작이 완전히 보존된다. 3.0.0에서 제거.

**부수 수확 — 미문서 변위 4건**: 전 chord 154개를 전체 소스와 대조해서
`cmd+b`(Toggle Primary Side Bar), `cmd+1`(Focus First Editor Group),
`cmd+0`(Focus into Primary Side Bar), `cmd+9`(lastEditorInGroup 보조키)를 찾았다.
전부 v1.0.0부터 출시돼 있었고 README에 한 줄도 없었다. 다만 이 스윕은
스코프 판별을 못 하므로(104건 겹침 중 대부분이 chat/terminal 한정) **후보 목록**이지
판정이 아니다. 이 4건은 개별로 읽어 확인했다.

**문서 — 완료**: README에 `Migrating to 2.0.0`(설정 대응표),
`Migrating off k--kato`(활성화 → 제거 → 롤백 순서 + 카테고리 대응표),
`Coverage and what is deliberately missing`(19건 전수와 사유) 신설.
중복되던 구 "If you also use k--kato" 절은 흡수해 삭제했다.

## 4. 영구 제외 (구현 불가)

k--kato는 `src/package-with-comment.json`에서 **45개 IntelliJ 액션을 `"command": ""` 로
비워둔 채** 유지한다. 그중 우리가 6개를 이미 채웠다. 아래는 구조적으로 불가능한 것만 추렸다.

### VS Code 키바인딩 문법 한계

| IntelliJ 액션 | 키 | 이유 |
|---|---|---|
| Search Everywhere | `shift shift` | 순수 modifier는 keybinding 이벤트를 발생시키지 않아 double-tap 감지 불가. `cmd+shift+space`로 우회 중 |
| Run Anything | `ctrl ctrl` | 위와 동일 |
| Brief Info | `cmd+mouseover` | `contributes.keybindings`는 키보드 전용, 마우스 제스처 등록 불가 |
| Goto next/prev splitter | `alt+tab`, `shift+alt+tab` | macOS 앱 스위처가 OS 레벨에서 선점. **v1.5.0에서 확정 제외** |
| Generate | `cmd+n` | TS 의 Generate 계열 kind 는 `refactor.rewrite.property.generateAccessors` 하나뿐이고 커서가 프로퍼티 위에 있어야 한다. `cmd+n` 을 걸면 대부분의 위치에서 아무것도 안 하면서 New Untitled File 만 막는다. 해당 기능은 이미 `ctrl+t`(Refactor This)에서 나온다. **v2.1.0 에서 확정 제외** |
| Move Caret to Previous/Next Method | `ctrl+up`, `ctrl+down` | VS Code에 대응 커맨드 부재(전수 확인) + macOS Mission Control 선점. **v2.0.1에서 제거** |

### IntelliJ 전용 서브시스템 (VS Code에 대응 개념 없음)

Live Template (`cmd+j`, `cmd+alt+j`), Surround with (`cmd+alt+t`), Postfix completion,
Search/Replace structurally (`cmd+shift+s`, `cmd+shift+m`), Inspect with profile (`alt+shift+i`),
Add to Favorites (`alt+shift+f`), Smart completion (`ctrl+shift+space`), Context info (`ctrl+shift+q`),
Paste from recent buffers (`cmd+shift+v`), Method hierarchy (`cmd+shift+h`),
Bookmarks 전체 (`f3`, `alt+f3`, `ctrl+0`, `cmd+f3`), Safe Delete (`cmd+delete`),
External Doc (`shift+f1`), View recent changes (`alt+shift+c`), Synchronize (`cmd+alt+y`).

Bookmarks는 서드파티 확장 필수 의존이 되어 self-contained 원칙에 위배되므로 제외.

### 언어별 부분 지원

Extract Field (`cmd+alt+f`), Change Signature (`cmd+f6`), Go to Test (`cmd+shift+t`),
Go to super-method (`cmd+u`), Complete Current Statement (`cmd+shift+enter`).
전 언어 클론 불가. 지원 언어에만 등록하는 방식으로 축소.

## 5. 위험 요소

### VS Code 기본 키 충돌

**확정** (conventions.md에 명문화됨)

| 키 | VS Code 기본 | 넣으려는 것 | 대응 |
|---|---|---|---|
| `cmd+.` | Quick Fix | Toggle Fold | 플래그 없이 금지. BREAKING 표기 필수 |

**높은 확률로 충돌 (실측 대기)**

| 키 | 추정 기본 | 넣으려는 것 | 위험도 |
|---|---|---|---|
| `cmd+s` | Save (단일) | Save All | **최상**. formatOnSave가 열린 모든 파일에 걸려 diff 오염 |
| `ctrl+\`` | Toggle Terminal | Select Color Theme | **최상**. 터미널 토글 상실은 즉시 체감 |
| `f1` | Show All Commands | Show Hover | **상**. 명령 팔레트 진입점 상실 |
| `cmd+[` / `cmd+]` | Outdent / Indent | Navigate Back / Forward | **상**. k--kato는 명시적으로 제거 처리 |
| `cmd+shift+e` | Show Explorer | Recent files (prev) | **상** |
| `cmd+up` / `cmd+down` | 문서 처음/끝 | Nav Bar / View source | **상**. macOS 텍스트 편집 관례와도 충돌 |
| `ctrl+tab` | Next Recently Used Editor | quickOpenNavigateNext | 중 |
| `cmd+delete` | 줄 시작까지 삭제 | Cut line | 중. IntelliJ에선 Safe Delete라 의미가 3중 |

### macOS OS 레벨 선점

`alt+tab`, `shift+alt+tab` (앱 스위처), `ctrl+left`, `ctrl+right` (Mission Control).

~~`ctrl+up`/`ctrl+down`은 우리가 v1.0.0에서 이미 바인딩 중이고 Mission Control과 겹친다~~
→ **2026-08-21 v2.0.1에서 해소, 두 겹으로 죽어 있었다.**
1. 커맨드 `workbench.action.gotoPrevSymbol` / `gotoNextSymbol`이 **VS Code에 존재하지 않는다.**
   v1.3.0의 `workbench.action.files.move`와 같은 유형이고, 출처는 k--kato도 아니다
   (k--kato는 `ctrl+up/down`을 아예 안 쓴다). v1.0.0에서 우리가 지어낸 이름이다.
2. 이 맥의 `AppleSymbolicHotKeys`에 ID 32/33(Mission Control, Application Windows)이
   **미저장 = 공장 기본값**이라 `⌃↑`/`⌃↓`가 활성이고, macOS가 앱보다 먼저 이벤트를 가져간다.

의도했던 IntelliJ 액션은 *Move Caret to Previous/Next Method*인데 VS Code에 대응 커맨드가
없다(`nextSymbol`/`prevSymbol`/`nextMember` 계열 전수 0건, `outline.*`는 뷰 포커스·접기 전용).
**4절 영구 제외로 이동.** 두 바인딩은 제거했다.

`ctrl+left`/`ctrl+right`는 유지한다. 커맨드가 실존하고 `!terminalFocus` 가드도 이미 있다.
다만 ID 79~82("Move left/right a space")가 `enabled = 1`에 파라미터 오버라이드 없음
(= 기본 할당)이라 같은 선점을 받는다. 시스템 설정에서 끄면 동작한다.
탭 이동은 `⌘⇧[`/`⌘⇧]`에도 있고 그쪽은 macOS가 가로채지 않는다.

### VSCodeVim 충돌 (가장 심각)

| 키 | Vim 용도 | 우리 계획 |
|---|---|---|
| `ctrl+d` | 반 페이지 아래 | **v1.0.0에서 이미 `debug.start`로 사용 중** |
| `ctrl+o` / `ctrl+i` | 점프리스트 | v1.3.0 Override / Implement |
| `ctrl+r` | redo | v1.4.0 reRunTask |
| `ctrl+g` | 파일 정보 | v1.1.0 addSelectionToNextFindMatch |
| `ctrl+t` | 태그 스택 pop | v1.3.0 Refactor This |
| `ctrl+h` | backspace | v1.2.0 Type hierarchy |
| `ctrl+m` | 캐리지 리턴 | v1.2.0 jumpToBracket |

~~v1.2.0~v1.4.0이 Vim 사용자에게 7개 키 동시 충돌~~ → **2026-08-21 해결.**
실제 충돌은 9건이었다(`ctrl+j`, `ctrl+r` 추가). VSCodeVim이 점유 키마다 컨텍스트 키를
발행한다(`configuration.ts` L198의 `VSCodeContext.set(\`vim.use${boundKey.key}\`, useKey)`).
9건 전부 `!vim.use<C-x>` 게이트를 달았다. Vim 미설치 시 키가 undefined라 우리 것이 발화하고,
Vim이 점유하면 양보하며, `vim.handleKeys`로 되돌려주면 다시 우리 것이 잡는다.
`<`/`>`는 `when` 파서가 허용한다(`scanner.ts` L302, 전용 유닛 테스트 `contextkey.test.ts` L392).
토글을 끄라고 안내할 필요가 없어졌다.

### 되돌리기 어려운 항목

| 키 | 커맨드 | 이유 |
|---|---|---|
| `cmd+alt+z` | `git.revertSelectedRanges` | **이미 v1.0.0 출시됨**. 미커밋 변경을 되돌리며 undo 스택에 안 남을 수 있다. `cmd+z`와 modifier 하나 차이 |
| `cmd+k` | `git.commit` vs `git.commitAll` | **v2.0.0에서도 commitAll로 바꾸지 말 것.** 클론 충실도보다 안전 우선 |
| `cmd+t` | `git.pull` vs `git.sync` | sync는 push까지 수행. 현재 pull 유지가 옳다 |
| `cmd+s` | `saveAll` | 열린 모든 파일에 formatOnSave / codeActionsOnSave |
| `cmd+delete` | `clipboardCutAction` | IntelliJ에선 Safe Delete. 리팩터링 기대하고 눌렀는데 줄이 잘림 |

### 기타

- **k--kato 동시 설치**: 이관 기간 중 59개 chord가 이중 등록된다. 나중에 로드된 쪽이
  이기지만 순서가 보장되지 않는다. README에 "동시 설치 금지"를 v1.1.0부터 명시할 것.
- **git-graph 의존**: `cmd+alt+shift+g`는 유일한 외부 확장 의존. self-contained 주장과
  상충하므로 v2.0.0에서 명시하거나 제거 검토.
- **패키징 사고 전례**: v1.0.0 VSIX에 `global-bundle.pem`(161KB)이 포함돼 배포된 적 있다.
  매 릴리스마다 `vsce ls`로 내용물 확인 (v1.0.1에서 `.vscodeignore` 보강 완료).
- **버전 범프**: conventions.md가 package.json 변경 시 patch 범프를 요구한다. VS Code가
  확장을 캐싱하므로 범프 없이는 VSIX 재설치가 반영되지 않는다.

## 6. 미확인 (추측하지 않고 남김)

1. VS Code macOS 기본 키맵의 정확한 바인딩. 앱 번들이 minify돼 있어 `cursorWordStartLeft`
   문자열 존재만 확인했고 어느 키에 묶였는지는 미확인. 2절 실측 대상.
2. ~~GitLens 실제 키바인딩 목록~~ → **2026-08-21 해소.** 키바인딩 59건 전수 확인,
   `ctrl+alt+shift+up/down` 미점유. 충돌 없음.
3. `references-view.showTypeHierarchy`가 built-in인지 별도 확장인지. v1.2.0 착수 전 확인.

## 참고 파일

- `package.json` (매니페스트)
- `src/refactor/language-action-table.ts` (v1.3.0 확장 지점)
- `.claude/conventions.md` (키 추가 규칙, `cmd+.` 금지, built-in `list.*` 동작표)
- `.planning/todos/pending/2026-04-28-...md` (이전 갭 분석, 집계 단위 다름)
- `../vscode-intellij-idea-keybindings/src/package-with-comment.json`
  (IntelliJ 액션 이름 원본, `"command": ""` 45건이 k--kato의 포기 목록)
