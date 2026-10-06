# Potential Issues — 의도적으로 수정하지 않음

아래는 main 원본에도 있던 코드이다. 리팩터링과 버그 수정을 섞지 않았다.

1. `progress.js bars(vals, higherBetter)`: higherBetter의 두 분기 모두 `(x - mn) / (mx - mn)`이다. 방향을 구분하려는 의도인지 확인이 필요하다. 결과는 그대로 유지했다.
2. `records.js startEditRecord`: § 상세 JSON이 있는 기록에서 저장 payload의 `scaled`는 `!!newNotes`, 저장 후 메모리 객체의 `scaled`는 `!!newDetail`이다. 메모가 비어도 상세 JSON이 있으면 두 값이 달라질 수 있다. 고치지 않았다.
3. `progress.js`: Lifting trend `liftCard`를 만들지만 append하지 않는다. 원본 주석은 PR 및 프로필 RM으로 대체하여 숨긴다고 설명한다. 의도된 동작으로 보존했다.
4. `leaderboard.js renderBoard`는 남아 있지만 `switchTab('board')`는 `renderProgress`를 호출한다. 기존 탭 연결을 유지했으며 별도 Leaderboard 진입 기능을 추가하지 않았다.
5. `sw.js`: 동일 origin의 실패한 GET에 파일 종류와 무관하게 캐시된 index.html을 fallback으로 반환할 수 있다. 미캐시 JS/CSS 요청에 HTML이 반환될 가능성이 있다. 원본 정책은 그대로 두고 분리된 정적 파일을 precache에 추가했다.
6. Supabase CDN은 `@2`로 고정되어 있어 minor/patch 갱신이 가능하다. 이번 작업은 기존 URL을 그대로 유지했다. 검증은 실행 시 다운로드한 번들로 수행했다. 버전 고정은 별도 변경이다.
7. 기록 autosave는 기존처럼 새 행 insert 후 기존 소유행 delete를 수행한다. 두 요청을 DB transaction으로 바꾸지 않았다. 중간 실패 시 중복 가능성 등을 별도 검토할 수 있다.
8. 파일 분리 후에도 공통 전역 상태와 양방향 함수 의존이 있다. 책임별 위치만 정리한 것이며 완전한 dependency inversion/상태 격리는 하지 않았다.
