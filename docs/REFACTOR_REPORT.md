# JOGYM NOTE 안전 리팩터링 작업 보고

작업 기준: main `b109ee3b897bfebb0b39244458fd5a34d42bc6c9` (2026-10-07 확인).
작업 브랜치: `refactor/modularize-frontend`.
원본 백업 브랜치: `backup/pre-refactor-20261007-b109ee3`.

**1차 코드 분리는 로컬 작업 브랜치에서 완료했다. 원격 main과 운영 사이트는 변경하지 않았다. GitHub 연결의 브랜치 생성 요청은 403 `Resource not accessible by integration`으로 거절됐으며, git push도 인증 수단이 없어 실패했다. 따라서 원격 백업/작업 브랜치와 PR은 생성하지 못했다. 제공한 Git bundle에 원본과 작업 브랜치가 모두 포함된다.**

## 1. 변경 파일과 새 구조

원본 index.html 4,813줄 → 156줄. HTML은 원래 구조 그대로다. CSS와 JS를 외부 파일로 옮겼으며 최종 HTML에서 classic script를 순서대로 로드한다. React/TypeScript/빌드 시스템/새 앱 dependency를 도입하지 않았다.

| 파일 | 역할 / 이동한 주요 함수 |
| --- | --- |
| index.html | 기존 화면 구조·문구·inline 속성, 기존 CDN 및 순서가 있는 JS 파일 목록 |
| css/style.css | 원본 style 블록 그대로, 반응형/다크 테마 포함 |
| js/config.js | SUPABASE_URL, SUPABASE_KEY |
| js/supabase.js | getBruteTokens, const sb, 기존 x-brute-tokens fetch |
| js/utils.js | todayStr, reveal/revealToggle/fadeSwap, collapsible/slideToggle, icons, escapeHtml/escapeAttr, toKg/fromKg/formatWeight, 단위 설정, WD/clockSec/shortD/wdOf/limName, buildCalendarPicker |
| js/programs.js | stripLabelPrefix/isSameLabel/splitPrescribedLines/formatPrescribed, extractMovementName/normMv, 영상 조회/장식/관리, ITEM_TYPES |
| js/charts.js | cssVarRaw, buildGlassLineChart |
| js/records.js | loadDatesForLog/renderLogForm/buildWhoBar, parseRestSec/parseCapSec, buildMultiPartCard/buildRepeatSetCard, igugMoves, Personal, attachAutosave/saveCard/flushLogSaves, collectProgramCard/restoreProgramCard/restoreLogRecords, startEditRecord |
| js/pace.js | paceRates/paceStats/pacePattern/paceCoach/paceChanged/paceTol/paceDetailHtml, suggestTargetPace |
| js/progress.js | PROGRESS_RANGE, mvCat/spark/bars/progCard/progHead, renderProgress, PR/Pace session/baseline/Limiter/Lifting/같은 처방 비교 |
| js/profile.js | renderProfileList/showProfileDetail/renderProfileBody/showProfileItemDetail, token/privacy/PIN 함수, buildDateLookupBox, key lift graph/이력 저장·수정 함수 |
| js/leaderboard.js | renderBoard 및 그 안의 renderLeaderboardFor |
| js/admin.js | ADMIN_SEC/showAdminSection/renderAdminPinList/unlockAdmin, setInputMode, validateProgramItems/extractJsonArray/callParseFunction, editor 상태/렌더링/프로그램 관리 |
| js/weight-calculator.js | round1/formatBothUnits, BAR_INVENTORY/PLATE_INVENTORY, calcPlatesForWeight/buildBarbellVisual/initFloatingWeightCalc |
| js/app.js | switchTab, 기존 이벤트 연결/MutationObserver, 초기 switchTab('log')와 계산기 실행, service worker 등록 |
| sw.js | cache v45 → v46(CSS 단계) → v47(JS 단계), 새 정적 파일 precache. 기존 install/activate/fetch 정책 보존 |
| PROJECT_CONTEXT.json | 기존 Netlify/프론트 비밀번호 설명 갱신, 실제 구조·인증·storage·데이터·알고리즘·배포 주의사항 |
| docs/DEPENDENCIES.md | 선언/실행 순서와 기능별 의존성 |
| docs/POTENTIAL_ISSUES.md | 발견했으나 수정하지 않은 코드 |
| docs/REFACTOR_REPORT.md | 본 보고서 |
| tests/refactor.test.cjs | npm 없이 Node 기본 테스트로 원본 동일성/계산/파싱 검사 |
| tests/extraction-map.json | 원본 코드와 각 분리 파일의 문자열 위치 대응 |
| tests/browser-parity.cjs | 선택적 Playwright fixture 비교 및 PWA 업데이트 검증 |
| tests/README.md | 실행 방법, 번들 해시, 검증 환경·제한 |

