# IntelliJ Mac 키맵 완전 클론 로드맵

측정 기준: `custom-intellij-nav` v1.0.1, `vscode-intellij-idea-keybindings` v1.7.7.
집계 단위는 **고유 Mac chord** 1개 = 1건. 같은 키에 `when` 절만 다른 엔트리는 1건으로 합산한다.

> 이전 갭 분석(`.planning/todos/pending/2026-04-28-...md`)의 "k--kato 216개 vs 우리 74개"는
> 엔트리 단위 집계라 이 문서와 직접 비교할 수 없다. 이 문서가 최신이며 chord 단위로 재집계했다.

## 1. 현황

| 항목 | v1.0.1 | v1.1.0 | **v1.2.0 (현재)** |
|---|---|---|---|
| 우리 고유 Mac chord | 73 | 102 | **121** |
| k--kato 고유 Mac chord | 157 | 158 | 158 |
| 겹침 (양쪽 보유) | 59 | 85 | **104** |
| 순수 미구현 | 98 | 73 | **54** |
| **커버율** | 37.6% | 53.8% | **65.8%** |

> chord 총계가 157에서 158로 바뀐 것은 재집계 시 필터 차이다. v1.1.0 수치가 최신이다.

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
| Editing | 18 | 53 | 34% |
| Navigation | 14 | 32 | 44% |
| Refactoring | 5 | 11 | 45% |
| ToolWindow | 6 | 14 | 43% |
| Search | 4 | 10 | 40% |
| Debugging | 8 | 11 | 73% |
| VCS | 4 | 6 | 67% |
| Run / Build | 0 | 4 | **0%** |
| Workbench 기타 | 0 | 11 | **0%** |
| Diff / Notebook | 0 | 5 | **0%** |

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

v1.3.0(Refactoring) 착수 전 확인 대상: `ctrl+o`, `ctrl+i`, `ctrl+t`, `cmd+f6`,
`cmd+alt+f`, `cmd+alt+p`의 VS Code 기본 점유 여부. 다만 v1.3.0의 본체는 키 충돌이
아니라 **LSP kind 매핑**이므로, 언어별 지원 매트릭스 실측(TS / Java / Kotlin / Python
× 6액션 = 24칸)이 더 중요하다.

## 3. 마일스톤

기존 갭 분석의 "새 카테고리 불필요" 결론은 데이터와 맞지 않는다. Run/Build와 Workbench는
커버율 0%이고 대응 토글이 없다. **`enableRunKeymap`, `enableWorkbenchKeymap`,
`enableDiffKeymap` 3개 추가가 필요하다.**

| 버전 | 내용 | 건수 | 시간 | 누적 커버율 |
|---|---|---|---|---|
| ~~v1.1.0~~ | ✅ **완료 (2026-05-11)**. Editing 필수. 34 엔트리 추가 | 27 | 실제 ~3h | **53.8%** |
| ~~v1.2.0~~ | ✅ **완료 (2026-05-11)**. Navigation + Search. 23 엔트리 추가 | 23 | 실제 ~2h | **65.8%** |
| v1.3.0 | Refactoring + Generate | 6 (축소 시 3) | 5~7h | 73% |
| v1.4.0 | Run 신설 + Debugging 마감 | 6 | 2~3h | 77% |
| v1.5.0 | ToolWindow + Workbench + Diff | 17 (2건 제외 시 15) | 2.5~3h | 87% |
| v2.0.0 | numpad 미러 + 토글 구조 정리 + 이관 가이드 | 17 + 정리 | 4~5h | 100% (실기능) |
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

### v1.3.0 — Refactoring (6건 → 3건 축소 권장, 5~7h)

`ctrl+o`(Override) `ctrl+i`(Implement) `ctrl+t`(Refactor This)
`cmd+f6`(Change Signature) `cmd+alt+f`(Extract Field) `cmd+alt+p`(Introduce Parameter)

이 마일스톤은 키 추가가 아니라 **LSP kind 매핑 연구**가 본체다.
`src/refactor/language-action-table.ts`의 확장 지점이다.

`cmd+alt+f`는 TS LS가 `refactor.extract.field`를 노출하지 않아 이미 불가 판정.
`cmd+f6`도 LSP 표준 kind가 없다. **뒤 3건은 언어별 지원 매트릭스를 먼저 실측한 뒤
지원 언어에만 등록**하는 방식으로 축소할 것.

### v1.4.0 — Run 신설 + Debugging 마감 (6건, 2~3h)

`cmd+f9` `ctrl+alt+r` `ctrl+r` (Run 신규)
`ctrl+alt+d` `alt+f8` `cmd+shift+f8` (Debugging)

신규 설정: `customIntellijNav.enableRunKeymap`.

