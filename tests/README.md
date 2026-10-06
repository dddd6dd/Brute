# 검증 실행

## 기본 회귀/이동 검증

저장소 루트에서 Node.js 18 이상으로 실행한다. 앱 빌드나 npm 설치가 필요 없다.

```bash
node --test tests/refactor.test.cjs
```

`b109ee3b897bfebb0b39244458fd5a34d42bc6c9` Git 객체가 있어야 한다. 전체 clone 또는 제공된 Git bundle에 들어 있다. extraction-map.json은 원본 top-level statement를 분리 파일의 정확한 문자열 위치에 대응한다. 원본 순서대로 재조립하여 JavaScript/HTML/CSS 전체의 동일성을 검증한다. 이 원본 이동 계약은 향후 의도적인 함수 내부 변경 시 변경 이유와 함께 갱신해야 한다.

## 선택적 브라우저 비교

Playwright와 Chromium은 테스트 도구이며 앱 dependency에 추가하지 않았다. 별도 도구 환경을 사용한다. 테스트 서버가 실제 CDN 주소를 로컬의 동일 번들로 대체하고, 외부 Supabase 요청은 전부 fixture 응답으로 처리한다. 운영 DB에 요청을 보내거나 기록을 변경하지 않는다.

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
SUPABASE_TEST_BUNDLE=/absolute/path/to/supabase.js \
CHART_TEST_BUNDLE=/absolute/path/to/chart.umd.js \
node tests/browser-parity.cjs
```

선택적 환경 변수: `DEBUG_PARITY=1`은 비교 단계 출력, `PARITY_WIDTHS='[390]'`는 폭 선택, `PARITY_OUTPUT_DIR=/absolute/path`는 불일치 스크린샷 저장이다. 전체 실행은 390px/1440px 비교와 PWA 업데이트 테스트를 수행한다.

검증 환경: Node 24.19.0, Playwright 1.62.1, Chromium 153.0.8010.0, Asia/Seoul, 고정 날짜 2026-10-07. 외부 font를 제거하고 두 페이지에 같은 시스템 font를 사용했다. DOM/배치 비교는 유한한 화면 전환 애니메이션이 끝난 상태에서 수행한다. 모바일 스크린샷은 포인터와 포커스를 같은 상태로 정리해 캡처한다. 계산기 패널은 확장 완료 후 같은 내부 스크롤 위치에서 비교한다. 데스크톱은 소프트웨어 렌더링 캡처의 시간 제한 때문에 DOM 및 실제 DOMRect/computed style로 비교한다.

사용한 번들:

- Supabase: 기존 `@supabase/supabase-js@2` UMD 다운로드. SHA256 `59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd`.
- Chart.js 4.4.1 UMD: SHA256 `74401d738dd3e03ee5dfb3b6841210fe2c4ead8a960c4011ca4ba0b78a9fd8f3`.

PWA는 v45 설치 → v47 업데이트/activate 완료 → 분리 파일 precache → 오프라인 재로딩을 확인한다. CDN 번들이 이미 캐시된 조건이다. 첫 방문부터 완전 오프라인인 환경은 원본도 지원을 보장하지 않는다. 실제 Pages의 CDN 연결, 실제 PIN/관리자 계정, 서버 RLS, 휴대폰 홈 화면 설치는 사람 확인이 필요하다.