`manifest.json`, icon 3개는 수정하지 않았다. Supabase 서버 파일/schema/RLS/데이터는 수정하지 않았다.

## 2. 내부적으로 정리한 부분

- 함수 본문은 다시 작성하지 않았다. 전역 상태와 생성된 DOM handler 이름을 유지했다.
- 원본 top-level 실행문을 app.js로 모아 기존 실행문 간 상대 순서를 유지했다. 모든 기능 선언 및 sb 생성이 완료된 뒤 초기 요청을 시작한다.
- 함수 호출에서 늦게 해석되던 의존은 공통 classic script scope로 보존했다. supabase.js는 Profile 토큰 함수 정의 후에 로드한다.
- 모든 CSS 문자열을 그대로 이동했다. JavaScript cssText/inline style의 class 전환은 하지 않았다.
- renderProgress 내부의 session 생성/분석/렌더링 closure는 그대로 유지했다. 재사용 Pace 함수와 목표 함수는 pace.js로 이동했다.

2차 함수 내부 분해/inline style 정리는 진행하지 않았다. 실제 운영 RPC/RLS 및 사용자의 PWA 설치 상태는 직접 검증할 수 없는 상태이므로, 1차의 코드 동일성 보장을 유지하는 데 범위를 한정했다. 책임별 파일 경계는 정리했지만 전역 상태와 순환 의존까지 제거한 구조는 아니다.

## 3. 보존한 계약

- RPC: admin_login, profile_unlock, can_access, profile_set_private, profile_set_public, profile_change_pin, admin_reset_profile, brute_logout. 이름·인자·호출 조건 모두 동일하다.
- Storage: localStorage `bruteLogName`, `bruteProfileTokens`, `bruteAutosaveSeen`, `weightUnit`; sessionStorage `bruteAdminToken`.
- DB query, INSERT/UPDATE/DELETE payload, autosave debounce와 소유행 판정, PIN·관리자 gate 흐름을 보존했다.
- `§{...}` 상세 JSON, 일반 메모, skipped, weight/for_time/reps/calories/distance/status, 라운드/파트/IGUG/Personal 형식과 기존 kg 저장을 보존했다.
- Pace CV/slope/firstExcess/drop/halfGain, baseline ±2%, 목표 성공 후 base × 0.985, target tolerance 모두 기존 코드와 같다.
- PR 및 Limiter 계산, 추정 1RM, 프로그램 타입/파싱, 원판 재고 및 DP 계산을 보존했다.

## 4. 검증 결과

### 정적·순수 함수

`node --test tests/refactor.test.cjs`: **6개 테스트 모두 통과**.

- 분리 파일의 코드 조각을 원래 순서로 재조립하여 원본 JavaScript와 완전히 일치함을 확인했다.
- 스타일과 script를 HTML에 다시 넣으면 원본 HTML 전체와 완전히 일치한다. 코드 누락/추가/문구 변경을 함께 검출한다.
- 모든 JS 구문 검사, 전체 연결 script 구문 검사, 함수 본문 동일성, manifest/icons 동일성, service worker 이벤트 본문 동일성.
- 410개 고정/seeded Pace 입력을 양방향 지표로 비교. null/0/음수/빈 배열/짧은 배열을 포함한다.
- 시간/Rest/Cap 파싱, kg/lb 변환, § 상세 복원, 원판 조합, 처방 변경 감지, 프로그램 JSON 파싱/13개 타입 검증, 반복 세트/IGUG 등의 helper 비교.

### Chromium fixture 비교

운영 Supabase 요청은 전혀 보내지 않았다. 실제 Supabase UMD client와 Chart.js 4.4.1을 사용하되 REST/RPC 응답과 모든 쓰기는 가상 DB에 한정했다. 원본과 리팩터링본을 같은 날짜/시간대/폰트/데이터로 비교했다.