**부가 작업**: 기존 Debugging 8건의 `when` 절이 `isMac && config...` 뿐이다.
k--kato는 `debugState == 'stopped'`, `inDebugMode`, `debuggersAvailable`로 정밀 게이팅한다.
디버그 세션 밖에서 `f7`/`f8`이 무의미하게 발화하므로 이 마일스톤에서 함께 강화한다.

### v1.5.0 — ToolWindow + Workbench + Diff (17건, 2.5~3h)

ToolWindow 3: `cmd+7` `cmd+shift+'` `shift+escape`
VCS 2: `ctrl+alt+shift+down` `ctrl+alt+shift+up`
Diff 2: `ctrl+shift+tab` `shift+f7`
Workbench 10: `cmd+s` `cmd+,` `cmd+;` `ctrl+\`` `ctrl+cmd+f` `ctrl+tab` `shift+cmd+c`
`shift+f12` `alt+tab` `shift+alt+tab`

신규 설정: `enableWorkbenchKeymap`, `enableDiffKeymap`.

`cmd+s`(Save All)는 **기본 제외 권장**. 넣더라도 별도 옵트인 설정으로.
`alt+tab` 2건은 macOS 앱 스위처가 선점하므로 4절로 이동 예정 (실측 후 확정).

### v2.0.0 — 완전 대체 선언 (17건 + 구조 정리, 4~5h)

**numpad 미러 14건**: 폴딩 6, 주석 2, ToolWindow 5, Workbench 1. 기계적 배치, 기능 신규 없음.

**니치 3건 스킵 권장**: `enter`, `tab`, `ctrl+enter` (VS Code 기본과 동일하거나 notebook 전용).

**구조 정리 (BREAKING의 핵심)**: `enableBundledMacKeymap`(1건) / `enableExtendedMacKeymap`(15건)
두 토글이 기능 카테고리 8개와 개념적으로 중복된다. `cmd+alt+v`(Extract Variable)는 리팩터링인데
`enableExtendedMacKeymap` 아래 있고, `shift+f6`(Rename)은 `enableRefactoringKeymap` 아래 있다.
토글이 12개에서 15개로 늘어나는 시점에 이 이중 축을 정리하지 않으면 사용자가 어느 토글을
켜야 할지 알 수 없게 된다. 두 토글을 폐기하고 15건을 기능 카테고리로 재배치하되,
`enableBundledMacKeymap`만 default true이므로 마이그레이션 안내가 반드시 필요하다.

**문서**: k--kato 이관 가이드 (설정 키 대응표, 제거 순서, 롤백), 영구 제외 목록 공개, 커버리지 갱신.

## 4. 영구 제외 (구현 불가)

k--kato는 `src/package-with-comment.json`에서 **45개 IntelliJ 액션을 `"command": ""` 로
비워둔 채** 유지한다. 그중 우리가 6개를 이미 채웠다. 아래는 구조적으로 불가능한 것만 추렸다.

### VS Code 키바인딩 문법 한계

| IntelliJ 액션 | 키 | 이유 |
|---|---|---|
| Search Everywhere | `shift shift` | 순수 modifier는 keybinding 이벤트를 발생시키지 않아 double-tap 감지 불가. `cmd+shift+space`로 우회 중 |
| Run Anything | `ctrl ctrl` | 위와 동일 |
| Brief Info | `cmd+mouseover` | `contributes.keybindings`는 키보드 전용, 마우스 제스처 등록 불가 |
| Goto next/prev splitter | `alt+tab` | macOS 앱 스위처가 OS 레벨에서 선점 |

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

`ctrl+up`/`ctrl+down`은 **우리가 v1.0.0에서 이미 바인딩 중**이고 Mission Control과 겹친다.
사용자 환경에 따라 이미 안 먹고 있을 수 있으므로 회귀 확인 대상.

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

v1.2.0~v1.4.0이 Vim 사용자에게 **7개 키 동시 충돌**이다. `when` 절에 Vim 컨텍스트 키를
넣을 수 있는지 조사하거나, README에 해당 토글을 끄라고 명시할 것.

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
2. GitLens 실제 키바인딩 목록 (확장 소스 미보유). v1.5.0 `ctrl+alt+shift+up/down` 충돌 가능.
3. `references-view.showTypeHierarchy`가 built-in인지 별도 확장인지. v1.2.0 착수 전 확인.

## 참고 파일

- `package.json` (매니페스트)
- `src/refactor/language-action-table.ts` (v1.3.0 확장 지점)
- `.claude/conventions.md` (키 추가 규칙, `cmd+.` 금지, built-in `list.*` 동작표)
- `.planning/todos/pending/2026-04-28-...md` (이전 갭 분석, 집계 단위 다름)
- `../vscode-intellij-idea-keybindings/src/package-with-comment.json`
  (IntelliJ 액션 이름 원본, `"command": ""` 45건이 k--kato의 포기 목록)
