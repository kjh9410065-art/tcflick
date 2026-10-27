// TCFLiCK portfolio availability + crawl-readiness audit.
// The monitor never edits the target websites or conflates crawl readiness with indexing.
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { SITES } from "./portfolio-sites.mjs";

const BROWSER_UA = "Mozilla/5.0 (compatible; TCFLiCK-PortfolioAudit/1.0)";
const GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";
const TIMEOUT_MS = 18000;

export function extractCanonical(html) {
  const links = String(html || "").match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    if (!rel.split(/\s+/).includes("canonical")) continue;
    return tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || "";
  }
  return "";
}
export function extractRobotsMeta(html) {
  const metas = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  return metas.filter(tag => /\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(tag))
    .map(tag => tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] || "")
    .join(",");
}
export function scanRobots(text) {
  // Parse only an entire "Disallow: /" directive, not partial path exclusions.
  const blocked = /^\s*Disallow:\s*\/\s*$/im.test(String(text || ""));
  return { blocked, sitemap_declared: /^\s*Sitemap:\s*https?:\/\//im.test(String(text || "")) };
}
export function scanSitemap(xml) {
  const source = String(xml || "");
  return {
    url_count: (source.match(/<loc(?:\s[^>]*)?>[\s\S]*?<\/loc>/gi) || []).length,
    is_xml: /<\?xml|<urlset\b|<sitemapindex\b/i.test(source),
    is_sitemap: /<urlset\b|<sitemapindex\b/i.test(source)
  };
}
export function sameCanonical(canonical, url) {
  try {
    const parsed = new URL(canonical);
    const requested = new URL(url);
    return parsed.origin === requested.origin &&
      parsed.pathname.replace(/\/+$/, "") === requested.pathname.replace(/\/+$/, "");
  } catch { return false; }
}
export function statusFromIssues(issues) {
  return issues.some(x => x.level === "error") ? "down" :
    issues.some(x => x.level === "warning") ? "warning" : "ok";
}
function safeMessage(error) {
  return String(error?.message || error || "알 수 없는 통신 오류").slice(0, 180);
}
async function get(url, agent, fetcher) {
  const started = Date.now();
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetcher(url, {
        headers: { "User-Agent": agent, "Accept": "text/html,application/xml,application/json,*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "follow", cache: "no-store"
      });
      const text = await response.text();
      const result = {
        status: response.status, url: response.url || url,
        elapsed_ms: Date.now() - started,
        content_type: response.headers?.get?.("content-type") || "",
        x_robots_tag: response.headers?.get?.("x-robots-tag") || "",
        body: text
      };
      if (response.status >= 500 && attempt < 2) { last = result; continue; }
      return result;
    } catch (error) {
      last = { status: 0, url, elapsed_ms: Date.now() - started, body: "", error: safeMessage(error) };
    }
  }
  return last;
}
function problem(issues, level, code, message, url) {
  issues.push({ level, code, message, url });
}
export async function auditSite(site, fetcher = fetch) {
  const base = site.url.replace(/\/+$/, "");
  const entries = [
    [base + "/", BROWSER_UA],
    [base + "/", GOOGLEBOT_UA],
    [base + "/robots.txt", BROWSER_UA],
    [base + "/sitemap.xml", BROWSER_UA],
    [base + site.sample, BROWSER_UA]
  ];
  const [home, bot, robots, sitemap, sample] =
    await Promise.all(entries.map(([url, agent]) => get(url, agent, fetcher)));
  const issues = [];
  if (home.status !== 200) {
    problem(issues, "error", "homepage_unavailable", "홈페이지 HTTP " + home.status + (home.error ? " (" + home.error + ")" : ""), base + "/");
  }
  if (bot.status !== 200) {
    problem(issues, "warning", "googlebot_unavailable", "Googlebot 요청 HTTP " + bot.status + " — 색인 가능성 점검 필요", base + "/");
  }
  if (sample.status !== 200) {
    problem(issues, "warning", "sample_unavailable", "대표 기능 경로 HTTP " + sample.status, base + site.sample);
  }
  if (home.status === 200 && !/^text\/html/i.test(home.content_type || "")) {
    problem(issues, "warning", "homepage_not_html", "홈페이지 Content-Type이 HTML이 아닙니다.", base + "/");
  }
  const canonical = extractCanonical(home.body);
  if (home.status === 200 && !sameCanonical(canonical, base + "/")) {
    problem(issues, "warning", "canonical", "홈페이지 canonical이 없거나 공식 주소와 다릅니다.", base + "/");
  }
  const robotMeta = extractRobotsMeta(home.body);
  const headerRobots = home.x_robots_tag || "";
  const noindex = /(?:^|[,;\s])noindex(?:[,;\s]|$)/i.test(robotMeta + "," + headerRobots);
  if (noindex) problem(issues, "warning", "noindex", "홈페이지에 noindex가 설정됐습니다.", base + "/");
  const robotPolicy = scanRobots(robots.body);
  if (robots.status !== 200) {
    problem(issues, "warning", "robots_missing", "robots.txt HTTP " + robots.status, base + "/robots.txt");
  } else if (robotPolicy.blocked) {
    problem(issues, "warning", "robots_blocked", "robots.txt에서 전체 경로 수집을 차단합니다.", base + "/robots.txt");
  } else if (!robotPolicy.sitemap_declared) {
    problem(issues, "warning", "robots_sitemap_missing", "robots.txt에 사이트맵 주소가 없습니다.", base + "/robots.txt");
  }
  const mapInfo = scanSitemap(sitemap.body);
  if (sitemap.status !== 200 || !mapInfo.is_sitemap || !mapInfo.url_count) {
    problem(issues, "warning", "sitemap", "사이트맵 검증 실패 (HTTP " + sitemap.status + ")", base + "/sitemap.xml");
  }
  if (bot.status === 200 && /(?:^|[,;\s])noindex(?:[,;\s]|$)/i.test(extractRobotsMeta(bot.body) + "," + bot.x_robots_tag)) {
    problem(issues, "warning", "googlebot_noindex", "Googlebot 응답의 noindex 설정을 확인하세요.", base + "/");
  }
  return {
    id: site.id, name: site.name, url: base + "/", sample_path: site.sample,
    status: statusFromIssues(issues),
    http: { homepage: home.status, googlebot: bot.status, sample: sample.status,
      home_elapsed_ms: home.elapsed_ms, sample_elapsed_ms: sample.elapsed_ms },
    crawl: {
      robots_status: robots.status, robots_blocks_all: robotPolicy.blocked,
      sitemap_status: sitemap.status, sitemap_urls: mapInfo.url_count,
      canonical: canonical || null, homepage_noindex: noindex,
      google_index_status: "unverified"
    },
    responsive: { status: "not_checked", viewports: [] },
    issues
  };
}
export function summarise(report) {
  const sites = report.sites || [];
  return {
    total: sites.length,
    ok: sites.filter(s => s.status === "ok").length,
    warning: sites.filter(s => s.status === "warning").length,
    down: sites.filter(s => s.status === "down").length,
    responsive_checked: sites.filter(s => s.responsive?.status === "ok" || s.responsive?.status === "warning").length
  };
}
export async function main() {
  const now = new Date().toISOString();
  const sites = await Promise.all(SITES.map(site => auditSite(site)));
  const report = {
    schema_version: 1, checked_at_utc: now,
    scope: "six public TCFLiCK-owned websites; HTTP, bot crawl readiness and browser layout",
    google_search_console_connected: false,
    disclaimer: "Google 인덱싱/색인 제외 건수는 Google Search Console 접속 없이 확인할 수 없습니다.",
    sites
  };
  report.summary = summarise(report);
  await writeFile("site-health-status.json", JSON.stringify(report, null, 2) + "\n", "utf8");
  sites.forEach(s => console.log("PORTFOLIO " + s.id + ": " + s.status + " | homepage " + s.http.homepage +
    " | Googlebot " + s.http.googlebot + " | sitemap URLs " + s.crawl.sitemap_urls +
    (s.issues.length ? " | " + s.issues.map(x => x.code).join(",") : "")));
  console.log("Portfolio HTTP audit report created at " + now);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error("Portfolio audit failed:", safeMessage(error)); process.exitCode = 1; });
}