- 390px: **36개 DOM/배치/데이터 비교**, 주요 화면 스크린샷 **4개 픽셀 동일**.
- 1440px: **36개 DOM/배치/데이터 비교**. 데스크톱 스크린샷은 소프트웨어 렌더링 시간 제한으로 제외하고 DOMRect/computed style을 비교했다.
- GET query 내용·횟수·토큰 헤더, 쓰기/RPC 요청 순서와 payload 비교.
- 브라우저 page error 및 console error 없음.
- 계산기 패널은 확장 완료와 동일한 focus/scroll 상태에서 비교했다. 초기에 자동 포커스 스크롤/hover 때문에 발생한 캡처 차이는 테스트 상태를 동일하게 맞춰 해결했다. 앱 코드 변경은 없었다.

| 요청한 확인 항목 | 검증 범위 |
| --- | --- |
| 1 초기 로딩 | 원본/분리본 fixture 초기화, 구문, 외부 파일 로드 |
| 2 모든 탭 | log/Progress/Profile/Admin 전환 |
| 3 프로그램 조회 | 날짜/항목/카드 렌더링과 REST 요청 비교 |
| 4 Profile 선택 | 이름 입력 후 저장/폼 재렌더링 |
| 5 WOD 입력 | 무게/시간/개수/거리/완료/라운드 입력 |
| 6 autosave | 실제 debounce 저장과 flush, INSERT→조회→DELETE 비교 |
| 7 기존 기록 복원 | 저장·복원 후 DOM/입력값 및 데이터 비교 |
| 8 기록 수정 | startEditRecord의 UI 저장, PATCH payload |
| 9 기록 삭제 | 기존 삭제 버튼/확인, DELETE payload |
| 10 weight | 225lb 입력, kg 저장, 복원/표시 |
| 11 For Time | 5:42 입력, 저장·복원 |
| 12 반복 Finish/Split | 누적 Finish 입력 → Split 및 기록 형식 비교 |
| 13 Rest | 2:30/5:00 휴식의 다음 시작/Split, parser 테스트 |
| 14 목표 Pace | 실제 추천 경로, 60초 기준 목표 성공 후 59초 추천 확인 |
| 15 I GO U GO | 모드/완료/중단/추가 reps 입력과 상세 JSON |
| 16 Progress | 최근 4주/전체 DOM 및 데이터 비교 |
| 17 PR | 기존 기록 및 새 무게/거리 기록에서 계산/렌더링 동일성 |
| 18 Pace | session/baseline/상세 DOM, 순수 계산 비교 |
| 19 Limiter | 반복 lim 선택 fixture의 계산/렌더링 |
| 20 Lifting | weight/RM 기록, 프로필 표시/계산 코드 동일성. 실제 key_lift_history 쓰기는 미검증 |
| 21 Profile 조회 | 명단/공개 상세/단위 변경 |
| 22 공개 Profile | 공개 조회 및 기존 기록 |
| 23 비공개 Profile | 잠금 화면 및 can_access fixture 응답 |
| 24 PIN unlock | 실패/성공 RPC, 토큰 저장/요청 헤더 |
| 25 관리자 로그인 | 실패/성공 RPC, 토큰/패널/PIN 관리 조회 |
| 26 Leaderboard | 기존 renderBoard를 호출해 날짜·순위 렌더링 비교. 기존 탭은 여전히 Progress |
| 27 lb/kg | Profile kg 전환, 무게 입력/표시 및 함수 테스트 |
| 28 계산기 | 퍼센트 및 기존 원판 DP/시각화, DOM/배치 비교 |
| 29 Chart.js | 실제 Chart 생성/데이터/파괴와 프로필 관련 코드 보존 |
| 30 PWA | v45→v47 업데이트/activate, 모든 CSS/JS precache, CDN이 캐시된 조건의 offline reload, 기존 storage 유지 |

자동 비교는 운영 PIN/관리자 계정, 서버 RLS policy, 실제 네트워크 장애/동시 저장, 실제 브라우저별 설치 상태를 검증한 것이 아니다.

## 5. 의도적으로 수정하지 않은 문제

상세 위치는 POTENTIAL_ISSUES.md에 정리했다.

