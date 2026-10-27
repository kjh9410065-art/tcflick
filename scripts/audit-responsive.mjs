// Live Chromium audit: cover-fold, bar phone, unfolded fold and desktop.
// This observes rendered pages without changing application code.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { statusFromIssues, summarise } from "./audit-portfolio.mjs";

const WIDTHS = [320, 390, 690, 1280];
const HEIGHT = 820;
const OUTPUT = ".health-artifacts/screenshots";
function issue(site, code, message, url) {
  site.issues.push({ level: "warning", code, message, url });
}
export async function main() {
  const path = "site-health-status.json";
  const report = JSON.parse(await readFile(path, "utf8"));
  await mkdir(OUTPUT, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
  } catch (error) {
    const message = "Chromium 실행 실패: " + String(error.message || error).slice(0, 150);
    report.sites.forEach(site => {
      site.responsive = { status: "not_checked", viewports: [], error: message };
      issue(site, "responsive_not_checked", "화면 검증을 실행하지 못했습니다. " + message, site.url);
      site.status = statusFromIssues(site.issues);
    });
    report.summary = summarise(report);
    await writeFile(path, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log("::warning::" + message);
    return;
  }
  try {
    for (const site of report.sites) {
      const context = await browser.newContext({
        viewport: { width: WIDTHS[0], height: HEIGHT },
        deviceScaleFactor: 1, locale: "ko-KR", reducedMotion: "reduce"
      });
      const page = await context.newPage();
      const entries = [];
      const jsErrors = [];
      page.on("pageerror", error => { if (jsErrors.length < 3) jsErrors.push(String(error.message).slice(0, 100)); });
      page.on("dialog", dialog => { dialog.dismiss().catch(() => {}); });
      try {
        const response = await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        if (!response || response.status() >= 400) throw Error("Chromium page status " + (response?.status() ?? 0));
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          await page.waitForTimeout(350);
          const measurements = await page.evaluate(() => ({
            viewport: window.innerWidth,
            document_width: document.documentElement.scrollWidth,
            body_width: document.body?.scrollWidth ?? 0,
            title: document.title || ""
          }));
          const farthest = Math.max(measurements.document_width, measurements.body_width);
          const overflow = farthest > width + 5;
          const entry = {
            width, actual_width: measurements.viewport,
            document_width: measurements.document_width,
            body_width: measurements.body_width,
            horizontal_overflow: overflow
          };
          entries.push(entry);
          if (width === 320 || width === 690 || width === 1280) {
            try {
              const screenshot = OUTPUT + "/" + site.id + "-" + width + ".png";
              await page.screenshot({ path: screenshot, fullPage: false, animations: "disabled", timeout: 10000 });
              entry.screenshot = screenshot;
            } catch (error) { entry.screenshot_error = String(error.message || error).slice(0, 120); }
          }
        }
        const failures = entries.filter(e => e.horizontal_overflow);
        site.responsive = {
          status: failures.length ? "warning" : "ok",
          viewports: entries,
          browser: "Chromium; same-page viewport resize",
          js_error_samples: jsErrors
        };
        if (failures.length) {
          issue(site, "horizontal_overflow",
            "가로 넘침 감지: " + failures.map(e => e.width + "px(문서 " + Math.max(e.document_width, e.body_width) + "px)").join(", "), site.url);
        }
      } catch (error) {
        site.responsive = { status: "not_checked", viewports: entries, error: String(error.message || error).slice(0, 180) };
        issue(site, "responsive_not_checked", "브라우저 점검 실패: " + site.responsive.error, site.url);
      } finally {
        await context.close();
      }
      site.status = statusFromIssues(site.issues);
      console.log("PORTFOLIO responsive " + site.id + ": " + site.responsive.status +
        " | widths " + entries.map(x => x.width + "=" + (x.horizontal_overflow ? "OVERFLOW" : "ok")).join(" "));
    }
  } finally {
    await browser.close();
  }
  report.summary = summarise(report);
  report.layout_checked_at_utc = new Date().toISOString();
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", "utf8");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error("Responsive audit failed:", error); process.exitCode = 1; });
}
