# TCFLiCK root SEO check · 2026-10-27

**검증 대상:** TCFLiCK 루트 웹사이트 `https://tcflick.com/`, 게시된 16개 HTML 페이지. 이 보고서는 실제 Google 색인 여부를 확인하는 문서가 아닙니다.

## 저장소에서 확인하는 항목

- 사이트맵 URL 16개 이상의 존재·중복·도메인 범위·HTML 파일 대응
- 각 페이지의 한국어 언어 설정(`ko` 또는 `ko-KR` 모두 유효), 고유한 title 및 description
- 각 페이지의 자기 자신을 가리키는 canonical, 의도하지 않은 noindex 금지, 내용 있는 H1
- 예전 NERDING 도메인으로의 링크 금지
- 문서담 기능을 실제 제공하지 않는 문서 업로드·질의응답 서비스로 설명하지 않도록 검사
- 매일/주기적 GitHub Actions 결과와 `seo-status.json`의 HTTP 200/Googlebot 확인은 **접속·크롤링 가능성**의 근거일 뿐 실제 인덱싱 증거가 아님

로컬 점검: `node --test scripts/test-seo-pages.mjs`, `node scripts/check-seo-pages.mjs`.

## Google Search Console에서 계정 소유자가 직접 확인할 사항

1. [Google Search Console](https://search.google.com/search-console)에서 `tcflick.com` 도메인 속성을 엽니다. 도메인 속성은 연결된 하위 도메인들의 상태도 포함할 수 있으니 특정 URL의 호스트를 구분하세요.
2. 사이트맵 제출 항목에서 **`https://tcflick.com/sitemap.xml`** 상태를 확인하세요. 기존에 정상 제출되어 있다면 같은 사이트맵을 반복 제출할 필요는 없습니다.
3. 상단 URL 검사에서 `https://tcflick.com/` 및 특정 제외 URL을 각각 검사하고, **실제 Google이 선택한 canonical / 크롤링 / 색인 상태**를 확인하세요.
4. 수정 후에도 Google의 자체 판단에 따라 색인되지 않을 수 있습니다. '색인 생성 요청'은 필요한 특정 URL에만 사용하고 색인을 보장하지 않는다는 점을 기억하세요.
5. 모보카의 과거 5xx URL 문제는 별도 속성/URL 목록으로 확인하고, Google Search Console의 수정 확인 절차를 별도로 진행해야 합니다.

계정 접근 권한이 없는 CI나 GitHub 소스 코드 수정만으로 'Google 색인 요청 완료', '검색 순위 상승', '모든 페이지 색인 완료'라고 주장하지 않습니다.
