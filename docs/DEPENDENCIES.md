# 의존성 분석과 분리 원칙

분석 기준 main: `b109ee3b897bfebb0b39244458fd5a34d42bc6c9`.
원본 4,813줄(실행 스크립트 한 블록). ES module로 전환하지 않고 classic script의 공통 전역 scope를 유지한다. HTML inline handler/생성된 handler와 기존 전역 lexical bindings를 보존한다. 함수 선언만 이동하는 것으로 초기화 순서를 해결할 수 없는 부분은 기존 top-level 실행문 전체를 app.js에 모았다. 실행문 간 상대 순서도 보존한다.

| 영역 | 주요 의존성 | 처리 |
| --- | --- | --- |
| Supabase | config URL/key; profile.getProfileTokens; sessionStorage | profile 선언 후 sb 생성; 모든 초기 요청 전 생성 |
| 공통 utility | DOM, localStorage; limName은 programs 문구 함수 | 함수 호출 시 해석, 초기 요청 전 모두 정의 |
| 탭/초기화 | records, progress, profile, admin, calculator, programs | app.js 마지막; 기존 handler/MutationObserver/실행 순서 유지 |
| 프로그램/영상 | sb, utils, 관리자 상태 | programs.js; 영상 관리 포함하여 과도한 분리 피함 |
| 기록/ autosave /수정/삭제 | sb, utils, programs, profile 권한, pace | records.js; 원본 카드 closure와 debounce 유지 |
| 반복/파트/I GO U GO | records 내부 파서, utils 시간/단위, pace, LOG_CTX | records.js; _collect/_restore 및 소유행 판정 그대로 |
| 목표 Pace | LOG_CTX, records 반복 세트 파서/상세 parser, sb, programs, progress 범용 날짜 | pace.js; clockSec/WD/shortD는 utils로 이동 |
| Progress/PR/Limiter/Lifting | sb, records 상세 parser, programs, utils, pace | progress.js; renderProgress 내부 session closure 그대로 |
| Pace 분석/상세 | utils, programs, limName, bars/spark/slideToggle | pace.js; progress와 상호 호출은 모든 파일 로드 후 실행 |
| Profile/privacy | sb, records.startEditRecord/Personal 표시, charts, calculator, utils | profile.js; RLS/RPC 그대로 |
| Leaderboard | sb, records Personal/표시, programs, utils | leaderboard.js; renderLeaderboardFor는 원본처럼 내부 함수 |
| Admin | sb, profile token/오류함수, programs 영상, utils 캘린더/escaping | admin.js; editor state와 parser closure 그대로 |
| Calculator | utils KG_PER_LB/단위/애니메이션/아이콘 | weight-calculator.js; 재고 상수의 초기화는 utils 뒤 |
| Chart.js | 외부 Chart 전역; utils 표시; Profile 사용처 | charts.js; CDN URL/버전 불변 |
| PWA | 초기 load 이벤트; worker shell URL | app.js 등록, sw.js 기존 network-first 정책 유지 |

로드 순서는 PROJECT_CONTEXT.json의 script_load_order에 명시했다. `async`, `defer`, `type="module"`, IIFE 래핑을 추가하면 전역 접근/실행 순서가 바뀔 수 있다. 함수 파일은 모두 로드된 뒤 app.js가 요청을 시작한다. `getProfileTokens()`를 sb 생성 전에 사용할 수 있다.

이 분리는 책임별 파일 경계를 만든 1차 작업이다. 순환 의존 자체를 제거한 완전한 모듈 설계가 아니다. 그 작업은 API/상태 격리 및 운영 검증을 갖춘 별도 단계에서 수행해야 한다.
