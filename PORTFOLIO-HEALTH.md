# TCFLiCK 6개 사이트 통합 상태 모니터

6개 사이트의 운영 코드/디자인은 변경하지 않고 공개 응답을 점검합니다.

- 대시보드: https://tcflick.com/site-health.html (별도 noindex 페이지)
- 상태 JSON: https://tcflick.com/site-health-status.json
- Workflow: .github/workflows/portfolio-health.yml, 매 6시간 자동 실행과 수동 실행 지원
- 홈페이지·Googlebot HTTP, robots.txt, sitemap.xml, 대표 기능 경로 및 canonical/noindex 확인
- Chromium 320/390/690/1280px 실제 렌더링 점검, 320/690/1280px 스크린샷은 Workflow Artifact에 14일 보관
- 확인된 홈페이지 장애와 SEO/레이아웃 경고를 분리하고 미실행 검사는 미확인으로 표시

**Google Search Console의 실제 색인/색인 제외 건수는 측정하지 않습니다.** 연결 없이 추측해 정상이라고 표시하지 않습니다.

대상 운영 사이트를 자동 수정하거나 복원하지 않습니다. 보고서는 TCFLiCK 저장소의 site-health-status.json만 갱신합니다.

테스트: `node --test scripts/test-portfolio-health.mjs`. GitHub Actions의 Node 22/Playwright 1.56.1/Chrome에서 검사합니다.
