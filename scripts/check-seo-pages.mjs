/**
 * Static SEO regression check for the TCFLiCK root site.
 * Checks source pages, not Google's private indexing status.
 * Does not edit any website, generate fabricated crawl outcomes or change layout.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const BASE = "https://tcflick.com";
function matchTags(html, type) {
  return [...String(html).matchAll(new RegExp("<" + type + "\\b[^>]*>", "gi"))].map(m => m[0]);
}
function attr(tag, name) {
  const re = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i");
  const result = String(tag).match(re);
  return result ? (result[1] ?? result[2] ?? "") : "";
}
function normalizeText(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
export function analyzePage(html, url) {
  const errors = [];
  const htmlTags = matchTags(html, "html");
  const lang = attr(htmlTags[0], "lang").toLowerCase();
  if (!/^ko(?:-kr)?$/.test(lang)) errors.push("Korean html[lang] must be ko or ko-KR");
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m => normalizeText(m[1]));
  if (titles.length !== 1 || titles[0].length < 10 || titles[0].length > 100)
    errors.push("Expected one meaningful page title");
  const descriptionTags = matchTags(html, "meta").filter(tag => attr(tag, "name").toLowerCase() === "description");
  const descriptions = descriptionTags.map(tag => attr(tag, "content").trim());
  if (descriptions.length !== 1 || descriptions[0].length < 35 || descriptions[0].length > 230)
    errors.push("Expected one descriptive meta description (35–230 characters)");
  const canonicalTags = matchTags(html, "link").filter(tag => attr(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"));
  const canonicals = canonicalTags.map(tag => attr(tag, "href"));
  if (canonicals.length !== 1 || canonicals[0] !== url)
    errors.push("Expected one self-referencing canonical: " + url);
  const robots = matchTags(html, "meta").filter(tag => ["robots","googlebot"].includes(attr(tag,"name").toLowerCase())).map(tag => attr(tag,"content"));
  if (robots.some(v => /\b(?:noindex|none)\b/i.test(v))) errors.push("Indexable sitemap URL unexpectedly has noindex");
  if (/<meta\b[^>]*http-equiv\s*=\s*["']refresh["']/i.test(html)) errors.push("Unexpected meta refresh");
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1.length !== 1 || normalizeText(h1[0]?.[1] ?? "").length < 4) errors.push("Expected exactly one meaningful H1");
  if (/https?:\/\/mova\.tcflick\.com\b|mova\.carpick\.workers\.dev\b/i.test(html))
    errors.push("Retired NERDING domain must not be linked");
  return { url, title: titles[0] ?? "", description: descriptions[0] ?? "", lang, errors };
}
export function validateSitemap(xml) {
  const urls = [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length >= 16, "Expected all 16 published TCFLiCK pages in sitemap");
  assert.equal(new Set(urls).size, urls.length, "Duplicate sitemap URLs");
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, BASE, "Sitemap must only use the root site's own domain");
    assert.equal(parsed.search, "", "Sitemap URLs must not have query strings");
    assert.equal(parsed.hash, "", "Sitemap URLs must not have fragments");
    assert.match(parsed.pathname, /^\/(?:[a-z0-9-]+)?$/, "Unexpected sitemap path");
  }
  return urls;
}
export async function validateSourcePages(root = ".") {
  const xml = await readFile(root + "/sitemap.xml", "utf8");
  const urls = validateSitemap(xml);
  const checked = [];
  for (const url of urls) {
    const pathname = new URL(url).pathname;
    const file = pathname === "/" ? "index.html" : pathname.slice(1) + ".html";
    const html = await readFile(root + "/" + file, "utf8");
    const info = analyzePage(html, url);
    checked.push({ file, ...info });
  }
  const titleOwners = new Map(), descriptionOwners = new Map();
  for (const page of checked) {
    for (const [kind, val, owners] of [["title",page.title,titleOwners],["description",page.description,descriptionOwners]]) {
      if (!val) continue;
      if (owners.has(val)) page.errors.push("Duplicate " + kind + " with " + owners.get(val));
      else owners.set(val,page.file);
    }
  }
  const services = await readFile(root + "/services.html", "utf8");
  const guide = await readFile(root + "/guide.html", "utf8");
  const prohibited = ["문서를 보관한 뒤 문서 내용을 기준으로 질문", "문서담은 사용자가 제공한 문서를 바탕으로 답변", "내 문서를 기반으로 답변을 확인할 때", "내 문서를 기반으로 답변을 확인하고 싶다면"];
  for (const phrase of prohibited) {
    if (services.includes(phrase) || guide.includes(phrase))
      checked.find(page => page.file === "services.html").errors.push("Incorrect document-service copy: " + phrase);
  }
  assert.match(services, /문서 양식을 선택하고 항목별 내용을 입력/, "Document service should be described accurately");
  const failed = checked.filter(item => item.errors.length);
  for (const page of checked) console.log("SEO " + (page.errors.length ? "FAIL" : "PASS") + " " + page.url + (page.errors.length ? " — " + page.errors.join("; ") : ""));
  if (failed.length) throw new Error("Root-site SEO metadata failed for " + failed.length + " of " + checked.length + " pages");
  console.log("TCFLiCK SEO metadata/source checks passed: " + checked.length + " canonical pages, unique titles/descriptions, Korean lang, H1, accurate service copy.");
  return checked;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateSourcePages().catch(error => { console.error(error); process.exitCode = 1; });
}