- bars의 higherBetter 양쪽 계산식이 동일하다.
- startEditRecord의 DB payload scaled와 메모리 record.scaled의 판정 기준이 다를 수 있다.
- Lifting trend 카드는 기존처럼 생성 후 화면에 붙이지 않는다.
- Leaderboard 함수는 있지만 board 탭은 기존처럼 Progress를 연다.
- service worker의 실패 요청 fallback은 원본처럼 index.html이다.
- Supabase `@2` CDN 버전은 minor/patch 고정이 아니다.
- autosave insert/delete는 기존처럼 여러 요청이며 transaction으로 바꾸지 않았다.

## 6. 동작 차이 가능성과 한계

의도된 사용자 기능/계산/디자인 변경은 없다. 소스 동일성 및 fixture 비교는 이를 지지한다. 다만 새 JS/CSS 요청이 생겨 네트워크 로딩 경로가 바뀐다. **index.html만 배포하면 안 되고 전체 css/js와 sw.js를 함께 배포해야 한다.** 서비스 워커는 새 cache version과 precache 목록을 사용한다.

외부 font는 비교 환경에서 공통 시스템 font를 썼다. 원래 CDN/font URL과 CSS는 그대로다. 실제 Pages의 경로/MIME/CDN 접근 및 모바일 PWA 업데이트는 병합 전후 사람이 확인해야 한다. 실제 배포와 production end-to-end까지 완료했다고 주장하지 않는다.

## 7. 추가 권장 사항

이번 변경에 포함하지 않았다.

1. 스테이징 Supabase 또는 테스트 전용 이름으로 RLS/RPC/쓰기 실패 시나리오를 검증한다.
2. 운영 확인 후 renderProgress의 Pace session 생성·분석·렌더링을 별도 순수 함수로 분해한다.
3. 기존 비교 fixture를 확장해 개인 운동/다중 머신 칼로리/권한 만료/동시 autosave/다양한 legacy 기록을 추가한다.
4. 동일 inline style 정리는 화면 캡처 비교를 동반한 별도 커밋으로 진행한다.
5. Potential Issues는 별도 bugfix PR로 다룬다. CDN 버전 고정/전역 상태 격리도 분리한다.

## 8. main 병합 전 사람이 직접 확인할 항목

- 테스트 환경에서 실제 PIN 성공/실패/변경/공개 전환/로그아웃, 관리자 로그인/권한 만료/PIN 초기화. 운영 사용자의 PIN은 임의로 바꾸지 않는다.
- 테스트용 프로필에 weight/For Time/라운드/칼로리/거리/상태/Personal/생략/멀티파트/IGUG를 입력하고 저장·수정·삭제·재접속 복원.
- 대표 실제 기록의 Progress PR/Pace baseline/target/상세/Limiter 및 프로필/그래프를 현재 운영 화면과 대조.
- 실제 key lift/history 저장·수정/삭제 및 차트.
- 프로그램 JSON/AI 파싱·편집·게시, 동작 영상 관리. 테스트 날짜를 사용한다.
- GitHub Pages 경로에서 모든 CSS/JS가 200과 올바른 MIME으로 로드되고 콘솔 오류가 없는지 확인.
- Android/iOS 실제 브라우저/홈 화면 PWA에서 기존 설치의 worker 업데이트, 정상 재접속, 캐시된 조건의 오프라인 재로딩, storage 유지.
- 전체 파일이 함께 배포되는지, 원격 main이 이 작업 기준에서 변경됐는지 확인. 운영 변경이 있으면 재비교 후 병합.

## 9. 커밋과 적용

작은 단계: stylesheet + shell → 기능별 JS + shell → context/dependency/issue 문서 → 비교 테스트 → 최종 보고.
모든 기능 파일을 원래 global scope로 연결해야 하므로 JS 분리는 일관된 로드 순서를 갖춘 하나의 변경 단위로 커밋했다. 함수 재작성은 하지 않았다.

제공물의 Git bundle에서 작업 브랜치를 가져오거나, 기준 main 위 별도 브랜치에 format-patch를 적용한다. 소스 snapshot은 배포 파일 전체를 담는다. main 직접 덮어쓰기나 자동 merge/deploy는 하지 않았다. 실행/적용 방법은 제공물 README를 참고한다.
